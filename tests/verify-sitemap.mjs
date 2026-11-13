import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
const SITEMAP_FILE = join(DIST_DIR, 'sitemap-0.xml');
const REDIRECTS_FILE = join(DIST_DIR, '_redirects');

if (!existsSync(DIST_DIR)) {
  console.error('Error: dist directory not found. Run npm run build first.');
  process.exit(1);
}

if (!existsSync(SITEMAP_FILE)) {
  console.error('Error: sitemap-0.xml not found.');
  process.exit(1);
}

function loadRedirectSources() {
  const sources = new Set();
  if (!existsSync(REDIRECTS_FILE)) return sources;
  for (const line of readFileSync(REDIRECTS_FILE, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0]) sources.add(parts[0].replace(/\/$/, '') || '/');
  }
  return sources;
}

function normalizePath(p) {
  return p.replace(/\/$/, '') || '/';
}

function verifySitemap() {
  const sitemapContent = readFileSync(SITEMAP_FILE, 'utf-8');
  const urls = sitemapContent.match(/<loc>(.*?)<\/loc>/g)?.map((match) => match.replace(/<\/?loc>/g, '')) || [];
  const redirectSources = loadRedirectSources();

  console.log(`Checking ${urls.length} URLs from sitemap for existence, noindex, redirects, and canonical match...`);

  let failed = false;
  let checked = 0;

  for (const url of urls) {
    try {
      const parsedUrl = new URL(url);
      const urlPath = normalizePath(parsedUrl.pathname);

      if (redirectSources.has(urlPath)) {
        console.error(`❌ [FAIL] ${url}: Redirect source found in sitemap.`);
        failed = true;
      }

      let filePath = join(DIST_DIR, parsedUrl.pathname, 'index.html');
      if (!existsSync(filePath)) {
        filePath = join(
          DIST_DIR,
          parsedUrl.pathname.endsWith('.html') ? parsedUrl.pathname : `${parsedUrl.pathname}.html`
        );
      }

      if (!existsSync(filePath)) {
        console.error(`❌ [FAIL] ${url}: Sitemap URL has no built HTML file in ${DIST_DIR}.`);
        failed = true;
        continue;
      }

      const content = readFileSync(filePath, 'utf-8');
      if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(content)) {
        console.error(`❌ [FAIL] ${url}: Found in sitemap but has noindex tag.`);
        failed = true;
      }

      const canonicalMatch =
        content.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
        content.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);

      if (!canonicalMatch) {
        console.error(`❌ [FAIL] ${url}: Missing <link rel="canonical"> tag.`);
        failed = true;
      } else {
        const canonicalPath = normalizePath(new URL(canonicalMatch[1], parsedUrl.origin).pathname);
        if (canonicalPath !== urlPath) {
          console.error(`❌ [FAIL] ${url}: Non-canonical page in sitemap! Canonical points to "${canonicalMatch[1]}".`);
          failed = true;
        }
      }

      checked++;
    } catch (e) {
      console.error(`❌ [FAIL] Error parsing URL ${url}: ${e.message}`);
      failed = true;
    }
  }

  console.log(`\nVerification complete. Checked ${checked} sitemap URLs.`);

  if (failed) {
    console.error('FAILED: Sitemap verification encountered errors.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All sitemap URLs exist, are indexable, and are self-canonical.');
  }
}

verifySitemap();
