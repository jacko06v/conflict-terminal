You are a senior full-stack engineer and product designer.  
Build a production-grade web application called **Conflict Terminal**: a real-time geopolitical conflict monitoring dashboard with a dark terminal/cyber aesthetic.

The product must include both:

1. **Frontend**
2. **Backend**
3. **Database schema**
4. **Ingestion pipeline architecture**
5. **Seed/demo data**
6. **Developer documentation**

The initial use case is a dashboard focused on the Iran conflict / Middle East war events, but the architecture must be generic enough to support multiple regions and conflicts in the future.

---

# PRODUCT GOAL

Create a web app that looks like a modern military/geopolitical intelligence terminal.

It should display:
- a dark interactive map
- live conflict events
- explosion/strike/missile/drone markers
- region and country filters
- event confidence / verification levels
- event timeline
- side panel with event feed
- statistics cards
- layers for different event types
- websocket live updates
- a clean backend API

Important:
This is NOT a military targeting tool.
This is an open-source intelligence style monitoring dashboard for visualization of public conflict-related information.
Do not implement anything that helps users conduct violence.
Only visualize public event data.

---

# TECH STACK

Use the following stack unless there is a strong reason to improve it:

## Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- MapLibre GL JS (preferred) or Leaflet if needed
- Zustand or React Context for state management
- TanStack Query for API data fetching
- Recharts for charts
- shadcn/ui for UI primitives if useful

## Backend
- Node.js
- TypeScript
- Fastify or Express (Fastify preferred)
- PostgreSQL
- PostGIS extension for geospatial querying
- Prisma or Drizzle ORM (Drizzle preferred if geospatial support stays manageable, otherwise Prisma + raw SQL)
- WebSocket support (native ws or Socket.IO)
- node-cron for scheduled ingestion jobs

## Dev / Infra
- Docker + docker-compose
- Environment variable configuration
- ESLint + Prettier
- Clear README with setup instructions

---

# CORE FEATURES

## 1. Interactive map
Build a full-screen or large central map with dark “terminal” styling.

The map must support:
- event markers
- clustering when zoomed out
- different icons/colors/styles for event types:
  - explosion
  - airstrike
  - missile
  - drone
  - fire / thermal hotspot
  - infrastructure hit
  - troop movement
  - alert / warning
- clicking a marker opens a detail panel
- optional pulsing animation for recent events
- optional circles for approximate location radius
- layer toggles
- legend

## 2. Right-side live feed
A vertical feed of latest events with:
- timestamp
- title
- short summary
- location
- source count
- confidence badge
- event type badge

Clicking a feed item should focus/select the marker on the map.

## 3. Top stats / overview
Cards or small panels showing:
- total events in selected range
- number of high-confidence events
- number of missile/drone events
- hotspots detected
- countries affected
- last update time

## 4. Filters
Support filters for:
- country
- region / province / governorate
- event type
- verification status
- confidence range
- time range
- source type

## 5. Timeline
Build a timeline panel or chart that shows events over time.
Allow selecting 24h / 7d / 30d.

## 6. Event details panel
When an event is clicked, show:
- title
- description
- coordinates
- location label
- country / region / city
- event type
- severity
- confidence score
- verification status
- source list
- timestamps
- whether location is exact or approximate
- raw source text if available
- related nearby events

## 7. Live updates
Implement WebSocket live updates so new ingested events can appear in the feed and map without full refresh.

---

# DATA MODEL REQUIREMENTS

Create a robust relational schema.

Minimum entities:

## events
- id
- external_id (nullable)
- title
- summary
- description
- event_type
- severity (1-5)
- confidence_score (0-100)
- verification_status ("unverified", "partial", "verified")
- geolocation_precision ("exact", "approximate", "area")
- latitude
- longitude
- location_radius_km (nullable)
- country
- region
- city
- occurred_at
- first_seen_at
- last_updated_at
- is_active
- created_at
- updated_at

## sources
- id
- name
- source_type ("news", "social", "satellite", "manual", "api")
- url
- publisher
- published_at
- reliability_score
- raw_text
- created_at

## event_sources
- event_id
- source_id

## regions (optional normalized table)
- id
- country
- region
- city
- latitude
- longitude
- geojson (optional)

## ingestion_runs
- id
- provider_name
- started_at
- completed_at
- status
- records_fetched
- records_created
- records_updated
- error_log

Also create indexes, especially geospatial indexes for event coordinates.

Use PostGIS properly for radius and bounding box queries.

---

# API REQUIREMENTS

Build a clean backend API.

Minimum routes:

## GET /health
Returns service status.

## GET /api/events
Query params:
- country
- region
- city
- eventType
- verificationStatus
- minConfidence
- start
- end
- bbox
- limit
- offset

Must return events with enough data for map rendering and list rendering.

