# CONFLICT TERMINAL

A real-time geopolitical conflict monitoring dashboard with a dark terminal / cyber OSINT aesthetic. Events are ingested automatically from free public data sources — no LLMs, no paid APIs.

> **Data notice:** Events are sourced from public APIs (GDELT, NASA FIRMS, RSS feeds) and classified automatically via rule-based NLP. They represent real-world reported incidents but should be treated as unverified open-source intelligence. Confidence scores reflect automated classification quality, not ground truth.

---

## Overview

Conflict Terminal monitors conflict events across the Middle East and connected theatres (Red Sea, Arabian Sea, Suez Canal, Cyprus, Azerbaijan, Pakistan, etc.) with:

- Interactive dark map (MapLibre GL) with clustered event markers and stacked-event picker
- Live event feed with WebSocket push updates
- Automated ingestion from GDELT, NASA FIRMS satellite thermal data, and RSS news feeds
- Rule-based keyword classifier + gazetteer for event type and geolocation extraction
- Confidence scoring and verification status based on source reliability
- Timeline chart with event breakdown by type
- Historical backfill script for catch-up ingestion

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, MapLibre GL JS, Zustand, TanStack Query, Recharts |
| Backend | Node.js, TypeScript, Fastify 4, WebSocket (`@fastify/websocket`) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Query layer | Raw SQL via `pg` (node-postgres) |
| Ingestion | `node-cron` + pluggable provider pattern |
| NLP | Rule-based keyword classifier + gazetteer (no external ML) |

---

## Architecture

```
terminal-war/
├── backend/
│   └── src/
│       ├── db/              # DB client, migrations, seed
│       ├── types/           # Shared TypeScript types
│       ├── repositories/    # SQL query layer (events, sources)
│       ├── services/        # Business logic (ingest, stats, timeline)
│       ├── providers/       # Pluggable ingestion providers
│       │   ├── gdeltProvider.ts      # GDELT DOC API (news)
│       │   ├── firmsProvider.ts      # NASA FIRMS (satellite thermal)
│       │   └── rssProvider.ts        # Al Jazeera, BBC, ToI, MEE
│       ├── schedulers/      # Cron-based ingestion scheduler
│       ├── websocket/       # WebSocket broadcast server
│       ├── routes/          # Fastify route handlers
│       ├── utils/
│       │   ├── gazetteer.ts          # Location name → coordinates lookup
│       │   ├── classifier.ts         # Event type + severity classifier
│       │   └── confidence.ts         # Confidence scoring model
│       └── validation/      # Zod schemas
├── frontend/
│   └── src/
│       ├── api/             # API fetch layer
│       ├── stores/          # Zustand global state
│       ├── hooks/           # TanStack Query hooks + WS hook
│       ├── types/           # Frontend types
│       └── components/
│           ├── Header/      # Status bar
│           ├── Map/         # MapLibre GL map + legend + layer controls
│           ├── Feed/        # Live event feed
│           ├── Stats/       # Stats cards
│           ├── Timeline/    # Recharts timeline
│           ├── Filters/     # Filter sidebar
│           └── EventDetail/ # Event detail drawer
└── backend/scripts/
    ├── backfill.ts           # Historical backfill (run once)
    └── rematch-locations.ts  # Re-geocode existing events with updated gazetteer
```

---

## Data Sources

All sources are free and require no API keys (except NASA FIRMS, which is free with registration).

| Provider | Schedule | Data |
|----------|----------|------|
| **GDELT DOC API** | Every 15 min | News articles indexed in real-time from thousands of outlets worldwide. Filtered for conflict keywords + Middle East geography. |
| **NASA FIRMS VIIRS** | Every 30 min | Satellite thermal anomaly data (fire radiative power). Used to detect large fires consistent with strikes or infrastructure damage. Requires a free API key. |
| **RSS Feeds** | Every 5 min | Al Jazeera, BBC Middle East, Times of Israel, Middle East Eye. Parsed without external libraries. |

### Ingestion Pipeline

For each raw article/hotspot:

1. **Pre-filter** — region keyword check (`isRelevantToRegion`) and conflict keyword check (`isConflictRelevant`)
2. **Geocoding** — gazetteer lookup (`lookupLocation`) extracts the most specific known location from the title. Covers 200+ cities, military sites, airports, waterways, and country-level fallbacks across the region and connected theatres
3. **Classification** — weighted keyword scorer assigns event type (`airstrike`, `missile`, `drone`, `explosion`, `fire`, `infrastructure`, `troop_movement`, `alert`) and severity (1–5)
4. **Confidence scoring** — based on source reliability, geolocation precision, and number of corroborating sources
5. **Deduplication** — by `external_id` (URL hash for news, coordinate+timestamp hash for satellite). Re-ingesting the same article upgrades confidence rather than creating a duplicate
6. **WebSocket broadcast** — new events are pushed live to all connected clients

