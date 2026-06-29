#!/usr/bin/env node
/**
 * Generate a hero image for a WMTBOC 2026 post by drawing text on the template background.
 *
 * Usage:
 *   node scripts/generate-wmtboc26-hero.mjs --text "Training info" --slug wmtboc26-training-info
 *   or:
 *   node scripts/generate-wmtboc26-hero.mjs "Training info" wmtboc26-training-info
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'src', 'assets', 'images', 'hero-template.png');

function parseArgs() {
  const args = process.argv.slice(2);
  let text = '';
  let slug = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' && args[i + 1]) {
      text = args[i + 1];
      i++;
    } else if (args[i] === '--slug' && args[i + 1]) {
      slug = args[i + 1];
      i++;
    }
  }

  // Fallback to positional arguments
  if (!text || !slug) {
    if (args[0] && args[1]) {
      text = args[0];
      slug = args[1];
    } else {
      console.error('ERROR: Missing required arguments.');
      console.error('Usage:');
      console.error('  node scripts/generate-wmtboc26-hero.mjs --text "Training info" --slug wmtboc26-training-info');
      process.exit(1);
    }
  }

  return { text, slug };
}

async function main() {
  const { text, slug } = parseArgs();

  const outputPath = path.join(PROJECT_ROOT, 'src', 'assets', 'images', 'posts', slug, 'image.png');

  // Verify template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`ERROR: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  console.log(`Generating styled hero image for: "${text}" (slug: ${slug})...`);

  // Escape HTML characters for SVG
  const escapeHtml = (unsafe) => (unsafe || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Simple wrap text logic for title
  const wrapText = (str, maxChars) => {
    const words = str.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      if ((currentLine + word).length > maxChars) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  };

  const nameLines = wrapText(text, 24);

  // Position: Centered horizontally at x=640 (out of 1280)
  // Adjusted baseline for larger, condensed font size
  const startY = nameLines.length > 1 ? 220 : 280;

  // Use x="640" for middle alignment
  const titleTspans = nameLines
    .map((line, i) => `<tspan x="640" dy="${i === 0 ? 0 : 100}">${escapeHtml(line)}</tspan>`)
    .join('');

  const svgText = `
    <svg width="1280" height="720">
      <defs>
        <!-- Drop shadow filter for text depth -->
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <style>
        .title {
          fill: #005ea6;
          stroke: #ffffff;
          stroke-width: 12px;
          paint-order: stroke fill;
          font-size: 100px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-style: italic;
          font-weight: bold;
          text-anchor: middle;
          filter: url(#shadow);
        }
      </style>
      <text x="640" y="${startY}" class="title">${titleTspans}</text>
    </svg>
  `;

  try {
    // Ensure destination directory exists
    const destDir = path.dirname(outputPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    await sharp(TEMPLATE_PATH)
      .composite([{ input: Buffer.from(svgText) }])
      .png()
      .toFile(outputPath);

    console.log(`✓ Hero image successfully generated at: ${outputPath}`);
  } catch (error) {
    console.error(`ERROR: Failed to generate image:`, error.message);
    process.exit(1);
  }
}

main();
