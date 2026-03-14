import type { ScraperEvent } from '~/types/events';
import { resolveCountryCode, getOrganiserName } from './events';

/**
 * Generates JSON-LD for a SportsEvent.
 * Used on event detail pages for SEO and rich results.
 */
export function generateEventJsonLd(event: ScraperEvent): Record<string, unknown> {
  const country = resolveCountryCode(event);
  const organiser = getOrganiserName(event);

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    startDate: event.start_time,
    endDate: event.end_time,
    eventStatus:
      event.status === 'Canceled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    sport: 'Mountain Bike Orienteering',
  };

  if (organiser) {
    ld.organizer = {
      '@type': 'Organization',
      name: organiser,
    };
  }

  if (event.races[0]?.position) {
    ld.location = {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: event.races[0].position.lat,
        longitude: event.races[0].position.lng,
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: country,
      },
    };
  }

  ld.subEvent = event.races.map((race) => ({
    '@type': 'SportsEvent',
    name: race.name || event.name,
    startDate: race.datetimez,
    sport: `Mountain Bike Orienteering - ${race.discipline}`,
  }));

  return ld;
}
