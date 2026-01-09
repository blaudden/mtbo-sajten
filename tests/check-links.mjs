import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const DIST_DIR = './dist';
const CONCURRENCY = 5;
const TIMEOUT = 10000;
const HEAD_TIMEOUT = 5000; // Compromise: 5s is usually enough for a healthy HEAD

// Browser Simulation Headers
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

// Domains to skip network checks for (Bot Protection / Scraper Blocking)
// We assume they are valid if the URL looks sane.
const SKIPPED_HOSTS = ['facebook.com', 'instagram.com', 'pixieset.com', 'fb.me', 'linkedin.com', 'sharepoint.com'];

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const GRAY = '\x1b[90m';
const MAGENTA = '\x1b[35m';

if (!statSync(DIST_DIR, { throwIfNoEntry: false })) {
  console.error(`${RED}Error: ${DIST_DIR} directory not found.${RESET}`);
  console.error(`Please run 'npm run build' first.`);
  process.exit(1);
}

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

// Extract links from HTML content
function extractLinks(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const links = [];
  // Regex to capture href and the link content (text)
  // Note: This is a simple regex and might fail on nested tags, but good for diagnostics.
  const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gis;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const rawUrl = match[2];
    const linkText = match[3]
      .replace(/<[^>]*>/g, '')
      .trim()
      .substring(0, 50); // Strip HTML tags from text

    if (rawUrl.startsWith('#') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')) continue;

    try {
      let url;
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        url = rawUrl;
      } else {
        // Skip internal relative links for now
        continue;
      }

      // Calculate line number
      const linesBefore = content.substring(0, match.index).split('\n').length;

      links.push({ url, source: filePath, line: linesBefore, text: linkText });
    } catch {
      // Invalid URL
    }
  }
  return links;
}

// Normalize URL to pattern for clustering
function getUrlPattern(urlStr) {
  try {
    const url = new URL(urlStr);
    let path = url.pathname;

    // Replace digits with {{N}}
    path = path.replace(/\d+/g, '{{N}}');
    // Replace UUIDs (approximate)
    path = path.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '{{UUID}}');

    return `${url.origin}${path}`;
  } catch {
    return urlStr;
  }
}

async function verifyUrlStatus(url) {
  if (SKIPPED_HOSTS.some((host) => url.includes(host))) {
    return { ok: true, status: 200, skipped: true };
  }

  return fetchWithRetry(url, 'HEAD');
}

function fetchWithRetry(url, method, redirectCount = 0, chain = []) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    if (redirectCount > 5) {
      finish({ ok: false, error: 'Too many redirects', chain });
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      finish({ ok: false, error: 'Invalid URL', chain });
      return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      method,
      headers: HEADERS,
      timeout: method === 'HEAD' ? HEAD_TIMEOUT : TIMEOUT,
    };

    const req = lib.request(parsedUrl, options, (res) => {
      res.resume(); // Consume body

      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        finish({ ok: true, status, chain });
        return;
      }

      if (status >= 300 && status < 400 && res.headers.location) {
        const dest = new URL(res.headers.location, url).toString();
        const newChain = [...chain, { url, status, dest }];
        // Follow redirect with GET always
        fetchWithRetry(dest, 'GET', redirectCount + 1, newChain).then(finish);
        return;
      }

      // Retry with GET if HEAD fails (404, 403, 405, etc.)
      if (method === 'HEAD') {
        fetchWithRetry(url, 'GET', redirectCount, chain).then(finish);
        return;
      }

      finish({ ok: false, status, chain });
    });

    req.on('error', (err) => {
      if (method === 'HEAD') {
        fetchWithRetry(url, 'GET', redirectCount, chain).then(finish);
      } else {
        finish({ ok: false, error: err.message, chain });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (method === 'HEAD') {
        fetchWithRetry(url, 'GET', redirectCount, chain).then(finish);
      } else {
        finish({ ok: false, error: 'Timeout', chain });
      }
    });

    req.end();
  });
}

