# Architecture

### Parsing Rules

- A `service` is any location-based resource, program, place, or event shown to the user.
- A `dashboard` is the main browse experience organized by category.
- A `chat response` is an AI answer grounded only in retrieved service data.
- A `roadmap` is a logged-in planning feature that helps a user move toward longer-term stability across time horizons such as `this week`, `this month`, and `longer term`.
- `MUST` means required behavior for the MVP.
- `SHOULD` means strongly recommended behavior unless a constraint blocks it.

## 2. Product Summary

The product is a web project that helps people find nearby essential services and, for signed-in users, plan toward greater long-term stability.

Core value:

- show nearby help fast
- support natural-language questions
- support longer-term planning for authenticated users
- keep trust high by showing source and freshness metadata

Primary resource types:

- food
- showers
- shelters
- bathrooms
- clinics
- legal help
- libraries, Wi-Fi, and charging
- community services

## 3. MVP Goals

The MVP should:

- let a user enter a location or use device geolocation
- show nearby services by category
- support a grounded chatbot for questions about those services
- support a roadmap feature for signed-in users focused on longer-term stability planning
- optionally let a signed-in user save favorites
- surface trust signals when data may be stale

## 4. Non-Goals for MVP

The MVP does not need to include:

- fully real-time shelter occupancy across all cities
- complex case management workflows
- native iOS or Android apps
- multilingual support at launch
- live route optimization
- heavy agent orchestration frameworks

## 5. Core User Needs

The product is optimized for people who need help with immediate practical questions such as:

- "Where can I get food tonight?"
- "What shelter is closest?"
- "What is open now?"
- "Where can I shower before going to a shelter?"
- "What support should I prioritize over the next few weeks?"

The product should also be usable by helpers, volunteers, or outreach workers who are searching on someone else's behalf.

## 6. Core Features

### 6.1 Location-Based Dashboard

The dashboard is the primary experience.

It MUST:

- load after the user sets a location
- organize results by category
- show practical service cards
- keep the current location visible
- expose help lines and emergency contacts

### 6.2 Grounded AI Chatbot

The chatbot is a support layer on top of retrieved service data.

It MUST:

- answer only from backend-provided services
- recommend actual services from the current context
- explain uncertainty when data is incomplete or stale
- avoid inventing facts such as hours, eligibility, or capacity

### 6.3 Logged-In Stability Roadmap

The roadmap is a planning layer for authenticated users who want to work toward greater stability over time.

It MUST:

- require login
- accept a short need summary or simple intake answers
- produce a staged plan such as `this week`, `this month`, and `longer term`
- connect each step to actual services when available
- focus on stabilization goals rather than only same-day triage
- call out verification needs for time-sensitive resources

### 6.4 Optional Auth and Favorites

Authentication is optional for browsing and chat, but it is required for roadmap planning and favorites.

If enabled, users can:

- access the roadmap feature
- save favorites
- keep recent searches
- keep preferred locations

### 6.5 Freshness and Trust Layer

Time-sensitive services need explicit trust handling.

The system SHOULD:

- store source metadata
- store last verification time when known
- mark stale or unknown records clearly
- tell the user when they should call first or verify before traveling

## 7. High-Level System Overview

```text
[ Web Browser ]
        |
        v
[ Next.js Frontend ]
  - location input
  - dashboard
  - chat UI
  - authenticated roadmap UI
  - favorites UI
        |
        v
[ Next.js API Layer ]
  - geocoding
  - service retrieval
  - filtering and ranking
  - AI prompt building
  - authenticated roadmap generation
  - favorites endpoints
    /           |             \
   v            v              v
[ Google ]  [ Service Store ] [ Gemini API ]
[ Maps   ]  [ normalized data ] [ grounded AI ]

Optional:
[ Firebase Auth + Firestore ]
```

## 8. Technology Choices

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- responsive web app layout
- optional component library such as `shadcn/ui`

### Backend

