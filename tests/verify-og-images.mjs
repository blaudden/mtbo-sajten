import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';

function getAllHtmlFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else {
      if (filePath.endsWith('.html')) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

function verifyOgImages() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  let failed = false;
  let checked = 0;

  console.log(`Scanning ${htmlFiles.length} HTML files in ${DIST_DIR}...`);

  htmlFiles.forEach((file) => {
    const content = readFileSync(file, 'utf-8');
    // Flexible regex for meta property=og:image
    const ogImageMatch =
      content.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogImageMatch) {
      checked++;
      const ogImage = ogImageMatch[1];

      // Valid hosts whitelist
      const ALLOWED_HOSTS = ['www.mountainbikeorientering.se', 'mountainbikeorientering.se', 'localhost'];

      // Allow dynamic Netlify deploy preview host if set
      if (process.env.DEPLOY_PRIME_URL) {
        try {
          const primeHost = new URL(process.env.DEPLOY_PRIME_URL).hostname;
          ALLOWED_HOSTS.push(primeHost);
        } catch {
          // ignore invalid env var
        }
      }

      try {
        const parsedUrl = new URL(ogImage);

        // precise validation
        if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
          console.warn(`⚠️ [WARN] ${file}: og:image host '${parsedUrl.hostname}' is not in allowed list: ${ogImage}`);
        } else if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          console.error(`❌ [FAIL] ${file}: og:image has invalid protocol: ${ogImage}`);
          failed = true;
        } else if (!parsedUrl.pathname.startsWith('/og-images/')) {
          console.error(
            `❌ [FAIL] ${file}: og:image does not use the required clean URL format ('/og-images/...'): ${ogImage}`
          );
          failed = true;
        } else {
          // Valid case
          // console.log(`✅ [PASS] ${file}: ${ogImage}`);
        }
      } catch {
        console.error(`❌ [FAIL] ${file}: og:image is not a valid URL: ${ogImage}`);
        failed = true;
      }
    } else {
      // debug: check if og:image exists at all
      if (content.includes('og:image')) {
        console.warn(`⚠️ [WARN] ${file}: Contains 'og:image' but regex failed via strict text matching.`);
      }
    }
  });

  console.log(`\nVerification complete. Checked ${checked} files with og:image tags.`);

  if (failed) {
    console.error('FAILED: Some files have incorrect og:image URLs.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All checked og:image URLs are valid absolute URLs.');
  }
}

verifyOgImages();