## GET /api/events/:id
Return detailed event info plus related sources.

## GET /api/stats
Return aggregated statistics for current filters.

## GET /api/timeline
Return time-bucketed event counts.

## GET /api/map/layers
Return map layer metadata.

## GET /api/sources
Return source records or source metadata.

## WS / live updates
Push new events and updates.

Add validation and proper error handling.

---

# INGESTION / AUTOMATION ARCHITECTURE

This is extremely important.

The system should support partial automation of conflict event ingestion, but not fake precision.

Design the ingestion pipeline to support these conceptual providers:

1. **News / map-based conflict feeds**
2. **Satellite thermal hotspot feeds**
3. **Structured conflict datasets**
4. **Manual analyst input**

You do NOT need to connect to real external APIs unless easy and safe, but you MUST architect the code so providers are pluggable.

Create a provider interface like:

- fetchRawItems()
- normalize()
- deduplicate()
- save()

Implement at least:
- one mock news provider
- one mock satellite/hotspot provider
- one manual seed provider

If possible, include an adapter structure so future real integrations can be plugged in later.

---

# DEDUPLICATION + CONFIDENCE LOGIC

Implement clear logic for:
- multiple sources referring to the same event
- approximate vs exact coordinates
- confidence scoring
- verification status updates

Example ideas:
- exact coordinates from multiple sources => higher confidence
- text-only place mention => approximate
- satellite hotspot near previously reported strike within time threshold => higher confidence
- single untrusted source => low confidence

Create reusable utility functions for:
- geospatial distance comparison
- time proximity comparison
- source reliability weighting
- confidence scoring

Keep the logic explainable and visible in code comments.

---

# UI / VISUAL STYLE

The app should feel like:
- intelligence terminal
- dark cyber dashboard
- premium modern OSINT tool
- not cheesy

Use:
- black / near-black background
- subtle grid overlays
- muted green / cyan / amber / red terminal accents
- crisp typography
- glass/dim panels
- soft glow, but restrained
- good spacing and hierarchy

Avoid:
- over-the-top gamer neon
- messy clutter
- poor readability

Important:
The map and dashboard must feel credible and professional, not like a fake hacker movie UI.

---

# FRONTEND STRUCTURE

Create a maintainable project structure.

Suggested pages/components:
- App shell
- Header / status bar
- Map panel
- Live feed panel
- Filters panel
- Event detail drawer
- Stats cards
- Timeline chart
- Legend
- Layer controls
- WebSocket hook
- API hooks

Implement:
- loading states
- empty states
- error states
- skeletons
- responsive layout for laptop/desktop first

---

# BACKEND STRUCTURE

Organize code into:
- routes
- controllers / handlers
- services
- repositories
- providers
- schedulers
- websocket module
- DB layer
- validation schemas
- utility modules

Make the backend easy to extend.

---

# SEED DATA / DEMO EXPERIENCE

Add realistic mock/seed data for the Iran conflict demo so the app is visually compelling immediately after setup.

Seed at least:
- 50 to 150 events
- various event types
- different confidence levels
- locations across Iran and nearby affected areas
- multiple sources linked to some events

Use plausible but clearly synthetic/mock public-visualization data if needed.
Do not present invented data as verified real-world facts in the UI.
Mark demo data clearly as demo/seed if necessary.

---

# DOCUMENTATION

Write a strong README that includes:
- project overview
- tech stack
- architecture
- setup instructions
- env variables
- how to run database migrations
- how to seed demo data
- how to start frontend/backend
- how ingestion providers work
- future integrations ideas

Also include a short explanation of the confidence model and data limitations.

---

# IMPLEMENTATION QUALITY

I want real, usable code, not pseudo-code.

Requirements:
- strict TypeScript
- clean naming
- reusable components
- comments only where useful
- no dead code
- no fake TODO-heavy scaffolding
- must run locally with Docker
- sensible defaults
- robust error handling

Where helpful, generate:
- SQL migration files
- Dockerfiles
- docker-compose.yml
- .env.example

---

# DELIVERABLE FORMAT

Generate the actual full project structure and files.

At minimum provide:
1. frontend app
2. backend app
3. DB schema
4. seed script
5. Docker setup
6. README

If output is too long, proceed file by file in a logical order, but prioritize runnable completeness over fluff.

---

# IMPORTANT PRODUCT DECISIONS

- Clearly differentiate exact vs approximate event locations in UI.
- Do not pretend to know precise strike coordinates if source text is vague.
- Make the confidence and verification system transparent.
- Design the ingestion system to be pluggable and honest about data quality.
- The result should look impressive enough for a portfolio/demo and also be a credible base for a real OSINT dashboard.

Start by:
1. defining final architecture
2. generating project folder tree
3. creating backend first
4. then frontend
5. then README
