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

export type ScraperCounts = Record<string, number>;

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
  /** Optional direct external URL (e.g. Eventor link) for this specific race in a grouped arrangement */
  external_url?: string | null;
  /** Optional bilingual location/arena note for this specific race/stage */
  location_note?: {
    sv?: string;
    en?: string;
  };
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
  is_date_preliminary?: boolean;

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

/** Bilingual editorial text and notes for an event or grouped weekend */
export interface EventAugmentationLocaleContent {
  title: string;
  subtitle?: string;
  /** Paragraphs of editorial description */
  paragraphs: string[];
  /** Optional registration & practical entry information callout */
  registration_info?: {
    title?: string;
    paragraphs: string[];
    cta_label?: string;
    cta_url?: string;
  };
  /**
   * Optional per-race location or stage notes keyed by ScraperEvent ID (e.g. "SWE_60899")
   * for multi-event weekends, or by "EventID:RaceNumber" (e.g. "SWE_59350:1") for multi-stage events.
   */
  race_notes?: Record<string, string>;
}

/** Augmentation or multi-event weekend group definition (Astro 'augmentations' collection entry) */
export interface EventAugmentation {
  /** Primary canonical slug under /events/[slug] (e.g. "mtbo-camp-skane-2027" or "swe-59350") */
  slug: string;
  /** Optional additional alias slugs that also resolve to this augmented event (e.g. ["oringen-stockholm-2027"]) */
  aliases?: string[];
  /** Upstream scraper event IDs belonging to this weekend/event */
  event_ids: string[];
  start_date: string;
  end_date: string;
  organisers?: string[];
  region?: string;
  website?: string;
  /** Optional future photo album URL */
  photo_album_url?: string;
  /** Optional custom links (e.g. previous Livelox maps, extra websites) */
  custom_links?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  content: {
    sv: EventAugmentationLocaleContent;
    en?: EventAugmentationLocaleContent;
  };
}

/**
 * Resolved domain model where AugmentedEvent owns 1..* ScraperEvent instances
 * (each owning 1..* ScraperRace instances) and 1..2 LocaleContent languages (sv, en).
 */
export interface AugmentedEvent extends EventAugmentation {
  /** The 1..* child ScraperEvent instances owned by this AugmentedEvent */
  events: ScraperEvent[];
}
