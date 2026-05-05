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

import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'events');
const OG_DEST_DIR = path.join(PROJECT_ROOT, 'public', 'og-images', 'events');
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'src', 'assets', 'images', 'event_og_template.png');
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

async function importData(scraperRoot) {
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
    fs.mkdirSync(OG_DEST_DIR, { recursive: true });

    const destFile = path.join(destYearDir, 'events.json');
    fs.copyFileSync(srcFile, destFile);
    totalEvents += data.events.length;

    // Generate OG images
    for (const event of data.events) {
      const slug = event.id.toLowerCase().replace(/_/g, '-');
      const ogPath = path.join(OG_DEST_DIR, `${slug}.jpg`);

      if (!fs.existsSync(ogPath)) {
        try {
          const organiser = event.organisers && event.organisers.length > 0 ? event.organisers[0].name : '';

          // Escape HTML characters for SVG
          const escapeHtml = (unsafe) =>
            (unsafe || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

          // Intelligent word wrap: looks back for a comma if line exceeds maxChars
          const wrapText = (text, maxChars) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            words.forEach((word) => {
              if ((currentLine + word).length > maxChars) {
                const lastCommaIndex = currentLine.lastIndexOf(',');
                // If there's a comma to break at, and it's not the very end of the line
                if (lastCommaIndex !== -1 && lastCommaIndex !== currentLine.length - 1) {
                  const breakPoint = lastCommaIndex + 1;
                  const lineToKeep = currentLine.slice(0, breakPoint).trim();
                  const leftover = currentLine.slice(breakPoint).trim();

                  lines.push(lineToKeep);
                  currentLine = leftover ? leftover + ' ' + word + ' ' : word + ' ';
                } else {
                  if (currentLine) lines.push(currentLine.trim());
                  currentLine = word + ' ';
                }
              } else {
                currentLine += word + ' ';
              }
            });
            if (currentLine) lines.push(currentLine.trim());
            return lines;
          };

          const nameLines = wrapText(event.name, 32);
          const subtitleStr = `${event.start_time}${organiser ? ' - ' + organiser : ''}`;
          const subtitleLines = wrapText(subtitleStr, 50);

          // 1/3 of 720 is 240. Font baseline is ~50px below the top of the text.
          const startY = 240 + 50;

          const titleTspans = nameLines
            .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 75}">${escapeHtml(line)}</tspan>`)
            .join('');

          const subTspans = subtitleLines
            .map((line, i) => `<tspan x="80" dy="${i === 0 ? 80 : 50}">${escapeHtml(line)}</tspan>`)
            .join('');

          const svgText = `
            <svg width="1280" height="720">
              <style>
                .title { fill: #ffffff; font-size: 64px; font-family: sans-serif; font-weight: bold; text-anchor: start; }
                .subtitle { fill: #e2e8f0; font-size: 40px; font-family: sans-serif; text-anchor: start; }
              </style>
              <text x="80" y="${startY}" class="title">${titleTspans}</text>
              <text x="80" y="${startY + (nameLines.length - 1) * 75}" class="subtitle">${subTspans}</text>
            </svg>
          `;

          await sharp(TEMPLATE_PATH)
            .composite([{ input: Buffer.from(svgText) }])
            .jpeg({ quality: 80 })
            .toFile(ogPath);
        } catch (err) {
          console.error(`  ⚠ Failed to create OG image for ${slug}:`, err.message);
        }
      }
    }

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
  await importData(scraperRoot);

  if (shouldCommit) {
    console.log('\nCommitting changes...');
    try {
      execFileSync('git', ['add', DEST_DIR], { stdio: 'inherit' });
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
