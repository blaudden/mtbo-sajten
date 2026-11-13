import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, posix, relative } from 'path';

const DIST_DIR = './dist';
const SITE_ORIGIN = 'https://www.mountainbikeorientering.se';
const KNOWN_SERVER_ROUTES = new Set(['/api/svenska-cupen-standings', '/api/resolve-eventor-storage']);

if (!existsSync(DIST_DIR)) {
  console.error('Error: dist directory not found. Run npm run build first.');
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

function loadRedirectSources() {
  const sources = new Set();
  const redirectsPath = join(DIST_DIR, '_redirects');
  if (!existsSync(redirectsPath)) return sources;

  for (const line of readFileSync(redirectsPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0]) {
      sources.add(parts[0].replace(/\/$/, '') || '/');
    }
  }
  return sources;
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
  return route || '/';
}

function targetExists(routePath, pageRoutes, redirectSources) {
  const clean = routePath.replace(/\/$/, '') || '/';
  if (pageRoutes.has(clean)) return true;
  if (redirectSources.has(clean)) return true;
  if (KNOWN_SERVER_ROUTES.has(clean)) return true;
  if (existsSync(join(DIST_DIR, clean)) || existsSync(join(DIST_DIR, `${clean}.html`))) return true;
  return false;
}

function verifyInternalLinks() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  const redirectSources = loadRedirectSources();
  const pageRoutes = new Set(htmlFiles.map(fileToRoute));

  const errors = [];
  let checkedLinks = 0;

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf-8');
    const sourceRoute = fileToRoute(file);
    const baseDir = sourceRoute === '/' ? '/' : `${sourceRoute}/`;

    // Guard against ClientRouter / per-deploy X-Netlify-Deploy-ID JS regression
    if (html.includes('ClientRouter') || html.includes('astro-view-transitions-enabled')) {
      errors.push({
        source: file,
        ref: 'ClientRouter',
        reason: 'ClientRouter / astro-view-transitions detected (causes per-deploy JS 404s on Netlify)',
      });
    }

    // Check <a href="...">
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
        lowerHref.startsWith('vbscript:')
      ) {
        continue;
      }

      if (lowerHref.startsWith('file://')) {
        errors.push({ source: file, ref: rawHref, reason: 'Local file:// URL leaked into HTML' });
        continue;
      }

      let pathPart;
      if (lowerHref.startsWith('http://') || lowerHref.startsWith('https://') || rawHref.startsWith('//')) {
        try {
          const parsed = new URL(rawHref, SITE_ORIGIN);
          if (parsed.origin !== SITE_ORIGIN) continue;
          pathPart = parsed.pathname;
        } catch {
          // Malformed external URLs from upstream scraper data are out of scope for internal link checks
          continue;
        }
      } else {
        pathPart = rawHref.split('#')[0].split('?')[0];
      }

      if (!pathPart) continue;
      checkedLinks++;

      const resolved = pathPart.startsWith('/') ? pathPart : posix.resolve(baseDir, pathPart);
      if (!targetExists(resolved, pageRoutes, redirectSources)) {
        errors.push({
          source: file,
          ref: rawHref,
          reason: `Broken internal link (resolved to "${resolved}", not found in dist/ or _redirects)`,
        });
      }
    }

    // Check local <script src="..."> and <link rel="stylesheet" href="...">
    const assetRegex = /<(?:script|link)\s+[^>]*(?:src|href)=(["'])(\/_astro\/[^"']+)\1/gi;
    while ((match = assetRegex.exec(html)) !== null) {
      const rawAsset = match[2].split('?')[0];
      checkedLinks++;
      if (!existsSync(join(DIST_DIR, rawAsset))) {
        errors.push({
          source: file,
          ref: match[2],
          reason: `Missing built asset "${rawAsset}" in ${DIST_DIR}`,
        });
      }
    }
  }

  console.log(`Checked ${checkedLinks} internal links and assets across ${htmlFiles.length} HTML files.`);

  if (errors.length > 0) {
    console.error(`❌ [FAIL] Found ${errors.length} broken internal link/asset issues:`);
    for (const err of errors.slice(0, 30)) {
      console.error(`  - ${err.source}: "${err.ref}" -> ${err.reason}`);
    }
    if (errors.length > 30) {
      console.error(`  ... and ${errors.length - 30} more.`);
    }
    process.exit(1);
  }

  console.log('SUCCESS: All internal links and built assets resolve cleanly (no 404s or file:// URLs).');
}

verifyInternalLinks();
