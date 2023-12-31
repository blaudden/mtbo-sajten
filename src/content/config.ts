import { z, defineCollection } from 'astro:content';

const postCollection = defineCollection({
  schema: z.object({
    publishDate: z.string(),
    updateDate: z.string().optional(),
    draft: z.boolean().optional(),
    evergreen: z.boolean().optional(),

    title: z.string(),
    subtitle: z.string().optional(),
    excerpt: z.string().optional(),
    image: z.string(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: z.object({ canonical: z.string().optional() }).optional(),
  }),
});

export const collections = {
  posts: postCollection,
};
