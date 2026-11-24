/** Read-only checks against a running local server or the deployed public origin. */
import {pathToFileURL} from 'node:url';
import {publicPages} from '../src/public-pages.mjs';

const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), decode(match[2])]));

export async function auditSeo(base, {expectedOrigin = new URL(base).origin, headers = {}} = {}) {
  const errors = [], pages = new Map(), resources = new Set(), titles = new Set(), descriptions = new Set();
  const origin = new URL(base).origin;
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const request = (route, method = 'GET') => fetch(origin + route, {method, headers, redirect:'manual', signal:AbortSignal.timeout(15000)});
  const sitemap = await request('/sitemap.xml');
  check(sitemap.status === 200, `Sitemap returned ${sitemap.status}`);
  check(sitemap.headers.get('content-type')?.includes('xml'), 'Sitemap must have an XML content type');
  const xml = await sitemap.text();
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
  check(locations.length === publicPages.length, `Sitemap must contain exactly ${publicPages.length} public pages`);
  for (const page of publicPages) check(locations.includes(expectedOrigin + page.path), `Sitemap missing ${page.path}`);
  check(new Set(locations).size === locations.length, 'Sitemap contains duplicate URLs');
  const robots = await request('/robots.txt');
  check(robots.status === 200, `robots.txt returned ${robots.status}`);
  const rules = await robots.text();
  check(rules.includes(`Sitemap: ${expectedOrigin}/sitemap.xml`), 'robots.txt must advertise the canonical sitemap');
  check(!/^Disallow:\s*\/\s*$/m.test(rules), 'robots.txt blocks the whole site');
  check(!/^Disallow:\s*\/studio\s*$/m.test(rules), 'Studio must be crawlable for noindex to be seen');

  await Promise.all(publicPages.map(async page => {
    const response = await request(page.path);
    check(response.status === 200, `${page.path}: returned ${response.status}`);
    check(response.headers.get('content-type')?.includes('text/html'), `${page.path}: must serve HTML`);
    const html = await response.text();
    pages.set(page.path, html);
    const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(match => attrs(match[0]));
    const meta = name => tags.find(tag => tag.name === name || tag.property === name)?.content;
    const canonical = tags.filter(tag => tag.rel === 'canonical');
    const titleTags = [...html.matchAll(/<title>(.*?)<\/title>/g)];
    const title = decode(titleTags[0]?.[1] || '');
    const description = meta('description');
    check(titleTags.length === 1 && title.length > 0, `${page.path}: needs one nonempty title`);
    check(!titles.has(title), `${page.path}: duplicate title`); titles.add(title);
    check(Boolean(description) && description.length <= 180, `${page.path}: needs a concise description`);
    check(!descriptions.has(description), `${page.path}: duplicate description`); descriptions.add(description);
    check(canonical.length === 1 && canonical[0].href === expectedOrigin + page.path, `${page.path}: canonical URL is incorrect`);
    check(meta('robots')?.startsWith('index,'), `${page.path}: public page is not indexable`);
    check(!response.headers.get('x-robots-tag')?.includes('noindex'), `${page.path}: noindex HTTP header`);
    check((html.match(/<h1\b/gi) || []).length === 1, `${page.path}: needs one primary heading`);
    check(/<html[^>]*lang="en"/.test(html), `${page.path}: missing document language`);
    check(meta('og:url') === expectedOrigin + page.path, `${page.path}: Open Graph URL differs from canonical`);
    check(meta('og:title') === title && meta('twitter:title') === title, `${page.path}: social titles differ from page title`);
    check(meta('og:description') === description, `${page.path}: social description differs from snippet`);
    for (const name of ['og:image', 'twitter:image']) {
      const value = meta(name);
      check(value?.startsWith(expectedOrigin + '/'), `${page.path}: ${name} must use an absolute canonical URL`);
      if (value?.startsWith(expectedOrigin + '/')) resources.add(new URL(value).pathname);
    }
    const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    check(schemas.length === 1, `${page.path}: needs one structured-data graph`);
    for (const match of schemas) {
      try {
        const data = JSON.parse(match[1]);
        check(data['@context'] === 'https://schema.org', `${page.path}: invalid schema context`);
        check(data['@graph']?.some(node => node.url === expectedOrigin + page.path && /Page$/.test(node['@type'])), `${page.path}: missing canonical page entity`);
        check(!data['@graph']?.some(node => node.aggregateRating || node.review), `${page.path}: unsupported review markup`);
      } catch { check(false, `${page.path}: invalid JSON-LD`); }
    }
    for (const match of html.matchAll(/<(?:link|script|img|video)\b[^>]*>/gi)) {
      const attributes = attrs(match[0]);
      const value = attributes.src || attributes.href;
      if (!value || value.startsWith('data:')) continue;
      const url = new URL(value, expectedOrigin + page.path);
      if (url.origin === expectedOrigin && !url.pathname.startsWith('/api/')) resources.add(url.pathname + url.search);
    }
  }));

  const extraLinks = new Set();
  for (const [route, html] of pages) {
    for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
      const href = attrs(match[0]).href;
      if (!href) continue;
      const url = new URL(href, expectedOrigin + route);
      if (url.origin !== expectedOrigin) continue;
      const destination = pages.get(url.pathname);
      if (destination && url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        check(destination.includes(`id="${id}"`) || destination.includes(`id='${id}'`), `${route}: broken anchor ${href}`);
      }
      if (!destination) extraLinks.add(url.pathname + url.search);
    }
  }
  const assets = [...new Set([...resources, ...extraLinks])];
  // Bound concurrency when auditing a production server.
  for (let index = 0; index < assets.length; index += 4) {
    await Promise.all(assets.slice(index, index + 4).map(async route => {
      const response = await request(route, 'HEAD');
      check(response.status === 200, `Linked resource ${route} returned ${response.status}`);
    }));
  }
  const studio = await request('/studio');
  check(studio.status === 200, `Studio returned ${studio.status}`);
  check(studio.headers.get('x-robots-tag')?.includes('noindex'), 'Studio must have a noindex HTTP header');
  check(/<meta name="robots" content="noindex, follow"/.test(await studio.text()), 'Studio must have a noindex meta tag');
  const missing = await request('/seo-audit-page-that-does-not-exist');
  check(missing.status === 404, 'Missing pages must return a real 404');
  check(missing.headers.get('x-robots-tag')?.includes('noindex'), 'Missing pages must be noindex');
  return {pages:pages.size, resources:assets.length, errors};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const base = process.argv[2] || 'http://localhost:4173';
    if (!/^https?:$/.test(new URL(base).protocol)) throw Error('Use an HTTP or HTTPS origin');
    const result = await auditSeo(base);
    console.log(`SEO audit: ${result.pages} public pages and ${result.resources} linked resources checked at ${new URL(base).origin}`);
    if (result.errors.length) {
      for (const error of result.errors) console.error(`FAIL ${error}`);
      process.exitCode = 1;
    } else console.log('PASS metadata, canonicals, structured data, sitemap, robots, links, resources, studio exclusion and 404s');
  } catch (error) { console.error(`SEO audit failed: ${error.message}`); process.exitCode = 1; }
}
