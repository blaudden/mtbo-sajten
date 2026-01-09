---
description: Check the site for semantic depth and SEO best practices
---

# Semantic Depth Audit

This workflow helps you audit the site's content for "Semantic Depth," ensuring that we are building topical authority and not just targeting keywords.

## 1. Check for Structured Data (Schema.org)

Semantic search relies heavily on structured data to understand entities. We should check if our pages include JSON-LD schema.

```bash
# Check if Schema.org JSON-LD is present in the layout or common components
grep -r "application/ld+json" src/components src/layouts
```

**Goal**: You should see results indicating `Article`, `BreadcrumbList`, `Event`, or `FAQPage` schema.
**Action if missing**: Implement `Schema.org` generation in `src/components/common/Metadata.astro` or specific page layouts.

## 2. Identify Pillar Content

Check if we have "Pillar Pages" for our core topics:

- Svenska Cupen
- O-Ringen
- WMTBOC 2026

Run this to see our "Pillar-like" long-form content (filtered by high word count or specific file names):

```bash
# Find large markdown files that might act as pillars
find src/content/posts -name "*.mdoc" -exec wc -w {} + | sort -n | tail -n 10
```

**Action**: Review the top large files. Do they link out to sub-topics? Do they cover the "What, Why, How" of the entity?

## 3. Check Internal Linking Structure

We want to ensure that "Cluster Pages" (e.g., specific news or events) link back to their "Pillar Page".

Example: Check if `svenska-cupen-haessleholm-2025` links back to `svenska-cupen`.

```bash
# Check for link back to Svenska Cupen pillar in a specific sub-page
grep "svenska-cupen" src/content/posts/svenska-cupen-haessleholm-2025/index.mdoc
```

**Action**: Ensure every sub-page has a contextual link (in the text) pointing back to the main topic page.

## 4. Breadcrumbs Check

Breadcrumbs signal hierarchy to Google.

```bash
# Check for Breadcrumb component usage
grep -r "Breadcrumb" src/components src/layouts src/pages
```

**Action if missing**: Create a `<Breadcrumbs />` component and add it to `PageLayout.astro`.

## 5. Content Completeness (Manual Review)

Pick a core topic (e.g., "MTBO") and ask:

- Do we have a definition? ("What is MTBO?")
- Do we have a guide for beginners?
- Do we have advanced tips?

**Action**: Create new content to fill these gaps if they don't exist.

## 6. Google Search Console Check (External)

- Log in to GSC.
- Check "Search Results" for a Pillar Page URL.
- Look at "Queries". Are they diverse? (e.g., "dates", "rules", "locations", "classes").
- If queries are narrow, expand the content.
