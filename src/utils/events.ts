/**
 * Utility functions for working with MTBO event data.
 */

import type { ScraperEvent, ScraperUmbrellaIndex, RaceWithEvent, ScraperRace } from '~/types/events';
import fs from 'node:fs';
import path from 'node:path';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

// --- Configuration ---

/** Minimum year to generate pages for */
export const MIN_YEAR = 2022;

/** IOF event types considered "high-level international" for the landing page */
export const HIGH_LEVEL_IOF_TYPES = [
  'World Championships',
  'European Championships',
  'World Cup',
  'Junior World Championships',
];

// --- Data loading ---

/**
 * Retrieves the base URLs for event sources (e.g., SWE, IOF).
 * Metadata is extracted from the umbrella index.
 */
export function getSourceUrls(): Record<string, string> {
  const sources: Record<string, string> = {};

  try {
    const index = loadUmbrellaIndex();
    if (index.sources) {
      for (const [code, info] of Object.entries(index.sources)) {
        sources[code] = info.url;
      }
    }
  } catch (e) {
    console.warn('Failed to load sources from umbrella index', e);
  }

  return sources;
}

/**
 * Loads the umbrella index containing partition information.
 */
export function loadUmbrellaIndex(): ScraperUmbrellaIndex {
  const indexPath = path.join(process.cwd(), 'src/data/events/mtbo_events.json');
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

/**
 * Loads events for a specific year from Astro collections.
 */
export async function loadEventsForYear(year: number): Promise<ScraperEvent[]> {
  const entries = await getCollection('events', ({ data }) => data.year === year);
  return entries.map((e) => e.data).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/**
 * Loads all events across all available years.
 * Returns an array of events.
 */
export async function loadAllEvents(): Promise<ScraperEvent[]> {
  const entries = await getCollection('events');
  return entries.map((e) => e.data);
}

/**
 * Lists all years present in the event data index.
 */
export function getAvailableYears(): number[] {
  const index = loadUmbrellaIndex();
  return Object.keys(index.partitions)
    .map(Number)
    .filter((y) => y >= MIN_YEAR)
    .sort();
}

// --- Slug & ID helpers ---

/** Convert event.id to URL slug: "SWE_54359" → "swe-54359" */
export function eventToSlug(event: ScraperEvent): string {
  return event.slug;
}

/** Convert URL slug back to event.id: "swe-54359" → "SWE_54359" */
export function slugToEventId(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_');
}

/** Get the source code from an event id: "SWE_54359" → "SWE" */
export function getEventSource(event: ScraperEvent): string {
  const underscoreIdx = event.id.indexOf('_');
  return underscoreIdx > 0 ? event.id.substring(0, underscoreIdx) : event.id;
}

/** Find an event by slug across all loaded data */
export async function getEventBySlug(slug: string): Promise<ScraperEvent | undefined> {
  const eventId = slugToEventId(slug);
  const entry = (await getEntry('events', eventId)) as CollectionEntry<'events'> | undefined;
  return entry ? (entry.data as unknown as ScraperEvent) : undefined;
}

// --- Country / organiser helpers ---

/** Resolve the primary country code for an event (from organisers or event id) */
export function resolveCountryCode(event: ScraperEvent): string {
  return event.countryCode;
}

/** Get primary organiser name */
export function getOrganiserName(event: ScraperEvent): string {
  if (!event.organisers || event.organisers.length === 0) return '';
  return [...event.organisers]
    .reverse()
    .map((o) => o.name)
    .join(', ');
}

// --- External URL helpers ---

/** Build the external Eventor URL for this event */
export function resolveExternalUrl(event: ScraperEvent): string | null {
  const source = getEventSource(event);
  const baseUrl = getSourceUrls()[source];

  // Find the Path URL
  const pathUrl = event.urls?.find((u) => u.type === 'Path');
  if (pathUrl && baseUrl) {
    return `${baseUrl}/${pathUrl.url}`;
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
 * Resolve a relative URL (e.g., from documents) based on the event's source.
 * If URL is already absolute, returns it as-is.
 */
export function resolveRelativeUrl(url: string, event: ScraperEvent): string {
  if (!url || url.startsWith('http')) return url;

  const source = getEventSource(event);
  const baseUrl = getSourceUrls()[source];

  if (!baseUrl) return url;

  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
}

// --- Date formatting ---

/**
 * Format a race datetimez string for display in Swedish locale.
 * Input: "2026-08-26T10:00:00+02:00"
 * Output: "ons 26 aug" or "26 aug 2026" etc.
 */
export function formatRaceDate(datetimez: string, options?: { includeYear?: boolean; includeTime?: boolean }): string {
  const date = new Date(datetimez);

  // If the time is midnight (00:00), the scraper didn't have a specific time
  const isDateOnly = datetimez.includes('T00:00:00');
  const includeTime = options?.includeTime ?? true;

  const formatOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Stockholm',
  };

  if (options?.includeYear) {
    formatOptions.year = 'numeric';
  }

  let formatted = date.toLocaleDateString('sv-SE', formatOptions);

  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  // Add time if available and requested
  if (!isDateOnly && includeTime) {
    const time = date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm',
    });
    formatted += ` ${time}`;
  }

  return formatted;
}

/**
 * Get the display name for a race.
 * Rule: only races which have name equal to discipline should have the race name prefixed with event name.
 */
export function getRaceDisplayName(race: ScraperRace, event: ScraperEvent): string {
  const eventName = event.name;
  const raceName = race.name || '';

  // Use "Event Name - Race Name" if race name is different from event name
  if (raceName && raceName.toLowerCase() !== eventName.toLowerCase()) {
    return `${eventName} - ${raceName}`;
  }

  // Otherwise, just return the event name
  return eventName;
}

/**
 * Format event date range for display.
 * Single-day: "26 aug 2026"
 * Multi-day: "25–30 aug 2026"
 */
export function formatEventDateRange(startTime: string, endTime: string): string {
  // Use T12:00:00Z and UTC formatting to avoid any timezone boundary shifts
  const start = new Date(startTime.includes('T') ? startTime : startTime + 'T12:00:00Z');
  const end = new Date(endTime.includes('T') ? endTime : endTime + 'T12:00:00Z');
  const formatOpts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };

  const startDay = start.toLocaleDateString('sv-SE', { day: 'numeric', ...formatOpts });
  const endDay = end.toLocaleDateString('sv-SE', { day: 'numeric', ...formatOpts });

  const formatMonth = (d: Date) => d.toLocaleDateString('sv-SE', { month: 'long', ...formatOpts });
  const formatYear = (d: Date) => d.toLocaleDateString('sv-SE', { year: 'numeric', ...formatOpts });

  const startMonth = formatMonth(start);
  const startYear = formatYear(start);
  const endMonth = formatMonth(end);
  const endYear = formatYear(end);

  if (startTime.split('T')[0] === endTime.split('T')[0]) {
    return `${startDay} ${startMonth} ${startYear}`;
  }

  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
  }

  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${startMonth} ${startYear}`;
  }

  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${startYear}`;
}

