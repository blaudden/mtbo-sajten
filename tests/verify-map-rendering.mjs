import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CONTENT_DIR = './src/content/posts';
const COMPONENTS_DIR = './src/components';

function getAllFiles(dir, extensions, fileList = []) {
  if (!readdirSync(dir)) return fileList;
  const files = readdirSync(dir);
  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, extensions, fileList);
    } else {
      if (extensions.some((ext) => filePath.endsWith(ext))) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

function verifyMapUsageInContent() {
  console.log('Scanning content files for LeafletMap usage...');
  const postFiles = getAllFiles(CONTENT_DIR, ['.mdoc', '.md', '.mdx']);
  let mapsFound = 0;
  let failed = false;

  postFiles.forEach((file) => {
    const content = readFileSync(file, 'utf-8');
    const matches = content.match(/{%\s*LeafletMap[\s\S]*?%}/g);
    if (matches) {
      matches.forEach((match) => {
        mapsFound++;
        // Verify required props or attributes exist in Markdoc tag
        const hasMarkers = match.includes('markers=') || match.includes('lat=') || match.includes('markers');
        const hasHeight = match.includes('height=');
        if (!hasMarkers && !hasHeight) {
          console.error(`❌ [FAIL] ${file}: LeafletMap tag missing expected properties.`);
          failed = true;
        }
      });
    }
  });

  console.log(`Found ${mapsFound} LeafletMap tag instances across post files.`);
  if (failed) {
    process.exit(1);
  }
}

function verifyEventMapComponent() {
  console.log('Verifying EventMap component integration...');
  const eventMapFile = join(COMPONENTS_DIR, 'events/EventMap.astro');
  const content = readFileSync(eventMapFile, 'utf-8');

  if (!content.includes('LeafletMap')) {
    console.error('❌ [FAIL] EventMap.astro does not import or render LeafletMap component.');
    process.exit(1);
  }
  console.log('✓ EventMap component imports LeafletMap.');
}

function main() {
  console.log('=== Map Rendering Verification Test ===');
  verifyMapUsageInContent();
  verifyEventMapComponent();
  console.log('SUCCESS: Map rendering verification completed successfully.');
}

main();
