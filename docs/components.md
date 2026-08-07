# UI Components & Widgets Guide (`mtbo-sajten`)

This guide documents the reusable Astro UI components and widgets available in `mtbo-sajten` (`src/components/ui/` and `src/components/widgets/`). All pages and feature layouts in this repository must use these standard components instead of writing custom raw HTML tags and hardcoded Tailwind utility classes.

---

## Component Architecture Overview

The site layout is built around the **Astrowind component library**:

- `src/components/ui/`: Low-level UI primitives (`WidgetWrapper`, `Headline`, `Background`, `Button`, `Timeline`, `ItemGrid`).
- `src/components/widgets/`: Higher-level page sections (`HeroText`, `Hero`, `Steps`, `Steps2`, `Features`, `Content`, `Note`, `CallToAction`, `FAQs`, `Stats`).

---

## Page Layout & Section Components

### WidgetWrapper (`src/components/ui/WidgetWrapper.astro`)

The primary section wrapper for all content blocks. Handles light/dark theme backgrounds, responsive vertical padding (`py-12 md:py-16`), horizontal max-width constraints, and section anchors (`id`).

- **Key Props**: `id`, `isDark`, `containerClass`, `bg`, `as` (default: `'section'`).
- **Usage**: Always wrap major page sections inside `<WidgetWrapper>` to guarantee responsive site-wide padding alignment.

### Headline (`src/components/ui/Headline.astro`)

Standard section header component for titles, subtitles, and taglines.

- **Key Props**: `title`, `subtitle`, `tagline`, `classes` (`container`, `title`, `subtitle`).
- **Usage**: Use for titles above tables, grids, and feature blocks instead of manual `<h2>` / `<p>` tags.

---

## Hero & Title Widgets

### HeroText (`src/components/widgets/HeroText.astro`)

Top-of-page title and subtitle hero banner for inner pages and subpages.

- **Key Props**: `title`, `subtitle`, `tagline`, `content`, `callToAction`.
- **Usage**: Use as the top section on subpages (e.g., Svenska Cupen, event calendar, topic indexes) instead of manual `<h1>` elements.

### Hero / Hero2 / HeroFullSpeed (`src/components/widgets/Hero.astro`)

Main landing page hero banners featuring side images or background overlays, buttons, and call-to-actions.

---

## Procedure & Guide Widgets

### Steps2 (`src/components/widgets/Steps2.astro`)

Step-by-step procedural instruction block rendering headings, step items with icons/numbers, and action buttons.

- **Key Props**: `title`, `subtitle`, `tagline`, `items` (array of `{ title, description, icon }`), `isReversed`, `callToAction`.
- **Usage**: Use for guide steps, organiser instructions, workflow procedures, and getting-started lists.

### Timeline (`src/components/ui/Timeline.astro`)

Vertical timeline list with connected icon nodes. Rendered internally by `Steps` and available for custom vertical timelines.

---

## Callout & Info Widgets

### Note (`src/components/widgets/Note.astro`)

Full-width highlight callout banner for important notes, philosophy highlights, or policy notices.

### Content (`src/components/widgets/Content.astro`)

Rich content block pairing text copy, bulleted feature items with icons, and optional side media.

---

## Quick Component Reference

| Purpose                   | Recommended Component | Avoid                               |
| ------------------------- | --------------------- | ----------------------------------- |
| Page Hero / Title         | `HeroText`            | Manual `<h1>` + `<p>`               |
| Section Wrapper           | `WidgetWrapper`       | Manual `<section>` with `px-4 py-8` |
| Section Header            | `Headline`            | Manual `<h2>` + `<p>`               |
| Step-by-Step Instructions | `Steps2` or `Steps`   | Manual `<ol>` / `<ul>` lists        |
| Content + Bullets         | `Content`             | Custom `flex` text blocks           |
| Action Button             | `Button`              | Manual `<a>` button styling         |
