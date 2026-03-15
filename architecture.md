# Architecture

## 1. Current System Snapshot

Genesis Navigator is a Next.js 15 App Router application for finding nearby support services, asking grounded questions about those services, and, for signed-in users, generating a longer-term stability roadmap.

The current implementation is a Toronto-first demo:

- the only bundled curated dataset is [`data/toronto/services.json`](data/toronto/services.json)
- the default location fallback is downtown Toronto
- helplines and copy are Toronto-specific

Anonymous users can:

- set a location
- browse the dashboard
- open service detail pages
- use grounded chat

Authenticated users can also:

- generate a roadmap
- save favorites in Supabase

The app does not use a standalone backend service. Everything runs through Next.js route handlers plus server-side service modules.

## 2. Stack

### Framework and UI

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Zustand for lightweight client state
- Framer Motion and Lucide React for UI polish

### External integrations

- Google Maps / Places for geocoding, autocomplete, place details, and supplemental place search
- Gemini for grounded chat, roadmap generation, and trusted-page extraction
- Brave Search for trusted web discovery
- Supabase Auth and Postgres for authentication and favorites

### Testing and tooling

- Vitest
- Testing Library

## 3. High-Level Runtime Topology

```text
[ Browser ]
    |
    v
[ Next.js App Router ]
  - server pages
  - client components
  - middleware
    |
    +--> [ Zustand app store ]
    |
    +--> [ Route handlers under /app/api ]
              |
              +--> [ lib/services/* ]
              |      - dashboard assembly
              |      - search
              |      - ranking
              |      - favorites store
              |
              +--> [ lib/adapters/google-maps.ts ]
              +--> [ lib/adapters/web-discovery.ts ]
              +--> [ lib/adapters/gemini.ts ]
              +--> [ lib/supabase/* ]
              +--> [ data/toronto/services.json ]
```

The app has no background jobs, queue workers, or persistent cache layer. Request-time composition is the dominant pattern.

## 4. Project Structure

```text
app/
  api/                    HTTP route handlers
  auth/callback/          Supabase auth callback exchange
  dashboard/              dashboard page
  chat/                   grounded chat page
  plan/                   roadmap page
  saved/                  favorites page
  services/[id]/          service detail page

components/               shared client components
features/dashboard/       dashboard-specific UI, hooks, API helpers
features/roadmap/         roadmap-specific UI, hooks, API helpers
lib/
  adapters/               Google Maps, Gemini, Brave, web discovery, Supabase mapping
  services/               dashboard assembly, ranking, normalization, favorites
  supabase/               browser/server/middleware helpers
  constants/              categories and helplines
  types.ts                zod schemas and shared contracts
store/                    Zustand app store
data/toronto/             curated service seed
supabase/                 SQL schema for favorites
```

`components/dashboard-client.tsx` and `components/roadmap-client.tsx` are compatibility re-exports; the real implementations live under `features/`.

## 5. User-Facing Routes

### Public routes

- `/`
  - landing page with `LocationEntry`
  - supports typed location, autocomplete, and browser geolocation
- `/dashboard`
  - main browse experience
  - loads the assembled dashboard payload for the current location
- `/chat`
  - grounded chat over the currently loaded service set
- `/services/[id]`
  - service detail page
  - resolves a service from curated data, supplemental search, or dashboard payload lookup

### Auth-sensitive routes

- `/plan`
  - roadmap generation UI
  - protected by middleware and also guarded in the client component
- `/saved`
  - favorites list
  - protected by middleware and also guarded in the client component

### Auth callback

- `/auth/callback`
  - exchanges Supabase auth code for a session
  - redirects back to the original path via `next`

## 6. Frontend Architecture

### 6.1 Root layout

`app/layout.tsx` wraps the app with:

- `Providers`
- `TopNav`
- the route content area

### 6.2 Client state

The Zustand store in `store/app-store.ts` holds:

- `location`
- `services`
- `selectedCategory`
- `user`
- `authReady`

In practice:

- location and services are the most important shared client state
- dashboard category filtering is currently local to the dashboard client
- auth state is hydrated from Supabase in `components/providers.tsx`

### 6.3 Auth hydration

`Providers` does the client-side auth bootstrap:

