# MTBO Event Calendar - Future Backlog

This document tracks features and improvements that have been deferred for future iterations of the event calendar.

## High Priority

- **Entry Deadlines:** Display registration deadlines on the event detail page. This data is available in the scraper output (`entry_deadlines`) but not currently rendered in the UI.
- **Real-time Participant Count Enrichment:** Fetch up-to-date entry/start counts in real-time (e.g. via a serverless function/edge handler querying the event provider's API directly) when the user views the event detail page, ensuring counts are always fresh rather than relying entirely on static scraper build caches.

## Medium Priority

- **Map Integration:** Embed a map (e.g., using Leaflet) on the event detail page using the `position` (lat/lng) and `areas` data from the races to show the location geographically.
- **Advanced Filtering:** Add filtering capabilities to the landing page and year pages to filter by Discipline (Sprint, Long) and Event Type (Championship, National, Local).
- **Visual Divider on Year Pages:** While past events are dimmed out, adding a hard visual divider line or section heading between "Upcoming" and "Past" events on year pages would improve UX.
- **"Add to Calendar" Functionality:** Allow users to export an `.ics` file for an event or race to add it directly to their personal calendar (Google, Apple, Outlook).
- **Pagination / Virtual Scrolling:** As the number of events grows, implement virtual scrolling or pagination for the year list views to avoid rendering too many DOM nodes at once.

## Low Priority

- **Global Site Integration:** Add links to `/events` in the main header and footer (`src/navigation.ts`), and add an "Upcoming Events" widget to the start page (`src/pages/index.astro`).
- **Internationalization (i18n):** Translate the calendar UI strings (currently hardcoded in Swedish, e.g., "Tävlingskalender", "Länkar", "Dokument") into English to fully support international users visiting for WMTBOC 2026.
- **Legacy Content Cleanup:** Implement 301 redirects from old static event pages (like `/mtbo-program`) to the new `/events` route.
