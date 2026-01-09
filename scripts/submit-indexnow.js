import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_PATH = path.join(__dirname, '../dist/sitemap-0.xml');
const INDEXNOW_KEY = 'f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5';
const HOST = 'www.mountainbikeorientering.se';

// Helper to extract URLs from sitemap
function extractUrls(sitemapContent) {
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(sitemapContent)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

async function submitToIndexNow(urls) {
  if (urls.length === 0) {
    console.log('No URLs found to submit.');
    return;
  }

  if (urls.length > 0) {
    console.log(`First URL to submit: ${urls[0]}`);
  }

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    urlList: urls,
  };

  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  console.log(`Submitting ${urls.length} URLs to IndexNow...`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Success! Status: ${res.statusCode} ${res.statusMessage}`);
          resolve();
        } else {
          console.error(`Failed. Status: ${res.statusCode} ${res.statusMessage}`);
          console.error('Response:', body);
          reject(new Error(`IndexNow submission failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

function main() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error(`Sitemap not found at ${SITEMAP_PATH}. Make sure to build the project first.`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const urls = extractUrls(content);
    console.log(`Found ${urls.length} URLs in sitemap.`);

    // Limit to 10,000 per request
    if (urls.length > 10000) {
      console.warn('Warning: More than 10,000 URLs found. Only submitting the first 10,000.');
      submitToIndexNow(urls.slice(0, 10000));
    } else {
      submitToIndexNow(urls);
    }
  } catch (e) {
    console.error('Error processing sitemap:', e);
    process.exit(1);
  }
}

main();
