#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Image inspection script for mtbo-sajten.
 * Inspects dimensions, aspect ratio, file format, and file size.
 *
 * Usage:
 *   node scripts/analyze-images.mjs <file1> <file2> ...
 *   node scripts/analyze-images.mjs path/to/images/*.jpg
 */

async function analyzeImages(files) {
  if (files.length === 0) {
    console.error('Usage: node scripts/analyze-images.mjs <image_files...>');
    process.exit(1);
  }

  console.log('\n--- Image Analysis Report ---');
  console.log(
    'File'.padEnd(25) + 'Dimensions'.padEnd(14) + 'Ratio'.padEnd(10) + 'Format'.padEnd(8) + 'Size'.padEnd(10)
  );
  console.log('-'.repeat(67));

  for (const filePath of files) {
    try {
      const stats = fs.statSync(filePath);
      const metadata = await sharp(filePath).metadata();
      const filename = path.basename(filePath);
      const dimensions = `${metadata.width}x${metadata.height}`;
      const ratio = (metadata.width / metadata.height).toFixed(2);
      const format = metadata.format || 'unknown';
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

      console.log(
        filename.padEnd(25) + dimensions.padEnd(14) + ratio.padEnd(10) + format.padEnd(8) + sizeMB.padEnd(10)
      );
    } catch (err) {
      console.error(`Error reading ${filePath}: ${err.message}`);
    }
  }
  console.log('-'.repeat(67) + '\n');
}

const args = process.argv.slice(2);
analyzeImages(args);
