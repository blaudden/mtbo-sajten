import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
const SITEMAP_FILE = join(DIST_DIR, 'sitemap-0.xml');

if (!existsSync(DIST_DIR)) {
  console.error('Error: dist directory not found. Run npm run build first.');
  process.exit(1);
}

if (!existsSync(SITEMAP_FILE)) {
  console.error('Error: sitemap-0.xml not found.');
  process.exit(1);
}

function verifySitemap() {
  const sitemapContent = readFileSync(SITEMAP_FILE, 'utf-8');
  const urls = sitemapContent.match(/<loc>(.*?)<\/loc>/g)?.map((match) => match.replace(/<\/?loc>/g, '')) || [];

  console.log(`Checking ${urls.length} URLs from sitemap for noindex tags...`);

  let failed = false;
  let checked = 0;

  for (const url of urls) {
    try {
      const parsedUrl = new URL(url);
      let filePath = join(DIST_DIR, parsedUrl.pathname, 'index.html');

      // Handle URLs that end in / or not
      if (!existsSync(filePath)) {
        filePath = join(
          DIST_DIR,
          parsedUrl.pathname.endsWith('.html') ? parsedUrl.pathname : `${parsedUrl.pathname}.html`
        );
      }

      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes('name="robots" content="noindex"')) {
          console.error(`❌ [FAIL] ${url}: Found in sitemap but has noindex tag.`);
          failed = true;
        }
        checked++;
      } else {
        // Skip external URLs or non-HTML files
        // console.log(`Skipping external or non-existent file: ${url}`);
      }
    } catch (e) {
      console.error(`Error parsing URL ${url}:`, e.message);
    }
  }

  console.log(`\nVerification complete. Checked ${checked} local pages.`);

  if (failed) {
    console.error('FAILED: Noindex pages found in sitemap.');
    process.exit(1);
  } else {
    console.log('SUCCESS: No pages in sitemap have noindex tags.');
  }
}

verifySitemap();
