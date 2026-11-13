import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { AugmentedEvent, EventAugmentation, ScraperEvent } from '~/types/events';
import { getEventBySlug, resolveExternalUrl, resolveRelativeUrl, slugToEventId } from '~/utils/events';
import { instantiateAugmentedEvent, synthesizeCombinedEvent } from '~/utils/augmentedEventModel';

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

  return instantiateAugmentedEvent(aug, rawEvents, resolveExternalUrl);
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

  return synthesizeCombinedEvent(aug, {
    requestedSlug,
    resolveExtUrl: resolveExternalUrl,
    resolveRelUrl: resolveRelativeUrl,
  });
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

  // If slug matches a child event ID of an augmentation (e.g. swe-58993 in Svenska Cupen Sätervurpan),
  // render the combined group page directly so all child routes render the combined page.
  const eventId = slugToEventId(slug);
  const parentAug = await getAugmentationByEventId(eventId);
  if (parentAug) {
    const augmentedEvent = await resolveAugmentedEvent(parentAug);
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
 * Return only the canonical slugs to generate as static HTML pages for /events/[slug]:
 * - Primary canonical augmentation/group slugs
 * - Individual event slugs that are NOT owned by any augmentation (owned child IDs and aliases
 *   are handled via HTTP 301 redirects in astro.config.ts).
 */
export async function getCanonicalEventPageSlugs(allEvents: ScraperEvent[]): Promise<string[]> {
  const allAugs = await loadAllAugmentations();
  const ownedEventIds = new Set<string>();
  const slugSet = new Set<string>();

  for (const aug of allAugs) {
    slugSet.add(aug.slug);
    for (const id of aug.event_ids) {
      ownedEventIds.add(id.toUpperCase());
    }
  }

  for (const event of allEvents) {
    if (!ownedEventIds.has(event.id.toUpperCase())) {
      slugSet.add(event.slug);
    }
  }

  return Array.from(slugSet);
}
