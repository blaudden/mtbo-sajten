import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import ytdl from '@distube/ytdl-core';
import slugify from 'slugify';
import ffmpeg from 'fluent-ffmpeg';

const INFO_LOG = '\x1b[34m[INFO]\x1b[0m';
const SUCCESS_LOG = '\x1b[32m[SUCCESS]\x1b[0m';
const ERROR_LOG = '\x1b[31m[ERROR]\x1b[0m';

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const stream = fs.createWriteStream(dest);
  if (res.body) {
    // Check if body exists
    // @ts-expect-error - Readable.fromWeb matches standard, ignoring type mismatch for now
    await finished(Readable.fromWeb(res.body).pipe(stream));
  }
}

async function extractFrame(videoUrl: string, timestamp: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoUrl)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720', // Ensure decent quality
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error(`${ERROR_LOG} Please provide a YouTube URL.`);
    process.exit(1);
  }

  console.log(`${INFO_LOG} Fetching video info for: ${url}`);

  try {
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;

    const title = videoDetails.title;
    const authorName = videoDetails.author.name;
    const description = videoDetails.description;
    const videoId = videoDetails.videoId;
    const publishDate = videoDetails.publishDate; // YYYY-MM-DD format usually

    console.log(`${INFO_LOG} Found video: "${title}" by ${authorName}`);

    const slug = slugify(title, { lower: true, strict: true });
    const postDir = path.join(process.cwd(), 'src/content/posts', slug);
    const assetsDir = path.join(process.cwd(), 'src/assets/images/posts', slug);

    // Create directories
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    // Download Thumbnail
    const thumbnail = videoDetails.thumbnails.reduce((prev, current) => {
      return prev.width > current.width ? prev : current;
    }); // Get max res

    if (thumbnail) {
      console.log(`${INFO_LOG} Downloading thumbnail...`);
      await downloadFile(thumbnail.url, path.join(assetsDir, 'hero_bg_source.jpg'));
      // Copy as potential overlay source too, user can replace
      fs.copyFileSync(path.join(assetsDir, 'hero_bg_source.jpg'), path.join(assetsDir, 'video_thumb.jpg'));
    }

    // Try to extract frames?
    // We need a direct video URL for ffmpeg. ytdl formats can give us that.
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
    if (format && format.url) {
      console.log(`${INFO_LOG} Attempting to extract frames (this might take a moment)...`);
      // Extract 3 frames: 20%, 50%, 80%
      const duration = parseInt(videoDetails.lengthSeconds);
      if (duration > 0) {
        const t1 = Math.floor(duration * 0.2);
        const t2 = Math.floor(duration * 0.5);
        const t3 = Math.floor(duration * 0.8);

        // Note: FFmpeg might fail on some signed URLs or streams, but worth a shot.
        // Actually, usually easier to just use the URL directly with ffmpeg.
        try {
          // We'll do them sequentially or parallel
          await extractFrame(format.url, `${t1}`, path.join(assetsDir, 'frame_1.jpg'));
          await extractFrame(format.url, `${t2}`, path.join(assetsDir, 'frame_2.jpg'));
          await extractFrame(format.url, `${t3}`, path.join(assetsDir, 'frame_3.jpg'));
          console.log(`${SUCCESS_LOG} Extracted 3 frames.`);
        } catch (e) {
          console.warn(`${ERROR_LOG} Failed to extract frames:`, e);
          console.log(`${INFO_LOG} Skipping frame extraction.`);
        }
      }
    }

    // Create index.mdoc
    const mdocContent = `---
title: "${title.replace(/"/g, '\\"')}"
draft: true
publishDate: ${publishDate || new Date().toISOString().split('T')[0]}
excerpt: "REPLACE_WITH_SUMMARY"
image: ~/assets/images/posts/${slug}/hero_bg_source.jpg
author: "Magnus Blåudd"
---

REPLACE_WITH_INTRO_TEXT

{% YoutubeVideo videoid="${videoId}" title="${title.replace(/"/g, '\\"')}" /%}

REPLACE_WITH_DESCRIPTION
${description ? `<!-- \nDescription from YouTube:\n${description}\n-->` : ''}

## 3 Key Takeaways

1.  **Tip 1**
    ...

2.  **Tip 2**
    ...

3.  **Tip 3**
    ...

### Om skaparen

**${authorName}** ... (Add bio here)

Se hela kanalen här: [${authorName}](${videoDetails.author.channel_url})
`;

    fs.writeFileSync(path.join(postDir, 'index.mdoc'), mdocContent);

    console.log(`${SUCCESS_LOG} Created post at: src/content/posts/${slug}/index.mdoc`);
    console.log(`${SUCCESS_LOG} Assets saved to: src/assets/images/posts/${slug}/`);
    console.log(`${INFO_LOG} Next steps:`);
    console.log(`  1. Review and edit the article content.`);
    console.log(`  2. Create the hero image (use 'hero_bg_source.jpg' and an overlay).`);
    console.log(`  3. Set 'draft: false' when ready.`);
  } catch (err) {
    console.error(`${ERROR_LOG} Error:`, err);
    process.exit(1);
  }
}

main();
