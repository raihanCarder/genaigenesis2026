# Architecture

## Goals

The codebase is organized around a few practical design rules:

- feature UI lives with its feature
- domain logic lives in focused modules with small public interfaces
- transport and vendor-specific adapters stay thin
- shared infrastructure such as caches and timeout-aware fetch helpers is centralized
- compatibility facades can exist temporarily, but the implementation should live in modular domain folders

## Current module boundaries

### Features

- `features/chat`: grounded chat UI
- `features/dashboard`: dashboard UI, hooks, and browser-side data loading
- `features/roadmap`: roadmap UI and API client
- `features/saved`: saved-services UI

### Domain modules

- `lib/location`
  - default location state
  - search-param parsing and serialization
  - dashboard cache
  - Google Maps integration split into focused submodules
- `lib/roadmap`
  - roadmap prompt/input building
  - roadmap response to view-model shaping
- `lib/ai/gemini`
  - Gemini JSON transport helper
  - grounded chat generation
  - roadmap generation
- `lib/discovery/trusted-web`
  - URL trust rules
  - page text extraction
  - discovered candidate validation
  - discovery orchestration
- `lib/shared`
  - generic expiring cache utilities
  - timeout-aware fetch helper

### Compatibility facades

These files exist as stable import points while the internals stay modular:

- `lib/adapters/google-maps.ts`
- `lib/adapters/gemini.ts`
- `lib/adapters/web-discovery.ts`
- `lib/dashboard-cache.ts`

They should stay thin and delegate to the domain modules above.

## Interaction rules

1. App routes should depend on feature entry points and domain interfaces, not deep implementation files.
2. Feature components may call feature-specific hooks and API clients, but should avoid embedding infrastructure code.
3. Domain services may use shared helpers and adapters, but should not depend on UI modules.
4. Shared helpers must remain generic and reusable across domains.
5. If a module starts owning fallback data, parsing, transport, orchestration, and formatting at once, it should be split again.

## Directory sketch

```text
app/
components/
features/
  chat/
  dashboard/
  roadmap/
  saved/
lib/
  ai/
    gemini/
  discovery/
    trusted-web/
  location/
    google-maps/
  roadmap/
  shared/
  services/
  supabase/
test/
docs/
```

## Refactor notes

- The large Google Maps, Gemini, and trusted web discovery modules were decomposed into smaller internal modules.
- `chat-client` and `saved-client` were moved into feature folders to align the UI structure with the rest of the app.
- Tests were updated to match current module boundaries and accessible UI behavior.
