import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  instantiateAugmentedEvent,
  synthesizeCombinedEvent,
  resolveExternalUrl,
} from '../src/utils/augmentedEventModel.ts';

const AUGMENTATIONS_PATH = './src/data/events/augmentations.json';
const EVENTS_DIR = './src/data/events';
const OG_DIR = './public/og-images/events';
const DIST_EVENTS_DIR = './dist/events';
const DIST_REDIRECTS_PATH = './dist/_redirects';

function loadRedirectsMap() {
  const map = new Map();
  if (!existsSync(DIST_REDIRECTS_PATH)) return map;
  const lines = readFileSync(DIST_REDIRECTS_PATH, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      map.set(parts[0], { dest: parts[1], status: parts[2] });
    }
  }
  return map;
}

/**
 * Load all upstream ScraperEvent objects indexed by event.id (e.g. "SWE_60899", "IOF_8277").
 */
function loadAllUpstreamEventsById() {
  const map = new Map();
  const entries = readdirSync(EVENTS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
      const file = join(EVENTS_DIR, entry.name, 'events.json');
      if (existsSync(file)) {
        const parsed = JSON.parse(readFileSync(file, 'utf-8'));
        for (const ev of parsed.events || []) {
          map.set(ev.id, {
            ...ev,
            year: parseInt(ev.start_time.substring(0, 4), 10),
            slug: ev.id.toLowerCase().replace(/_/g, '-'),
            countryCode: ev.id.startsWith('SWE_') ? 'SWE' : 'INT',
            isFeatured: true,
          });
        }
      }
    }
  }
  return map;
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

  const upstreamEvents = loadAllUpstreamEventsById();
  const hasDist = existsSync(DIST_EVENTS_DIR);
  const redirectsMap = hasDist ? loadRedirectsMap() : new Map();
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

    // 1. Verify all referenced event_ids exist in upstream scraper partitions
    const ownedIds = new Set(aug.event_ids);
    const rawChildEvents = [];
    for (const id of aug.event_ids) {
      const ev = upstreamEvents.get(id);
      if (!ev) {
        console.error(`❌ [FAIL] Augmentation "${aug.slug}" references unknown event_id "${id}".`);
        failed = true;
      } else {
        rawChildEvents.push(ev);
      }
    }

    // 1b. Verify any wre_pairs keys are owned event_ids and values exist in upstream scraper partitions
    const companionEvents = new Map();
    if (aug.wre_pairs) {
      for (const [primaryId, companionId] of Object.entries(aug.wre_pairs)) {
        if (!ownedIds.has(primaryId)) {
          console.error(
            `❌ [FAIL] Augmentation "${aug.slug}" wre_pairs key "${primaryId}" is not in event_ids [${aug.event_ids.join(', ')}].`
          );
          failed = true;
        }
        const companionEv = upstreamEvents.get(companionId);
        if (!companionEv) {
          console.error(
            `❌ [FAIL] Augmentation "${aug.slug}" wre_pairs companion "${companionId}" does not exist in upstream events.`
          );
          failed = true;
        } else {
          companionEvents.set(companionId.toUpperCase(), companionEv);
        }
      }
    }

    // 2. Verify all race_notes keys point to an owned event_id or event_id:race_number
    for (const lang of ['sv', 'en']) {
      const notes = aug.content?.[lang]?.race_notes;
      if (notes) {
        for (const key of Object.keys(notes)) {
          const eventIdPart = key.split(':')[0];
          if (!ownedIds.has(eventIdPart)) {
            console.error(
              `❌ [FAIL] Augmentation "${aug.slug}" (${lang}) has race_notes key "${key}" which does not match any owned event_id in [${aug.event_ids.join(', ')}].`
            );
            failed = true;
          }
        }
      }
    }

    // 3. Instantiate AugmentedEvent and verify the object graph:
    //    AugmentedEvent -> owns ScraperEvent[] -> each ScraperEvent owns ScraperRace[] with resolved race_notes
    if (rawChildEvents.length === aug.event_ids.length) {
      const augmentedInstance = instantiateAugmentedEvent(
        aug,
        rawChildEvents,
        (ev) => `https://eventor.orientering.se/Events/Show/${ev.id.replace(/^(SWE|IOF)_/, '')}`,
        companionEvents
      );

      if (!Array.isArray(augmentedInstance.events) || augmentedInstance.events.length !== aug.event_ids.length) {
        console.error(
          `❌ [FAIL] Instantiated AugmentedEvent "${aug.slug}" expected ${aug.event_ids.length} owned ScraperEvents, got ${augmentedInstance.events?.length}.`
        );
        failed = true;
      }

      for (const ownedEvent of augmentedInstance.events) {
        if (!Array.isArray(ownedEvent.races) || ownedEvent.races.length === 0) {
          console.error(`❌ [FAIL] Owned ScraperEvent "${ownedEvent.id}" in "${aug.slug}" has no races.`);
          failed = true;
        }
        for (const race of ownedEvent.races) {
          const expectedSv =
            aug.content.sv.race_notes?.[`${ownedEvent.id}:${race.race_number}`] ??
            aug.content.sv.race_notes?.[ownedEvent.id];
          const expectedEn =
            aug.content.en?.race_notes?.[`${ownedEvent.id}:${race.race_number}`] ??
            aug.content.en?.race_notes?.[ownedEvent.id];

          if (expectedSv && race.location_note?.sv !== expectedSv) {
            console.error(
              `❌ [FAIL] Race ${ownedEvent.id}:${race.race_number} in "${aug.slug}" expected sv note "${expectedSv}", got "${race.location_note?.sv}".`
            );
            failed = true;
          }
          if (expectedEn && race.location_note?.en !== expectedEn) {
            console.error(
              `❌ [FAIL] Race ${ownedEvent.id}:${race.race_number} in "${aug.slug}" expected en note "${expectedEn}", got "${race.location_note?.en}".`
            );
            failed = true;
          }
          if (!race.external_url) {
            console.error(`❌ [FAIL] Race ${ownedEvent.id}:${race.race_number} is missing its external_url.`);
            failed = true;
          }
        }
      }

      // Verify synthesized combined view preserves all races across owned ScraperEvents
      const expectedTotalRaces = rawChildEvents.reduce((sum, e) => sum + e.races.length, 0);
      const synthesized = synthesizeCombinedEvent(augmentedInstance, {
        resolveExtUrl: (ev) => `https://eventor.orientering.se/Events/Show/${ev.id.replace('SWE_', '')}`,
      });
      if (!synthesized || synthesized.races.length !== expectedTotalRaces) {
        console.error(
          `❌ [FAIL] Synthesized view for "${aug.slug}" expected ${expectedTotalRaces} total races, got ${synthesized?.races.length}.`
        );
        failed = true;
      }

      // Verify primary external URL resolves to Eventor, not organizer website
      const primaryChildExtUrl = rawChildEvents[0].urls?.find((u) => u.type === 'Path')
        ? `https://eventor.orientering.se/${rawChildEvents[0].urls.find((u) => u.type === 'Path').url.replace(/^\//, '')}`
        : null;
      if (primaryChildExtUrl) {
        const resolvedUrl = resolveExternalUrl(synthesized);
        if (resolvedUrl !== primaryChildExtUrl) {
          console.error(
            `❌ [FAIL] Synthesized view for "${aug.slug}" expected primary external URL "${primaryChildExtUrl}", got "${resolvedUrl}".`
          );
          failed = true;
        }
      }
      for (const u of synthesized.urls || []) {
        if (u.type === 'Website' && u.title?.toLowerCase() === 'website') {
          console.error(
            `❌ [FAIL] Synthesized view for "${aug.slug}" has a Website link with raw title "Website". Expected clean domain name.`
          );
          failed = true;
        }
      }
    }

    // 4. Verify OG image and built HTML page exist for the canonical slug,
    //    and all aliases redirect (301) to the canonical slug without generating duplicate HTML.
    const ogFile = join(OG_DIR, `${aug.slug}.jpg`);
    if (!existsSync(ogFile)) {
      console.error(`❌ [FAIL] Missing OG image for augmented slug "${aug.slug}" at ${ogFile}.`);
      failed = true;
    }

    if (hasDist) {
      const htmlFile = join(DIST_EVENTS_DIR, aug.slug, 'index.html');
      if (!existsSync(htmlFile)) {
        console.error(`❌ [FAIL] Missing built HTML page for augmented slug "${aug.slug}" at ${htmlFile}.`);
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
            console.error(`❌ [FAIL] Built page ${htmlFile} does not contain English title "${aug.content.en.title}".`);
            failed = true;
          }
          if (!html.includes('data-event-lang-btn="en"')) {
            console.error(`❌ [FAIL] Built page ${htmlFile} is missing the in-page English language switcher button.`);
            failed = true;
          }
        }

        // Issue 1: "Gå till anmälan" must link to Eventor (for Eventor-backed events)
        const primaryChildExtUrl = rawChildEvents[0].urls?.find((u) => u.type === 'Path')
          ? `https://eventor.orientering.se/${rawChildEvents[0].urls.find((u) => u.type === 'Path').url.replace(/^\//, '')}`
          : null;
        if (primaryChildExtUrl) {
          if (!html.includes(`href="${primaryChildExtUrl}"`)) {
            console.error(
              `❌ [FAIL] Built page ${htmlFile} does not link "Gå till anmälan" to primary Eventor URL "${primaryChildExtUrl}".`
            );
            failed = true;
          }
          if (html.includes('anmäl dig till tävlingen på tävlingens webbplats.')) {
            console.error(`❌ [FAIL] Built page ${htmlFile} says "på tävlingens webbplats" instead of "på Eventor".`);
            failed = true;
          }
        }

        // Issue 1: No generic "Website" label in links
        if (html.includes('>Website<') || html.includes('>website<')) {
          console.error(`❌ [FAIL] Built page ${htmlFile} renders generic link text "Website".`);
          failed = true;
        }
      }

      for (const alias of aug.aliases || []) {
        const aliasHtmlFile = join(DIST_EVENTS_DIR, alias, 'index.html');
        if (existsSync(aliasHtmlFile)) {
          console.error(`❌ [FAIL] Alias "${alias}" should redirect, not emit duplicate HTML at ${aliasHtmlFile}.`);
          failed = true;
        }
        const redir = redirectsMap.get(`/events/${alias}`);
        if (!redir || redir.dest !== `/events/${aug.slug}` || redir.status !== '301') {
          console.error(
            `❌ [FAIL] Alias "/events/${alias}" missing 301 redirect to "/events/${aug.slug}" in ${DIST_REDIRECTS_PATH}.`
          );
          failed = true;
        }
      }
    }

    // 5. Verify all non-canonical child event routes (including wre_pairs companions) redirect (301) to the canonical augmentation page
    if (hasDist) {
      for (const id of [...aug.event_ids, ...Object.values(aug.wre_pairs || {})]) {
        const childSlug = id.toLowerCase().replace(/_/g, '-');
        if (childSlug === aug.slug) continue;

        const childHtmlFile = join(DIST_EVENTS_DIR, childSlug, 'index.html');
        if (existsSync(childHtmlFile)) {
          console.error(
            `❌ [FAIL] Child event route "${childSlug}" should 301-redirect to "/events/${aug.slug}", not emit duplicate HTML at ${childHtmlFile}.`
          );
          failed = true;
        }

        const redir = redirectsMap.get(`/events/${childSlug}`);
        if (!redir || redir.dest !== `/events/${aug.slug}` || redir.status !== '301') {
          console.error(
            `❌ [FAIL] Child event route "/events/${childSlug}" missing 301 redirect to "/events/${aug.slug}" in ${DIST_REDIRECTS_PATH}.`
          );
          failed = true;
        }
      }
    }
  }

  // 6. Verify multi-stage World Championships (IOF_8277: 4 races — Middle, Long, Sprint, Relay)
  //    locks down the AugmentedEvent -> ScraperEvent -> ScraperRace hierarchy on IOF multi-stage events.
  const wmtboc2026 = upstreamEvents.get('IOF_8277');
  if (!wmtboc2026 || wmtboc2026.races.length !== 4) {
    console.error(`❌ [FAIL] Expected upstream World Championships event IOF_8277 with 4 races.`);
    failed = true;
  } else {
    const wmtbocAug = instantiateAugmentedEvent(
      {
        slug: 'wmtboc-2026-mora',
        event_ids: ['IOF_8277'],
        start_date: wmtboc2026.start_time,
        end_date: wmtboc2026.end_time,
        content: {
          sv: {
            title: 'VM i MTBO 2026 i Mora',
            paragraphs: ['Fyra VM-distanser i Dalarna.'],
            race_notes: {
              'IOF_8277:1': 'Medeldistans, Mora',
              'IOF_8277:2': 'Långdistans, Mora',
              'IOF_8277:3': 'Sprint, Mora',
              'IOF_8277:4': 'Stafett, Mora',
            },
          },
          en: {
            title: 'WMTBOC 2026 in Mora',
            paragraphs: ['Four World Championship races in Dalarna.'],
            race_notes: {
              'IOF_8277:1': 'Middle distance, Mora',
              'IOF_8277:2': 'Long distance, Mora',
              'IOF_8277:3': 'Sprint, Mora',
              'IOF_8277:4': 'Relay, Mora',
            },
          },
        },
      },
      [wmtboc2026],
      () => 'https://eventor.orienteering.org/Events/Show/8277'
    );

    const ownedWmtboc = wmtbocAug.events[0];
    const expectedDisciplines = ['Middle', 'Long', 'Sprint', 'Relay'];
    for (let i = 0; i < 4; i++) {
      const race = ownedWmtboc.races[i];
      const stageNum = i + 1;
      if (race.discipline !== expectedDisciplines[i]) {
        console.error(
          `❌ [FAIL] WMTBOC IOF_8277 race ${stageNum} expected discipline "${expectedDisciplines[i]}", got "${race.discipline}".`
        );
        failed = true;
      }
      if (race.location_note?.sv !== wmtbocAug.content.sv.race_notes[`IOF_8277:${stageNum}`]) {
        console.error(`❌ [FAIL] WMTBOC IOF_8277 race ${stageNum} failed to attach sv location_note.`);
        failed = true;
      }
      if (race.location_note?.en !== wmtbocAug.content.en.race_notes[`IOF_8277:${stageNum}`]) {
        console.error(`❌ [FAIL] WMTBOC IOF_8277 race ${stageNum} failed to attach en location_note.`);
        failed = true;
      }
    }
    console.log(
      `✓ Verified AugmentedEvent -> ScraperEvent -> ScraperRace hierarchy across ${augmentations.length} augmentations + multi-stage WMTBOC (IOF_8277).`
    );
  }

  // 7. Verify lead vs excerpt separation on new articles when dist exists
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
