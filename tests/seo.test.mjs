import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {publicPages, renderPublicPage} from '../src/public-pages.mjs';
import {applySeo, canonicalRedirect, robotsText, sitemapXml} from '../src/seo.mjs';
import {auditSeo} from '../scripts/audit-seo.mjs';

const root = path.resolve(import.meta.dirname, '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); }); }
function requestHost(url, host) { return new Promise((resolve, reject) => { const request = http.get(url, {headers:{Host:host}}, response => { let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve({status:response.statusCode, headers:response.headers, body})); }); request.on('error', reject); }); }
async function startServer(t, overrides = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'replotre-seo-'));
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  const env = {...process.env, PORT:String(port), DATA_DIR:dir, APP_ORIGIN:base, NODE_ENV:'test', SEO_INDEXABLE:'', GOOGLE_SITE_VERIFICATION:'', BING_SITE_VERIFICATION:'', OPENAI_API_KEY:'', ANTHROPIC_API_KEY:'', WHOP_API_KEY:'', ...overrides};
  const server = spawn(process.execPath, ['server.mjs'], {cwd:root, env, stdio:['ignore', 'pipe', 'pipe']});
  let logs = '';
  server.stdout.on('data', chunk => { logs += chunk; }); server.stderr.on('data', chunk => { logs += chunk; });
  t.after(async () => {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      for (let i = 0; i < 60 && server.exitCode === null; i++) await wait(50);
      if (server.exitCode === null) { server.kill('SIGKILL'); await new Promise(resolve => server.once('exit', resolve)); }
    }
    await rm(dir, {recursive:true, force:true});
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(`SEO fixture server exited: ${logs}`);
    try { if ((await fetch(base + '/api/healthz')).ok) return base; } catch {}
    await wait(50);
  }
  throw Error(`SEO fixture server did not start: ${logs}`);
}

test('public URL aliases normalize without redirecting unknown paths', () => {
  for (const [alias, canonical] of Object.entries({'/home':'/', '/home/':'/', '/landing.html':'/', '/index.html':'/studio', '/studio/':'/studio', '/privacy.html':'/privacy', '/terms.html':'/terms', '/auto-captions/':'/auto-captions', '/guides/how-to-edit-videos-online/':'/guides/how-to-edit-videos-online'})) assert.equal(canonicalRedirect(alias), canonical);
  for (const route of ['/', '/studio', '/missing/', '/assets/demo/', '/guides/not-an-article/']) assert.equal(canonicalRedirect(route), null);
});

test('metadata is idempotent, uses the configured origin and safely escapes verification values', async () => {
  const template = await readFile(path.join(root, 'landing.html'), 'utf8');
  const options = {googleVerification:'a"><script>alert(1)</script>', bingVerification:'bing&value'};
  const html = applySeo(template, '/', 'https://video.example', options);
  assert.equal(applySeo(html, '/', 'https://video.example', options), html);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((html.match(/application\/ld\+json/g) || []).length, 1);
  assert.match(html, /href="https:\/\/video\.example\/"/);
  assert.match(html, /a&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /bing&amp;value/);
  assert.doesNotMatch(html, /<script>alert/);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(schema['@graph'].some(node => node['@type'] === 'WebApplication' && node.offers?.length));
  assert.ok(schema['@graph'].every(node => !node.aggregateRating && !node.review));
});

test('sitemaps include canonical public pages and staging remains crawlable for noindex', () => {
  const xml = sitemapXml('https://video.example');
  assert.equal((xml.match(/<loc>/g) || []).length, publicPages.length);
  assert.doesNotMatch(xml, /\/studio|\/api\/|<priority>|<changefreq>/);
  for (const m of xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) assert.match(m[1], /^\d{4}-\d{2}-\d{2}$/, 'lastmod is a real calendar date');
  assert.doesNotMatch(sitemapXml('https://video.example', false), /<loc>/);
  assert.match(robotsText('https://video.example'), /Sitemap: https:\/\/video\.example\/sitemap.xml/);
  assert.doesNotMatch(robotsText('https://video.example', false), /Sitemap:|Disallow: \/\s*$/m);
});

