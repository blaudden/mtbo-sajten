import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
// Max length set to 165 to account for "..." appended by truncateText (160 + 3)
const MAX_LENGTH = 165;

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

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function verifyMetaDescriptions() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  let failed = false;
  let checked = 0;

  console.log(`Scanning ${htmlFiles.length} HTML files in ${DIST_DIR} for meta description length...`);

  htmlFiles.forEach((file) => {
    const content = readFileSync(file, 'utf-8');

    // Regex for description
    // <meta content="..." name="description"> or <meta name="description" content="...">
    const descMatch =
      content.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

    // Regex for og:description
    const ogDescMatch =
      content.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      content.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

    if (descMatch) {
      let desc = descMatch[1];
      desc = decodeEntities(desc);
      if (desc.length > MAX_LENGTH) {
        console.error(`❌ [FAIL] ${file}: description too long (${desc.length} chars). Limit: ${MAX_LENGTH}.`);
        console.error(`   Value: ${desc.substring(0, 50)}...`);
        failed = true;
      }
      checked++;
    }

    if (ogDescMatch) {
      let ogDesc = ogDescMatch[1];
      ogDesc = decodeEntities(ogDesc);
      if (ogDesc.length > MAX_LENGTH) {
        console.error(`❌ [FAIL] ${file}: og:description too long (${ogDesc.length} chars). Limit: ${MAX_LENGTH}.`);
        console.error(`   Value: ${ogDesc.substring(0, 50)}...`);
        failed = true;
      }
      checked++;
    }
  });

  console.log(`\nVerification complete. Checked meta tags in ${checked} locations across ${htmlFiles.length} files.`);

  if (failed) {
    console.error('FAILED: Some meta descriptions are too long.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All checked meta descriptions are within limits.');
  }
}

verifyMetaDescriptions();
