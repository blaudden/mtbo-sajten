import type { ScraperEvent, ScraperRace } from '~/types/events';
import { resolveCountryCode, getOrganiserName, resolveExternalUrl } from './events';
import { SITE } from '~/utils/config';

/**
 * Convert 3-letter country code to 2-letter ISO code for schema addressCountry.
 */
function countryToTwoLetter(code: string): string {
  const map: Record<string, string> = {
    SWE: 'SE',
    NOR: 'NO',
    FIN: 'FI',
    DEN: 'DK',
    DNK: 'DK',
    GBR: 'GB',
    FRA: 'FR',
    GER: 'DE',
    DEU: 'DE',
    ITA: 'IT',
    ESP: 'ES',
    PRT: 'PT',
    POL: 'PL',
    CZE: 'CZ',
    AUT: 'AT',
    CHE: 'CH',
    SUI: 'CH',
    HUN: 'HU',
    BGR: 'BG',
    BUL: 'BG',
    HRV: 'HR',
    CRO: 'HR',
    SVK: 'SK',
    SVN: 'SI',
    SLO: 'SI',
    LTU: 'LT',
    LVA: 'LV',
    LAT: 'LV',
    EST: 'EE',
    UKR: 'UA',
    AUS: 'AU',
    USA: 'US',
    CAN: 'CA',
    NZL: 'NZ',
    TUR: 'TR',
    ROU: 'RO',
    BEL: 'BE',
    NED: 'NL',
    JPN: 'JP',
    CHN: 'CN',
    IRL: 'IE',
    ISL: 'IS',
    RSA: 'ZA',
    POR: 'PT',
    BRA: 'BR',
  };
  return map[code.toUpperCase()] || code;
}

/**
 * Translates Swedish discipline names to English for schema descriptions.
 */
function translateDiscipline(discipline: string): string {
  const map: Record<string, string> = {
    sprint: 'sprint',
    medel: 'middle',
    medeldistans: 'middle distance',
    lång: 'long',
    långdistans: 'long distance',
    stafett: 'relay',
    masstart: 'mass start',
    natt: 'night',
    ultralång: 'ultra long',
  };
  const lower = discipline.toLowerCase();
  return map[lower] || lower;
}

/**
 * Helper to format event date/time for JSON-LD.
 * If time is midnight (00:00:00 or 00:00), we strip the time to keep it date-only (YYYY-MM-DD).
 */
function formatJsonLdDate(dateStr: string | undefined | null): string | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.split('T');
  if (parts.length > 1) {
    const timePart = parts[1];
    if (timePart.startsWith('00:00:00') || timePart.startsWith('00:00')) {
      return parts[0];
    }
    return dateStr;
  }
  return dateStr;
}

/**
 * Adjusts an end date-time string to represent the end of the day (23:59:59)
 * if it contains a non-midnight time and a timezone offset.
 */
function getEndOfTheDay(dateStr: string): string {
  const parts = dateStr.split('T');
  if (parts.length > 1) {
    const timePart = parts[1];
    const tzMatch = timePart.match(/([+-]\d{2}:?\d{2}|Z)$/);
    const tz = tzMatch ? tzMatch[0] : '';
    return `${parts[0]}T23:59:59${tz}`;
  }
  return dateStr;
}

/**
 * Resolves a race-specific external Eventor URL.
 * Falls back to parent external URL if not available.
 */
function resolveRaceExternalUrl(race: ScraperRace, parentExternalUrl: string | null): string | null {
  const pathUrl = race.urls?.find((u) => u.type === 'Path');
  if (pathUrl && parentExternalUrl) {
    try {
      const urlObj = new URL(parentExternalUrl);
      return `${urlObj.origin}/${pathUrl.url}`;
    } catch {
      // ignore
    }
  }
  return parentExternalUrl;
}

/**
 * Generates JSON-LD for a SportsEvent.
 * Used on event detail pages for SEO and rich results.
 */
