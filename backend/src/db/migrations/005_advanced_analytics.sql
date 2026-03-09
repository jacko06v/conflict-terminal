-- Migration 005: Advanced analytics tables
-- Supports: convergence alerts, trending spikes, breaking alerts,
--           temporal baselines, country instability, news clusters

-- ─── Convergence alerts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS convergence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_key TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  location_name TEXT,
  event_types TEXT[] NOT NULL,
  event_count INTEGER NOT NULL,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_convergence_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_convergence_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON convergence_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_convergence_geom();

CREATE INDEX IF NOT EXISTS idx_convergence_geom ON convergence_alerts USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_convergence_active ON convergence_alerts (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_convergence_detected ON convergence_alerts (detected_at DESC);

-- ─── Trending keyword spikes ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trending_spikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  spike_count INTEGER NOT NULL,
  baseline DOUBLE PRECISION NOT NULL DEFAULT 0,
  multiplier DOUBLE PRECISION NOT NULL DEFAULT 0,
  unique_sources INTEGER NOT NULL DEFAULT 0,
  headline_samples JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_term ON trending_spikes (term);
CREATE INDEX IF NOT EXISTS idx_trending_detected ON trending_spikes (detected_at DESC);

-- ─── Breaking news alerts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS breaking_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_tier SMALLINT NOT NULL,
  url TEXT,
  threat_level TEXT NOT NULL,
  threat_category TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breaking_detected ON breaking_alerts (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_breaking_threat ON breaking_alerts (threat_level);

-- ─── Temporal baselines (Welford state persistence) ─────────────────────────

CREATE TABLE IF NOT EXISTS temporal_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  region TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  mean DOUBLE PRECISION NOT NULL DEFAULT 0,
  m2 DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_type, region)
);

-- ─── Temporal anomalies ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS temporal_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  event_type TEXT NOT NULL,
  region TEXT NOT NULL,
  current_count INTEGER NOT NULL,
  mean DOUBLE PRECISION NOT NULL,
  stddev DOUBLE PRECISION NOT NULL,
  z_score DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL,
  message TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON temporal_anomalies (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON temporal_anomalies (severity);

-- ─── Country instability snapshots ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS country_instability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  level TEXT NOT NULL,
  trend TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  components JSONB,
  top_categories JSONB,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instability_country ON country_instability (country);
CREATE INDEX IF NOT EXISTS idx_instability_snapshot ON country_instability (snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_instability_score ON country_instability (score DESC);

-- ─── News clusters ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS news_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key TEXT NOT NULL,
  headline TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 1,
  sources TEXT[] NOT NULL,
  best_tier SMALLINT NOT NULL DEFAULT 4,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clusters_active ON news_clusters (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_clusters_updated ON news_clusters (last_updated_at DESC);

-- ─── Expand event_type enum for new providers ───────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'earthquake' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'earthquake';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cyber' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'cyber';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'nuclear' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'nuclear';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'political' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'political';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'economic' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'economic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'health' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'health';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'unrest' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'unrest';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'maritime' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'maritime';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'aviation' AND enumtypid = 'event_type'::regtype) THEN
    ALTER TYPE event_type ADD VALUE 'aviation';
  END IF;
END$$;

-- Add threat classification columns to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS threat_level TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS threat_category TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_tier SMALLINT;

-- Add enrichment columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS entities TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS cluster_id UUID;
