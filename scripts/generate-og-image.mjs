#!/usr/bin/env node
/**
 * Generate an Open Graph / Hero image for a page by compositing text onto a background template image.
 * Text is placed within a bounding box covering the top 2/3 of the image, with left, right, and top margins.
 *
 * Usage:
 *   node scripts/generate-og-image.mjs --title "Seedningsordning Svenska Cupen MTBO 2026" --subtitle "Aktuell seedning för Svenska Cupen MTBO" --tagline "Svenska Cupen MTBO" --slug "svenska-cupen-seedning"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_TEMPLATE_PATH = path.join(PROJECT_ROOT, 'src', 'assets', 'images', 'generic-hero-template.png');

function parseArgs() {
  const args = process.argv.slice(2);
  let title = '';
  let subtitle = '';
  let tagline = '';
  let slug = '';
  let templatePath = DEFAULT_TEMPLATE_PATH;
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--subtitle' && args[i + 1]) {
      subtitle = args[i + 1];
      i++;
    } else if (args[i] === '--tagline' && args[i + 1]) {
      tagline = args[i + 1];
      i++;
    } else if (args[i] === '--slug' && args[i + 1]) {
      slug = args[i + 1];
      i++;
    } else if (args[i] === '--template' && args[i + 1]) {
      templatePath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }

  if (!title) {
    console.error('ERROR: Missing required --title argument.');
    console.error('Usage:');
    console.error(
      '  node scripts/generate-og-image.mjs --title "Title" [--subtitle "Sub"] [--tagline "Tag"] --slug "slug"'
    );
    process.exit(1);
  }

  if (!slug && !outputPath) {
    console.error('ERROR: Missing --slug or --output argument.');
    process.exit(1);
  }

  if (!outputPath) {
    outputPath = path.join(PROJECT_ROOT, 'src', 'assets', 'images', 'og', `${slug}.png`);
  }

  return { title, subtitle, tagline, templatePath, outputPath };
}

const escapeHtml = (str) =>
  (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrapText(str, maxChars) {
  if (!str) return [];
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
}

async function main() {
  const { title, subtitle, tagline, templatePath, outputPath } = parseArgs();

  if (!fs.existsSync(templatePath)) {
    console.error(`ERROR: Template file not found at ${templatePath}`);
    process.exit(1);
  }

  const metadata = await sharp(templatePath).metadata();
  const canvasWidth = metadata.width || 1280;
  const canvasHeight = metadata.height || 720;

  // Bounding box configuration:
  // Top margin: ~60px
  // Left/Right margin: ~80px
  // Height constraint: Top 2/3 of the image canvas (y from 60px to canvasHeight * 0.67)
  const marginLeft = 80;
  const marginTop = 60;

  // Determine line wrapping limits based on title length
  const maxTitleCharsPerLine = title.length > 35 ? 26 : 22;
  const titleLines = wrapText(title, maxTitleCharsPerLine);
  const subtitleLines = wrapText(subtitle, 42);

  // Dynamic font scaling to ensure all wrapped lines fit inside the top 2/3 bounding box
  const titleFontSize = titleLines.length > 2 ? 64 : titleLines.length > 1 ? 76 : 84;
  const titleLineHeight = titleFontSize * 1.15;
  const subtitleFontSize = 36;
  const subtitleLineHeight = subtitleFontSize * 1.25;
  const taglineFontSize = 28;

  let currentY = marginTop + 40;

  let taglineSvg = '';
  if (tagline) {
    taglineSvg = `<text x="${marginLeft}" y="${currentY}" class="tagline">${escapeHtml(tagline.toUpperCase())}</text>`;
    currentY += 45;
  }

  const titleTspans = titleLines
    .map((line, i) => `<tspan x="${marginLeft}" dy="${i === 0 ? 0 : titleLineHeight}">${escapeHtml(line)}</tspan>`)
    .join('');
  const titleSvg = `<text x="${marginLeft}" y="${currentY + titleFontSize * 0.8}" class="title">${titleTspans}</text>`;

  currentY += titleLines.length * titleLineHeight + 20;

  let subtitleSvg = '';
  if (subtitleLines.length > 0) {
    const subtitleTspans = subtitleLines
      .map((line, i) => `<tspan x="${marginLeft}" dy="${i === 0 ? 0 : subtitleLineHeight}">${escapeHtml(line)}</tspan>`)
      .join('');
    subtitleSvg = `<text x="${marginLeft}" y="${currentY + subtitleFontSize * 0.8}" class="subtitle">${subtitleTspans}</text>`;
  }

  const svgOverlay = `
    <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.75"/>
        </filter>
      </defs>
      <style>
        .tagline {
          fill: #007cdc;
          font-size: ${taglineFontSize}px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-weight: bold;
          letter-spacing: 2px;
          filter: url(#drop-shadow);
        }
        .title {
          fill: #005ea6;
          stroke: #ffffff;
          stroke-width: 10px;
          paint-order: stroke fill;
          font-size: ${titleFontSize}px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-style: italic;
          font-weight: bold;
          filter: url(#drop-shadow);
        }
        .subtitle {
          fill: #005ea6;
          stroke: #ffffff;
          stroke-width: 6px;
          paint-order: stroke fill;
          font-size: ${subtitleFontSize}px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-weight: normal;
          filter: url(#drop-shadow);
        }
      </style>
      ${taglineSvg}
      ${titleSvg}
      ${subtitleSvg}
    </svg>
  `;

  const destDir = path.dirname(outputPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  console.log(`Generating OG image for "${title}" -> ${outputPath}...`);

  await sharp(templatePath)
    .composite([{ input: Buffer.from(svgOverlay) }])
    .png()
    .toFile(outputPath);

  console.log(`✓ OG image successfully created at: ${outputPath}`);
}

main().catch((err) => {
  console.error('ERROR generating OG image:', err);
  process.exit(1);
});