// --- Status helpers ---

/**
 * Returns the time status of a race relative to a build date.
 * current-week: Falls between start (Monday 00:00) and end (Sunday 23:59) of the ISO week
 * past: Before start of current week
 * future: After end of current week
 */
export function getRaceTimeStatus(
  raceDateStr: string,
  buildDate: Date = new Date()
): 'past' | 'current-week' | 'future' {
  const raceDate = new Date(raceDateStr);
  const raceTime = raceDate.getTime();

  // Get start of week (Monday 00:00:00)
  const startOfWeek = new Date(buildDate);
  const day = startOfWeek.getDay();
  // Adjust so Monday is 0, Sunday is 6
  const diffToMonday = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get end of week (Sunday 23:59:59.999)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfWeekTime = startOfWeek.getTime();
  const endOfWeekTime = endOfWeek.getTime();

  if (raceTime < startOfWeekTime) {
    return 'past';
  } else if (raceTime > endOfWeekTime) {
    return 'future';
  } else {
    return 'current-week';
  }
}

// --- Discipline helpers ---

const DISCIPLINE_ABBREV: Record<string, string> = {
  Sprint: 'S',
  Middle: 'M',
  Long: 'L',
  'Ultra Long': 'UL',
  'Mass start': 'MS',
  Relay: 'R',
  Training: 'T',
  Other: '–',
};

const DISCIPLINE_TRANSLATIONS: Record<string, string> = {
  Sprint: 'Sprint',
  Middle: 'Medel',
  Long: 'Lång',
  'Ultra Long': 'Ultralång',
  'Mass start': 'Masstart',
  Relay: 'Stafett',
  Training: 'Träning',
  Other: 'Övrigt',
};

/** Get discipline abbreviation */
export function disciplineAbbrev(discipline: string): string {
  return DISCIPLINE_ABBREV[discipline] || (discipline ? discipline.charAt(0) : '–');
}

