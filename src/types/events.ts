/**
 * TypeScript interfaces for MTBO event data from the scraper.
 * Based on mtbo-scraper schema v2.0.
 */

// --- Scraper data types (matching JSON structure) ---

export interface ScraperSource {
  country_code: string; // 3-letter ISO (ie. SWE, NOR, IOF)
  name: string;
  url: string;
}

export interface ScraperMeta {
  sources: ScraperSource[];
}

export interface ScraperOrganiser {
  name: string;
  country_code?: string | null; // 3-letter ISO
}

export interface ScraperDocument {
  type: string; // Bulletin, EmbargoMap, Other
  title: string;
  url: string;
  published_time?: string | null;
}

export interface ScraperUrl {
  type: string; // Website, Path, StartList, ResultList, EntryList, Livelox, Series, LocalStartList
  url: string;
  title?: string | null;
  last_updated_at?: string | null;
}

export interface ScraperPosition {
  lat: number;
  lng: number;
}

export interface ScraperCounts {
  total?: number;
  current?: number;
}

export interface ScraperRace {
  race_number: number;
  name?: string;
  datetimez: string; // ISO 8601 with timezone
  discipline: string; // Sprint, Middle, Long, Ultra Long, Training, Other
  night_or_day?: string | null;
  position?: ScraperPosition | null;
  areas?: Array<{ lat: number; lng: number; polygon?: number[][] | null }>;
  documents?: ScraperDocument[];
  urls?: ScraperUrl[];
  entry_counts?: ScraperCounts | null;
  start_counts?: ScraperCounts | null;
  result_counts?: ScraperCounts | null;
}

export interface ScraperEntryDeadline {
  type: string;
  datetimez: string;
}

export interface ScraperEvent {
  id: string; // e.g. "SWE_54359", "IOF_8277"
  name: string;
  start_time: string; // date string YYYY-MM-DD
  end_time: string; // date string YYYY-MM-DD
  status: 'Planned' | 'Applied' | 'Proposed' | 'Sanctioned' | 'Canceled' | 'Rescheduled';
  original_status?: string | null;
  types?: string[]; // World Championships, World Cup, National, Championship, etc.
  tags?: string[];
  form?: string | null;
  organisers?: ScraperOrganiser[];
  officials?: Array<{ role: string; name: string }>;
  classes?: string[];
  documents?: ScraperDocument[];
  urls?: ScraperUrl[];
  information?: string | null;
  region?: string | null;
  punching_system?: string | null;
  races: ScraperRace[];
  entry_deadlines?: ScraperEntryDeadline[];

  // --- Pre-computed fields for build optimization ---
  /** Pre-calculated year: 2026 */
  year: number;
  /** Pre-calculated slug: "swe-12345" */
  slug: string;
  /** Pre-calculated primary country code: "SWE" */
  countryCode: string;
  /** Pre-calculated featured status for landing page */
  isFeatured: boolean;
}

export interface ScraperEventListWrapper {
  schema_version: string;
  meta: ScraperMeta;
  events: ScraperEvent[];
}

export interface ScraperUmbrellaIndex {
  schema_version: string;
  last_scraped_at: string;
  data_root: string;
  partitions: Record<
    string,
    {
      path: string;
      count: number;
      last_updated_at: string;
    }
  >;
  sources: Record<
    string,
    {
      country_code: string;
      name: string;
      url: string;
      count: number;
      last_updated_at: string;
    }
  >;
}

// --- Derived types for display ---

/** A race with its parent event info attached, used for flat race listings */
export interface RaceWithEvent {
  race: ScraperRace;
  event: ScraperEvent;
  /** Event slug for URL: "swe-54359" */
  slug: string;
  /** Country code of the event (from organiser or event id) */
  countryCode: string;
  /** Primary organiser name */
  organiser: string;
  /** External source URL (Eventor page) */
  externalUrl: string | null;
  /** Whether the event is featured on the landing page default view */
  isFeatured?: boolean;
}

/** Page type for the catch-all route */
export type EventPageType = 'landing' | 'year' | 'detail';
