import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type {
  AugmentedEvent,
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
 * Load all validated event augmentations from the Astro 'augmentations' Content Collection.
 */
export async function loadAllAugmentations(): Promise<EventAugmentation[]> {
  if (cachedAugmentations) return cachedAugmentations;
  const entries = await getCollection('augmentations');
  const list: EventAugmentation[] = entries.map((entry) => entry.data as EventAugmentation);
  cachedAugmentations = list;
  return list;
}

/**
 * Find an augmentation by its canonical slug or any of its aliases.
 */
export async function getAugmentationBySlug(slug: string): Promise<EventAugmentation | undefined> {
  const normalized = slug.toLowerCase();
  const all = await loadAllAugmentations();
  return all.find(
    (aug) => aug.slug.toLowerCase() === normalized || aug.aliases?.some((a) => a.toLowerCase() === normalized)
  );
}

/**
 * Find an augmentation that includes a given scraper event ID (e.g. "SWE_57010").
 */
export async function getAugmentationByEventId(eventId: string): Promise<EventAugmentation | undefined> {
  const upperId = eventId.toUpperCase();
  const all = await loadAllAugmentations();
  return all.find((aug) => aug.event_ids.some((id) => id.toUpperCase() === upperId));
}

/**
 * Find a multi-event weekend group containing the given event ID.
 * Returns undefined for single-event augmentations (where the event IS the canonical page).
 */
export async function getParentGroupForEvent(eventId: string): Promise<EventAugmentation | undefined> {
  const aug = await getAugmentationByEventId(eventId);
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
 * Resolve a race note from an EventAugmentationLocaleContent.race_notes map.
 * Supports:
 * 1. Explicit "EventID:RaceNumber" key (e.g. "SWE_59350:1") for multi-stage single events
 * 2. Explicit "EventID" key (e.g. "SWE_60899") for multi-event weekends
 * 3. Fallback 1-indexed sequential number (e.g. "1")
 */
function lookupRaceNote(
  notes: Record<string, string> | undefined,
  eventId: string,
  raceNumber: number,
  sequentialNum?: number
): string | undefined {
  if (!notes) return undefined;
  return (
    notes[`${eventId}:${raceNumber}`] ??
    notes[eventId] ??
    (sequentialNum !== undefined ? notes[String(sequentialNum)] : undefined)
  );
}

/**
 * Build the resolved AugmentedEvent domain object that owns its 1..* child ScraperEvents
 * (each owning its 1..* ScraperRaces enriched with bilingual notes and external URLs).
 */
export async function resolveAugmentedEvent(aug: EventAugmentation): Promise<AugmentedEvent | undefined> {
  const rawEvents: ScraperEvent[] = [];
  for (const id of aug.event_ids) {
    const ev = await getEventById(id);
    if (ev) {
      rawEvents.push(ev);
    }
  }

  if (rawEvents.length === 0) {
    return undefined;
  }

  const isSingleEvent = rawEvents.length === 1;

  const ownedEvents: ScraperEvent[] = rawEvents.map((ev) => {
    const evExternalUrl = resolveExternalUrl(ev);
    const enrichedRaces: ScraperRace[] = ev.races.map((race) => {
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

      const svNote = lookupRaceNote(aug.content.sv.race_notes, ev.id, race.race_number);
      const enNote = lookupRaceNote(aug.content.en?.race_notes, ev.id, race.race_number);

      return {
        ...race,
        name: raceName,
        discipline,
        external_url: evExternalUrl,
        location_note: svNote || enNote ? { sv: svNote, en: enNote } : race.location_note,
      };
    });

    return {
      ...ev,
      races: enrichedRaces,
    };
  });

  return {
    ...aug,
    events: ownedEvents,
  };
}

/**
 * Construct a unified ScraperEvent view from an EventAugmentation or AugmentedEvent,
 * aggregating its owned ScraperEvents' races, classes, documents, URLs, and deadlines.
 */
export async function buildAugmentedEvent(
  augInput: EventAugmentation | AugmentedEvent,
  requestedSlug?: string
): Promise<ScraperEvent | undefined> {
  const aug: AugmentedEvent | undefined = 'events' in augInput ? augInput : await resolveAugmentedEvent(augInput);

  if (!aug || aug.events.length === 0) {
    return undefined;
  }

  const childEvents = aug.events;
  const effectiveSlug = requestedSlug || aug.slug;
  const isSingleEvent = childEvents.length === 1;
  const primaryChild = childEvents[0];

  // Collect and sort all races across owned ScraperEvents
  const combinedRaces: Array<{ race: ScraperRace; eventId: string }> = [];
  for (const ev of childEvents) {
    for (const race of ev.races) {
      combinedRaces.push({ race, eventId: ev.id });
    }
  }

  combinedRaces.sort((a, b) => new Date(a.race.datetimez).getTime() - new Date(b.race.datetimez).getTime());

  // Number races sequentially across the weekend and ensure notes are attached
  const numberedRaces: ScraperRace[] = combinedRaces.map(({ race, eventId }, idx) => {
    const num = idx + 1;
    const svNote = race.location_note?.sv ?? lookupRaceNote(aug.content.sv.race_notes, eventId, race.race_number, num);
    const enNote = race.location_note?.en ?? lookupRaceNote(aug.content.en?.race_notes, eventId, race.race_number, num);
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
    if (extUrl && !seenUrls.has(extUrl) && !isSingleEvent) {
      seenUrls.add(extUrl);
      urls.push({
        type: 'Series',
        url: extUrl,
        title: `Eventor: ${ev.name}`,
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
 * - If slug matches an augmentation or group (or its alias), returns the resolved AugmentedEvent
 *   (which owns its 1..* ScraperEvents) alongside its aggregated view.
 * - Otherwise looks up the individual ScraperEvent and attaches parentGroup if it belongs to a multi-event weekend.
 */
export async function resolveEventPage(slug: string): Promise<
  | {
      event: ScraperEvent;
      augmentation?: AugmentedEvent;
      parentGroup?: EventAugmentation;
    }
  | undefined
> {
  const rawAug = await getAugmentationBySlug(slug);
  if (rawAug) {
    const augmentedEvent = await resolveAugmentedEvent(rawAug);
    if (augmentedEvent) {
      const event = await buildAugmentedEvent(augmentedEvent, slug);
      if (event) {
        return { event, augmentation: augmentedEvent };
      }
    }
  }

  const individualEvent = await getEventBySlug(slug);
  if (!individualEvent) {
    return undefined;
  }

  const parentGroup = await getParentGroupForEvent(individualEvent.id);
  return {
    event: individualEvent,
    parentGroup,
  };
}

/**
 * Return all static slugs to generate for /events/[slug], including:
 * - All canonical augmentation/group slugs and their aliases
 */
export async function getAllAugmentedAndEventSlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  const all = await loadAllAugmentations();
  for (const aug of all) {
    slugs.add(aug.slug);
    for (const alias of aug.aliases || []) {
      slugs.add(alias);
    }
  }
  return Array.from(slugs);
}
