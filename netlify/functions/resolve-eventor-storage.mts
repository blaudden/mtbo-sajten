import type { Config } from '@netlify/functions';

export default async (request: Request) => {
  const requestUrl = new URL(request.url);
  const docUrl = requestUrl.searchParams.get('url');
  const eventorUrl = requestUrl.searchParams.get('eventorUrl');

  if (!docUrl || !eventorUrl) {
    return new Response('Missing parameters', {
      status: 400,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  // Check if the original URL is valid using a fast HEAD request
  try {
    const checkResponse = await fetch(docUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });

    if (checkResponse.ok) {
      console.log(`Live check: original document URL is valid. Redirecting: ${docUrl}`);
      return new Response(null, {
        status: 302,
        headers: {
          Location: docUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  } catch (e) {
    console.warn(`Live check HEAD request failed for ${docUrl}:`, e);
  }

  // Extract the Eventor event ID from the event URL path
  const eventIdMatch = eventorUrl.match(/\/Events\/Show\/(\d+)/i);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;
  const urlParts = docUrl.split('/');
  const filename = urlParts[urlParts.length - 1];

  if (eventId && filename) {
    try {
      const eventorResponse = await fetch(eventorUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (eventorResponse.ok) {
        const html = await eventorResponse.text();

        // Extract all Eventor storage URLs from the HTML
        const hrefRegex = /href="([^"]*eventdocuments\/\d+\/[^"]+)"/gi;
        const foundUrls: string[] = [];
        let match;
        while ((match = hrefRegex.exec(html)) !== null) {
          foundUrls.push(match[1]);
        }

        const targetFilename = decodeURIComponent(filename).toLowerCase();

        // Strategy A: Exact case-insensitive filename match
        let matchedUrl = foundUrls.find((u) => {
          try {
            const decoded = decodeURIComponent(u);
            const parts = decoded.split('/');
            const fname = parts[parts.length - 1].toLowerCase();
            return fname === targetFilename;
          } catch {
            return false;
          }
        });

        // Strategy B: Fallback substring match on the base filename
        if (!matchedUrl) {
          const dotIndex = targetFilename.lastIndexOf('.');
          const baseName = dotIndex !== -1 ? targetFilename.substring(0, dotIndex) : targetFilename;
          if (baseName.length > 2) {
            matchedUrl = foundUrls.find((u) => {
              try {
                const decoded = decodeURIComponent(u);
                const parts = decoded.split('/');
                const fname = parts[parts.length - 1].toLowerCase();
                return fname.includes(baseName);
              } catch {
                return false;
              }
            });
          }
        }

        if (matchedUrl) {
          // HTML entities might be encoded, decode them if needed
          const newDocUrl = matchedUrl.replace(/&amp;/g, '&');
          console.log(`Resolved broken document URL ${docUrl} to ${newDocUrl} via Eventor page scraping`);
          return new Response(null, {
            status: 302,
            headers: {
              Location: newDocUrl,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      }
    } catch (e) {
      console.error(`Failed to scrape Eventor event page ${eventorUrl}:`, e);
    }
  }

  // Fallback to Eventor event page
  console.log(`Could not resolve document URL ${docUrl}. Redirecting to Eventor event page fallback: ${eventorUrl}`);
  return new Response(null, {
    status: 302,
    headers: {
      Location: eventorUrl,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};

export const config: Config = {
  path: '/api/resolve-eventor-storage',
};
