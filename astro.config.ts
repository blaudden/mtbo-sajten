import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import compress from 'astro-compress';
import icon from 'astro-icon';
import tasks from './src/utils/tasks.mjs';
import { ANALYTICS, SITE } from './src/utils/config.ts';
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import keystatic from '@keystatic/astro';
import netlify from "@astrojs/netlify";
import type { AstroIntegration } from 'astro';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hasExternalScrits = ANALYTICS.vendors.googleAnalytics.id && ANALYTICS.vendors.googleAnalytics.partytown;
const whenExternalScripts = (items: (() => AstroIntegration) | (() => AstroIntegration)[] = []) =>
  hasExternalScrits ? (Array.isArray(items) ? items.map((item) => item()) : [items()]) : [];

// Array with pages to eclude from sitemap
const sitemap_exclude = [
  // Remove canonical pages
  'https://www.mountainbikeorientering.se/mountainbikeorientering-i-uppland-hosten-2023',
  'https://www.mountainbikeorientering.se/mtbo-i-skutskaer-28-29-augusti-2021',
  'https://www.mountainbikeorientering.se/sportident-air-utbildning-i-uppsala',
  'https://www.mountainbikeorientering.se/mtbo-sommar-i-uppsala-2022',
  'https://www.mountainbikeorientering.se/mtbo-i-osterbybruk-2021'
];

// https://astro.build/config
export default defineConfig({
  site: SITE.site,
  base: SITE.base,
  trailingSlash: SITE.trailingSlash ? 'always' : 'never',
  output: 'hybrid',
  adapter: netlify(),
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
      filter: (page) => !sitemap_exclude.includes(page),
    }),
    mdx(),
    markdoc(),
    react(),
    keystatic(),
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

    ...whenExternalScripts(() =>
      partytown({
        config: { forward: ['dataLayer.push'] },
      })
    ),

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
    '/svenska-': '/svenska-cupen',
  },
});
