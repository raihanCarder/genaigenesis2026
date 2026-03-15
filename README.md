# beacon

`beacon` is a location-aware support navigator built to help people in need find nearby essential services, ask grounded questions about those services, and move from immediate needs toward longer-term stability.

## Goal

The project is designed around a simple progression:

- help someone discover relevant nearby support quickly
- keep answers grounded in real service data instead of generic AI output
- support longer-term planning and saved places for returning users

It is intended for people navigating urgent support needs such as food access, shelter, hygiene, healthcare, legal help, and related community services.

## Product Surface

- `/` landing page with location entry
- `/dashboard` ranked local service discovery
- `/chat` grounded chat over the currently loaded service set
- `/services/[id]` service detail pages
- `/plan` signed-in roadmap planning flow
- `/saved` signed-in saved-services view

## Core Features

- Location-aware dashboard that combines curated service data with optional Google Places enrichment and trusted web discovery
- Service normalization, deduplication, distance scoring, freshness handling, and ranking before results reach the UI
- Grounded Gemini chat that is constrained to the provided services, with local fallback responses when AI credentials are missing
- Signed-in planning experience for generating a stability roadmap from the user context and available services
- Favorites persistence backed by Supabase with row-level security
- Local-first development mode that still works with the bundled seed dataset when external APIs are unavailable

## System Overview

### Request and data flow

1. A user enters a location on the landing page.
2. The dashboard resolves that location and loads services from:
   - the bundled seed dataset at `data/toronto/services.json`
   - optional Google Maps and Places enrichment
   - optional trusted web discovery
3. Service records are normalized, merged, ranked, and limited per category.
4. The resulting service set powers:
   - the dashboard UI
   - grounded chat recommendations
   - roadmap generation inputs
5. Signed-in users can save services to Supabase-backed favorites.

### Backend surface

- `app/api/dashboard/route.ts`: ranked dashboard payloads
- `app/api/services/route.ts`: service lookup
- `app/api/location/*`: geocoding, autocomplete, and static-map utilities
- `app/api/chat/route.ts`: grounded chat responses
- `app/api/roadmap/route.ts`: roadmap generation
- `app/api/favorites/route.ts`: saved service persistence
- `app/auth/callback/route.ts`: auth callback handling

### Validation and state

- Zod schemas in `lib/types.ts` define service, location, dashboard, chat, roadmap, and favorites contracts.
- Zustand in `store/app-store.ts` manages client-side app state such as user and location context.

## Project Structure

```text
app/
  api/                    Next.js route handlers
  auth/                   Auth callback route
  chat/                   Grounded chat page
  dashboard/              Dashboard page
  plan/                   Roadmap page
  saved/                  Saved-services page
  services/[id]/          Service detail pages

components/
  ui/                     Shared UI primitives and visual components
  *.tsx                   Cross-page components such as nav, chat, save buttons

features/
  dashboard/              Dashboard-specific UI, hooks, and API client code
  roadmap/                Roadmap-specific UI, hooks, and API client code

lib/
  adapters/               Gemini, Google Maps, Brave Search, Supabase adapters
  auth/                   Server auth helpers
  constants/              Categories and helpline constants
  services/               Aggregation, normalization, ranking, favorites logic
  supabase/               Browser, server, and middleware clients
  *.ts                    Shared utilities, env parsing, and types

data/toronto/
  services.json           Current bundled seed dataset

store/
  app-store.ts            Zustand app state

supabase/
  favorites.sql           Favorites table and RLS policies

scripts/
  test-roadmap.ts         Manual roadmap test helper

test/
  *.test.ts(x)            Vitest coverage for dashboard, routes, adapters, and UI
```

## Tech Stack

- Next.js 15 with the App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand for client state
- Zod for runtime validation
- Gemini paired with LangChain and LangGraph technologies for advisory logic
- Google Maps and Places APIs for geocoding and enrichment
- Brave Search for trusted web discovery
- Supabase Auth and Postgres for user sessions and saved services
- Vitest and Testing Library for automated tests

## Environment Variables

Copy `.env.example` to `.env` and fill in the values you need.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | Optional | Live geocoding, place details, and supplemental place search |
| `GOOGLE_PLACES_API_FLAVOR` | Optional | Places API mode, defaults to `legacy` |
| `GEMINI_API_KEY` | Optional | Live grounded chat and roadmap generation |
| `GEMINI_MODEL` | Optional | Gemini model name, defaults to `gemini-2.5-flash` |
| `BRAVE_SEARCH_API_KEY` | Optional | Trusted web discovery for service enrichment |
| `NEXT_PUBLIC_SUPABASE_URL` | Required for auth and favorites | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required for auth and favorites | Supabase publishable key |

### Local fallback behavior

The app still runs without the optional external credentials:

- without Google Maps, it falls back to bundled location handling
- without Gemini, it returns local fallback chat and roadmap responses
- without Brave Search, trusted web discovery is skipped
- without Supabase, signed-in flows such as saved services are not available

## Data Model

The repository currently includes a seed dataset at `data/toronto/services.json`.

The product itself is not Toronto-specific. Any region can be supported as long as service records follow the same schema and the relevant local data is supplied.

Supported service categories:

- `food`
- `services`
- `free-food-events`
- `showers`
- `bathrooms`
- `shelters`
- `clinics`
- `legal-help`
- `wifi-charging`

Each service record is validated against the schemas in `lib/types.ts`.

## How To Run

### Prerequisites

- Node.js 20 or newer
- npm

### Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in the environment variables you want to use.

4. If you want auth and saved services, create a Supabase project and run:

   - the SQL in `supabase/favorites.sql`
   - Email auth in the Supabase dashboard

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Available Scripts

- `npm run dev`: start the local development server
- `npm run build`: create a production build
- `npm run start`: run the production build
- `npm run typecheck`: run TypeScript without emitting files
- `npm test`: run the Vitest suite

## Development Modes

### Local dataset mode

Useful for UI work, local development, and basic flow validation.

- uses the current bundled seed dataset
- supports the public dashboard and service browsing flows
- returns fallback chat and roadmap responses when AI credentials are missing

### Full integration mode

Useful for end-to-end behavior closer to production.

- Google Maps for live location and place enrichment
- Gemini for grounded responses and planning output
- Brave Search for trusted web discovery
- Supabase for authentication and favorites persistence

## Contributors

Current git history contributors include:

- Raihan Carder
- Suhiyini Kasim
- Liam Kitsingh