test('public features and articles expose their content and navigation without JavaScript', () => {
  for (const page of publicPages.filter(page => !page.file)) {
    const html = applySeo(renderPublicPage(page), page.path, 'https://video.example');
    assert.ok(html.includes(page.heading));
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    for (const section of page.sections || []) {
      assert.ok(html.includes(`id="${section.id}"`));
      assert.ok(html.includes(`href="#${section.id}"`));
    }
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.ok(schema['@graph'].some(node => node['@type'] === 'BreadcrumbList'));
    if (page.kind === 'article') {
      assert.ok(schema['@graph'].some(node => node['@type'] === 'TechArticle'));
      assert.match(html, /By the Replotre team/);
    }
  }
});

test('HTTP crawl verifies every public page, linked resource and search exclusion', {timeout:60000}, async t => {
  const base = await startServer(t, {SEO_INDEXABLE:'true', GOOGLE_SITE_VERIFICATION:'google-proof', BING_SITE_VERIFICATION:'bing-proof'});
  const audit = await auditSeo(base);
  assert.deepEqual(audit.errors, []);
  assert.equal(audit.pages, publicPages.length);
  assert.ok(audit.resources > 15);
  const home = await fetch(base + '/?utm_source=search');
  const html = await home.text();
  assert.match(html, new RegExp(`<link rel="canonical" href="${base}/"`));
  assert.match(html, /name="google-site-verification" content="google-proof"/);
  assert.match(html, /name="msvalidate.01" content="bing-proof"/);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(json).digest('base64');
  assert.ok(home.headers.get('content-security-policy').includes(`'sha256-${hash}'`));
  assert.doesNotMatch(home.headers.get('content-security-policy').split(';')[1], /unsafe-inline/);
  assert.doesNotMatch(html, /Start editing, free|No account needed|Your videos stay on your device/);
  for (const route of ['/', '/auto-captions', '/guides/how-to-edit-videos-online', '/sitemap.xml', '/robots.txt']) {
    const get = await fetch(base + route), body = await get.text();
    const head = await fetch(base + route, {method:'HEAD'});
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(body)));
    assert.equal(await head.text(), '');
    const cached = await fetch(base + route, {headers:{'If-None-Match':get.headers.get('etag')}});
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), '');
  }
  for (const [from, to] of [['/home?utm_source=test','/?utm_source=test'], ['/landing.html','/'], ['/index.html?q=trim','/studio?q=trim'], ['/privacy.html','/privacy'], ['/auto-captions/?utm_source=test','/auto-captions?utm_source=test']]) {
    const response = await fetch(base + from, {redirect:'manual'});
    assert.equal(response.status, 301); assert.equal(response.headers.get('location'), to);
  }
  const studio = await fetch(base + '/studio');
  assert.match(studio.headers.get('cache-control'), /^private/);
  assert.match(await studio.text(), /data-boot="/);
  const privateAPI = await fetch(base + '/api/projects');
  assert.equal(privateAPI.status, 401); assert.match(privateAPI.headers.get('x-robots-tag'), /noindex/);
  for (const route of ['/src/seo.mjs', '/.env', '/data/replotre.sqlite', '/guides/missing']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404); assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.match(await response.text(), /Page not found/);
  }
});

test('development and explicit staging settings prevent indexing while exposing noindex', {timeout:30000}, async t => {
  const base = await startServer(t);
  for (const route of ['/', '/auto-captions', '/privacy']) {
    const response = await fetch(base + route);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.match(await response.text(), /name="robots" content="noindex, follow"/);
  }
  assert.doesNotMatch(await (await fetch(base + '/sitemap.xml')).text(), /<loc>/);
  assert.doesNotMatch(await (await fetch(base + '/robots.txt')).text(), /Sitemap:|Disallow: \/\s*$/m);
});

test('production enables public indexing, combines host and path redirects and supports staging opt-out', {timeout:30000}, async t => {
  const base = await startServer(t, {NODE_ENV:'production', APP_ORIGIN:'https://replotre.example', SEO_INDEXABLE:''});
  const alias = await requestHost(base + '/home?utm_source=test', 'www.replotre.example');
  assert.equal(alias.status, 301); assert.equal(alias.headers.location, 'https://replotre.example/?utm_source=test');
  const response = await requestHost(base + '/', 'replotre.example');
  assert.equal(response.status, 200); assert.match(response.headers['x-robots-tag'], /^index,/);
  assert.match(response.body, /href="https:\/\/replotre\.example\/"/);
  const staging = await startServer(t, {NODE_ENV:'production', APP_ORIGIN:'https://staging.example', SEO_INDEXABLE:'false'});
  const preview = await requestHost(staging + '/', 'staging.example');
  assert.match(preview.headers['x-robots-tag'], /noindex/);
});
