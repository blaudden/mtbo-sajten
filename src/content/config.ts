import { z, defineCollection, reference } from 'astro:content';
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
    author: reference('authors').optional(),

    metadata: z.object({ canonical: z.string().optional(), lang: z.string().optional() }).optional(),
  }),
});

const authorsCollection = defineCollection({
  loader: glob({ base: 'src/content/authors/', pattern: ['**/*.md', '**/*.mdoc'] }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    avatar: z.string(),
  }),
});

export const collections = {
  posts: postCollection,
  authors: authorsCollection,
};