/** Get Swedish translation for discipline */
export function translateDiscipline(discipline: string): string {
  return DISCIPLINE_TRANSLATIONS[discipline] || discipline;
}

// --- Country flag helpers ---

/** Map of 3-letter ISO country codes to 2-letter codes for emoji flags */
const COUNTRY_CODE_MAP: Record<string, string> = {
  SWE: 'SE',
  NOR: 'NO',
  FIN: 'FI',
  DEN: 'DK',
  DNK: 'DK',
  GBR: 'GB',
  FRA: 'FR',
  GER: 'DE',
  DEU: 'DE',
  ITA: 'IT',
  ESP: 'ES',
  PRT: 'PT',
  POL: 'PL',
  CZE: 'CZ',
  AUT: 'AT',
  CHE: 'CH',
  SUI: 'CH',
  HUN: 'HU',
  ROU: 'RO',
  BGR: 'BG',
  HRV: 'HR',
  SVK: 'SK',
  SVN: 'SI',
  LTU: 'LT',
  LVA: 'LV',
  EST: 'EE',
  BLR: 'BY',
  UKR: 'UA',
  RUS: 'RU',
  AUS: 'AU',
  JPN: 'JP',
  KOR: 'KR',
  CHN: 'CN',
  ISR: 'IL',
  BRA: 'BR',
  USA: 'US',
  CAN: 'CA',
  NZL: 'NZ',
  TUR: 'TR',
  INT: '🌐',
  IOF: '🌐',
};

/** Convert 3-letter country code to emoji flag */
export function countryCodeToFlag(code: string): string {
  if (!code) return '';
  if (code === 'INT' || code === 'IOF') return '🌐';

  const twoLetter = COUNTRY_CODE_MAP[code.toUpperCase()];
  if (!twoLetter) {
    // Try to infer from first two letters
    const upper = code.toUpperCase();
    if (upper.length >= 2) {
      return (
        String.fromCodePoint(0x1f1e6 + upper.charCodeAt(0) - 65) +
        String.fromCodePoint(0x1f1e6 + upper.charCodeAt(1) - 65)
      );
    }
    return code;
  }

  if (twoLetter.length > 2) return twoLetter; // already an emoji

  return (
    String.fromCodePoint(0x1f1e6 + twoLetter.charCodeAt(0) - 65) +
    String.fromCodePoint(0x1f1e6 + twoLetter.charCodeAt(1) - 65)
  );
}

/** Get friendly country name */
export function countryCodeToName(code: string): string {
  const names: Record<string, string> = {
    SWE: 'Sverige',
    NOR: 'Norge',
    FIN: 'Finland',
    DEN: 'Danmark',
    DNK: 'Danmark',
    GBR: 'Storbritannien',
    FRA: 'Frankrike',
    GER: 'Tyskland',
    DEU: 'Tyskland',
    ITA: 'Italien',
    ESP: 'Spanien',
    PRT: 'Portugal',
    POL: 'Polen',
    CZE: 'Tjeckien',
    AUT: 'Österrike',
    CHE: 'Schweiz',
    SUI: 'Schweiz',
    HUN: 'Ungern',
    BGR: 'Bulgarien',
    TUR: 'Turkiet',
    LTU: 'Litauen',
    EST: 'Estland',
    AUS: 'Australien',
    INT: 'Internationellt',
    IOF: 'Internationellt',
  };
  return names[code.toUpperCase()] || code;
}

// --- Race listing builders ---

/** Flatten events into race-level rows for listing */
export function buildRaceRows(events: ScraperEvent[]): RaceWithEvent[] {
  const rows: RaceWithEvent[] = [];

  for (const event of events) {
    const slug = eventToSlug(event);
    const countryCode = resolveCountryCode(event);
    const organiser = getOrganiserName(event);
    const externalUrl = resolveExternalUrl(event);

    for (const race of event.races) {
      rows.push({
        race,
        event,
        slug,
        countryCode,
        organiser,
        externalUrl,
      });
    }
  }

  // Sort by race date
  rows.sort((a, b) => new Date(a.race.datetimez).getTime() - new Date(b.race.datetimez).getTime());

  return rows;
}

/** Get all races for a year */
export async function getRacesForYear(year: number): Promise<RaceWithEvent[]> {
  const events = await loadEventsForYear(year);
  return buildRaceRows(events);
}

/**
 * Get races for the landing page: -1 month to +12 months,
 * SWE events + high-level IOF events.
 */
