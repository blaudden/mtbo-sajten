import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import compress from 'astro-compress';
import icon from 'astro-icon';
import tasks from './src/utils/tasks.mjs';
import { SITE, APP_BLOG } from './src/utils/config.ts';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import netlify from '@astrojs/netlify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to identify pages that should be excluded from the sitemap based on their content frontmatter
const getExcludedSlugs = () => {
  const excluded = new Set();
  const postsDir = './src/content/posts';
  if (!fs.existsSync(postsDir)) return excluded;

  // Recursive function to walk through the content directory
  const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach((file) => {
      const dirFile = path.join(dir, file);
      try {
        if (fs.statSync(dirFile).isDirectory()) {
          filelist = walkSync(dirFile, filelist);
        } else {
          filelist.push(dirFile);
        }
      } catch {
        // ignore
      }
    });
    return filelist;
  };

  const allFiles = walkSync(postsDir);

  // Process each file to check for "noindex" or external canonical links
  allFiles.forEach((filePath) => {
    if (!filePath.match(/\.(md|mdx|mdoc)$/)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract frontmatter
    const match = content.match(/^---\n([\s\S]+?)\n---/);
    if (match) {
      try {
        const frontmatter = yaml.load(match[1]);
        
        // Check for explicit noindex in robots or metadata
        const isNoIndex =
          frontmatter?.robots?.index === false || frontmatter?.metadata?.robots?.index === false;
        
        let hasExternalCanonical = false;
        const canonical = frontmatter?.metadata?.canonical || frontmatter?.canonical;
        
        // Check if canonical URL points to an external site
        if (canonical && typeof canonical === 'string') {
          const url = canonical.trim();
          if (url.startsWith('http') && !url.includes('mountainbikeorientering.se')) {
            hasExternalCanonical = true;
          }
        }

        // If the page should be excluded, add its slug to the set
        if (isNoIndex || hasExternalCanonical) {
          const filename = path.basename(filePath);
          let slug = filename.replace(/\.(md|mdx|mdoc)$/, '');
          // Handle index files (e.g. /some-post/index.md -> slug: some-post)
          if (slug === 'index') {
            slug = path.basename(path.dirname(filePath));
          }
          excluded.add(slug);
        }
      } catch {
        // ignore yaml error
      }
    }
  });

  return excluded;
};

const excludedSlugs = getExcludedSlugs();

const getSite = () => {
  if (process.env.CONTEXT === 'deploy-preview' || process.env.CONTEXT === 'branch-deploy') {
    return process.env.DEPLOY_PRIME_URL || SITE.site;
  }
  return SITE.site;
};

// https://astro.build/config
export default defineConfig({
  site: getSite(),
  base: SITE.base,
  trailingSlash: SITE.trailingSlash ? 'always' : 'never',
  output: 'static',
  adapter: netlify({
    imageCDN: true,
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      i18n: {
        defaultLocale: 'sv', // All urls that don't contain `sv` will be treated as default locale, i.e. `sv`
        locales: {
          sv: 'sv', // The `defaultLocale` value must present in `locales` keys
          en: 'en',
        },
      },
      // Filter function to exclude pages based on config (globally disabled sections) or specific content logic
      filter: (page) => {
        // Check config-based excludes
        if (APP_BLOG?.tag?.robots?.index === false && page.includes('/tag/')) return false;
        if (APP_BLOG?.category?.robots?.index === false && page.includes('/category/')) return false;
        if (
          APP_BLOG?.list?.robots?.index === false &&
          (page.includes('/blog/') || page.endsWith('/blog'))
        )
          return false;

        // Check content excludes
        const matchesSlug = [...excludedSlugs].some((slug) => {
          return page.endsWith(`/${slug}/`) || page.endsWith(`/${slug}`);
        });

        if (matchesSlug) return false;

        // Exclude paginated blog pages (e.g., /blog/2, /blog/3) which are set to noindex in the template
        if (page.match(/(^|\/)blog\/\d+\/?$/)) return false;

        return true;
      },
    }),
    mdx(),
    markdoc(),
    react(),
    ...(process.env.NODE_ENV === 'development' ? [keystatic()] : []),
    icon({
      include: {
        tabler: ['*'],
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database',
        ],
      },
    }),

    tasks(),

    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),
  ],

  markdown: {},

  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },

  redirects: {
    '/en/mtbo-': '/en/mtbo-oringen-smalandskusten-2024',
    '/mtbo-': '/',
    '/ny-': '/',
    '/orientering.se': '/',
    '/svenska-': '/svenska-cupen',
    '/svenska-cupen-': '/svenska-cupen',
    '/wmtboc26/hemus_moraparken.pdf':
      'https://drive.google.com/file/d/1qh4T2srZvEt668uz0higNb7ca-WdH0Gs/view?usp=drive_link',
    '/wmtboc26/lade_eldris.pdf':
      'https://drive.google.com/file/d/19_J5yD96BYsByrCRl-fIySnX4yoPTCKQ/view?usp=drive_link',
    '/wmtboc26/selbacksvagen.pdf':
      'https://drive.google.com/file/d/1bEPyU8SJrr4DWCsR0ItxPf4U4Tuatjr_/view?usp=drive_link',
    '/wmtboc2026': '/wmtboc26',
    '/wmtboc26/accomodation_booking_wmtboc26.xlsx':
      'https://docs.google.com/spreadsheets/d/1QotjDvD0y30I8_rSoVWtD_aypV8aoEL6/export?format=xlsx',
  },
});
