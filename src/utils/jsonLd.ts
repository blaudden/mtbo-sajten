import type { ScraperEvent } from '~/types/events';
import { resolveCountryCode, getOrganiserName, resolveExternalUrl } from './events';
import { SITE } from '~/utils/config';

/**
 * Generates JSON-LD for a SportsEvent.
 * Used on event detail pages for SEO and rich results.
 */
export function generateEventJsonLd(event: ScraperEvent): Record<string, unknown> {
  const country = resolveCountryCode(event);
  const organiser = getOrganiserName(event);
  const externalUrl = resolveExternalUrl(event);

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

  if (externalUrl) {
    ld.url = externalUrl;
  }

  if (event.information) {
    ld.description = event.information;
  }

  if (SITE.site) {
    ld.image = `${SITE.site}/og-images/events/${event.slug}.jpg`;
  }

  let location: Record<string, unknown> | undefined;
  if (event.races[0]?.position) {
    location = {
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
    ld.location = location;
  }

  ld.subEvent = event.races.map((race) => {
    const subLd: Record<string, unknown> = {
      '@type': 'SportsEvent',
      name: race.name || event.name,
      startDate: race.datetimez,
      sport: `Mountain Bike Orienteering - ${race.discipline}`,
      eventStatus:
        event.status === 'Canceled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    };

    if (location) {
      subLd.location = location;
    }
    if (organiser) {
      subLd.organizer = {
        '@type': 'Organization',
        name: organiser,
      };
    }
    if (externalUrl) {
      subLd.url = externalUrl;
    }
    if (event.information) {
      subLd.description = event.information;
    }
    if (SITE.site) {
      subLd.image = `${SITE.site}/og-images/events/${event.slug}.jpg`;
    }

    return subLd;
  });

  return ld;
}
