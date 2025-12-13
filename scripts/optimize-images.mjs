
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { glob } from 'glob';

const MAX_SIZE_MB = 2; // Threshold in MB
const MAX_WIDTH = 2500; // Max width in pixels
const JPEG_QUALITY = 85;
const PNG_QUALITY = 85;
const WEBP_QUALITY = 85;

const TARGET_DIRS = ['src/**/*.{jpg,jpeg,png,webp}', 'public/**/*.{jpg,jpeg,png,webp}'];

async function getFileSizeInMB(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size / (1024 * 1024);
}

async function optimizeImage(filePath) {
  try {
    const sizeMB = await getFileSizeInMB(filePath);
    if (sizeMB < MAX_SIZE_MB) {
      return false; // Skip if small enough
    }

    console.log(`Optimizing: ${filePath} (${sizeMB.toFixed(2)} MB)`);

    const image = sharp(filePath);
    const metadata = await image.metadata();

    let pipeline = image;

    // Resize if too wide
    if (metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH });
    }

    // Compress based on format
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY });
    } else if (metadata.format === 'png') {
      pipeline = pipeline.png({ quality: PNG_QUALITY });
    } else if (metadata.format === 'webp') {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
    }

    const buffer = await pipeline.toBuffer();
    await fs.writeFile(filePath, buffer);

    const newSizeMB = await getFileSizeInMB(filePath);
    console.log(`Optimized: ${filePath} -> ${newSizeMB.toFixed(2)} MB`);
    return true;

  } catch (error) {
    console.error(`Error optimizing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('Starting image optimization check...');
  let processedCount = 0;

  for (const pattern of TARGET_DIRS) {
    const files = await glob(pattern);
    for (const file of files) {
      const changed = await optimizeImage(file);
      if (changed) processedCount++;
    }
  }

  if (processedCount === 0) {
    console.log('No images required optimization.');
  } else {
    console.log(`Successfully optimized ${processedCount} images.`);
  }
}

main().catch(console.error);
