---
description: Guide for creating new MTBO articles with consistent tone and styling
---

How to Create a New Article for MTBO Sajten

This workflow describes the process for adding new event articles to the website, ensuring a consistent tone of voice and visual style.

## 1. Tone and Style

The writing tone should be **energetic, inviting, and inclusive**. We are "we" (vi) with the readers.

- **Keywords**: "Äntligen", "Vi ser fram emot", "Välkomna", "Fest", "Utmaning".
- **Perspective**: Use "Vi" (We) to represent the MTBO community/organizers.
- **Focus**: Emphasize the experience, the gathering, and the challenge, rather than just dry facts.
- **Structure**:
  - Engaging Intro.
  - **Programmet**: Clear bullet points for the schedule.
  - **Terräng och Karta**: Descriptive text about the forest/map.
  - **Anmälan**: Clear links to Eventor.

## 2. File Structure

1.  Create a new folder in `src/content/posts/` with a descriptive slug (e.g., `svenska-cupen-ort-2026`).
2.  Create an `index.mdoc` file inside that folder.

### Frontmatter Template:

```yaml
---
title: [Engaging Title]
draft: false
evergreen: false
publishDate: [YYYY-MM-DD]
excerpt: >-
  [Short energetic summary]
image: ~/assets/images/posts/[slug]/image.png
category: svenska-cupen
tags:
  - svenska-cupen-[year]
author: Magnus Blåudd
metadata: {}
---
```

## 3. Hero Image Workflow

All hero images must be **1280x720 pixels**.

### Step-by-Step:

1.  **Initial Setup**:
    - Use the placeholder image for the initial draft: `~/assets/images/generic-hero-placeholder.png`.
    - Frontmatter: `image: ~/assets/images/generic-hero-placeholder.png`

2.  **Create Final Image**:
    - Create your image manually using a tool like **Canva**.
    - **Dimensions**: 1280x720 pixels.
    - **Logo**: Include the site logo if appropriate for the visual style.
    - **Export**: Save as a high-quality PNG or JPG.

3.  **Upload & Optimize**:
    - Place the file in `src/assets/images/posts/[slug]/image.png`.
    - **Optimize the image**: Run `npm run optimize-images src/assets/images/posts/[slug]/image.png`.
    - Update the frontmatter path in your article to point to this new file.

## 4. External Links (PDFs)

For linking to external files like Bulletins or PDFs, use standard Markdown link syntax. The site handles the "external" icon automatically.

- **Correct**: `[Bulletin 1](https://example.com/bulletin.pdf)`
- **Incorrect**: `[Bulletin 1 (extern länk)](https://example.com/bulletin.pdf)`

## 5. Categories

**Do not create new categories.** Check existing articles to see valid categories (e.g., `svenska-cupen`, `oringen`, `wmtboc26`). If unsure, leave it empty or use a generic one if available.

## 6. Updates to Other Pages

When a new article is created, remember to update:

1.  **`src/content/posts/mtbo-program/index.mdoc`**: Add a reference to the new article using `{% BlogListBySlug slugs=["[slug]"] /%}`.
2.  **`src/content/posts/svenska-cupen-mtbo/index.mdoc`**: Add a summary and link if it's a cup event.
