import { config, fields, collection } from '@keystatic/core';
import type { LocalConfig, GitHubConfig } from '@keystatic/core';

// Storage strategy
const storage: LocalConfig['storage'] | GitHubConfig['storage'] =
  process.env.NODE_ENV === 'development'
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: {
          owner: process.env.GIT_REPO_OWNER!,
          name: process.env.GIT_REPO_SLUG!,
        },
      };

const posts = collection({
  label: 'Posts',
  slugField: 'title',
  path: 'src/content/posts/**/',
  entryLayout: 'content',
  format: { contentField: 'content' },
  schema: {
    title: fields.slug({
      name: {
        label: 'Title',
        description: 'The title of the post',
      },
    }),
    draft: fields.checkbox({
      label: 'Draft',
      description: 'Set this post as draft to prevent it from being published',
    }),
    publishDate: fields.date({
      label: 'Published date',
      validation: { isRequired: true },
      defaultValue: { kind: 'today' },
    }),
    excerpt: fields.text({ label: 'Excerpt', multiline: true }),
    image: fields.image({
      label: 'Image',
      validation: { isRequired: true },
      directory: 'src/assets/images/posts',
      publicPath: '~/assets/images/posts',
    }),
    category: fields.text({ label: 'Category' }),
    tags: fields.array(fields.text({ label: 'Tag' }), {
      label: 'Tag',
      itemLabel: (props) => props.value,
    }),
    author: fields.text({ label: 'Author' }),
    content: fields.document({
      label: 'Content',
      formatting: true,
      dividers: true,
      links: true,
      images: {
        directory: 'src/assets/images/posts',
        publicPath: '~/assets/images/posts',
      },
    }),
    metadata: fields.object({
      canonical: fields.url({
        label: 'Canonical URL',
        description: 'Fylls i om samma artikel finns publiserad på annat ställe',
      }),
    }),
  },
});

export default config({
  storage,
  collections: {
    posts,
  },
  singletons: {},
});
