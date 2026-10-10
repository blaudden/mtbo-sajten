import type { EventGroup, ScraperEvent } from '~/types/events';
import groupsData from '~/data/events/groups.json';
import { getEntry, type CollectionEntry } from 'astro:content';

const groups: EventGroup[] = groupsData as EventGroup[];

/**
 * Returns all configured event groups.
 */
export async function loadAllEventGroups(): Promise<EventGroup[]> {
  return groups;
}

/**
 * Finds an event group by its unique slug.
 */
export async function getEventGroupBySlug(slug: string): Promise<EventGroup | undefined> {
  return groups.find((g) => g.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * Finds the parent event group for a given event ID (e.g. "SWE_57010").
 */
export async function getEventGroupByEventId(eventId: string): Promise<EventGroup | undefined> {
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