### Coverage Geography

Core theatres: Iran, Iraq, Syria, Lebanon, Yemen, Gaza, West Bank, Israel

Extended coverage: UAE (Dubai Airport, Abu Dhabi, Jebel Ali), Qatar (Al Udeid Air Base), Bahrain (US 5th Fleet), Oman, Kuwait, Turkey (Incirlik), Cyprus (RAF Akrotiri), Egypt (Suez Canal, Sinai), Azerbaijan, Pakistan (Balochistan border), Saudi Arabia (Ras Tanura, Prince Sultan AB)

Waterways: Strait of Hormuz, Red Sea, Bab el-Mandeb, Gulf of Aden, Arabian Sea, Persian Gulf, Eastern Mediterranean

---

## Setup

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- (Optional) NASA FIRMS API key — free at [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/)

### Quick Start (Docker)

```bash
cd terminal-war
cp backend/.env.example backend/.env
# Optionally add your FIRMS_MAP_KEY to backend/.env
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

### Local Dev

**Database** (PostgreSQL + PostGIS via Docker):

```bash
docker run -d \
  --name conflict_db \
  -e POSTGRES_USER=conflict \
  -e POSTGRES_PASSWORD=conflict_secret \
  -e POSTGRES_DB=conflict_terminal \
  -p 5432:5432 \
  postgis/postgis:16-3.4
```

**Backend:**

```bash
cd backend
npm install
cp .env.example .env
npm run migrate   # run SQL migrations
npm run dev       # start on :4000 — ingestion begins automatically
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev       # start Vite on :5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `PORT` | `4000` | Server port |
| `NODE_ENV` | `development` | Node environment |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `FIRMS_MAP_KEY` | — | NASA FIRMS API key (optional — FIRMS provider is silently skipped if not set) |

---

## Historical Backfill

To populate data from the start of the current conflict (2026-02-28) to now:

```bash
cd backend
npm run backfill
```

The script queries GDELT in 2-hour windows and automatically splits any window that hits the 250-article cap into smaller sub-windows. Deduplication ensures re-running is always safe.

To re-geocode existing events after updating the gazetteer:

```bash
npm run rematch          # dry run — shows what would change
npm run rematch -- --apply   # apply changes to DB
```

---

## Database Migrations

```bash
cd backend
npm run migrate
```

Migrations are tracked in `schema_migrations` and run only once. Current migrations:

| File | Description |
|------|-------------|
| `001_initial.sql` | Events, sources, event_sources, regions, ingestion_runs tables + PostGIS spatial index |
| `002_sources_url_unique.sql` | Unique constraint on `sources.url` to prevent duplicate source rows |

---

## Confidence Model

Confidence (0–100) is derived automatically from source metadata:

| Factor | Effect |
|--------|--------|
| Source domain reliability | Base weight (Reuters = 90, state media = 35–45, unknown = 58) |
| Multiple corroborating sources | +5 per additional source (max +20) |
| Satellite + news corroboration | +10 |
| Geolocation precision: approximate | −5 |
| Geolocation precision: area | −15 |

**Verification status:**
- `verified`: score ≥ 80 AND at least one high-reliability source
- `partial`: score ≥ 50 OR 2+ sources
- `unverified`: all others

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/api/events` | List events with filters |
| GET | `/api/events/:id` | Event detail + sources + nearby |
| GET | `/api/stats` | Aggregated stats |
| GET | `/api/timeline` | Time-bucketed event counts |
| GET | `/api/map/layers` | Map layer metadata |
| GET | `/api/sources` | Source records |
| WS | `/ws` | Live event push (`new_event`, `update_event`) |

**Events query params:** `country`, `eventType`, `verificationStatus`, `minConfidence`, `start`, `end`, `limit`, `offset`

---

## Extending

**Add a new ingestion provider:**

1. Create a class in `backend/src/providers/` implementing:
   ```typescript
   interface IngestionProvider {
     name: string;
     fetchRawItems(): Promise<RawItem[]>;
   }
   ```
2. Register it in `src/schedulers/ingestionScheduler.ts`

**Add locations to the gazetteer:**

Edit `backend/src/utils/gazetteer.ts`. After adding entries, run `npm run rematch -- --apply` to re-geocode existing events.

**Add event types:**

Add to the `EventType` enum in `backend/src/types/index.ts` and `frontend/src/types/index.ts`, then add keyword entries in `backend/src/utils/classifier.ts`.
