import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { ImageMetadata } from 'astro';
import type { OpenGraph } from '@astrolib/seo';

const load = async function () {
  let images: Record<string, () => Promise<unknown>> | undefined = undefined;
  try {
    images = import.meta.glob('~/assets/images/**/*.{jpeg,jpg,png,tiff,webp,gif,svg,JPEG,JPG,PNG,TIFF,WEBP,GIF,SVG}');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // continue regardless of error
  }
  return images;
};

let _images: Record<string, () => Promise<unknown>> | undefined = undefined;

/** */
export const fetchLocalImages = async () => {
  _images = _images || (await load());
  return _images;
};

/** */
export const findImage = async (
  imagePath?: string | ImageMetadata | null
): Promise<string | ImageMetadata | undefined | null> => {
  // Not string
  if (typeof imagePath !== 'string') {
    return imagePath;
  }

  // Absolute paths
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }

  // Relative paths or not "~/assets/" or "src/assets/"
  if (!imagePath.startsWith('~/assets/images') && !imagePath.startsWith('src/assets/images')) {
    return imagePath;
  }

  const images = await fetchLocalImages();
  // Normalize key to match what regular imports look like if needed, 
  // but importantly convert to the key format used in _images
  // referencing the glob: import.meta.glob('~/assets/images/...')
  
  // If path starts with src/, replace it with ~/. 
  // The glob keys in Vite might actually use /src/ if imported differently, 
  // but here the glob pattern is `~/assets/images/...`.
  // Vite usually normalizes import.meta.glob keys to be relative to project root or match the pattern specific structure.
  // Let's check how `images` keys look.
  // The existing code does: const key = imagePath.replace('~/', '/src/');
  // This suggests the keys in `images` map are like `/src/assets/images/...`
  
  let key = imagePath;
  if (imagePath.startsWith('~/')) {
    key = imagePath.replace('~/', '/src/');
  } else if (imagePath.startsWith('src/')) {
    key = '/' + imagePath;
  }

  if (!images || typeof images[key] !== 'function') {
    console.log(`[findImage] Image not found for key: ${key}`);
    console.log(`[findImage] Available keys sample:`, Object.keys(images || {}).slice(0, 5));
    return null;
  }

  return ((await images[key]()) as { default: ImageMetadata })['default'];
};

/** */
export const adaptOpenGraphImages = async (
  openGraph: OpenGraph = {},
  astroSite: URL | undefined = new URL(''),
  pathname: string = '/'
): Promise<OpenGraph> => {
  if (!openGraph?.images?.length) {
    return openGraph;
  }

  const images = openGraph.images;

  const adaptedImages = await Promise.all(
    images.map(async (image) => {
      if (image?.url) {
        // Find the image metadata (to ensure it exists)
        const resolvedImageMetadata = (await findImage(image.url)) as ImageMetadata | undefined;
        if (!resolvedImageMetadata) {
          return { url: '' };
        }

        // Logic to resolve the PHYSICAL file path for Sharp
        // calculate key same way as findImage
        const imagePath = image.url;
        if (typeof imagePath === 'string' && imagePath.startsWith('~/assets/images')) {
          const key = imagePath.replace('~/', '/src/');
          const inputPath = path.join(process.cwd(), key);

          if (fs.existsSync(inputPath)) {
            try {
              // Determine output filename from slug
              // e.g. / -> home.jpg
              // /mtbo-oringen -> mtbo-oringen.jpg
              // /blog/my-post -> blog-my-post.jpg (flattened)
              let slug = pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-');
              if (!slug) slug = 'home';
              const filename = `${slug}.jpg`;

              // Ensure directory exists
              const distDir = path.join(process.cwd(), 'dist', 'og-images');
              if (!fs.existsSync(distDir)) {
                fs.mkdirSync(distDir, { recursive: true });
              }

              const outputPath = path.join(distDir, filename);

              // Process with Sharp (resize to 1200x630, cover, jpeg)
              await sharp(inputPath)
                .resize(1200, 630, { fit: 'cover' })
                .toFormat('jpeg', { quality: 90 })
                .toFile(outputPath);

              return {
                url: String(new URL(`/og-images/${filename}`, astroSite)),
                width: 1200,
                height: 630,
              };
            } catch (e) {
              console.error('Sharp OG generation failed:', e);
              // Fallback or error?
            }
          } else {
            console.warn('Source image file not found on disk:', inputPath);
          }
        }

        // Fallback if not a local asset or processing failed (return original or empty?)
        // If we can't optimize, we might just return empty to avoid broken links
        return { url: '' };
      }

      return { url: '' };
    })
  );

  return { ...openGraph, ...(adaptedImages ? { images: adaptedImages } : {}) };
};