- Next.js route handlers or API routes
- TypeScript
- server-side service retrieval and AI orchestration

### Auth and Persistence

- Firebase Authentication
- Firestore for favorites and lightweight user metadata

### Maps and Location

- Google Maps Platform
- Geocoding API
- Places API
- Maps JavaScript API
- optional Routes API

### AI

- Gemini API
- structured prompts
- structured JSON outputs

### Data Sources

- curated service dataset
- manually entered demo data
- lightweight scraped nonprofit or city pages
- optional city open-data feeds
- Google Maps public place data where relevant

## 9. Component Responsibilities

### 9.1 Frontend Responsibilities

The frontend SHOULD:

- collect and store the current location
- render category rows and service cards
- open chat with current context
- open roadmap builder only for authenticated users
- show trust warnings and help lines
- support optional favorites for signed-in users

### 9.2 Backend Responsibilities

The backend MUST:

- geocode location input
- retrieve and normalize services from supported sources
- filter by category, radius, and optionally `openNow`
- rank services for dashboard, chat, and roadmap use
- build grounded AI context
- validate and parse structured AI responses
- enforce authentication for roadmap and favorites endpoints
- store and retrieve favorites if auth is enabled

### 9.3 External Service Responsibilities

- Google Maps provides geocoding, directions, and some public-place coverage.
- Curated and scraped data provides social-service coverage that maps alone will miss.
- Gemini provides explanation and planning, but never acts as the source of truth for service facts.
- Firebase provides optional identity and persistence.

## 10. Canonical Domain Model

### 10.1 Service Categories

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

### 10.2 Source and Freshness Types

```ts
type SourceType = "maps" | "scraped" | "manual" | "open-data";

type FreshnessState = "fresh" | "stale" | "unknown";
```

### 10.3 Service Schema

```ts
type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  subcategory?: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  hoursText?: string;
  openNow?: boolean;
  eligibilityNotes?: string;
  tags?: string[];
  sourceType: SourceType;
  sourceName?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  freshnessState?: FreshnessState;
  confidenceScore?: number;
};
```

### 10.4 User and Favorites Schema

```ts
type AppUser = {
  id: string;
  displayName?: string;
  preferredCity?: string;
  createdAt: string;
};

type Favorite = {
  id: string;
  userId: string;
  serviceId: string;
  savedAt: string;
};
```

### 10.5 AI Response Schemas

```ts
type ChatRecommendation = {
  serviceId: string;
  reason: string;
};

type ChatResponse = {
  summary: string;
  recommendedServices: ChatRecommendation[];
  nextSteps: string[];
  verificationWarning?: string;
};

type RoadmapStep = {
  serviceId?: string;
  reason: string;
};

type RoadmapResponse = {
  situationSummary: string;
  thisWeek: RoadmapStep[];
  thisMonth: RoadmapStep[];
  longerTerm: RoadmapStep[];
  notes: string[];
  verificationWarnings?: string[];
};
```

## 11. API Contracts

### 11.1 `POST /api/location/geocode`

Purpose:

- convert user-entered location text into normalized coordinates

Input:

```json
{
  "location": "Downtown Toronto"
}
```

Output:

```json
{
  "normalizedLocation": "Downtown Toronto, Toronto, ON, Canada",
  "latitude": 43.6532,
  "longitude": -79.3832
}
```

### 11.2 `GET /api/services`

Purpose:

- return nearby services filtered by category and optional constraints

Query params:

- `lat`
- `lng`
- `category`
- `radius`
- `openNow`

Output:

- array of normalized `Service` records

### 11.3 `POST /api/chat`

Purpose:

- generate a grounded answer over the current service context

Input:

```json
{
  "message": "Where can I get free food tonight?",
  "location": {
    "latitude": 43.6532,
    "longitude": -79.3832
  },
  "selectedCategory": "food",
  "services": []
}
```

Output:

- `ChatResponse`

### 11.4 `POST /api/roadmap`

