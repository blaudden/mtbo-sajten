---
description: Create a blog post from an external media link (SVT, YouTube, etc.) with styled images
---

# Create External Media Post

This workflow guides you through creating a blog post based on an external news report, video, or article. It ensures a consistent, professional style using a "blurred background + overlay" hero image.

> [!NOTE]
> **YouTube:** YouTube videos can usually be embedded directly. Use this workflow when you want a specific editorial look or for sources that don't support embedding (like SVT).

## 1. Prepare Workspace

1.  Create a new directory: `src/content/posts/[slug]/`.
2.  Create an assets directory: `src/assets/images/posts/[slug]/`.

## 2. Capture Screenshots & Assets

For standard articles, we use screenshots to tell the story. For YouTube, you can embed the video directly, but you **still need a styled Hero Image** for the post header and listing.

**Tips for clicking good screenshots (Hero):**

- **Hero Background (`hero_bg_source.jpg`):**
  - Find a high-quality frame showing action.
  - Avoid text overlays or UI elements if possible.
  - The aspect ratio should be roughly 16:9.
- **Hero Overlay (`hero_overlay_source.png`):**
  - Capture the "context": The article headline, the video player's start screen, or a specific interviewee.

**For Content Images (Non-YouTube):**

- Capture key moments to break up the text.
- **CRITICAL:** Ensure no browser UI (blue focus borders, scrollbars) is visible.

**For YouTube:**

- Get the Video ID (e.g., `55xp2cryPfE`).

## 3. Generate Styled Hero Image

_Always_ generate the styled hero image using the steps below, even for YouTube posts. This ensures the site looks consistent.

**Prerequisites:**

- `public/small_logo.svg`
- `hero_bg_source.jpg` (Background)
- `hero_overlay_source.png` (Overlay)

**ImageMagick Commands:**

```bash
# 1. Prepare Background (Crop to 16:9, Resize to 1280x720, Apply Blur)
convert hero_bg_source.jpg -resize 1280x720^ -gravity center -extent 1280x720 -blur 0x8 temp_bg.png

# 2. Prepare Overlay (Resize to height 600px - fits nicely in 720p container)
convert hero_overlay_source.png -resize x600 temp_overlay.png

# 3. Composite (Background + Overlay + Logo)
# Layer overlay onto blurred background
composite -gravity center temp_overlay.png temp_bg.png temp_hero.png

# Add MTBO Logo (Southeast corner)
convert public/small_logo.svg -resize 150x temp_logo.png
composite -gravity southeast -geometry +30+30 temp_logo.png temp_hero.png src/assets/images/posts/[slug]/image.png

# Cleanup
rm temp_bg.png temp_overlay.png temp_hero.png temp_logo.png
```

## 4. Create Post Content

Create `src/content/posts/[slug]/index.mdoc`.

**Guidelines:**

- **Title:** Compelling, independent title.
- **Tone & Voice:** Adopt a descriptive, reporting tone.
- **Categories:** Use relevant existing categories.

**YouTube Note:**
If the source is YouTube, use the `YoutubeVideo` tag instead of manually inserting illustrative screenshots in the body.

```markdown
---
title: [Engaging Title]
draft: false
publishDate: [YYYY-MM-DD]
excerpt: [Summary]
image: ~/assets/images/posts/[slug]/image.png
category: '[relevant-category]'
tags: []
author: [Your Name]
---

[Intro context...]

{% YoutubeVideo
   videoid="[VIDEO_ID]"
   title="[Video Title]" /%}

[Body text references...]

Se hela kanalen här: [Länktext](URL)
```

**Standard Article Template:**

```markdown
---
title: [Engaging Title]
...
---

[Intro context...]

![Caption](src/assets/images/posts/[slug]/[content_image_1].jpg)

[More text...]

Se filmen/läs artikeln: [Länktext för originalet](URL)
```

## 5. Examples

Reference these existing posts for structure and style:

- **SVT Reportage (2025):** [`src/content/posts/sm-i-mtbo-karlshamn/index.mdoc`](../../src/content/posts/sm-i-mtbo-karlshamn/index.mdoc)
- **SVT Reportage (Example):** [`src/content/posts/kraft-kvar-i-skallen/index.mdoc`](../../src/content/posts/kraft-kvar-i-skallen/index.mdoc)
