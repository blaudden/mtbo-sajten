import type { Config } from '@netlify/functions';

// Stop TypeScript from complaining about
// the missing process.env.REBUILD_HOOK
declare var process: {
  env: {
    REBUILD_HOOK: string;
  };
};

// An asynchronous function to call
// the Netlify build hook to rebuild your site
const rebuildSite = async (triggerTitle: string) => {
  // Construct the URL for the Netlify rebuild hook
  const url = new URL(process.env.REBUILD_HOOK);

  // Add the title to the query string
  url.searchParams.append('trigger_title', triggerTitle);

  // Make a POST request to the Netlify webhook
  return await fetch(url.toString(), {
    method: 'POST',
  });
};

export default async (request: Request) => {

  // Skip rebuild if it's not Thursday or Sunday
  const today = new Date();
  if (![0, 4].includes(today.getDay())) {
    return new Response('Not a scheduled day', {
      status: 200,
    });
  }

  await rebuildSite('Rebuild to publish sceduled posts');
};

// Netlify scheduled function cron syntax
// Run At 04:15 every day
export const config: Config = {
  schedule: '15 4 * * *',
};
