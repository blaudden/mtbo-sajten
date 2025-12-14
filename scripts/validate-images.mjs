
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

const TARGET_RATIO = 1280 / 720; // ~1.78 (16:9)
const TOLERANCE = 0.1; // 10% tolerance
const MAX_AGE_MONTHS = 6;

async function validateImages() {
  console.log('Validating blog post hero images...');
  
  // Find all image.{png,jpg,webp,jpeg} files in the posts directory
  const images = await glob('src/assets/images/posts/**/image.{png,jpg,jpeg,webp}');
  
  if (images.length === 0) {
    console.log('No images found to validate.');
    return;
  }

  let warningsCount = 0;
  const now = new Date();

  for (const imgPath of images) {
    try {
      const fullPath = path.resolve(process.cwd(), imgPath);
      const metadata = await sharp(fullPath).metadata();
      
      const { width, height } = metadata;
      if (!width || !height) {
        console.warn(`Could not read dimensions for ${imgPath}`);
        continue;
      }

      const ratio = width / height;
      const difference = Math.abs(ratio - TARGET_RATIO);
      const percentDiff = difference / TARGET_RATIO;

      if (percentDiff > TOLERANCE) {
        // Check file age via git
        let isOld = false;
        try {
          // Get the date of the last commit for this file
          const stdout = execSync(`git log -1 --format=%cd --date=iso "${imgPath}"`, { encoding: 'utf8' }).trim();
          if (stdout) {
            const commitDate = new Date(stdout);
            const monthsDiff = (now.getFullYear() - commitDate.getFullYear()) * 12 + (now.getMonth() - commitDate.getMonth());
            if (monthsDiff > MAX_AGE_MONTHS) {
              isOld = true;
            }
          }
        } catch (e) {
            // If git check fails (e.g. file untracked), assume it's new
            // console.warn('Git check failed for', imgPath); 
        }

        if (isOld) {
          console.info(`ℹ️  Info: ${imgPath} (Old file, > 6 months)`);
          console.info(`    Dimensions: ${width}x${height} (Ratio: ${ratio.toFixed(2)})`);
          console.info(`    Expected Ratio: ~${TARGET_RATIO.toFixed(2)} (1280x720)`);
        } else {
          warningsCount++;
          console.warn(`⚠️  Warning: ${imgPath}`);
          console.warn(`    Dimensions: ${width}x${height} (Ratio: ${ratio.toFixed(2)})`);
          console.warn(`    Expected Ratio: ~${TARGET_RATIO.toFixed(2)} (1280x720)`);
          console.warn(`    Difference: ${(percentDiff * 100).toFixed(1)}%`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${imgPath}:`, error.message);
    }
  }

  if (warningsCount > 0) {
    console.log(`\n❌ Found ${warningsCount} new images that deviate significantly from the recommended aspect ratio (16:9).`);
    // process.exit(1); 
  } else {
    console.log(`\n✅ Checked ${images.length} images. All look good!`);
  }
}

validateImages().catch(console.error);
