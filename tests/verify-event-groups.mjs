import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const AUGMENTATIONS_PATH = './src/data/events/augmentations.json';
const EVENTS_DIR = './src/data/events';
const OG_DIR = './public/og-images/events';
const DIST_EVENTS_DIR = './dist/events';

function loadAllUpstreamEventIds() {
  const ids = new Set();
  const entries = readdirSync(EVENTS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
      const file = join(EVENTS_DIR, entry.name, 'events.json');
      if (existsSync(file)) {
        const parsed = JSON.parse(readFileSync(file, 'utf-8'));
        for (const ev of parsed.events || []) {
          ids.add(ev.id);
        }
      }
    }
  }
  return ids;
}

function verifyEventGroups() {
  if (!existsSync(AUGMENTATIONS_PATH)) {
    console.error(`❌ [FAIL] Missing ${AUGMENTATIONS_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(AUGMENTATIONS_PATH, 'utf-8'));
  const augmentations = raw.augmentations;
  if (!Array.isArray(augmentations) || augmentations.length === 0) {
    console.error(`❌ [FAIL] ${AUGMENTATIONS_PATH} must contain a non-empty "augmentations" array.`);
    process.exit(1);
  }

  const upstreamIds = loadAllUpstreamEventIds();
  const hasDist = existsSync(DIST_EVENTS_DIR);
  let failed = false;

  console.log(`Verifying ${augmentations.length} augmented/grouped event configurations...`);

  for (const aug of augmentations) {
    if (!aug.slug || !Array.isArray(aug.event_ids) || aug.event_ids.length === 0) {
      console.error(`❌ [FAIL] Augmentation is missing slug or event_ids: ${JSON.stringify(aug)}`);
      failed = true;
      continue;
    }

    if (
      !aug.content?.sv?.title ||
      !Array.isArray(aug.content?.sv?.paragraphs) ||
      aug.content.sv.paragraphs.length === 0
    ) {
      console.error(`❌ [FAIL] Augmentation "${aug.slug}" is missing Swedish title or paragraphs.`);
      failed = true;
    }

    // Verify all referenced event_ids exist in upstream scraper partitions
    for (const id of aug.event_ids) {
      if (!upstreamIds.has(id)) {
        console.error(`❌ [FAIL] Augmentation "${aug.slug}" references unknown event_id "${id}".`);
        failed = true;
      }
    }

    // Verify OG images exist for canonical slug and all aliases
    const allSlugs = [aug.slug, ...(aug.aliases || [])];
    for (const slug of allSlugs) {
      const ogFile = join(OG_DIR, `${slug}.jpg`);
      if (!existsSync(ogFile)) {
        console.error(`❌ [FAIL] Missing OG image for augmented slug "${slug}" at ${ogFile}.`);
        failed = true;
      }

      if (hasDist) {
        const htmlFile = join(DIST_EVENTS_DIR, slug, 'index.html');
        if (!existsSync(htmlFile)) {
          console.error(`❌ [FAIL] Missing built HTML page for augmented slug "${slug}" at ${htmlFile}.`);
          failed = true;
        } else {
          const html = readFileSync(htmlFile, 'utf-8')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
          if (!html.includes(aug.content.sv.title)) {
            console.error(`❌ [FAIL] Built page ${htmlFile} does not contain Swedish title "${aug.content.sv.title}".`);
            failed = true;
          }
          if (aug.content.en?.title) {
            if (!html.includes(aug.content.en.title)) {
              console.error(
                `❌ [FAIL] Built page ${htmlFile} does not contain English title "${aug.content.en.title}".`
              );
              failed = true;
            }
            if (!html.includes('data-event-lang-btn="en"')) {
              console.error(
                `❌ [FAIL] Built page ${htmlFile} is missing the in-page English language switcher button.`
              );
              failed = true;
            }
          }
        }
      }
    }

    // For multi-event groups, verify individual child event routes still exist and link to parent group
    if (hasDist && aug.event_ids.length > 1) {
      for (const id of aug.event_ids) {
        const childSlug = id.toLowerCase().replace(/_/g, '-');
        const childHtmlFile = join(DIST_EVENTS_DIR, childSlug, 'index.html');
        if (!existsSync(childHtmlFile)) {
          console.error(
            `❌ [FAIL] Individual child event route "${childSlug}" was lost! Expected ${childHtmlFile} to exist.`
          );
          failed = true;
        } else {
          const childHtml = readFileSync(childHtmlFile, 'utf-8');
          if (!childHtml.includes(`/events/${aug.slug}`)) {
            console.error(
              `❌ [FAIL] Individual child event route "${childSlug}" does not link to parent group "/events/${aug.slug}".`
            );
            failed = true;
          }
        }
      }
    }
  }

  // Verify lead vs excerpt separation on new articles when dist exists
  if (hasDist && existsSync('./src/content/posts/mtbo-wre-i-sverige/index.mdoc')) {
    const wreHtmlPath = './dist/mtbo-wre-i-sverige/index.html';
    if (!existsSync(wreHtmlPath)) {
      console.error(`❌ [FAIL] Missing built WRE article at ${wreHtmlPath}`);
      failed = true;
    } else {
      const wreHtml = readFileSync(wreHtmlPath, 'utf-8');
      if (!wreHtml.includes('Att lägga till status som World Ranking Event (WRE)')) {
        console.error(`❌ [FAIL] Built WRE article ${wreHtmlPath} does not render the frontmatter "lead" paragraph.`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('FAILED: Event group and augmentation verification encountered errors.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All event groups, augmentations, OG images, and child routes are valid.');
  }
}

verifyEventGroups();
