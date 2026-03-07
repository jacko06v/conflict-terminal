-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Event type enum
CREATE TYPE event_type AS ENUM (
  'explosion',
  'airstrike',
  'missile',
  'drone',
  'fire',
  'infrastructure',
  'troop_movement',
  'alert'
);

-- Verification status enum
CREATE TYPE verification_status AS ENUM (
  'unverified',
  'partial',
  'verified'
);

-- Geolocation precision enum
CREATE TYPE geolocation_precision AS ENUM (
  'exact',
  'approximate',
  'area'
);

-- Source type enum
CREATE TYPE source_type AS ENUM (
  'news',
  'social',
  'satellite',
  'manual',
  'api'
);

-- Ingestion status enum
CREATE TYPE ingestion_status AS ENUM (
  'running',
  'completed',
  'failed'
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL,
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  confidence_score SMALLINT NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  geolocation_precision geolocation_precision NOT NULL DEFAULT 'approximate',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  location_radius_km REAL,
  country TEXT NOT NULL,
  region TEXT,
  city TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-populate geom column from lat/lon
CREATE OR REPLACE FUNCTION update_event_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_geom();

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type source_type NOT NULL,
  url TEXT,
  publisher TEXT,
  published_at TIMESTAMPTZ,
  reliability_score SMALLINT NOT NULL DEFAULT 50 CHECK (reliability_score BETWEEN 0 AND 100),
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event-source join table
CREATE TABLE IF NOT EXISTS event_sources (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, source_id)
);

-- Regions reference table
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  region TEXT,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  UNIQUE (country, region, city)
);

CREATE OR REPLACE FUNCTION update_region_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_region_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON regions
  FOR EACH ROW
  EXECUTE FUNCTION update_region_geom();

-- Ingestion runs tracking
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status ingestion_status NOT NULL DEFAULT 'running',
  records_fetched INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  error_log TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_geom ON events USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_country ON events (country);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_confidence ON events (confidence_score);
CREATE INDEX IF NOT EXISTS idx_events_verification ON events (verification_status);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events (is_active);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_sources_event ON event_sources (event_id);
CREATE INDEX IF NOT EXISTS idx_event_sources_source ON event_sources (source_id);
CREATE INDEX IF NOT EXISTS idx_regions_geom ON regions USING GIST (geom);
