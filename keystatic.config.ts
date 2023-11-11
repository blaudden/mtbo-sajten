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

// Location of embedded images in Markdoc differ locally vs. online
const embeddedImagePubPath: string =
  process.env.NODE_ENV === 'development'
    ? 'src/assets/images/posts' :
      '~/assets/images/posts';
console.log(embeddedImagePubPath);

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
        description:
          'Artikelns titel. Visas högst upp i artikeln, på alla ställen där artikeln länkas och när den delas. En slug skapas från titeln och blir artikelns sökväg på sajten. För artiklar på engelska så läggs en/ till framför slug.',
        validation: { length: { min: 5, max: 64 } },
      },
    }),
    draft: fields.checkbox({
      label: 'Draft',
      description: 'Sätt artikel som draft om den inte ska publiceras ännu',
    }),
    evergreen: fields.checkbox({
      label: 'Evergreen',
      description: 'Sätt artikel som evergreen, den får då inget datum',
    }),
    publishDate: fields.date({
      label: 'Published date',
      validation: { isRequired: true },
      defaultValue: { kind: 'today' },
      description: 'Datumet då artikeln publicerades. Visas högst upp i artikeln.',
    }),
    excerpt: fields.text({
      label: 'Excerpt',
      multiline: true,
      validation: { length: { min: 60, max: 250 } },
      description:
        'Artikelns beskrvning. Texten visas högst upp i artikeln, på alla ställen där artiklen länkas och när den delas. Minst 60 tecken och högst 250.',
    }),
    image: fields.image({
      label: 'Image',
      validation: { isRequired: true },
      directory: 'src/assets/images/posts',
      publicPath: '~/assets/images/posts',
      description: 'Bild som visas högst upp på sidan, på alla ställen där artikeln länkas och när den delas',
    }),
    category: fields.select({
      label: 'Category',
      description:
        'Det ämne som artikeln hamnar om, det här påverkar hur artikeln visas på sajten. Dom flesta artiklar har ingen kategori.',
      options: [
        { label: '', value: '' },
        { label: 'Svenska Cupen', value: 'svenska-cupen' },
        { label: 'O-Ringen', value: 'oringen' },
      ],
      defaultValue: '',
    }),
    tags: fields.array(fields.text({ label: 'Tag' }), {
      label: 'Tag',
      description:
        'Taggar för artikeln, används för att styra var och hur dom visas på sajten. tex. grupperas alla artiklar om Svenska Cupen 2024 med taggen svenska-cupen-2024 ',
      itemLabel: (props) => props.value,
    }),
    author: fields.text({
      label: 'Author',
      description: 'Artikelns författare, visas ännu inte någonstans på sajten men kan vara bra att ha. ',
    }),
    content: fields.document({
      label: 'Content',
      formatting: true,
      dividers: true,
      links: true,
      images: {
        directory: 'src/assets/images/posts',
        publicPath: embeddedImagePubPath,
      },
    }),
    metadata: fields.object({
      canonical: fields.url({
        label: 'Canonical URL',
        description:
          'Fylls i om samma artikel finns publicerad på annat ställe och den artikel som finns på sajten är en kopia, den pekar då på originalet ',
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
