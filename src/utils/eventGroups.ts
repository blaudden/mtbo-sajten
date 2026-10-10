import type { EventGroup, ScraperEvent, ScraperRace, ScraperUrl } from '~/types/events';
import groupsData from '~/data/events/groups.json';
import { getEntry, type CollectionEntry } from 'astro:content';

const groups: EventGroup[] = groupsData as EventGroup[];

/**
 * Returns all configured event groups.
 */
export function loadAllEventGroups(): EventGroup[] {
  return groups;
}

/**
 * Finds an event group by its unique slug.
 */
export function getEventGroupBySlug(slug: string): EventGroup | undefined {
  return groups.find((g) => g.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * Finds the parent event group for a given event ID (e.g. "SWE_57010").
 */
export function getEventGroupByEventId(eventId: string): EventGroup | undefined {
  const normalizedId = eventId.toUpperCase().replace(/-/g, '_');
  return groups.find((g) => g.event_ids.some((id) => id.toUpperCase().replace(/-/g, '_') === normalizedId));
}

/**
 * Loads all individual ScraperEvents belonging to a group, ordered by date.
 */
export async function getEventsForGroup(group: EventGroup): Promise<ScraperEvent[]> {
  const events: ScraperEvent[] = [];

  for (const id of group.event_ids) {
    const normalizedId = id.toUpperCase().replace(/-/g, '_');
    const entry = (await getEntry('events', normalizedId)) as CollectionEntry<'events'> | undefined;
    if (entry?.data) {
      events.push(entry.data as unknown as ScraperEvent);
    }
  }

  return events.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/**
 * Unifies an EventGroup and its sub-events into a single cohesive ScraperEvent
 * so it renders seamlessly across standard event templates (EventDetail, EventRaceTable, etc.).
 */
export function groupToUnifiedEvent(group: EventGroup, events: ScraperEvent[]): ScraperEvent {
  const firstEvent = events[0];

  // Combine all races in chronological order
  const allRaces: ScraperRace[] = [];
  let raceNumber = 1;
  for (const ev of events) {
    for (const r of ev.races) {
      allRaces.push({
        ...r,
        race_number: raceNumber++,
        name: r.name || ev.name,
      });
    }
  }

  // Combine unique organisers
  const allOrganisers = Array.from(new Set(events.flatMap((e) => e.organisers?.map((o) => o.name) || []))).map(
    (name) => ({ name, country_code: 'SWE' })
  );

  // Combine unique documents
  const allDocuments = events.flatMap((e) => e.documents || []);

  // Combine URLs: include all URLs from all events, de-duplicating by URL
  const seenUrls = new Set<string>();
  const allUrls: ScraperUrl[] = [];
  for (const ev of events) {
    if (ev.urls) {
      for (const u of ev.urls) {
        if (!seenUrls.has(u.url)) {
          seenUrls.add(u.url);
          allUrls.push(u);
        }
      }
    }
  }

  // Combine classes
  const allClasses = Array.from(new Set(events.flatMap((e) => e.classes || [])));

  // Combine deadlines
  const allDeadlines = events.flatMap((e) => e.entry_deadlines || []);

  // Merge information if available
  const infoParts = [group.description, ...events.map((e) => e.information).filter(Boolean)].filter(Boolean);

  const status = events.some((e) => e.status === 'Sanctioned') ? 'Sanctioned' : firstEvent?.status || 'Planned';

  return {
    id: group.slug.toUpperCase().replace(/-/g, '_'),
    slug: group.slug,
    name: group.name,
    start_time: group.start_date,
    end_time: group.end_date,
    status,
    types: Array.from(new Set(events.flatMap((e) => e.types || []))),
    tags: Array.from(new Set(events.flatMap((e) => e.tags || []))),
    form: firstEvent?.form || 'Individual',
    organisers:
      allOrganisers.length > 0 ? allOrganisers : group.organisers?.map((name) => ({ name, country_code: 'SWE' })) || [],
    officials: events.flatMap((e) => e.officials || []),
    classes: allClasses,
    documents: allDocuments,
    urls: allUrls,
    information: infoParts.length > 0 ? infoParts.join('\n\n') : null,
    region: group.region || firstEvent?.region || null,
    punching_system: firstEvent?.punching_system || null,
    races: allRaces,
    entry_deadlines: allDeadlines,
    year: parseInt(group.start_date.substring(0, 4), 10),
    countryCode: firstEvent?.countryCode || 'SWE',
    isFeatured: true,
  };
}
