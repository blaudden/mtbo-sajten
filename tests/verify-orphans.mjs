import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, posix, relative } from 'path';

const DIST_DIR = './dist';
const SITEMAP_FILE = join(DIST_DIR, 'sitemap-0.xml');
const SITE_ORIGIN = 'https://www.mountainbikeorientering.se';

if (!existsSync(DIST_DIR) || !existsSync(SITEMAP_FILE)) {
  console.error('Error: dist/ or sitemap-0.xml not found. Run npm run build first.');
  process.exit(1);
}

function getAllHtmlFiles(dir, fileList = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      getAllHtmlFiles(fullPath, fileList);
    } else if (fullPath.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function fileToRoute(filePath) {
  let route =
    '/' +
    relative(DIST_DIR, filePath)
      .replace(/\\/g, '/')
      .replace(/\/index\.html$/, '')
      .replace(/^index\.html$/, '')
      .replace(/\.html$/, '');
  if (route === '/.') route = '/';
  return (route || '/').replace(/\/$/, '') || '/';
}

function loadRedirects() {
  const map = new Map();
  const redirectsPath = join(DIST_DIR, '_redirects');
  if (!existsSync(redirectsPath)) return map;

  for (const line of readFileSync(redirectsPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      map.set(parts[0].replace(/\/$/, '') || '/', parts[1]);
    }
  }
  return map;
}

function verifyOrphans() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  const redirects = loadRedirects();
  const inlinks = new Map();

  for (const file of htmlFiles) {
    const sourceRoute = fileToRoute(file);
    const baseDir = sourceRoute === '/' ? '/' : `${sourceRoute}/`;
    const html = readFileSync(file, 'utf-8');

    const anchorRegex = /<a\s+[^>]*href=(["'])(.*?)\1/gi;
    let match;
    while ((match = anchorRegex.exec(html)) !== null) {
      const rawHref = match[2].trim();
      const lowerHref = rawHref.toLowerCase();
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        lowerHref.startsWith('mailto:') ||
        lowerHref.startsWith('tel:') ||
        lowerHref.startsWith('javascript:') ||
        // Include data: and vbscript: alongside javascript: for CodeQL js/incomplete-url-scheme-sanitization
        lowerHref.startsWith('data:') ||
        lowerHref.startsWith('vbscript:') ||
        lowerHref.startsWith('file://')
      ) {
        continue;
      }

      let pathPart;
      if (lowerHref.startsWith('http://') || lowerHref.startsWith('https://') || rawHref.startsWith('//')) {
        try {
          const parsed = new URL(rawHref, SITE_ORIGIN);
          if (parsed.origin !== SITE_ORIGIN) continue;
          pathPart = parsed.pathname;
        } catch {
          continue;
        }
      } else {
        pathPart = rawHref.split('#')[0].split('?')[0];
      }

      if (!pathPart) continue;
      let resolved = (pathPart.startsWith('/') ? pathPart : posix.resolve(baseDir, pathPart)).replace(/\/$/, '') || '/';
      if (redirects.has(resolved) && redirects.get(resolved).startsWith('/')) {
        resolved = redirects.get(resolved).replace(/\/$/, '') || '/';
      }

      if (resolved !== sourceRoute) {
        inlinks.set(resolved, (inlinks.get(resolved) || 0) + 1);
      }
    }
  }

  const sitemapContent = readFileSync(SITEMAP_FILE, 'utf-8');
  const sitemapUrls = sitemapContent.match(/<loc>(.*?)<\/loc>/g)?.map((m) => m.replace(/<\/?loc>/g, '')) || [];

  const orphans = [];
  for (const url of sitemapUrls) {
    const pathname = new URL(url).pathname.replace(/\/$/, '') || '/';
    if (pathname === '/') continue;
    if ((inlinks.get(pathname) || 0) === 0) {
      orphans.push(url);
    }
  }

  console.log(`Checked ${sitemapUrls.length} sitemap URLs for incoming internal links.`);

  if (orphans.length > 0) {
    console.error(`❌ [FAIL] Found ${orphans.length} orphan page(s) in sitemap with 0 incoming internal links:`);
    for (const u of orphans) {
      console.error(`  - ${u}`);
    }
    process.exit(1);
  }

  console.log('SUCCESS: Every sitemap URL has at least one incoming internal link.');
}

verifyOrphans();
