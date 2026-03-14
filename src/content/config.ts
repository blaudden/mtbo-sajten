import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ScraperEvent } from '../types/events';

const postCollection = defineCollection({
  loader: glob({ base: 'src/content/posts/', pattern: ['**/*.md', '**/  *.mdx', '**/*.mdoc'] }),
  schema: z.object({
    publishDate: z.date(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),
    evergreen: z.boolean().optional(),
    hideFromMain: z.boolean().optional(),

    title: z.string(),
    subtitle: z.string().optional(),
    excerpt: z.string().optional(),
    image: z.string(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: z.object({ canonical: z.string().optional(), lang: z.string().optional() }).optional(),
  }),
});

const entryCountSchema = z
  .object({
    total: z.number().optional(),
    current: z.number().optional(),
  })
  .nullable()
  .optional();

const fingerprintSchema = z.object({
  type: z.string(),
  value: z.string(),
});

const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['Planned', 'Applied', 'Proposed', 'Sanctioned', 'Canceled', 'Rescheduled']),
  original_status: z.string().nullable().optional(),
  types: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  form: z.string().nullable().optional(),
  organisers: z
    .array(
      z.object({
        name: z.string(),
        country_code: z.string().nullable().optional(),
      })
    )
    .optional(),
  officials: z
    .array(
      z.object({
        role: z.string(),
        name: z.string(),
      })
    )
    .optional(),
  classes: z.array(z.string()).optional(),
  documents: z
    .array(
      z.object({
        type: z.string(),
        title: z.string(),
        url: z.string(),
        published_time: z.string().nullable().optional(),
      })
    )
    .optional(),
  urls: z
    .array(
      z.object({
        type: z.string(),
        url: z.string(),
        title: z.string().nullable().optional(),
        last_updated_at: z.string().nullable().optional(),
      })
    )
    .optional(),
  information: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  punching_system: z.string().nullable().optional(),
  races: z.array(
    z.object({
      race_number: z.number(),
      name: z.string().optional(),
      datetimez: z.string(),
      discipline: z.string(),
      night_or_day: z.string().nullable().optional(),
      position: z
        .object({
          lat: z.number(),
          lng: z.number(),
        })
        .nullable()
        .optional(),
      areas: z
        .array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            polygon: z.array(z.array(z.number())).nullable().optional(),
          })
        )
        .optional(),
      documents: z.array(z.any()).optional(),
      urls: z.array(z.any()).optional(),
      entry_counts: entryCountSchema,
      start_counts: entryCountSchema,
      result_counts: entryCountSchema,
      fingerprints: z.array(fingerprintSchema).optional(),
    })
  ),
  entry_deadlines: z
    .array(
      z.object({
        type: z.string(),
        datetimez: z.string(),
      })
    )
    .optional(),

  // Pre-computed fields
  year: z.number(),
  slug: z.string(),
  countryCode: z.string(),
  isFeatured: z.boolean(),
});

const eventCollection = defineCollection({
  loader: {
    name: 'mtbo-events-loader',
    load: async ({ store, logger, meta }) => {
      const indexPath = path.join(process.cwd(), 'src/data/events/mtbo_events.json');
      if (!fs.existsSync(indexPath)) {
        logger.warn(`Event index not found at ${indexPath}`);
        return;
      }

      // Helper for SHA-256 digest
      const getDigest = (obj: object) => createHash('sha256').update(JSON.stringify(obj)).digest('hex');

      // Helper for figuring out country code (logic moved from events.ts)
      const resolveCountryCode = (event: ScraperEvent) => {
        if (event.organisers && event.organisers.length > 0) {
          for (const org of event.organisers) {
            if (org.country_code) return org.country_code;
          }
        }
        const underscoreIdx = event.id.indexOf('_');
        const source = underscoreIdx > 0 ? event.id.substring(0, underscoreIdx) : event.id;
        return source === 'IOF' || source === 'MAN' ? 'INT' : source;
      };

      // Helper for featured status
      const HIGH_LEVEL_IOF_TYPES = [
        'World Championships',
        'European Championships',
        'World Cup',
        'Junior World Championships',
      ];
      const isFeatured = (event: ScraperEvent) => {
        const underscoreIdx = event.id.indexOf('_');
        const source = underscoreIdx > 0 ? event.id.substring(0, underscoreIdx) : event.id;
        if (source === 'SWE' || source === 'MAN') return true;
        if (source === 'IOF' && event.types) {
          return event.types.some((t: string) => HIGH_LEVEL_IOF_TYPES.includes(t));
        }
        return false;
      };

      try {
        const indexStr = await fs.promises.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexStr);

        const loadPromises = Object.keys(index.partitions).map(async (yearStr) => {
          const yearPath = path.join(process.cwd(), `src/data/events/${yearStr}/events.json`);
          if (!fs.existsSync(yearPath)) return;

          const stats = await fs.promises.stat(yearPath);
          const lastModified = stats.mtimeMs;
          const cachedModified = meta.get(`partition-${yearStr}`);

          // Skip partition parsing if it hasn't changed
          if (typeof cachedModified === 'number' && cachedModified === lastModified) {
            return;
          }

          const dataStr = await fs.promises.readFile(yearPath, 'utf-8');
          const data = JSON.parse(dataStr);

          if (data.events) {
            for (const event of data.events as ScraperEvent[]) {
              const enrichedEvent = {
                ...event,
                year: parseInt(event.start_time.substring(0, 4), 10),
                slug: event.id.toLowerCase().replace(/_/g, '-'),
                countryCode: resolveCountryCode(event),
                isFeatured: isFeatured(event),
              };

              store.set({
                id: event.id,
                data: enrichedEvent,
                digest: getDigest(enrichedEvent),
              });
            }
          }

          meta.set(`partition-${yearStr}`, lastModified.toString());
        });

        await Promise.all(loadPromises);
        logger.info(`MTBO Events Loader: Finished processing partitions.`);
      } catch (e) {
        logger.error(`Failed to load events: ${e}`);
      }
    },
  },
  schema: eventSchema,
});

export const collections = {
  posts: postCollection,
  events: eventCollection,
};
