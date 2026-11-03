import fs from 'node:fs';
import path from 'node:path';
import { getEntry, type CollectionEntry } from 'astro:content';
import type {
  EventAugmentation,
  ScraperDocument,
  ScraperEntryDeadline,
  ScraperEvent,
  ScraperOrganiser,
  ScraperRace,
  ScraperUrl,
} from '~/types/events';
import { getEventBySlug, resolveExternalUrl, resolveRelativeUrl } from '~/utils/events';

let cachedAugmentations: EventAugmentation[] | null = null;

/**
 * Load all event augmentations and weekend groups from src/data/events/augmentations.json.
 */
export function loadAllAugmentations(): EventAugmentation[] {
  if (cachedAugmentations) return cachedAugmentations;
  const filePath = path.join(process.cwd(), 'src/data/events/augmentations.json');
  if (!fs.existsSync(filePath)) {
    cachedAugmentations = [];
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const list: EventAugmentation[] = Array.isArray(raw.augmentations) ? raw.augmentations : [];
  cachedAugmentations = list;
  return list;
}

/**
 * Find an augmentation by its canonical slug or any of its aliases.
 */
export function getAugmentationBySlug(slug: string): EventAugmentation | undefined {
  const normalized = slug.toLowerCase();
  return loadAllAugmentations().find(
    (aug) => aug.slug.toLowerCase() === normalized || aug.aliases?.some((a) => a.toLowerCase() === normalized)
  );
}

/**
 * Find an augmentation that includes a given scraper event ID (e.g. "SWE_57010").
 */
export function getAugmentationByEventId(eventId: string): EventAugmentation | undefined {
  const upperId = eventId.toUpperCase();
  return loadAllAugmentations().find((aug) => aug.event_ids.some((id) => id.toUpperCase() === upperId));
}

/**
 * Find a multi-event weekend group containing the given event ID.
 * Returns undefined for single-event augmentations (where the event IS the canonical page).
 */
export function getParentGroupForEvent(eventId: string): EventAugmentation | undefined {
  const aug = getAugmentationByEventId(eventId);
  if (aug && aug.event_ids.length > 1) {
    return aug;
  }
  return undefined;
}

/**
 * Fetch a ScraperEvent from the Astro content collection by its raw ID (e.g. "SWE_59350").
 */
export async function getEventById(eventId: string): Promise<ScraperEvent | undefined> {
  const entry = (await getEntry('events', eventId)) as CollectionEntry<'events'> | undefined;
  return entry ? (entry.data as unknown as ScraperEvent) : undefined;
}

/**
 * Construct a unified ScraperEvent for an EventAugmentation (either a multi-event weekend
 * or an augmented single event), attaching per-race external URLs and bilingual location notes.
 */
export async function buildAugmentedEvent(
  aug: EventAugmentation,
  requestedSlug?: string
): Promise<ScraperEvent | undefined> {
  const childEvents: ScraperEvent[] = [];
  for (const id of aug.event_ids) {
    const ev = await getEventById(id);
    if (ev) {
      childEvents.push(ev);
    }
  }

  if (childEvents.length === 0) {
    return undefined;
  }

  const effectiveSlug = requestedSlug || aug.slug;
  const isSingleEvent = childEvents.length === 1;
  const primaryChild = childEvents[0];

  // Collect and sort all races across child events
  const combinedRaces: ScraperRace[] = [];
  for (const ev of childEvents) {
    const evExternalUrl = resolveExternalUrl(ev);
    for (const race of ev.races) {
      let discipline = race.discipline;
      if (
        discipline === 'Long' &&
        (ev.name.toLowerCase().includes('masstart') || ev.information?.toLowerCase().includes('masstart'))
      ) {
        discipline = 'Mass start';
      }

      const raceName = isSingleEvent
        ? race.name || `Etapp ${race.race_number}`
        : race.name && race.name.toLowerCase() !== ev.name.toLowerCase()
          ? `${ev.name} – ${race.name}`
          : ev.name;

      combinedRaces.push({
        ...race,
        name: raceName,
        discipline,
        external_url: evExternalUrl,
      });
    }
  }

  combinedRaces.sort((a, b) => new Date(a.datetimez).getTime() - new Date(b.datetimez).getTime());

  // Re-number races sequentially and attach bilingual race_notes
  const numberedRaces: ScraperRace[] = combinedRaces.map((race, idx) => {
    const num = idx + 1;
    const svNote = aug.content.sv.race_notes?.[String(num)];
    const enNote = aug.content.en?.race_notes?.[String(num)];
    return {
      ...race,
      race_number: num,
      location_note: svNote || enNote ? { sv: svNote, en: enNote } : race.location_note,
    };
  });

  // Organisers
  const organisers: ScraperOrganiser[] = aug.organisers
    ? [...aug.organisers].reverse().map((name) => ({ name, country_code: primaryChild.countryCode }))
    : primaryChild.organisers || [];

  // Deduplicated classes
  const classesSet = new Set<string>();
  for (const ev of childEvents) {
    for (const c of ev.classes || []) {
      classesSet.add(c);
    }
  }

  // Deduplicated types
  const typesSet = new Set<string>();
  for (const ev of childEvents) {
    for (const t of ev.types || []) {
      typesSet.add(t);
    }
  }

  // Deduplicated documents (resolved to absolute URLs so multi-event documents work seamlessly)
  const documents: ScraperDocument[] = [];
  const seenDocUrls = new Set<string>();
  for (const ev of childEvents) {
    for (const doc of ev.documents || []) {
      const absUrl = resolveRelativeUrl(doc.url, ev);
      if (!seenDocUrls.has(absUrl)) {
        seenDocUrls.add(absUrl);
        documents.push({ ...doc, url: absUrl });
      }
    }
  }

  // Deduplicated URLs
  const urls: ScraperUrl[] = [];
  const seenUrls = new Set<string>();
  if (aug.website) {
    seenUrls.add(aug.website);
    urls.push({
      type: 'Website',
      url: aug.website,
      title: aug.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
    });
  }

  if (aug.custom_links) {
    for (const link of aug.custom_links) {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);
        urls.push({
          type: link.type || 'Website',
          url: link.url,
          title: link.title,
        });
      }
    }
  }

  for (const ev of childEvents) {
    const extUrl = resolveExternalUrl(ev);
    if (extUrl && !seenUrls.has(extUrl) && (!isSingleEvent || !aug.website)) {
      seenUrls.add(extUrl);
      urls.push({
        type: isSingleEvent ? 'Path' : 'Series',
        url: extUrl,
        title: isSingleEvent ? 'Eventor' : `Eventor: ${ev.name}`,
      });
    }
    for (const u of ev.urls || []) {
      if (u.type === 'Path') continue;
      const absUrl = resolveRelativeUrl(u.url, ev);
      if (!seenUrls.has(absUrl)) {
        seenUrls.add(absUrl);
        urls.push({ ...u, url: absUrl });
      }
    }
  }

  // Ensure primary Path url is preserved for single event so resolveExternalUrl works
  if (isSingleEvent && primaryChild.urls) {
    const pathUrl = primaryChild.urls.find((u) => u.type === 'Path');
    if (pathUrl && !urls.some((u) => u.type === 'Path')) {
      urls.unshift(pathUrl);
    }
  }

  // Entry deadlines
  const deadlines: ScraperEntryDeadline[] = [];
  const seenDeadlines = new Set<string>();
  for (const ev of childEvents) {
    for (const dl of ev.entry_deadlines || []) {
      const key = `${dl.type}:${dl.datetimez}`;
      if (!seenDeadlines.has(key)) {
        seenDeadlines.add(key);
        deadlines.push(dl);
      }
    }
  }

  const year = Number(aug.start_date.substring(0, 4)) || primaryChild.year;

  return {
    ...primaryChild,
    id: isSingleEvent ? primaryChild.id : `GRP_${aug.slug.toUpperCase().replace(/-/g, '_')}`,
    name: aug.content.sv.title,
    start_time: aug.start_date,
    end_time: aug.end_date,
    organisers,
    region: aug.region || primaryChild.region,
    classes: Array.from(classesSet),
    types: Array.from(typesSet),
    documents,
    urls,
    entry_deadlines: deadlines,
    races: numberedRaces,
    year,
    slug: effectiveSlug,
    countryCode: primaryChild.countryCode,
    isFeatured: childEvents.some((e) => e.isFeatured),
  };
}

