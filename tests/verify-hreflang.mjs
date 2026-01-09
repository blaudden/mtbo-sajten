import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// NOTE: You must run 'npm run build' before running this test to generate the 'dist' directory.
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

function verifyHreflang() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  let failed = false;
  let checked = 0;

  console.log(`Scanning ${htmlFiles.length} HTML files for hreflang tags...`);

  htmlFiles.forEach((file) => {
    const content = readFileSync(file, 'utf-8');

    // Find all hreflang tags
    // <link rel="alternate" hreflang="sv" href="..." />
    // Regex to match "alternate" links, then check attributes independently
    const matches = [];
    const linkRegex = /<link[^>]+rel=["']alternate["'][^>]*>/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const tag = match[0];
      const hreflangMatch = tag.match(/hreflang=["']([^"']+)["']/);
      const hrefMatch = tag.match(/href=["']([^"']+)["']/);

      if (hreflangMatch && hrefMatch) {
        matches.push({ lang: hreflangMatch[1], url: hrefMatch[1] });
      }
    }

    if (matches.length > 0) {
      checked++;

      // 1. Check for x-default
      const hasXDefault = matches.some((m) => m.lang === 'x-default');
      if (!hasXDefault) {
        console.error(`❌ [FAIL] ${file}: Missing x-default hreflang tag.`);
        failed = true;
      }

      // 2. Check for self-reference / minimum count
      // A proper multi-lingual setup should have at least 2 tags: self + alternate.
      // If we only have 1 (e.g. just x-default, or just the alternate but not self), it triggers "no return tag".
      if (matches.length < 2) {
        console.error(`❌ [FAIL] ${file}: Only ${matches.length} hreflang tag found. Missing self-reference?`);
        failed = true;
      }

      // 3. Check for duplicates
      const langs = matches.map((m) => m.lang);
      const uniqueLangs = new Set(langs);
      if (langs.length !== uniqueLangs.size) {
        console.error(`❌ [FAIL] ${file}: Duplicate hreflang tags found: ${langs.join(', ')}`);
        failed = true;
      }
    }
  });

  console.log(`\nVerification complete. Verified hreflang structure in ${checked} files.`);

  if (failed) {
    console.error('FAILED: Hreflang issues detected.');
    process.exit(1);
  } else {
    console.log('SUCCESS: Hreflang tags look structurally correct.');
  }
}

verifyHreflang();
