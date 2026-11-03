#!/usr/bin/env node
/**
 * Resize/crop a background photo to 1280x720 (16:9) and stamp the official
 * 180x180 sharp-cornered MTBO site logo onto the corner.
 *
 * Usage:
 *   npm run stamp:hero -- --input path/to/photo.jpg --output src/assets/images/posts/<slug>/image.png [--corner bottom-right|bottom-left]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOGO_PATH = path.join(PROJECT_ROOT, 'src', 'assets', 'images', 'site-logo.jpg');

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const LOGO_SIZE = 180;
const MARGIN_X = 68;
const MARGIN_BOTTOM = 40;

function parseArgs() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';
  let corner = 'bottom-right';
  let position = 'centre';

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--input' || args[i] === '-i') && args[i + 1]) {
      inputPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === '--corner' && args[i + 1]) {
      corner = args[i + 1];
      i++;
    } else if (args[i] === '--position' && args[i + 1]) {
      position = args[i + 1];
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run stamp:hero -- --input <photo> --output <dest> [--corner bottom-right|bottom-left]');
    process.exit(1);
  }

  return { inputPath, outputPath, corner, position };
}

async function main() {
  const { inputPath, outputPath, corner, position } = parseArgs();

  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: Input image not found: ${inputPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(LOGO_PATH)) {
    console.error(`ERROR: Logo file not found: ${LOGO_PATH}`);
    process.exit(1);
  }

  const logoBuffer = await sharp(LOGO_PATH).resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover' }).toBuffer();

  const left = corner === 'bottom-left' ? MARGIN_X : CANVAS_WIDTH - LOGO_SIZE - MARGIN_X;
  const top = CANVAS_HEIGHT - LOGO_SIZE - MARGIN_BOTTOM;

  const destDir = path.dirname(outputPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  let pipeline = sharp(inputPath)
    .rotate()
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: 'cover', position })
    .composite([{ input: logoBuffer, left, top }]);

  if (outputPath.toLowerCase().endsWith('.png')) {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  }

  await pipeline.toFile(outputPath);
  console.log(`✓ Created 1280x720 hero image with logo (${corner}) at: ${outputPath}`);
}

main().catch((err) => {
  console.error('ERROR creating hero image:', err);
  process.exit(1);
});