/**
 * Resolve any /events/[slug] page request:
 * - If slug matches an augmentation or group (or its alias), returns the augmented/grouped event.
 * - Otherwise looks up the individual ScraperEvent and attaches parentGroup if it belongs to a multi-event weekend.
 */
export async function resolveEventPage(slug: string): Promise<
  | {
      event: ScraperEvent;
      augmentation?: EventAugmentation;
      parentGroup?: EventAugmentation;
    }
  | undefined
> {
  const aug = getAugmentationBySlug(slug);
  if (aug) {
    const event = await buildAugmentedEvent(aug, slug);
    if (event) {
      return { event, augmentation: aug };
    }
  }

  const individualEvent = await getEventBySlug(slug);
  if (!individualEvent) {
    return undefined;
  }

  const parentGroup = getParentGroupForEvent(individualEvent.id);
  return {
    event: individualEvent,
    parentGroup,
  };
}

/**
 * Return all static slugs to generate for /events/[slug], including:
 * - All individual scraper event slugs
 * - All canonical augmentation/group slugs and their aliases
 */
export async function getAllAugmentedAndEventSlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  for (const aug of loadAllAugmentations()) {
    slugs.add(aug.slug);
    for (const alias of aug.aliases || []) {
      slugs.add(alias);
    }
  }
  return Array.from(slugs);
}
