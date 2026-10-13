---
description: Guide for creating new MTBO articles matching Magnus Blåudd's authentic voice and workflow
---

# How to Create a New Article for MTBO Sajten

This workflow describes the process for authoring articles for mountainbikeorientering.se, ensuring that content reflects Magnus Blåudd's authentic voice, factual grounding, and practical perspective.

## 1. Author Voice and Tone (Magnus Blåudd)

Articles must sound like Magnus speaking directly to the reader — practical, unvarnished, collegial, and grounded in the reality of the sport.

### Key Principles:

- **Grounded and Factual**: Focus on practical logistics: terrain type (tallhed, snabba stigar, stenar och rötter), actual travel options (train/car/parking), necessary gear (SIAC, map holders, lights in dusk), and realistic winning times.
- **Collegial Tone**: Write as a fellow active competitor and organiser ("vi"). Use Magnus's genuine conversational phrases (e.g., _"Kom i tid!!"_, _"roliga är dom iallafall"_, _"kanske tar vi tåget"_, _"hålla flaggan högt"_).
- **Zero AI Marketing Fluff**: Strictly avoid marketing hype, dramatic narrative arcs, and over-the-top superlatives. Never use words like _"fantastisk"_, _"episk"_, _"fest"_, _"storslam"_, _"enormt arbete"_, _"äntligen"_, or _"vi ser fram emot"_.
- **Language and Terminology**:
  - **Swedish (Default)**: Articles are normally written in Swedish. Use mountain bike terminology: _cykla_ / _cyklade_ (never _köra_ / _körde_ for cycling); use _deltagare_, _aktiv_ (or _de aktiva_), or _elit_ (never _åkare_); use _tävling_ or _träning_ (never _lopp_ or _race_).
  - **English (When applicable)**: Selected articles (such as international championships, O-Ringen overviews, or season summaries) are also published in English under `src/content/posts/en/`. When writing in English, strictly use **British English** (UK English) spelling and terminology (e.g. _programme_, _organisers_, _centre_), format titles and headings in **sentence case**, and avoid superlatives like "thrilled" or "massive".

## 2. Article Authoring Workflow (Story -> Transcription -> Grounding)

Instead of generating speculative content from scratch, follow this three-stage process:

1. **Magnus Tells the Story**:
   - The user provides the raw narrative (spoken voice, voice notes, or bullet points) sharing what happened or what is planned.
2. **Transcription and Voice Preservation**:
   - The agent transcribes the narrative, preserving Magnus's phrasing, expressions, and matter-of-fact perspective without embellishment.
3. **Factual Grounding**:
   - The agent enriches the text with concrete details from the structured database (`src/data/events/`), calendar dates, official Eventor links, results, and Livelox GPS data.
   - Do **not** invent quotes, drama, or synthetic praise.

## 3. Privacy & Security Rules

- **No Internal References**: Never mention internal infrastructure repositories, private issue trackers, issue numbers, hostnames, or internal tooling in article prose, metadata, commit messages, or PR descriptions.

## 4. File Structure and Frontmatter

1. Create a new folder in `src/content/posts/` (or `src/content/posts/en/` for English articles) with a descriptive slug (e.g. `svenska-cupen-ort-2027`).
2. Create an `index.mdoc` file inside that folder.

### Frontmatter Template:

```yaml
---
title: [Sentence Case Descriptive Title]
draft: false
evergreen: false
publishDate: [YYYY-MM-DD]
excerpt: >-
  [Factual, grounded summary in Magnus's voice]
image: ~/assets/images/posts/[slug]/image.png
category: [valid-category]
tags: []
author: Magnus Blåudd
metadata: {}
---
```

## 5. Hero Image Workflow

All hero images must use a **16:9** aspect ratio (**1280x720 pixels**) and stay under **800 KB**.

1. Place image in `src/assets/images/posts/[slug]/image.png` (or `hero.jpg`).
2. Run `npm run optimize-images` to resize and compress.
3. Run `npm run validate:images` to verify the 16:9 aspect ratio.

## 6. Integration and Evergreen Pages

When introducing a new event article:

1. Update `src/content/posts/mtbo-program/index.mdoc` or active cup pages using `{% EventCard %}` or `{% BlogListBySlug slugs=["[slug]"] /%}`.
2. Ensure links to Eventor, Livelox, or PDFs follow smart resource list patterns.
