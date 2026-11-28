import {publicPages, getPublicPage, breadcrumbs, escapeHtml} from './public-pages.mjs';

// IndexNow: public key served at /<key>.txt so Bing and other engines accept change notifications from this site.
// Google Search Console ownership file for https://replotre.com/ (keep it: removing it un-verifies the property).
export const GOOGLE_VERIFY_FILE = 'googleaed48d3c73c4187d.html';
export const INDEXNOW_KEY = 'b5bfcdd61ec118107965c033df4b17f9';
export const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const NOINDEX_ROBOTS = 'noindex, follow';

export function canonicalRedirect(pathname) {
  const aliases = {'/home':'/', '/landing.html':'/', '/index.html':'/studio', '/privacy.html':'/privacy', '/terms.html':'/terms'};
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (Object.hasOwn(aliases, normalized)) return aliases[normalized];
  if (normalized !== pathname && (getPublicPage(normalized) || normalized === '/studio')) return normalized;
  return null;
}

export function robotsText(origin, indexable = true) {
  // Studio must remain crawlable so crawlers can see its noindex directive.
  return `User-agent: *\nAllow: /\nDisallow: /api/\n${indexable ? `\nSitemap: ${origin}/sitemap.xml\n` : ''}`;
}

export function sitemapXml(origin, indexable = true) {
  // No synthetic lastmod timestamps: only canonical, public URLs belong here.
  // lastmod only where a page records a real content update date.
  const urls = indexable ? publicPages.map(page => `  <url><loc>${escapeHtml(origin + page.path)}</loc>${page.updated ? `<lastmod>${page.updated}</lastmod>` : ''}</url>`).join('\n') : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
// FAQ entries straight from the visible page, so structured data always matches what people can read.
function faqFromHtml(html) {
  const out = [];
  for (const m of html.matchAll(/<details class="fq-item"[\s\S]*?<span class="fq-q">([\s\S]*?)<\/span>[\s\S]*?<div class="fq-a">([\s\S]*?)<\/div>\s*<\/details>/g)) out.push({q:stripTags(m[1]), a:stripTags(m[2])});
  return out;
}
const faqLd = (items, id) => ({'@type':'FAQPage', '@id':id, mainEntity:items.map(({q, a}) => ({'@type':'Question', name:q, acceptedAnswer:{'@type':'Answer', text:a}}))});
const PLAN_OFFERS = [['Creator', '12.00', '115.00'], ['Pro', '29.00', '278.00']];
function structuredData(page, origin, html = '') {
  const organization = {'@type':'Organization', '@id':origin+'/#organization', name:'Replotre', url:origin+'/', description:'Replotre makes an AI video editor that runs in the browser.', email:'hello@replotre.com', logo:{'@type':'ImageObject', url:origin+'/assets/brand/replotre-icon-512.png', width:512, height:512}};
  const website = {'@type':'WebSite', '@id':origin+'/#website', url:origin+'/', name:'Replotre', inLanguage:'en', publisher:{'@id':organization['@id']}};
  const webpage = {'@type':page.kind === 'collection' ? 'CollectionPage' : 'WebPage', '@id':origin+page.path+'#webpage', url:origin+page.path, name:page.title, description:page.description, inLanguage:'en', isPartOf:{'@id':website['@id']}, publisher:{'@id':organization['@id']}};
  const graph = [organization, website, webpage];
  if (page.path === '/') {
    graph.push({'@type':'WebApplication', '@id':origin+'/#software', name:'Replotre', alternateName:['Replotre AI Video Editor', 'Replotre Studio'], url:origin+'/', applicationCategory:'MultimediaApplication', applicationSubCategory:'AI video editor', operatingSystem:'Web browser (Chrome, Edge, Brave, Arc)', browserRequirements:'Requires a current Chromium-based browser', description:page.description, image:origin+'/assets/og-image.jpg', screenshot:origin+'/assets/og-image.jpg',
      featureList:['AI video editing from plain-language prompts (AI Director)', 'Multi-track timeline with trims, splits, speed and keyframes', 'Automatic speech captions with SRT and WebVTT export', 'AI-designed video templates and looks', 'Remove silence and split at scene changes', 'Vertical, landscape, square and portrait frames', 'MP4 and WebM export'],
      offers:PLAN_OFFERS.flatMap(([name, month, year]) => [
        {'@type':'Offer', name:`${name} (monthly)`, price:month, priceCurrency:'USD', category:'subscription', url:origin+'/studio', priceSpecification:{'@type':'UnitPriceSpecification', price:month, priceCurrency:'USD', billingDuration:'P1M', unitText:'MONTH'}},
        {'@type':'Offer', name:`${name} (yearly)`, price:year, priceCurrency:'USD', category:'subscription', url:origin+'/studio', priceSpecification:{'@type':'UnitPriceSpecification', price:year, priceCurrency:'USD', billingDuration:'P1Y', unitText:'YEAR'}}]),
      publisher:{'@id':organization['@id']}});
    webpage.mainEntity = {'@id':origin+'/#software'};
    const faq = faqFromHtml(html);
    if (faq.length) graph.push(faqLd(faq, origin+'/#faq'));
  } else {
    const breadcrumbId = origin+page.path+'#breadcrumb';
    graph.push({'@type':'BreadcrumbList', '@id':breadcrumbId, itemListElement:breadcrumbs(page).map((crumb, index) => ({'@type':'ListItem', position:index+1, name:crumb.label, item:origin+crumb.path}))});
    webpage.breadcrumb = {'@id':breadcrumbId};
  }
  if (page.kind === 'article') {
    graph.push({'@type':'TechArticle', '@id':origin+page.path+'#article', headline:page.heading, description:page.description, image:origin+'/assets/og-image.jpg', inLanguage:'en', author:{'@id':organization['@id']}, publisher:{'@id':organization['@id']}, mainEntityOfPage:{'@id':webpage['@id']}});
    webpage.mainEntity = {'@id':origin+page.path+'#article'};
  }
  if (page.faq?.length) graph.push(faqLd(page.faq.map(([q, a]) => ({q, a})), origin+page.path+'#faq'));
  if (page.updated) webpage.dateModified = page.updated;
  if (page.kind === 'collection') webpage.mainEntity = {'@type':'ItemList', itemListElement:publicPages.filter(p => p.kind === 'article').map((p, index) => ({'@type':'ListItem', position:index+1, name:p.label, url:origin+p.path}))};
  return {'@context':'https://schema.org', '@graph':graph};
}

export function applySeo(html, pathname, origin, {indexable = true, googleVerification = '', bingVerification = ''} = {}) {
  const page = getPublicPage(pathname);
  const fallback = pathname === '/studio' ? {title:'Replotre Studio | Video Editing Workspace', description:'Sign in to Replotre Studio to edit your video projects, manage footage and export your finished videos.'} : {title:'Page Not Found | Replotre', description:'Find video editing tools and practical guides on Replotre.'};
  const {title, description} = page || fallback;
  const url = origin + pathname;
  const image = origin + '/assets/og-image.jpg';
  const robots = page && indexable ? INDEX_ROBOTS : NOINDEX_ROBOTS;
  // Replace managed metadata so templates cannot emit conflicting canonicals or snippets.
  const clean = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|google-site-verification|msvalidate\.01|og:[^"']+|twitter:[^"']+)["'][^>]*>\s*/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${page?.kind === 'article' ? 'article' : 'website'}" />`,
    '<meta property="og:site_name" content="Replotre" />',
    '<meta property="og:locale" content="en_US" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Replotre Studio video editor" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:image:alt" content="Replotre Studio video editor" />',
  ];
  if (page) {
    if (googleVerification.trim()) tags.push(`<meta name="google-site-verification" content="${escapeHtml(googleVerification.trim())}" />`);
    if (bingVerification.trim()) tags.push(`<meta name="msvalidate.01" content="${escapeHtml(bingVerification.trim())}" />`);
    const json = JSON.stringify(structuredData(page, origin, html)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }
  return clean.replace('</head>', tags.join('\n')+'\n</head>');
}
