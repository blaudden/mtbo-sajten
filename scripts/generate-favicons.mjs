
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import pngToIco from 'png-to-ico';

const SOURCE_IMAGE = 'public/small_logo.svg';
const PUBLIC_DIR = 'public';

const CONFIG = [
  { name: 'favicon-16x16.png', width: 16, height: 16 },
  { name: 'favicon-32x32.png', width: 32, height: 32 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'android-chrome-192x192.png', width: 192, height: 192 },
  { name: 'android-chrome-512x512.png', width: 512, height: 512 },
  { name: 'mstile-150x150.png', width: 150, height: 150 },
];

async function generateFavicons() {
  console.log(`Generating favicons from ${SOURCE_IMAGE}...`);

  try {
    const svgBuffer = await fs.readFile(SOURCE_IMAGE);

    // Generate PNGs
    for (const conf of CONFIG) {
      await sharp(svgBuffer)
        .resize(conf.width, conf.height)
        .toFormat('png')
        .toFile(path.join(PUBLIC_DIR, conf.name));
      console.log(`Created ${conf.name}`);
    }

    // Generate favicon.ico with multiple sizes for best compatibility
    console.log('Generating multi-size favicon.ico...');
    
    // Create temporary buffers for the ICO sizes
    const size16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
    const size32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
    const size48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer(); // Common icon size
    
    const icoBuffer = await pngToIco([size16, size32, size48]);
    await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
    console.log('Created valid favicon.ico with 16, 32, and 48px sizes');

  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