- creates the browser Supabase client if env vars exist
- calls `supabase.auth.getUser()`
- subscribes to `onAuthStateChange`
- maps the Supabase user into the app store
- refreshes the router when auth state changes

### 6.4 Main client entry points

- `components/location-entry.tsx`
  - location input, autocomplete, geolocation, and initial navigation
- `features/dashboard/components/dashboard-client.tsx`
  - fetches dashboard data through `useDashboardServices`
  - renders warnings, category filter, service sections, and helplines
- `components/chat-client.tsx`
  - fetches dashboard payload for context
  - stores services and location in Zustand
  - submits grounded chat requests
- `features/roadmap/components/roadmap-client.tsx`
  - loads services for roadmap generation
  - renders intake and results panes
- `components/saved-client.tsx`
  - loads saved service snapshots from `/api/favorites`

## 7. Middleware and Request Gating

`middleware.ts` delegates to `lib/supabase/middleware.ts`.

Current middleware responsibilities:

- redirect any request containing a Supabase `code` query param to `/auth/callback`
- protect `/plan` and `/saved`
- redirect unauthenticated users for protected pages back to `/`

This means protected pages are enforced before page rendering, not only inside API routes.

## 8. API Surface

The shared contracts for these routes live in `lib/types.ts`.

### `GET /api/location/autocomplete`

Purpose:

- location suggestions for the landing-page search box

Behavior:

- requires at least 2 characters
- uses Google Places autocomplete when configured
- falls back to a small Toronto-centric suggestion set otherwise

### `POST /api/location/geocode`

Purpose:

- convert user input, place id, or coordinates into a normalized `LocationContext`

Accepted inputs:

- `location`
- `placeId`
- `latitude` and `longitude`
- optional `label`

Behavior:

- prefers Google geocoding and place details when available
- falls back to Toronto defaults or the raw coordinates if Google is unavailable

### `GET /api/dashboard`

Purpose:

- return the full dashboard payload

Query params:

- `lat`
- `lng`
- optional `label`
- optional `placeId`
- optional `city`
- optional `region`
- optional `country`
- optional `radius`

Returns:

- `DashboardPayload`

### `GET /api/services`

Purpose:

- raw service search endpoint
- detail lookup by `id`

Query params:

- `lat`
- `lng`
- optional `id`
- optional `category`
- optional `radius`
- optional `openNow`

Notes:

- `lat` and `lng` are currently required even when `id` is provided
- this endpoint uses a simpler retrieval pipeline than `/api/dashboard`

### `POST /api/chat`

Purpose:

- grounded chat response over the current service context

Input:

- `message`
- `location`
- optional `selectedCategory`
- `services`

Behavior:

- validates input with zod
- truncates services to 12 before passing them to Gemini
- returns `ChatResponse`

### `POST /api/roadmap`

Purpose:

- authenticated roadmap generation

Input:

- `needs`
- optional `constraints`
- `location`
- `services`

Behavior:

- requires an authenticated Supabase user
- truncates services to 12
- returns `RoadmapResponse`

### `GET /api/favorites`

Purpose:

- list saved services for the authenticated user

Behavior:

- returns parsed service snapshots from Supabase

### `POST /api/favorites`

Purpose:

- save or remove a favorite

Input:

- `serviceId`
- `action: "save" | "remove"`
- `service` snapshot when saving

Behavior:

- requires auth
- persists the full service snapshot, not just the id

## 9. Canonical Domain Model

The source of truth is `lib/types.ts`.

### 9.1 Categories

```ts
type ServiceCategory =
  | "food"
  | "services"
  | "free-food-events"
  | "showers"
  | "bathrooms"
  | "shelters"
  | "clinics"
  | "legal-help"
  | "wifi-charging";
```

### 9.2 Service shape

```ts
type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  description?: string;
  phone?: string;
  website?: string;
  hoursText?: string;
  openNow?: boolean;
  eligibilityNotes?: string;
  tags?: string[];
  sourceType: "maps" | "scraped" | "manual" | "open-data";
  sourceName?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  freshnessState?: "fresh" | "stale" | "unknown";
  confidenceScore?: number;
};

type ServiceWithMeta = Service & {
  distanceMeters?: number;
};
```

### 9.3 Other important contracts

- `LocationContext`
  - lat/lng, display label, optional place and region metadata
