import type { APIRoute } from 'astro';
import seedingDataRaw from '~/data/cups/seeding_order.json';

export const GET: APIRoute = () => {
  const currentCupUrl = seedingDataRaw.current_cup_url || 'https://eventor.orientering.se/Standings/View/Series/1539';
  return Response.redirect(currentCupUrl, 307);
};
