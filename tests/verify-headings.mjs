import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';

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

function verifyHeadings() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  let failed = false;

  console.log(`Checking <h1> heading count across ${htmlFiles.length} HTML files...`);

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf-8');
    const h1Matches = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];

    if (h1Matches.length > 1) {
      console.error(`❌ [FAIL] ${file}: Expected at most 1 <h1>, found ${h1Matches.length}.`);
      failed = true;
      continue;
    }

    if (h1Matches.length === 1) {
      let text = h1Matches[0];
      let prev;
      do {
        prev = text;
        text = text.replace(/<[^>]+>/g, '');
      } while (text !== prev);
      if (!text.trim()) {
        console.error(`❌ [FAIL] ${file}: <h1> element is empty.`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('FAILED: Heading structure errors detected.');
    process.exit(1);
  }

  console.log(`SUCCESS: All ${htmlFiles.length} HTML files have at most one non-empty <h1>.`);
}

verifyHeadings();