- `LocationPlaceMetadata`
  - Google place details used as dashboard anchor context
- `DashboardPayload`
  - resolved location, optional anchor place, services, warnings
- `ChatResponse`
  - summary, recommended services, next steps, verification warning
- `RoadmapResponse`
  - situation summary, `thisWeek`, `thisMonth`, `longerTerm`, notes, verification warnings

## 10. Service Data Pipeline

### 10.1 Curated seed data

Curated records come from `data/toronto/services.json`.

`lib/services/normalization.ts`:

- parses the seed with `ServiceSchema`
- computes `freshnessState` from `lastVerifiedAt`
- returns the normalized records as the local baseline dataset

### 10.2 Google Maps adapter

`lib/adapters/google-maps.ts` provides:

- geocoding
- autocomplete
- place details
- text-based place matching
- category-based supplemental place search
- Google Maps directions URL generation

Key implementation details:

- supports `legacy` and `new` Places API modes via `GOOGLE_PLACES_API_FLAVOR`
- uses in-memory TTL caches
- falls back gracefully when Google is unavailable
- can temporarily disable Places usage after request-denied style failures

### 10.3 Trusted web discovery

`lib/adapters/web-discovery.ts` augments dashboard results with scraped candidates from trusted pages.

Pipeline:

1. Brave Search finds candidate pages for supported categories.
2. URLs are filtered to trusted domains and paths.
3. Pages are fetched and reduced to plain text.
4. Gemini extracts structured candidate services from page text.
5. Extracted candidates are validated against Google geocoding or place lookup.
6. Validated services are returned as `sourceType: "scraped"`.

Current trusted web discovery categories:

- `food`
- `free-food-events`
- `showers`
- `shelters`
- `services`
- `clinics`

If Brave or Gemini is missing, the dashboard still works and returns warnings instead of discovered services.

## 11. Dashboard Assembly

`lib/services/dashboard.ts` is the highest-level service retrieval pipeline in the repo.

Current flow:

1. Resolve the user location through `geocodeLocation`.
2. Fetch `anchorPlace` details when a place id exists.
3. Load curated services.
4. Load Google supplemental places for selected dashboard categories.
5. Run trusted web discovery with a 7 second timeout.
6. Merge and deduplicate all services.
7. Add distance from the resolved location.
8. Filter within radius.
9. Rank services.
10. Limit to 7 services per category.
11. Return warnings alongside the services.

Current dashboard categories loaded from Google Places:

- `food`
- `free-food-events`
- `shelters`
- `showers`
- `services`
- `clinics`
- `bathrooms`
- `wifi-charging`

Important merge rules:

- source priority favors `manual` over `open-data`, `scraped`, then `maps`
- Google data is preferred for precise coordinates, phone, website, and `openNow`
- scraped data is preferred for descriptions, hours text, eligibility notes, and source URLs

The dashboard is the richest retrieval path in the app.

## 12. Search and Detail Retrieval

`lib/services/query.ts` powers `/api/services` and some service detail fallback logic.

### `searchServices`

This is a lighter-weight retrieval path than dashboard assembly:

- loads curated services
- loads Google supplemental places
- adds distance
- deduplicates by normalized `name + address`
- filters by category, radius, and optional `openNow`
- ranks results

Differences from the dashboard pipeline:

- no trusted web discovery
- default radius is 5000 meters instead of 6000
- per-category limiting is not applied the same way

### `getServiceById`

Lookup order:

1. curated seed
2. `searchServices`
3. `findDashboardServiceById`

This is why detail pages can still resolve services that only appear after dashboard assembly.

## 13. Ranking and Trust

`lib/services/ranking.ts` scores services using:

- `openNow`
- distance
- freshness state
- source priority
- confidence score

`lib/services/freshness.ts` computes freshness using category-specific windows:

- 7 days for shelters and free-food events
- 14 days for food and showers
- 30 days for clinics, services, legal-help, bathrooms, and wifi-charging

Trust is surfaced in the UI through:

- warnings from the dashboard payload
- freshness labels on service cards
- source metadata on detail pages
- explicit verification messaging in chat and roadmap responses

## 14. AI Architecture

`lib/adapters/gemini.ts` is used in three places:

- grounded chat generation
- roadmap generation
- trusted web page extraction

