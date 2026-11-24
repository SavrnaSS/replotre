import {publicPages, getPublicPage, breadcrumbs, escapeHtml} from './public-pages.mjs';

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
  const urls = indexable ? publicPages.map(page => `  <url><loc>${escapeHtml(origin + page.path)}</loc></url>`).join('\n') : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function structuredData(page, origin) {
  const organization = {'@type':'Organization', '@id':origin+'/#organization', name:'Replotre', url:origin+'/', logo:{'@type':'ImageObject', url:origin+'/assets/brand/apple-touch-icon.png'}};
  const website = {'@type':'WebSite', '@id':origin+'/#website', url:origin+'/', name:'Replotre', inLanguage:'en', publisher:{'@id':organization['@id']}};
  const webpage = {'@type':page.kind === 'collection' ? 'CollectionPage' : 'WebPage', '@id':origin+page.path+'#webpage', url:origin+page.path, name:page.title, description:page.description, inLanguage:'en', isPartOf:{'@id':website['@id']}, publisher:{'@id':organization['@id']}};
  const graph = [organization, website, webpage];
  if (page.path === '/') {
    graph.push({'@type':'SoftwareApplication', '@id':origin+'/#software', name:'Replotre Studio', url:origin+'/', applicationCategory:'MultimediaApplication', operatingSystem:'Web browser', description:page.description, featureList:['Timeline video editing', 'AI Director editing', 'Speech captions', 'Video templates', 'MP4 and WebM export'], publisher:{'@id':organization['@id']}});
    webpage.mainEntity = {'@id':origin+'/#software'};
  } else {
    const breadcrumbId = origin+page.path+'#breadcrumb';
    graph.push({'@type':'BreadcrumbList', '@id':breadcrumbId, itemListElement:breadcrumbs(page).map((crumb, index) => ({'@type':'ListItem', position:index+1, name:crumb.label, item:origin+crumb.path}))});
    webpage.breadcrumb = {'@id':breadcrumbId};
  }
  if (page.kind === 'article') {
    graph.push({'@type':'TechArticle', '@id':origin+page.path+'#article', headline:page.heading, description:page.description, image:origin+'/assets/og-image.jpg', inLanguage:'en', author:{'@id':organization['@id']}, publisher:{'@id':organization['@id']}, mainEntityOfPage:{'@id':webpage['@id']}});
    webpage.mainEntity = {'@id':origin+page.path+'#article'};
  }
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
    const json = JSON.stringify(structuredData(page, origin)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }
  return clean.replace('</head>', tags.join('\n')+'\n</head>');
}