async function run() {
  console.log(`${BLUE}🔍 Scanning for links in ${DIST_DIR}...${RESET}`);
  const files = getAllHtmlFiles(DIST_DIR);

  let allLinks = [];
  for (const file of files) {
    allLinks = allLinks.concat(extractLinks(file));
  }

  const urlToSources = new Map();
  allLinks.forEach(({ url, source, line, text }) => {
    if (!urlToSources.has(url)) {
      urlToSources.set(url, []);
    }
    urlToSources.get(url).push({ source, line, text });
  });

  const uniqueUrls = Array.from(urlToSources.keys());
  console.log(`Found ${allLinks.length} total links, ${uniqueUrls.length} unique URLs.`);

  // Cluster by pattern
  const clusters = new Map();
  uniqueUrls.forEach((url) => {
    const pattern = getUrlPattern(url);
    if (!clusters.has(pattern)) {
      clusters.set(pattern, []);
    }
    clusters.get(pattern).push(url);
  });

  console.log(`Clustered into ${clusters.size} patterns.`);

  const urlsToCheck = new Set();
  let skippedCount = 0;

  clusters.forEach((group) => {
    if (group.length <= 5) {
      group.forEach((u) => urlsToCheck.add(u));
    } else {
      group.sort();
      const toAdd = [group[0], group[group.length - 1]];
      const middle = group.slice(1, group.length - 1);
      for (let i = 0; i < 3 && middle.length > 0; i++) {
        const idx = Math.floor(Math.random() * middle.length);
        toAdd.push(middle[idx]);
        middle.splice(idx, 1);
      }

      toAdd.forEach((u) => urlsToCheck.add(u));
      skippedCount += group.length - toAdd.length;
    }
  });

  const checkList = Array.from(urlsToCheck);
  // Randomize check order to avoid hammering single domains
  for (let i = checkList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [checkList[i], checkList[j]] = [checkList[j], checkList[i]];
  }

  console.log(`Checking ${checkList.length} URLs (Skipped ${skippedCount} items).`);

  let checked = 0;
  const broken = [];

  for (let i = 0; i < checkList.length; i += CONCURRENCY) {
    const chunk = checkList.slice(i, i + CONCURRENCY);
    const promises = chunk.map((url) => verifyUrlStatus(url).then((res) => ({ url, res })));

    process.stdout.write(`\rProgress: ${checked}/${checkList.length}`);

    const results = await Promise.all(promises);
    results.forEach(({ url, res }) => {
      checked++;
      if (!res.ok) {
        broken.push({ url, res });
        process.stdout.write(`\n${RED}✖ ${url} (${res.status || res.error})${RESET}\n`);
      }
    });
  }

  console.log(`\n\n${BLUE}--- REPORT ---${RESET}`);
  if (broken.length === 0) {
    console.log(`${GREEN}✅ All checked links are valid!${RESET}`);
  } else {
    console.log(`${RED}Found ${broken.length} broken links:${RESET}`);
    broken.forEach(({ url, res }) => {
      console.log(`\n${YELLOW}${url}${RESET}`);
      console.log(`  Status: ${res.status || res.error}`);
      if (res.chain && res.chain.length > 0) {
        console.log(`  Chain:`);
        res.chain.forEach((step) => {
          console.log(`    ${GRAY}↳ ${step.status} -> ${step.dest}${RESET}`);
        });
      }
      console.log(`  Found in:`);
      const sources = urlToSources.get(url);
      sources.slice(0, 5).forEach((s) => {
        // Pretty print source with line and text
        console.log(`    - ${GRAY}${s.source}:${s.line}${RESET} [${MAGENTA}"${s.text}"${RESET}]`);
      });
      if (sources.length > 5) console.log(`    ... and ${sources.length - 5} more`);
    });

    console.log(`\n${GRAY}See tests/LINK_CHECKING_GUIDE.md for fixing instructions.${RESET}`);
    process.exit(1);
  }
}

run();
