#!/usr/bin/env node
/**
 * Import MTBO event data from the mtbo-scraper repository.
 *
 * Usage:
 *   node scripts/import-events.mjs [--scraper-path /path/to/mtbo-scraper]
 *
 * If --scraper-path is not provided, the scraper repo is cloned from GitHub
 * into a temporary directory.
 *
 * Copies:
 *   - data/events/mtbo_events.json → src/data/events/mtbo_events.json
 *   - data/events/{year}/events.json → src/data/events/{year}/events.json
 *
 * Only years >= MIN_YEAR are imported.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'events');
const SCRAPER_REPO = 'https://github.com/blaudden/mtbo-scraper.git';
const MIN_YEAR = 2022;

function parseArgs() {
  const args = process.argv.slice(2);
  let scraperPath = null;
  let shouldCommit = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scraper-path' && args[i + 1]) {
      scraperPath = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--commit') {
      shouldCommit = true;
    }
  }
  return { scraperPath, shouldCommit };
}

function cloneScraper() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtbo-scraper-'));
  console.log(`Cloning mtbo-scraper into ${tmpDir}...`);
  execSync(`git clone --depth 1 ${SCRAPER_REPO} ${tmpDir}`, { stdio: 'inherit' });
  return tmpDir;
}

function importData(scraperRoot) {
  const srcEventsDir = path.join(scraperRoot, 'data', 'events');

  // Validate source exists
  if (!fs.existsSync(srcEventsDir)) {
    console.error(`ERROR: Source directory not found: ${srcEventsDir}`);
    process.exit(1);
  }

  // Read and validate umbrella index
  const indexPath = path.join(srcEventsDir, 'mtbo_events.json');
  if (!fs.existsSync(indexPath)) {
    console.error(`ERROR: Umbrella index not found: ${indexPath}`);
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  if (index.schema_version !== '2.0') {
    console.error(`ERROR: Unexpected schema version: ${index.schema_version}`);
    process.exit(1);
  }

  // Ensure destination directory exists
  fs.mkdirSync(DEST_DIR, { recursive: true });

  // Copy umbrella index
  const destIndex = path.join(DEST_DIR, 'mtbo_events.json');
  fs.copyFileSync(indexPath, destIndex);
  console.log(`✓ Copied mtbo_events.json`);

  // Copy year partitions
  const years = Object.keys(index.partitions)
    .map(Number)
    .filter((y) => y >= MIN_YEAR)
    .sort();

  let totalEvents = 0;
  for (const year of years) {
    const srcFile = path.join(srcEventsDir, String(year), 'events.json');
    if (!fs.existsSync(srcFile)) {
      console.warn(`⚠ Partition file missing for ${year}, skipping`);
      continue;
    }

    // Validate JSON
    const data = JSON.parse(fs.readFileSync(srcFile, 'utf-8'));
    if (!data.events || !Array.isArray(data.events)) {
      console.warn(`⚠ Invalid partition data for ${year}, skipping`);
      continue;
    }

    const destYearDir = path.join(DEST_DIR, String(year));
    fs.mkdirSync(destYearDir, { recursive: true });

    const destFile = path.join(destYearDir, 'events.json');
    fs.copyFileSync(srcFile, destFile);
    totalEvents += data.events.length;
    console.log(`✓ Copied ${year}/events.json (${data.events.length} events)`);
  }

  console.log(`\nDone! Imported ${years.length} years, ${totalEvents} total events.`);
  console.log(`Destination: ${DEST_DIR}`);
}

// Main
const { scraperPath, shouldCommit } = parseArgs();
let scraperRoot;
let shouldCleanup = false;

if (scraperPath) {
  scraperRoot = scraperPath;
  console.log(`Using local scraper path: ${scraperRoot}`);
} else {
  scraperRoot = cloneScraper();
  shouldCleanup = true;
}

try {
  importData(scraperRoot);

  if (shouldCommit) {
    console.log('\nCommitting changes...');
    try {
      execSync(`git add ${DEST_DIR}`, { stdio: 'inherit' });
      execSync('git commit -m "chore: import events from scraper"', { stdio: 'inherit' });
      console.log('✓ Committed changes');
    } catch {
      console.warn('⚠ Failed to commit changes (possibly no changes or git not configured)');
    }
  }
} finally {
  if (shouldCleanup) {
    console.log(`Cleaning up temp directory...`);
    fs.rmSync(scraperRoot, { recursive: true, force: true });
  }
}
