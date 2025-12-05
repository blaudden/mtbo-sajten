# Copilot Instructions for mtbo-sajten

## Project Overview

**mtbo-sajten** is a Swedish mountain bike orienteering (MTBO) community website built with [Astro 5.0](https://astro.build/) + [Tailwind CSS](https://tailwindcss.com/). The site showcases MTBO events, training camps, and competition information.

- **Site**: https://mountainbikeorientering.se
- **Framework**: Astro with static output
- **Hosting**: Netlify
- **Content Format**: Markdoc (`.mdoc`), Markdown (`.md`), and MDX (`.mdx`)
- **Language**: Swedish (with English translations in `/en/` subdirectories)

## Architecture Essentials

### Content Structure
Posts are stored in `src/content/posts/` with each post in its own directory containing `index.mdoc/md/mdx` files plus assets. The content collection is defined in `src/content/config.ts` with schema validation for frontmatter fields:
- Required: `publishDate`, `title`, `image`
- Optional: `updateDate`, `draft`, `evergreen`, `category`, `tags`, `author`, `metadata.canonical`

### Layout System
- **`PageLayout.astro`**: Default layout with header, announcement, and footer
- **`WMTBOC26PageLayout.astro`**: Special minimal layout for world championships (triggered when `category.slug === 'wmtboc26'`)
- **`Layout.astro`**: Core layout handling language, theme, analytics, and client-side routing

### Blog Rendering Pipeline
1. `src/pages/[...blog]/index.astro` dynamically generates routes from `src/utils/blog.ts`
2. `getStaticPathsBlogPost()` creates static paths with permalink pattern from `POST_PERMALINK_PATTERN`
3. `SinglePost.astro` component renders the article with tags and social sharing
4. Image processing via `findImage()` for responsive images using Unpic

### Customizations & Special Components
- **LeafletMap**: Markdoc component for embedding interactive maps with event markers (see `mtbo-oringen` post)
- **Markdoc Components**: Located in `src/components/markdoc/` for custom markdown extensions
- **React Components**: Minimal React usage via `@astrojs/react` (e.g., `LeafletMap.tsx`)
- **Keystatic CMS**: Integrated at `/@keystatic` route for content management

## Build & Development

### Key Commands
```bash
npm run dev              # Start dev server on http://127.0.0.1:3000 (--host flag for explicit IP)
npm run start            # Alternative: start dev server on http://localhost:3000
npm run build            # Build static site
npm run check            # Run type checking, ESLint, and Prettier
npm run fix              # Auto-fix ESLint and Prettier issues
npm run check:astro      # TypeScript validation for Astro components
```
### Important Build Details
- **Output**: Static HTML (`output: 'static'`)
- **Adapter**: Netlify (`@astrojs/netlify`)
- **Prerendering**: All routes use `export const prerender = true`
- **Image Service**: Unpic (`@unpic/astro/service`) for optimized images
- **Compression**: Enabled via `astro-compress`
- **Sitemap**: Automatically generated with excluded canonical URLs (see `astro.config.ts`)
- **Dev Port**: Default Astro port 3000; `npm run dev` explicitly binds to 127.0.0.1
- **CodeSandbox Config**: `sandbox.config.json` configures CodeSandbox container to use port 3000 and `npm start` script
- **Sitemap**: Automatically generated with excluded canonical URLs (see `astro.config.ts`)

## Conventions & Patterns

### Post Frontmatter Example
```yaml
---
title: Event Title
draft: false
evergreen: false                    # Set true for evergreen content (no publish date shown)
publishDate: 2025-11-06
excerpt: Short description
image: ~/assets/images/posts/folder/image.png
category: oringen                   # Maps to post slug prefix
tags: []
author: Author Name
metadata:
  canonical: Optional explicit URL
---
```

### i18n Pattern
- Default language: Swedish (`sv`)
- English translations: Mirror post directories under `/en/` subdirectory
- Language detection: Based on URL path first segment via `getLangFromUrl()`
- Example: `src/content/posts/en/mtbo-oringen/index.mdoc` mirrors `src/content/posts/mtbo-oringen/index.mdoc`

### Permalink Generation
Configured in `POST_PERMALINK_PATTERN` (check `src/utils/permalinks.ts`). Pattern supports:
- `%slug%`: Post directory name
- `%category%`: Category from frontmatter
- `%id%`: Unique post ID
- `%year%`, `%month%`, `%day%`: Date components

### TypeScript Usage
- Type definitions in `src/types.d.ts` for `Post`, `Taxonomy`, `MetaData`, etc.
- Astro components use TypeScript by default (`export interface Props`)
- Utility functions are fully typed (see `src/utils/blog.ts`)

## Integration Points

### Content Loaders
Posts loaded via Astro's `glob()` pattern from `src/content/posts/`:
- Patterns: `**/*.md`, `**/*.mdx`, `**/*.mdoc`
- Runtime: Build-time via `getStaticPaths()`

### Analytics & Verification
- Google Analytics configured in `src/utils/config.ts` (uses Partytown for non-blocking scripts)
- Site verification ID in `src/config.yaml`
- RSS feed at `/rss.xml` via `@astrojs/rss`

### SEO & Metadata
- Metadata managed via `src/components/common/Metadata.astro`
- OpenGraph and Twitter cards populated from post frontmatter
- Canonical URLs supported via `metadata.canonical`
- JSON-LD structured data can be injected in post components

### UI Components
Located in `src/components/`:
- **Widgets**: Header, Footer, Hero, CTA, Features, Testimonials, etc. (reusable page sections)
- **Blog**: GridItem, SinglePost, Tags, Pagination, LeafletMap
- **Common**: Image, Analytics, Metadata, SocialShare, ToggleTheme

## Common Tasks

### Adding a New Post
1. Create directory: `src/content/posts/event-slug/`
2. Create `index.mdoc` with required frontmatter (title, publishDate, image, excerpt)
3. Add featured image to `src/assets/images/posts/event-slug/`
4. Build generates route automatically based on `POST_PERMALINK_PATTERN`

### Adding Multi-language Content
1. Create mirror directory: `src/content/posts/en/event-slug/`
2. Use same `title` and `publishDate` for automatic language linking
3. Link between versions in post content (see MTBO O-Ringen example)

### Custom Component in Markdoc
1. Create component file: `src/components/markdoc/YourComponent.astro`
2. Register in `markdoc.config.mjs`
3. Use in posts: `{% YourComponent prop=value /%}`

### Modifying Layouts
- Edit `src/layouts/PageLayout.astro` for default layout changes
- Create specialized layouts for specific categories (pattern: check `WMTBOC26PageLayout.astro`)
- Pass metadata down through slots and props

## Debugging & Validation

- **Type Errors**: `npm run check:astro` validates Astro components
- **Linting**: `npm run check:eslint` (fix with `npm run fix:eslint`)
- **Format**: `npm run check:prettier` (fix with `npm run fix:prettier`)
- **Vite Cache Issues**: If the dev server shows "not a function" errors on mdoc/md files, use `touch src/content/posts/<post-slug>/index.mdoc` to clear Vite's cache and rebuild
- **Preview Build**: `npm run preview` after `npm run build` to test production output
- **Dev Server**: Use `npm run dev` for explicit 127.0.0.1 binding or `npm run start` for localhost (both use port 3000 with HMR enabled)
