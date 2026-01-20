import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

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

export const collections = {
  posts: postCollection,
  events: defineCollection({
    loader: glob({ base: 'src/content/events/', pattern: '[0-9]*.json' }),
    schema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        organizers: z.array(z.string()).default([]),
        country: z.string().optional(),
        url: z.string(),

        // Strict Normalized Fields
        region: z.string().default(''),
        classification: z.string().default(''),
        distance: z.string().default(''),
        isCancelled: z.boolean().default(false),

        // Optional raw bag if needed
        attributes: z.record(z.any()).optional(),
        races: z.array(z.any()).optional(),
      })
    ),
  }),
};
