# Product Requirements Document (PRD): MTBO Event Listings

**Version:** 1.0
**Status:** Implemented
**Date:** 2026-01-20

## 1. Overview

The goal of this feature is to provide a user-friendly, responsive, and reliable calendar of Mountain Bike Orienteering (MTBO) events. The system aggregates data from external sources and presents it in a high-density table format suitable for both desktop and mobile devices.

## 2. Problem Statement

Users need a central place to find MTBO events with clear dates, locations, and details. Previous solutions lacked responsiveness, mobile optimization, and robust data handling (e.g., missing flags, inconsistent attributes).

## 3. Core Features

### 3.1 Data Management

- **Automated Fetching**: Events are fetched from a remote JSON source (`mtbo_events.json`) via a custom script.
- **Normalization**: Inconsistent source data (e.g., `Region` vs `Regions`, `Status` capitalization) is normalized into a strict, predictable schema.
- **Strict Validation**: Input data is validated against a Zod schema to prevent build errors and ensure UI consistency.
- **Metadata Tracking**: The system tracks the fetch timestamp and total event count for transparency.

### 3.2 User Interface

- **High-Density Layout**: The event table is optimized for information density (`py-1`, `text-xs`) to reduce scrolling.
- **Dynamic Navigation**: Users can seamlessly switch between years (2020-2027+) based on available data.
- **Client-Side Filtering**: A dropdown allows users to filter the visible events by Country without page reloads.
- **Footer Information**: Displays total filtered event count and the "Last Updated" timestamp.

### 3.3 Visual & Responsive Design

- **Responsive Columns**: Information layout adapts to screen size:
  - **Mobile**: Date, Event Name, Organizer (folded under name).
  - **Tablet**: Adds Distance, Type.
  - **Desktop**: Adds dedicated Organizer column, Region.
  - **Large Screens**: Full detail.
- **Visual Indicators**:
  - **Flags**: Emoji-based flags for countries (handling both ISO codes and full names).
  - **Cancelled Events**: Distinct styling (strikethrough, red background/badge) for cancelled competitions.
  - **Dark Mode**: Fully compatible with system dark mode preferences.

## 4. Technical Architecture

### 4.1 Data Pipeline

1.  **Source**: `https://raw.githubusercontent.com/blaudden/mtbo-scraper/main/mtbo_events.json`
2.  **Processing Script**: `scripts/process-mtbo-events.ts`
    - Fetches JSON.
    - Splits by year.
    - Normalizes object keys to `CleanEvent` interface.
    - Writes to `src/content/events/[year].json`.
    - Writes metadata to `src/content/events/events-metadata.json`.
3.  **Content Loader**: Astro Content Collections (`src/content/config.ts`) with Zod schema.

### 4.2 Frontend Components

- **`src/pages/events/[year].astro`**: Route handler. Generates static paths for all years. Handles layout and state for the filter.
- **`src/components/events/EventTable.astro`**: Presentation component. Handles table rendering, column responsiveness, and "Cancelled" logic.

## 5. Requirements

### Functional

- **FR-01**: System MUST display all events sorted by date.
- **FR-02**: System MUST allow filtering by Country.
- **FR-03**: System MUST identify and style "Cancelled" events distinctly.
- **FR-04**: System MUST link to the external event URL in a new tab.

### Non-Functional

- **NFR-01**: The UI MUST be legible on mobile devices (320px width).
- **NFR-02**: The build MUST fail if event data does not match the defined schema (Type safety).
- **NFR-03**: Page load performance should be optimized (static generation).

## 6. Future Considerations

- **Source Standardization**: Update scraper to output standardized ISO-3166 alpha-3 country codes to simplify the frontend emoji mapping (See `TODO_scraper.md`).
- **Search**: Add text-based search for event names.
- **Map View**: A geographic visualization of events.