Purpose:

- generate a staged stability plan for an authenticated user from their needs and relevant services

Auth:

- required

Input:

```json
{
  "needs": [
    "replace ID",
    "find more stable housing support",
    "build a plan for regular food access"
  ],
  "constraints": {
    "hasId": false,
    "walkingOnly": true
  },
  "location": {
    "latitude": 43.6532,
    "longitude": -79.3832
  },
  "services": []
}
```

Output:

- `RoadmapResponse`

### 11.5 `GET /api/favorites`

Purpose:

- return saved services for the authenticated user

Output:

- array of saved service references or hydrated `Service` records

### 11.6 `POST /api/favorites`

Purpose:

- save or remove a favorite service for the authenticated user

Input:

```json
{
  "serviceId": "svc_123"
}
```

Output:

```json
{
  "ok": true
}
```

## 12. AI Behavior Contract

### 12.1 Inputs to the Model

The model should receive:

- user message or user need summary
- current location
- current category when relevant
- a bounded list of relevant services
- freshness and confidence metadata

### 12.2 Hard Rules

The model MUST:

- use only provided services as factual grounding
- never invent service names, locations, hours, or eligibility rules
- prefer direct and respectful language
- prioritize urgency, distance, and likely usefulness
- return structured JSON only
- include verification guidance when service data is stale or uncertain

The model MUST NOT:

- claim live capacity unless provided explicitly
- imply certainty where data is incomplete
- recommend impossible actions that conflict with user constraints

### 12.3 Chat Ranking Logic

For chat responses, ranking SHOULD prefer:

1. services matching the requested category
2. services open now when that matters
3. closer services
4. higher-confidence services
5. services with clearer instructions or contact info

### 12.4 Roadmap Planning Logic

For roadmap responses, planning SHOULD:

1. support stabilization and future planning, while still acknowledging urgent blockers
2. separate actions into time buckets such as `this week`, `this month`, and `longer term`
3. attach concrete services wherever possible
4. mention when the user should call first or verify before traveling

## 13. Data Ingestion and Normalization

### 13.1 Why a Hybrid Data Model Is Required

Google Maps is useful but incomplete for community support services.

Maps is stronger for:

- geocoding
- directions
- public buildings
- libraries
- some clinics
- some bathrooms and community spaces

Curated and scraped data is stronger for:

- shelters
- food programs
- free food events
- showers
- legal aid
- nonprofit support services
- warming or cooling centers

### 13.2 MVP Ingestion Strategy

For hackathon speed, the system SHOULD use:

- `services.json` as the canonical seed dataset
- optional lightweight scrape scripts before demo day
- a single normalization step into the shared `Service` schema

### 13.3 Required Metadata

Each normalized service SHOULD include:

- source type
- source name
- source URL when available
- last verified timestamp when available
- confidence score when available

### 13.4 Freshness Rules

Suggested default freshness behavior:

- `fresh`: record verified within the expected window
- `stale`: record is older than the expected window
- `unknown`: no verification timestamp exists

Suggested windows:

- shelters, food events, warming centers: 7 days
- general services and clinics: 30 days

If a record is `stale` or `unknown`, the UI and AI SHOULD say some version of:

- "Verify before traveling"
- "Hours may be outdated"
- "Call first if possible"

## 14. Core User Flows

### 14.1 Entry Flow

1. User lands on the welcome screen.
2. User enters a location or uses device geolocation.
3. Frontend calls geocoding.
4. Location is stored in shared state.
5. User is routed to the dashboard.

### 14.2 Dashboard Flow

1. Frontend requests nearby services by category.
2. Backend merges and normalizes data.
3. Frontend renders category rows and service cards.
4. User can tap a category, service, chat, or the logged-in roadmap entry point.

### 14.3 Chat Flow

1. User opens chat from the dashboard or a service detail.
2. Frontend sends the current message plus relevant services.
3. Backend builds a grounded prompt.
4. Gemini returns structured JSON.
5. Frontend renders the answer and links to recommended services.