### 14.1 Grounded chat

`generateGroundedChat`:

- builds a compact summary of up to 10 services
- sends a strict JSON prompt to Gemini
- validates the result with `ChatResponseSchema`
- removes recommended service ids that are not in the provided context

If Gemini is unavailable or fails:

- the app falls back to a deterministic response assembled from the top nearby services

### 14.2 Roadmap generation

`generateRoadmap`:

- takes user needs, optional constraints, and up to 12 services
- requests strict JSON
- validates with `RoadmapResponseSchema`
- strips unknown service ids from the generated steps

If Gemini is unavailable or fails:

- the app falls back to a deterministic roadmap built from nearby services

### 14.3 AI constraints

The current code enforces these constraints mainly through prompt design and output validation:

- only use provided services as factual grounding
- return strict JSON
- do not invent service ids

There is no streaming, tool calling, or multi-step agent orchestration.

## 15. Authentication and Persistence

### 15.1 Supabase auth

The app uses `@supabase/ssr` for both browser and server clients.

Current auth flow:

1. The browser opens the email/password auth modal.
2. Sign-in and sign-up run against Supabase Auth.
3. Supabase session cookies are read on the server.
4. Middleware and route handlers use those cookies to enforce access.
5. `Providers` mirrors the current session into Zustand for the client UI.

Current auth methods:

- email + password sign up
- email + password sign in
- sign out

No social providers are implemented in the current codebase.

### 15.2 Favorites persistence

Favorites live in Supabase Postgres.

Schema source:

- `supabase/favorites.sql`

Table shape:

- `user_id`
- `service_id`
- `service_snapshot`
- `saved_at`

Important design choice:

- favorites store the full `service_snapshot` JSON so saved items remain renderable even if live search results change later

RLS policies restrict reads and writes to the owning authenticated user.

## 16. Environment Variables

Validated in `lib/env.ts`.

### Server-side

- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_PLACES_API_FLAVOR` with default `legacy`
- `BRAVE_SEARCH_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` with default `gemini-2.5-flash`

### Client-visible

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Current behavior when env vars are missing:

- no Google Maps key: location and autocomplete fall back to Toronto-centric behavior; supplemental place search is disabled
- no Brave key: trusted web discovery is disabled
- no Gemini key: chat, roadmap, and discovery extraction fall back to deterministic behavior or no-op warnings
- no Supabase config: auth UI is disabled and protected features are unavailable

## 17. Caching, Timeouts, and Resilience

The app relies on short-lived in-memory caches inside adapter modules.

Current cache usage:

- Google geocoding and Places lookups
- Brave Search results
- page text for trusted discovery
- overall trusted discovery results

Common properties:

- 5 minute TTL
- process-local only
- lost on restart or across server instances

Notable timeouts:

- Google fetches: 4 seconds
- Brave Search: 4 seconds
- page fetch for discovery: 3.5 seconds
- Gemini extraction for discovery: 4 seconds
- dashboard web discovery wrapper: 7 seconds

Logging is currently thin and goes through `console.info` / `console.error` wrappers in `lib/logger.ts`.

## 18. Current Known Gaps

These are real characteristics of the current implementation and should be treated as architecture notes, not aspirational goals.

- The app is still Toronto-first even though the location input is generic.
- The only bundled seed dataset is Toronto.
- `legal-help` exists in shared types, but the dashboard pipeline does not currently load that category by default.
- `/api/services` and `/api/dashboard` use different retrieval pipelines, so results can differ between raw search and the main dashboard.
- Favorites are persisted correctly, but `FavoriteButton` does not hydrate its initial saved state from the server, so cards do not know they are already saved.
- Recent searches and preferred locations are not persisted yet.
- There is no durable cache, background verification job, or real-time service freshness pipeline.
- AI features are request/response only and depend on synchronous external calls.

## 19. Practical Summary

Today the codebase is organized around one central idea:

- build a dashboard payload for a location by combining curated Toronto services, Google place search, and optional trusted web discovery

Everything else is layered on top of that:

- chat reasons over the current dashboard context
- roadmap generation reuses nearby services but requires auth
- service details resolve individual records from the same retrieval stack
- favorites store snapshots of those records in Supabase

This is the current architecture as implemented, not the original MVP plan.