export function generateEventJsonLd(event: ScraperEvent): Record<string, unknown> {
  const country = resolveCountryCode(event);
  const organiser = getOrganiserName(event);
  const externalUrl = resolveExternalUrl(event);

  // Compute start/end dates of parent event spanning all races
  let parentStartRaw = event.start_time;
  let parentEndRaw = event.end_time || event.start_time;

  const raceDates = event.races
    .map((r) => r.datetimez)
    .filter(Boolean)
    .map((d) => new Date(d));

  if (raceDates.length > 0) {
    const minTime = Math.min(...raceDates.map((d) => d.getTime()));
    const maxTime = Math.max(...raceDates.map((d) => d.getTime()));

    const earliestRace = event.races.find((r) => new Date(r.datetimez).getTime() === minTime);
    const latestRace = event.races.find((r) => new Date(r.datetimez).getTime() === maxTime);

    if (earliestRace) parentStartRaw = earliestRace.datetimez;
    if (latestRace) parentEndRaw = latestRace.datetimez;
  }

  const startDate = formatJsonLdDate(parentStartRaw);
  let endDate = formatJsonLdDate(parentEndRaw);

  // For multi-race events with times, extend the parent endDate to the end of the day
  if (endDate && endDate.includes('T')) {
    endDate = getEndOfTheDay(endDate);
  }

  if (!endDate && startDate) {
    endDate = startDate;
  }

  // Construct human-readable description for Schema/Search Console
  const locationName = event.region || (country === 'SWE' ? 'Sverige' : country);
  const organizerName = organiser || 'okänd arrangör';
  let description: string;

  if (event.races && event.races.length > 0) {
    if (event.races.length === 1) {
      const discipline = translateDiscipline(event.races[0].discipline || 'orienteering');
      description = `MTBO ${discipline} competition organized by ${organizerName} in ${locationName}.`;
    } else {
      const disciplines = Array.from(
        new Set(event.races.map((r) => translateDiscipline(r.discipline || '')).filter(Boolean))
      ).join(', ');
      description = `MTBO competition with ${event.races.length} races (${disciplines}) organized by ${organizerName} in ${locationName}.`;
    }
  } else {
    description = `MTBO competition organized by ${organizerName} in ${locationName}.`;
  }

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: description,
    startDate: startDate,
    endDate: endDate,
    eventStatus:
      event.status === 'Canceled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    sport: 'Mountain Bike Orienteering',
    performer: {
      '@type': 'PerformingGroup',
      name: 'MTB orienteering competitors',
    },
  };

  // Organizer resolution with fallbacks to satisfy Search Console url & name requirements
  let organizerNameSchema = organiser;
  let organizerUrlSchema = event.urls?.find((u) => u.type === 'Website')?.url || externalUrl || undefined;

  if (!organizerNameSchema) {
    if (country === 'SWE') {
      organizerNameSchema = 'Svenska Orienteringsförbundet';
      organizerUrlSchema = 'https://www.orientering.se';
    } else if (country === 'INT' || country === 'IOF') {
      organizerNameSchema = 'International Orienteering Federation (IOF)';
      organizerUrlSchema = 'https://orienteering.sport';
    } else {
      organizerNameSchema = 'MTBO';
      organizerUrlSchema = SITE.site || externalUrl || undefined;
    }
  }

  const organizerLd = {
    '@type': 'Organization',
    name: organizerNameSchema,
    url: organizerUrlSchema,
  };
  ld.organizer = organizerLd;

  // Promote our site for the canonical event URL (using fallback if config is empty)
  const siteUrl = SITE.site || 'https://www.mountainbikeorientering.se';
  ld.url = `${siteUrl}/events/${event.slug}`;

  // Add missing offers fields (price, priceCurrency, validFrom)
  if (externalUrl) {
    ld.sameAs = externalUrl;

    let price: number;
    let priceCurrency = 'SEK';
    const isSwedish = country === 'SWE';

    if (isSwedish) {
      const isNationalOrDistrict = event.types?.some((t) =>
        ['national', 'championship', 'district', 'närområde'].includes(t.toLowerCase())
      );
      if (isNationalOrDistrict) {
        price = 210;
      } else {
        price = 0;
      }
    } else {
      priceCurrency = country === 'IOF' ? 'EUR' : 'SEK';
      price = 0;
    }

    const startDateObj = new Date(parentStartRaw || event.start_time);
    const validFromDate = new Date(startDateObj.getTime() - 90 * 24 * 60 * 60 * 1000);
    const validFrom = validFromDate.toISOString().split('T')[0];

    ld.offers = {
      '@type': 'Offer',
      url: externalUrl,
      price: price.toString(),
      priceCurrency: priceCurrency,
      validFrom: validFrom,
      availability: 'https://schema.org/InStock',
    };
  }

  // Map image (using absolute fallback url if empty)
  ld.image = [`${siteUrl}/og-images/events/${event.slug}.jpg`];

  // Map location Place schema (always generated to satisfy Schema/Search Console requirements)
  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressCountry: countryToTwoLetter(country),
  };
  if (event.region) {
    address.addressLocality = event.region;
  }

  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: locationName,
    address: address,
  };

  if (event.races[0]?.position) {
    location.geo = {
      '@type': 'GeoCoordinates',
      latitude: event.races[0].position.lat,
      longitude: event.races[0].position.lng,
    };
  }
  ld.location = location;

  // Map individual races/deltävlingar inside subEvent array (only for multi-race events)
  if (event.races && event.races.length > 1) {
    ld.subEvent = event.races.map((race) => {
      const raceStart = formatJsonLdDate(race.datetimez);
      const raceEnd = raceStart;

      const prefix = event.races.length > 1 ? `Deltävling ${race.race_number}: ` : '';
      const raceName = race.name || event.name;
      const subEventName = prefix && !raceName.startsWith('Deltävling') ? `${prefix}${raceName}` : raceName;

      const subLocation: Record<string, unknown> = {
        '@type': 'Place',
        name: locationName,
        address: address,
      };
      if (race.position) {
        subLocation.geo = {
          '@type': 'GeoCoordinates',
          latitude: race.position.lat,
          longitude: race.position.lng,
        };
      } else if (location.geo) {
        subLocation.geo = location.geo;
      }

      const subLd: Record<string, unknown> = {
        '@type': 'SportsEvent',
        name: subEventName,
        description: `MTBO ${translateDiscipline(race.discipline || 'orienteering')} race for ${event.name}.`,
        startDate: raceStart,
        endDate: raceEnd,
        sport: `Mountain Bike Orienteering - ${race.discipline}`,
        eventStatus:
          event.status === 'Canceled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
        performer: ld.performer,
        organizer: organizerLd,
        location: subLocation,
      };

      const raceExternalUrl = resolveRaceExternalUrl(race, externalUrl);
      if (raceExternalUrl) {
        subLd.sameAs = raceExternalUrl;

        let racePrice: number;
        let racePriceCurrency = 'SEK';
        const isSwedish = country === 'SWE';

        if (isSwedish) {
          const isNationalOrDistrict = event.types?.some((t) =>
            ['national', 'championship', 'district'].includes(t.toLowerCase())
          );
          if (isNationalOrDistrict) {
            racePrice = 210;
          } else {
            racePrice = 0;
          }
        } else {
          racePriceCurrency = country === 'IOF' ? 'EUR' : 'SEK';
          racePrice = 0;
        }

        const raceDateObj = new Date(race.datetimez);
        const raceValidFromDate = new Date(raceDateObj.getTime() - 90 * 24 * 60 * 60 * 1000);
        const raceValidFrom = raceValidFromDate.toISOString().split('T')[0];

        subLd.offers = {
          '@type': 'Offer',
          url: raceExternalUrl,
          price: racePrice.toString(),
          priceCurrency: racePriceCurrency,
          validFrom: raceValidFrom,
          availability: 'https://schema.org/InStock',
        };
      }

      return subLd;
    });
  }

  return ld;
}