### 14.4 Roadmap Flow

1. User signs in and opens roadmap mode.
2. User provides a short need summary or answers a few intake prompts.
3. Backend collects relevant services.
4. Gemini returns a structured staged plan.
5. Frontend renders the plan with service links and verification notes.

### 14.5 Favorites Flow

1. User signs in if they want persistence.
2. User saves a service.
3. Backend writes to Firestore.
4. Saved services are available in a future session.

## 15. UI Architecture

### 15.1 Welcome Screen

Purpose:

- establish location context immediately

Required elements:

- app name
- short product description
- location input
- "Use my location" action
- continue action

### 15.2 Dashboard Screen

Purpose:

- show nearby help quickly by category

Required elements:

- current location near the top
- chat entry point
- optional auth or profile entry point
- category rows or cards
- service cards with practical metadata
- footer with help lines and emergency context

### 15.3 Service Detail Screen

Purpose:

- show the full details for a selected service

Required elements:

- name
- category
- address
- hours
- phone
- source metadata
- directions action
- save action if logged in
- "Ask AI about this place" action

### 15.4 Chat Screen or Panel

Purpose:

- answer questions using the current service context

Required elements:

- chat history
- input field
- suggested prompt chips
- responses linked to service cards

### 15.5 Roadmap Screen

Purpose:

- show a multi-step stability plan for an authenticated user

Required elements:

- user situation summary
- sections for `this week`, `this month`, and `longer term`
- linked services
- verification notes

### 15.6 Navigation

For MVP, a simple bottom nav can be:

- Home
- Chat
- Help

If the user is signed in, add:

- Plan
- Saved

## 16. Reliability, Safety, and Privacy

### 16.1 Reliability

The product SHOULD:

- show source metadata when available
- flag stale records clearly
- return graceful empty states when no services are found
- keep help lines visible even when data is sparse

### 16.2 Safety

The product SHOULD:

- avoid overclaiming certainty
- steer users to call first for volatile services
- keep emergency or crisis contact information easy to access

### 16.3 Privacy and Security

The product MUST:

- store secrets server-side where possible
- restrict Maps keys by domain and allowed APIs
- scope saved data to authenticated users
- keep auth optional for browsing and chat
- require auth for roadmap and favorites flows

The MVP SHOULD avoid collecting more personal data than necessary.

## 17. Failure and Fallback Behavior

If no matching services are found:

- show nearby general help lines
- suggest broadening radius or removing filters
- allow the chatbot to explain that the current dataset has no matching results

If AI fails:

- keep dashboard browsing fully usable
- show a simple fallback message
- avoid blocking the user from core service discovery

If geolocation fails:

- allow manual location entry
- keep the rest of the flow unchanged

## 18. Scalability Path

This architecture can expand into:

- more cities
- provider dashboards
- stronger live-data integrations
- multilingual support
- route optimization
- SMS access
- native mobile clients
- caseworker mode

## 19. Recommended MVP Build Order

### Phase 1

- Next.js project setup
- welcome screen
- location input and geocoding
- dashboard shell

### Phase 2

- seed dataset
- service normalization
- category rows
- service cards
- help-line footer

### Phase 3

- grounded Gemini chatbot
- response parsing
- linked service recommendations

### Phase 4

- Firebase auth
- authenticated roadmap builder
- intake prompts
- staged plan screen

### Phase 5

- favorites
- polish and demo preparation

## 20. Final Summary

The MVP is a web-based support navigator with three main layers:

1. a dashboard for nearby services
2. a grounded chatbot for natural-language guidance
3. a logged-in roadmap feature for longer-term stability planning

The dashboard is the core product. AI is an assistive layer, not the source of truth. The roadmap is a signed-in planning feature aimed at helping someone move toward greater stability over time. Trust is maintained through source metadata, freshness handling, and explicit uncertainty when data may be incomplete.
