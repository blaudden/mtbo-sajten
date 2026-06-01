import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist/events';

function getAllHtmlFiles(dir, fileList = []) {
  try {
    const files = readdirSync(dir);
    files.forEach((file) => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        getAllHtmlFiles(filePath, fileList);
      } else {
        if (filePath.endsWith('.html')) {
          fileList.push(filePath);
        }
      }
    });
  } catch {
    // If directory doesn't exist, we will handle it gracefully in caller
  }
  return fileList;
}

function verifyJsonLd() {
  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  if (htmlFiles.length === 0) {
    console.log(`⚠️  No built HTML files found in ${DIST_DIR}. Make sure to run 'npm run build' first.`);
    // Don't fail the build if we haven't built yet
    return;
  }

  let failed = false;
  let checked = 0;

  console.log(`Scanning ${htmlFiles.length} event pages in ${DIST_DIR} for JSON-LD schema validity...`);

  htmlFiles.forEach((file) => {
    // Skip general calendar list and year-based index pages
    const normalizedPath = file.replace(/\\/g, '/');
    if (normalizedPath.endsWith('/events/index.html') || normalizedPath.match(/\/events\/\d{4}\/index\.html$/)) {
      return;
    }

    const content = readFileSync(file, 'utf-8');
    const scriptRegex = /<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    let match;
    let sportsEventFound = false;

    while ((match = scriptRegex.exec(content)) !== null) {
      const jsonText = match[1].trim();
      if (jsonText.includes('"SportsEvent"')) {
        sportsEventFound = true;
        checked++;
        try {
          const json = JSON.parse(jsonText);

          // 1. Basic properties
          if (json['@context'] !== 'https://schema.org') {
            console.error(`❌ [FAIL] ${file}: @context is not https://schema.org`);
            failed = true;
          }
          if (json['@type'] !== 'SportsEvent') {
            console.error(`❌ [FAIL] ${file}: @type is not SportsEvent`);
            failed = true;
          }

          // 2. Canonical and external URLs
          if (!json.url || !json.url.startsWith('https://www.mountainbikeorientering.se/events/')) {
            console.error(`❌ [FAIL] ${file}: canonical url is missing or incorrect: ${json.url}`);
            failed = true;
          }
          if (!json.sameAs || (!json.sameAs.startsWith('https://') && !json.sameAs.startsWith('http://'))) {
            console.error(`❌ [FAIL] ${file}: sameAs is missing or incorrect: ${json.sameAs}`);
            failed = true;
          }

          // 3. Offers
          if (!json.offers || json.offers['@type'] !== 'Offer') {
            console.error(`❌ [FAIL] ${file}: offers is missing or not of type Offer`);
            failed = true;
          } else {
            if (
              !json.offers.url ||
              (!json.offers.url.startsWith('https://') && !json.offers.url.startsWith('http://'))
            ) {
              console.error(`❌ [FAIL] ${file}: offers.url is missing or incorrect`);
              failed = true;
            }
            if (json.offers.availability !== 'https://schema.org/InStock') {
              console.error(`❌ [FAIL] ${file}: offers.availability is not InStock`);
              failed = true;
            }
          }

          // 4. Required Search Console Fields
          if (!json.name) {
            console.error(`❌ [FAIL] ${file}: missing field 'name'`);
            failed = true;
          }
          if (!json.description) {
            console.error(`❌ [FAIL] ${file}: missing field 'description'`);
            failed = true;
          }
          if (!json.startDate) {
            console.error(`❌ [FAIL] ${file}: missing field 'startDate'`);
            failed = true;
          }
          if (!json.endDate) {
            console.error(`❌ [FAIL] ${file}: missing field 'endDate'`);
            failed = true;
          }
          if (!json.performer || json.performer.name !== 'MTB orienteering competitors') {
            console.error(`❌ [FAIL] ${file}: missing or invalid field 'performer'`);
            failed = true;
          }

          // 5. Organizer
          if (!json.organizer || json.organizer['@type'] !== 'Organization' || !json.organizer.name) {
            console.error(`❌ [FAIL] ${file}: missing or invalid organizer field`);
            failed = true;
          }

          // 6. Images
          if (!json.image || !Array.isArray(json.image) || json.image.length === 0) {
            console.error(`❌ [FAIL] ${file}: missing or invalid image array`);
            failed = true;
          }

          // 7. Location
          if (!json.location || json.location['@type'] !== 'Place') {
            console.error(`❌ [FAIL] ${file}: missing or invalid location`);
            failed = true;
          } else {
            if (!json.location.name) {
              console.error(`❌ [FAIL] ${file}: missing field 'name' in location`);
              failed = true;
            }
            if (!json.location.address || json.location.address['@type'] !== 'PostalAddress') {
              console.error(`❌ [FAIL] ${file}: missing or invalid address in location`);
              failed = true;
            } else {
              const country = json.location.address.addressCountry;
              if (!country || country.length !== 2) {
                console.error(`❌ [FAIL] ${file}: addressCountry should be a 2-letter ISO code, received: ${country}`);
                failed = true;
              }
            }
          }

          // 8. Sub-events
          if (json.subEvent) {
            if (!Array.isArray(json.subEvent) || json.subEvent.length === 0) {
              console.error(`❌ [FAIL] ${file}: subEvent is defined but is not a non-empty array`);
              failed = true;
            } else {
              json.subEvent.forEach((sub, idx) => {
                if (sub['@type'] !== 'SportsEvent') {
                  console.error(`❌ [FAIL] ${file}: subEvent[${idx}] @type is not SportsEvent`);
                  failed = true;
                }
                if (!sub.name) {
                  console.error(`❌ [FAIL] ${file}: subEvent[${idx}] is missing name`);
                  failed = true;
                }
                if (!sub.startDate) {
                  console.error(`❌ [FAIL] ${file}: subEvent[${idx}] is missing startDate`);
                  failed = true;
                }
                if (!sub.endDate) {
                  console.error(`❌ [FAIL] ${file}: subEvent[${idx}] is missing endDate`);
                  failed = true;
                }
                if (!sub.offers || sub.offers['@type'] !== 'Offer') {
                  console.error(`❌ [FAIL] ${file}: subEvent[${idx}] is missing offers Offer`);
                  failed = true;
                }
              });
            }
          }
        } catch (err) {
          console.error(`❌ [FAIL] ${file}: Failed to parse JSON-LD script: ${err.message}`);
          failed = true;
        }
      }
    }

    if (!sportsEventFound) {
      console.error(`❌ [FAIL] ${file}: No SportsEvent JSON-LD block found on page.`);
      failed = true;
    }
  });

  console.log(
    `\nJSON-LD Verification complete. Checked ${checked} SportsEvent schema blocks across ${htmlFiles.length} files.`
  );

  if (failed) {
    console.error('FAILED: Some JSON-LD Structured Data errors were found.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All JSON-LD schema blocks are fully compliant and valid.');
  }
}

verifyJsonLd();
