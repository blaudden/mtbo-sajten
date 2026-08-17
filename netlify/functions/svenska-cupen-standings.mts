import type { Config } from '@netlify/functions';
import seedingDataRaw from '../../src/data/cups/svenska_cupen_seeding_order.json';

export default async () => {
  const targetUrl = seedingDataRaw.current_cup_url || 'https://eventor.orientering.se/Standings/View/Series/1539';

  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};

export const config: Config = {
  path: '/api/svenska-cupen-standings',
};
