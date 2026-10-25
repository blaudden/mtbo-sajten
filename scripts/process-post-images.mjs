#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { glob } from 'glob';

/**
 * Generic image processing tool for blog posts and site media.
 * Reads crop manifests (crops.json) and generates cropped, resized,
 * and optimized images for web publication.
 *
 * Usage:
 *   node scripts/process-post-images.mjs [path/to/crops.json...] [--source-dir <dir>]
 *   npm run process-images (processes all crops.json found in src/assets/images/posts/)
 */

function printHelp() {
  console.log(`
Usage:
  node scripts/process-post-images.mjs [manifests...] [options]
  npm run process-images

Options:
  --source-dir, -s <dir>   Directory containing source images (default: checks manifest dir, current dir, parent dir)
  --help, -h               Show this help message

Manifest format (crops.json):
  {
    "sourceDir": "optional/relative/or/absolute/path",
    "crops": [
      {
        "source": "raw_image.jpg",
        "output": "processed.jpg",
        "description": "Optional label",
        "crop": { "left": 100, "top": 100, "width": 1920, "height": 1080 },
        "resize": { "width": 1920, "height": 1080 },
        "quality": 82
      }
    ]
  }
`);
}

function resolveSourceFile(source, candidateDirs, manifestDir) {
  if (path.isAbsolute(source)) {
    return fs.existsSync(source) ? source : null;
  }

  // Check explicit candidate directories first
  for (const dir of candidateDirs) {
    if (!dir) continue;
    const resolved = path.resolve(dir, source);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  // Check walking up from manifest directory
  let cur = manifestDir;
  for (let i = 0; i < 5; i++) {
    const candidate = path.resolve(cur, source);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  // Check walking up from current working directory
  cur = process.cwd();
  for (let i = 0; i < 3; i++) {
    const candidate = path.resolve(cur, source);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  return null;
}

async function processManifest(manifestPath, cliSourceDir) {
  const manifestDir = path.dirname(path.resolve(manifestPath));
  console.log(`\nProcessing manifest: ${manifestPath}`);

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${manifestPath}:`, err.message);
    return;
  }

  const { sourceDir: manifestSourceDir, crops = [] } = manifest;

  // Search candidates for relative source images:
  // 1. Explicit CLI argument (--source-dir)
  // 2. Environment variable (SOURCE_DIR)
  // 3. Manifest sourceDir (relative to manifestDir or absolute)
  // 4. Manifest directory itself
  // 5. Current working directory
  // 6. Parent directory (e.g. root workspace)
  const candidateDirs = [
    cliSourceDir,
    process.env.SOURCE_DIR,
    manifestSourceDir
      ? path.isAbsolute(manifestSourceDir)
        ? manifestSourceDir
        : path.resolve(manifestDir, manifestSourceDir)
      : null,
    manifestDir,
    process.cwd(),
    path.resolve(process.cwd(), '..'),
  ].filter(Boolean);

  for (const item of crops) {
    const { source, output, crop, resize, quality = 82, description = output } = item;

    const resolvedSource = resolveSourceFile(source, candidateDirs, manifestDir);
    const resolvedOutput = path.isAbsolute(output) ? output : path.resolve(manifestDir, output);

    if (!resolvedSource) {
      console.warn(`  [Warning] Source image not found for "${source}" across search paths.`);
      continue;
    }

    try {
      let pipeline = sharp(resolvedSource);

      if (crop) {
        pipeline = pipeline.extract({
          left: Math.round(crop.left),
          top: Math.round(crop.top),
          width: Math.round(crop.width),
          height: Math.round(crop.height),
        });
      }

      if (resize) {
        pipeline = pipeline.resize(Math.round(resize.width), Math.round(resize.height));
      }

      // Format selection from output extension
      const ext = path.extname(resolvedOutput).toLowerCase();
      if (ext === '.webp') {
        pipeline = pipeline.webp({ quality });
      } else if (ext === '.png') {
        pipeline = pipeline.png({ quality });
      } else {
        pipeline = pipeline.jpeg({ quality, progressive: true });
      }

      // Ensure target directory exists
      const targetDir = path.dirname(resolvedOutput);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      await pipeline.toFile(resolvedOutput);

      const stats = fs.statSync(resolvedOutput);
      const sizeKB = (stats.size / 1024).toFixed(1);
      const outMeta = await sharp(resolvedOutput).metadata();

      console.log(
        `  ✓ ${path.basename(resolvedOutput)} (${outMeta.width}x${outMeta.height}, ${sizeKB} KB) - ${description}`
      );
    } catch (err) {
      console.error(`  [Error] Failed to process ${source} -> ${output}:`, err.message);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let cliSourceDir = null;
  const manifestPaths = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      return;
    } else if (arg === '--source-dir' || arg === '-s') {
      cliSourceDir = args[i + 1];
      i++;
    } else if (arg.startsWith('--source-dir=')) {
      cliSourceDir = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      manifestPaths.push(arg);
    }
  }

  if (manifestPaths.length > 0) {
    for (const manifestPath of manifestPaths) {
      await processManifest(manifestPath, cliSourceDir);
    }
  } else {
    const manifests = await glob('src/assets/images/posts/**/crops.json');
    if (manifests.length === 0) {
      console.log('No crops.json manifests found in src/assets/images/posts/');
      return;
    }
    for (const manifestPath of manifests) {
      await processManifest(manifestPath, cliSourceDir);
    }
  }

  console.log('\nAll image processing completed.\n');
}

main().catch((err) => {
  console.error('Fatal error in process-post-images:', err);
  process.exit(1);
});
