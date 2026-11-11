import type {
  AugmentedEvent,
  EventAugmentation,
  ScraperDocument,
  ScraperEntryDeadline,
  ScraperEvent,
  ScraperOrganiser,
  ScraperRace,
  ScraperUrl,
} from '../types/events.ts';

export function getSourceUrls(): Record<string, string> {
  return {
    SWE: 'https://eventor.orientering.se',
    IOF: 'https://eventor.orienteering.org',
    NOR: 'https://eventor.orientering.no',
    FIN: 'https://kiti.kartat.fi',
    DEN: 'https://orientering.dk',
  };
}

export function getEventSource(event: ScraperEvent): string {
  const underscoreIdx = event.id.indexOf('_');
  return underscoreIdx > 0 ? event.id.substring(0, underscoreIdx) : event.id;
}

export function resolveExternalUrl(event: ScraperEvent): string | null {
  const source = getEventSource(event);
  const sourceUrls = getSourceUrls();
  const baseUrl = sourceUrls[source] || sourceUrls[event.countryCode];

  // Find the Path URL
  const pathUrl = event.urls?.find((u) => u.type === 'Path');
  if (pathUrl) {
    if (pathUrl.url.startsWith('http://') || pathUrl.url.startsWith('https://')) {
      return pathUrl.url;
    }
    if (baseUrl) {
      return `${baseUrl}/${pathUrl.url.replace(/^\//, '')}`;
    }
  }

  // Fall back to Website URL
  const websiteUrl = event.urls?.find((u) => u.type === 'Website');
  if (websiteUrl) {
    return websiteUrl.url;
  }

  // For MAN events, try the first available URL
  if (event.urls && event.urls.length > 0) {
    return event.urls[0].url;
  }

  return null;
}

/**
 * Resolve a race note from an EventAugmentationLocaleContent.race_notes map.
 * Supports:
 * 1. Explicit "EventID:RaceNumber" key (e.g. "SWE_59350:1", "IOF_8277:2") for multi-stage single events
 * 2. Explicit "EventID" key (e.g. "SWE_60899") for multi-event weekends
 * 3. Fallback 1-indexed sequential number (e.g. "1")
 */
export function lookupRaceNote(
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
 * Pure domain factory: instantiate an AugmentedEvent that owns 1..* ScraperEvent instances,
 * where each ScraperEvent owns its 1..* ScraperRace instances enriched with bilingual notes
 * and direct external URLs.
 */
export function instantiateAugmentedEvent(
  aug: EventAugmentation,
  rawEvents: ScraperEvent[],
  resolveExtUrl: (ev: ScraperEvent) => string | null = () => null
): AugmentedEvent {
  const isSingleEvent = rawEvents.length === 1;

  const ownedEvents: ScraperEvent[] = rawEvents.map((ev) => {
    const evExternalUrl = resolveExtUrl(ev);
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
 * Derive a unified ScraperEvent view from an AugmentedEvent by aggregating its owned
 * ScraperEvents' races, classes, documents, URLs, and entry deadlines.
 */
export function synthesizeCombinedEvent(
  aug: AugmentedEvent,
  options: {
    requestedSlug?: string;
    resolveExtUrl?: (ev: ScraperEvent) => string | null;
    resolveRelUrl?: (url: string, ev: ScraperEvent) => string;
  } = {}
): ScraperEvent | undefined {
  const childEvents = aug.events;
  if (childEvents.length === 0) {
    return undefined;
  }

  const effectiveSlug = options.requestedSlug || aug.slug;
  const resolveExtUrl = options.resolveExtUrl || (() => null);
  const resolveRelUrl = options.resolveRelUrl || ((u: string) => u);
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

  // Deduplicated documents
  const documents: ScraperDocument[] = [];
  const seenDocUrls = new Set<string>();
  for (const ev of childEvents) {
    for (const doc of ev.documents || []) {
      const absUrl = resolveRelUrl(doc.url, ev);
      if (!seenDocUrls.has(absUrl)) {
        seenDocUrls.add(absUrl);
        documents.push({ ...doc, url: absUrl });
      }
    }
  }

  // Deduplicated URLs
  const urls: ScraperUrl[] = [];
  const seenUrls = new Set<string>();

  // Ensure primary Path url is preserved so resolveExternalUrl resolves to primary Eventor/upstream page
  const primaryPathUrl = primaryChild.urls?.find((u) => u.type === 'Path');
  const primaryExtUrl = resolveExtUrl(primaryChild);
  const synthesizedPath = primaryExtUrl || primaryPathUrl?.url;
  if (synthesizedPath) {
    urls.push({
      type: 'Path',
      url: synthesizedPath,
    });
  }

  // 1. For multi-event groups, add individual Eventor links for all child events
  if (!isSingleEvent) {
    for (const ev of childEvents) {
      const extUrl = resolveExtUrl(ev);
      if (extUrl && !seenUrls.has(extUrl)) {
        seenUrls.add(extUrl);
        urls.push({
          type: 'Eventor',
          url: extUrl,
          title: `Eventor: ${ev.name}`,
        });
      }
    }
  }

  // 2. Add series standings links from child events
  for (const ev of childEvents) {
    for (const u of ev.urls || []) {
      if (u.type === 'Series') {
        const absUrl = resolveRelUrl(u.url, ev);
        if (!seenUrls.has(absUrl)) {
          seenUrls.add(absUrl);
          urls.push({ ...u, url: absUrl });
        }
      }
    }
  }

  // 3. Add organizer website (from augmentation or child events) and custom links
  if (aug.website && !seenUrls.has(aug.website)) {
    seenUrls.add(aug.website);
    urls.push({
      type: 'Website',
      url: aug.website,
      title: aug.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
    });
  }

  for (const ev of childEvents) {
    for (const u of ev.urls || []) {
      if (u.type === 'Path' || u.type === 'Series') continue;
      const absUrl = resolveRelUrl(u.url, ev);
      if (!seenUrls.has(absUrl)) {
        seenUrls.add(absUrl);
        const cleanTitle =
          u.title && u.title.toLowerCase() !== 'website'
            ? u.title
            : absUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        urls.push({
          ...u,
          url: absUrl,
          title: cleanTitle,
        });
      }
    }
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
