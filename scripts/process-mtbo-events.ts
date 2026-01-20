import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const DATA_URL = 'https://raw.githubusercontent.com/blaudden/mtbo-scraper/main/mtbo_events.json';
const OUTPUT_DIR = 'src/content/events';

// Define Zod schema for validation of INCOMING data
const IncomingEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  organizers: z.array(z.string()).optional(),
  country: z.string().optional(),
  status: z.string().optional(),
  url: z.string(),
  info_text: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  contact: z.record(z.unknown()).optional(),
  classes: z.array(z.string()).optional(),
  races: z.array(z.any()).optional(),
});

const IncomingDataSchema = z.array(IncomingEventSchema);

async function processEvents() {
  console.log(`Fetching events from ${DATA_URL}...`);

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Validate incoming data
    const parseResult = IncomingDataSchema.safeParse(rawData);

    if (!parseResult.success) {
      console.error('Validation failed for incoming data:', parseResult.error.format());
      throw new Error('Incoming data validation failed');
    }

    const events = parseResult.data;
    console.log(`Found ${events.length} valid events.`);

    // Define specific mapped output type
    interface CleanEvent {
      id: string;
      name: string;
      start_date: string;
      end_date: string;
      organizers: string[];
      country: string;
      url: string;
      region: string;
      classification: string;
      distance: string;
      isCancelled: boolean;
      // Keep attributes loosely typed if needed for debugging but UI should use strict fields above
      attributes?: Record<string, unknown>;
    }

    const eventsByYear: Record<string, CleanEvent[]> = {};
    let cancelledCount = 0;

    events.forEach((event) => {
      // Determine year from start_date
      const year = event.start_date.split('-')[0];

      // Normalize Attributes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attrs = (event.attributes || {}) as Record<string, any>;

      const region = (attrs.Region || attrs.Regions || '').toString();
      const classification = (attrs['Event classification'] || attrs['Event type'] || '').toString();
      const distance = (attrs['Race distance'] || '').toString();

      // Improved Cancellation Check
      // Check both top-level status and attributes.Status in a case-insensitive way
      const statuses = [event.status, attrs.Status, attrs.status].map((s) =>
        String(s || '')
          .toLowerCase()
          .trim()
      );

      const isCancelled = statuses.includes('cancelled');
      if (isCancelled) cancelledCount++;

      const cleanEvent: CleanEvent = {
        id: event.id,
        name: event.name,
        start_date: event.start_date,
        end_date: event.end_date,
        organizers: event.organizers || [],
        country: event.country || '',
        url: event.url,
        region,
        classification,
        distance,
        isCancelled,
        attributes: event.attributes, // Keep original just in case, but optional
      };

      if (!eventsByYear[year]) {
        eventsByYear[year] = [];
      }
      eventsByYear[year].push(cleanEvent);
    });

    console.log(`Processed ${events.length} events. Identified ${cancelledCount} cancelled events.`);

    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    Object.keys(eventsByYear).forEach((year) => {
      const yearEvents = eventsByYear[year];
      // Sort by date
      yearEvents.sort((a, b) => a.start_date.localeCompare(b.start_date));

      const outputPath = join(OUTPUT_DIR, `${year}.json`);
      writeFileSync(outputPath, JSON.stringify(yearEvents, null, 2));
      console.log(`Wrote ${yearEvents.length} events to ${outputPath}`);
    });

    // Write metadata to same directory as events
    const metadata = {
      lastUpdated: new Date().toISOString(),
      totalEvents: events.length,
    };
    writeFileSync(join(OUTPUT_DIR, 'events-metadata.json'), JSON.stringify(metadata, null, 2));
    console.log(`Wrote metadata to ${join(OUTPUT_DIR, 'events-metadata.json')}`);
  } catch (error) {
    console.error('Error processing events:', error);
    process.exit(1);
  }
}

processEvents();