export async function getRacesForLanding(
  now: Date = new Date()
): Promise<{ races: RaceWithEvent[]; from: Date; to: Date }> {
  const from = new Date(now);
  from.setMonth(from.getMonth() - 1);
  const to = new Date(now);
  to.setFullYear(to.getFullYear() + 1);

  // Filter events by date range directly in the collection query
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const relevantEvents = await getCollection('events', ({ data }) => {
    return data.start_time >= fromStr && data.start_time <= toStr;
  });

  const allEvents = relevantEvents.map((e) => e.data);

  // Build rows and add the isFeatured flag
  const rows = buildRaceRows(allEvents).map((row) => ({
    ...row,
    isFeatured: row.event.isFeatured,
  }));

  // Secondary fine-grained filter by date range on races
  const filteredRaces = rows.filter((r) => {
    const raceDate = new Date(r.race.datetimez);
    return raceDate >= from && raceDate <= to;
  });

  return { races: filteredRaces, from, to };
}

/** Get unique country codes from a set of races */
export function getCountriesFromRaces(races: RaceWithEvent[]): string[] {
  const countries = new Set<string>();
  for (const r of races) {
    countries.add(r.countryCode);
  }
  // Sort with SWE first, then alphabetically
  return [...countries].sort((a, b) => {
    if (a === 'SWE') return -1;
    if (b === 'SWE') return 1;
    return a.localeCompare(b);
  });
}

/** Get all event slugs across all years (for getStaticPaths) */
export async function getAllEventSlugs(): Promise<Array<{ slug: string; year: number }>> {
  const events = await loadAllEvents();
  return events.map((event) => ({
    slug: event.slug,
    year: event.year,
  }));
}

// --- Landing page year helper ---

/** Check if a slug looks like a year */
export function isYearSlug(slug: string): boolean {
  return /^\d{4}$/.test(slug);
}

/** Check if a slug is a valid event slug (not a year) */
export function isEventSlug(slug: string): boolean {
  return !isYearSlug(slug) && slug.length > 0;
}

/**
 * Filter races by country code.
 * Used to offload logic from components.
 */
export function filterRacesByCountry(races: RaceWithEvent[], countryCode: string | null): RaceWithEvent[] {
  if (!countryCode || countryCode === 'ALL') return races;
  return races.filter((r) => r.countryCode === countryCode);
}

// --- Smart Icons Helper ---

export type SmartIconInfo = {
  type: 'image' | 'icon';
  source?: 'livelox' | 'eventor-swe' | 'eventor-iof' | 'eventor-nor';
  name?: string;
};

/**
 * Identify the appropriate icon or branded image for a URL and document type.
 */
export function getSmartIconInfo(urlStr: string, title?: string, docType?: string): SmartIconInfo {
  const tTitle = (title || '').toLowerCase();
  const tType = (docType || '').toLowerCase();

  if (tTitle.includes('livelox') || tType === 'livelox') {
    return { type: 'image', source: 'livelox' };
  }

  try {
    const url = new URL(urlStr, 'https://dummy.com'); // handle relative paths safely
    const hostname = url.hostname.toLowerCase();

    if (hostname.endsWith('livelox.com')) return { type: 'image', source: 'livelox' };
    if (hostname.endsWith('eventor.orientering.se')) return { type: 'image', source: 'eventor-swe' };
    if (hostname.endsWith('eventor.orienteering.org')) return { type: 'image', source: 'eventor-iof' };
    if (hostname.endsWith('eventor.orientering.no')) return { type: 'image', source: 'eventor-nor' };
    if (hostname.endsWith('winsplits.se') || hostname.endsWith('obasen.orientering.se'))
      return { type: 'icon', name: 'tabler:clock' };
  } catch {
    // ignore
  }

  // Fallback by title or document type
  if (tTitle.includes('winsplit') || tType === 'winsplits') return { type: 'icon', name: 'tabler:clock' };
  if (tType.startsWith('bulletin') || tTitle.startsWith('bulletin')) return { type: 'icon', name: 'tabler:book' };
  if (tTitle.includes('pm') || tType === 'pm') return { type: 'icon', name: 'tabler:info-circle' };
  if (tTitle.includes('inbjudan') || tType === 'inbjudan') return { type: 'icon', name: 'tabler:mail-opened' };
  if (tTitle.includes('startlista') || tType === 'startlist') return { type: 'icon', name: 'tabler:list-numbers' };
  if (tTitle.includes('resultat') || tType === 'resultlist') return { type: 'icon', name: 'tabler:medal' };
  if (tTitle.includes('anmälan') || tType === 'entry') return { type: 'icon', name: 'tabler:user-plus' };

  return { type: 'icon', name: 'tabler:file-text' };
}
