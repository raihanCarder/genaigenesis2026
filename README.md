# Genesis Navigator

Toronto support navigator built with Next.js, Zustand, Supabase, Google Maps, and Gemini.

The app has three product layers:

- public dashboard for nearby services
- public grounded chat over the currently loaded service set
- authenticated roadmap and saved places

## What You Need For It To Work

There are two levels of "working":

### 1. Local demo mode

This is enough to run the app locally with the curated Toronto dataset and fallback behavior.

Required:

- Node.js 22+
- npm
- the local seed dataset at [data/toronto/services.json](/Users/raihancarder/Desktop/repos/genaigenesis2026/data/toronto/services.json)

What works in this mode:

- landing page
- dashboard
- service detail pages
- fallback geocoding for a few Toronto inputs
- grounded chat with local fallback responses
- roadmap page UI

What does not fully work in this mode:

- email/password sign-in
- authenticated roadmap generation with real Supabase auth
- saved places persistence across sessions
- live Google geocoding and supplemental Google Places data
- live Gemini responses

### 2. Full integration mode

This is what you need for the complete MVP behavior.

Required external services:

- Google Maps Platform
- Gemini API
- Supabase Auth
- Supabase Postgres
- Supabase SSR cookie sessions for server-side route protection

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env
```

3. Set up Supabase:

- create a Supabase project
- enable Email auth
- copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- run the SQL in [supabase/favorites.sql](/Users/raihancarder/Desktop/repos/genaigenesis2026/supabase/favorites.sql) inside the Supabase SQL editor

4. Start the app:

```bash
npm run dev
```

5. Optional verification:

```bash
npm run typecheck
npm test
npm run build
```

## Required Environment Variables

These are defined in [.env.example](/Users/raihancarder/Desktop/repos/genaigenesis2026/.env.example).

### Google Maps

- `GOOGLE_MAPS_API_KEY`

Used for:

- location geocoding
- supplemental Google Places results for some categories
- directions links use a public Google Maps URL and do not require extra setup

If missing:

- the app falls back to a few hardcoded Toronto geocoding results
- supplemental Google Places results are skipped

### Gemini

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Used for:

- grounded chat responses
- roadmap generation

If missing:

- the app returns local fallback chat and roadmap responses instead of live model output

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Used for:

- email/password auth in the browser
- cookie-backed server auth in route handlers and protected pages
- favorites persistence in Postgres

If missing:

- the sign-in button is disabled
- roadmap and saved pages remain blocked behind auth

### Supabase Database Setup

This app uses Supabase browser auth plus cookie-backed server auth. It does not require a service role key for the current feature set.

Quick setup in the Supabase dashboard:

1. Create a new project.
2. Go to `Authentication` -> `Providers` -> `Email` and enable email/password sign-ins.
3. Optional: disable email confirmation if you want sign-up to create an immediately usable account during local development.
4. Go to `Project Settings` -> `API`.
5. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
6. Copy the publishable key into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   If your dashboard still labels it as the anon/public key, use that value.
7. Go to `SQL Editor`.
8. Paste the contents of [supabase/favorites.sql](/Users/raihancarder/Desktop/repos/genaigenesis2026/supabase/favorites.sql) and run it.

That SQL creates:

- `public.favorites`
- a unique constraint on `(user_id, service_id)`
- an index for recent favorites
- row-level security policies so users can only read and write their own rows

## Data You Need

### 1. Curated service dataset

The main required app data is [data/toronto/services.json](/Users/raihancarder/Desktop/repos/genaigenesis2026/data/toronto/services.json).

This file is the core source of truth for:

- food
- services
- free food events
- showers
- shelters
- clinics
- legal help
- bathrooms
- Wi-Fi and charging

Each record must match the `Service` schema defined in [lib/types.ts](/Users/raihancarder/Desktop/repos/genaigenesis2026/lib/types.ts).

### Minimum required fields per service

- `id`
- `name`
- `category`
- `address`
- `latitude`
- `longitude`
- `sourceType`

### Recommended fields

- `description`
- `phone`
- `website`
- `hoursText`
- `eligibilityNotes`
- `tags`
- `sourceName`
- `sourceUrl`
- `lastVerifiedAt`
- `confidenceScore`

### Allowed categories

- `food`
- `services`
- `free-food-events`
- `showers`
- `bathrooms`
- `shelters`
- `clinics`
- `legal-help`
- `wifi-charging`

### Allowed source types

- `maps`
- `scraped`
- `manual`
- `open-data`

### Example service record

```json
{
  "id": "food-example",
  "name": "Example Food Program",
  "category": "food",
  "description": "Meals and food bank support.",
  "address": "123 Example St, Toronto, ON",
  "latitude": 43.6532,
  "longitude": -79.3832,
  "phone": "(416) 555-0100",
  "website": "https://example.org",
  "hoursText": "Mon-Fri 9:00 AM-5:00 PM",
  "sourceType": "manual",
  "sourceName": "Toronto curated dataset",
  "sourceUrl": "https://example.org",
  "lastVerifiedAt": "2026-03-01T12:00:00.000Z",
  "confidenceScore": 0.95,
  "tags": ["meals", "food bank"]
}
```

## Data Quality Expectations

The app works best when each curated record has:

- accurate coordinates
- a real address string
- a recent `lastVerifiedAt`
- a sensible `confidenceScore` between `0` and `1`

Freshness is derived from category plus `lastVerifiedAt`, so stale or missing timestamps reduce trust messaging quality.

## External Data Behavior

### Google Places

The app supplements curated data with Google Places only for categories where maps data is useful:

- `clinics`
- `bathrooms`
- `wifi-charging`
- some `services`

You do not need to preload that data locally. It is fetched at runtime when `GOOGLE_MAPS_API_KEY` is present.

### Supabase / Postgres

Favorites are stored in:

- `public.favorites`

Each favorite row stores:

- `user_id`
- `service_id`
- `service_snapshot`
- `saved_at`

### Gemini

Gemini does not need its own dataset. It only receives:

- the user message or roadmap needs
- a bounded list of normalized services from the backend
- freshness and confidence metadata

So the real data it depends on is still your curated services plus any optional Google Places results.

## What Data You Should Gather Next

If you want this to feel real in demo or production, gather these for Toronto:

- 20 to 50 high-confidence curated service records
- at least 3 to 5 records each for `food`, `shelters`, `services`, `clinics`, and `legal-help`
- real `lastVerifiedAt` timestamps for time-sensitive services
- phone numbers for shelters and food programs
- eligibility notes for legal, shelter, and ID-related services

Priority categories for better demo quality:

1. `food`
2. `shelters`
3. `services`
4. `clinics`
5. `legal-help`
6. `showers`

## Current Fallback Behavior

If keys are missing, the code does not fully fail:

- missing Maps key: fallback Toronto geocoding is used
- missing Gemini key: local fallback chat and roadmap responses are used
- missing Supabase config: sign-in is disabled
- missing Supabase table setup: favorites will fail until the SQL is applied

That makes local UI development easy, but for the full MVP you need all env vars populated.

## Project Structure

- [app](/Users/raihancarder/Desktop/repos/genaigenesis2026/app): Next.js routes and API handlers
- [components](/Users/raihancarder/Desktop/repos/genaigenesis2026/components): UI and client-side flows
- [lib](/Users/raihancarder/Desktop/repos/genaigenesis2026/lib): adapters, schemas, auth, and service logic
- [store](/Users/raihancarder/Desktop/repos/genaigenesis2026/store): Zustand app state
- [data/toronto/services.json](/Users/raihancarder/Desktop/repos/genaigenesis2026/data/toronto/services.json): curated Toronto service dataset
- [test](/Users/raihancarder/Desktop/repos/genaigenesis2026/test): Vitest coverage
