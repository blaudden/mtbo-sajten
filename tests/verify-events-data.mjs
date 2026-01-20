import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const EVENTS_DIR = 'src/content/events';

function verifyEvents() {
  if (!existsSync(EVENTS_DIR)) {
    console.error(`❌ Events directory ${EVENTS_DIR} not found.`);
    process.exit(1);
  }

  const files = readdirSync(EVENTS_DIR).filter((f) => f.endsWith('.json') && f.match(/^\d{4}\.json$/));

  if (files.length === 0) {
    console.warn('⚠️  No event files found to verify.');
    return;
  }

  let totalEvents = 0;
  let errorCount = 0;
  let linkWarnings = 0;

  files.forEach((file) => {
    try {
      const content = readFileSync(join(EVENTS_DIR, file), 'utf-8');
      const events = JSON.parse(content);

      if (!Array.isArray(events)) {
        console.error(`❌ ${file}: Root element is not an array.`);
        errorCount++;
        return;
      }

      events.forEach((event, index) => {
        totalEvents++;
        const location = `${file}[${index}]`; // e.g. 2026.json[5]

        // Required fields
        if (!event.id) {
          console.error(`❌ ${location}: Missing 'id'`);
          errorCount++;
        }
        if (!event.name) {
          console.error(`❌ ${location}: Missing 'name'`);
          errorCount++;
        }
        if (!event.start_date) {
          console.error(`❌ ${location}: Missing 'start_date'`);
          errorCount++;
        }
        if (!event.url) {
          console.error(`❌ ${location}: Missing 'url'`);
          errorCount++;
        }

        // Link verification (regex)
        if (event.url && !event.url.match(/^(https?:\/\/|\/)/)) {
          console.warn(`⚠️ ${location}: URL looks suspicious: ${event.url}`);
          linkWarnings++;
        }
      });

      console.log(`✅ ${file}: Parsed ${events.length} events.`);
    } catch (err) {
      console.error(`❌ ${file}: Invalid JSON - ${err.message}`);
      errorCount++;
    }
  });

  console.log('\n--- Verification Summary ---');
  console.log(`Total Events: ${totalEvents}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Link Warnings: ${linkWarnings}`);

  if (errorCount > 0) process.exit(1);
}

verifyEvents();
