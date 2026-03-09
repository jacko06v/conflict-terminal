export type EventType =
  | "explosion"
  | "airstrike"
  | "missile"
  | "drone"
  | "infrastructure"
  | "troop_movement"
  | "alert"
  | "earthquake"
  | "cyber"
  | "nuclear"
  | "political"
  | "economic"
  | "health"
  | "unrest"
  | "maritime"
  | "aviation";

export type VerificationStatus = "unverified" | "partial" | "verified";
export type GeolocationPrecision = "exact" | "approximate" | "area";

export interface ConflictEvent {
  id: string;
  external_id: string | null;
  title: string;
  summary: string;
  description: string | null;
  event_type: EventType;
  severity: number;
  confidence_score: number;
  verification_status: VerificationStatus;
  geolocation_precision: GeolocationPrecision;
  latitude: number;
  longitude: number;
  location_radius_km: number | null;
  country: string;
  region: string | null;
  city: string | null;
  occurred_at: string;
  first_seen_at: string;
  last_updated_at: string;
  is_active: boolean;
  source_count?: number;
}

export interface Source {
  id: string;
  name: string;
  source_type: string;
  url: string | null;
  publisher: string | null;
  published_at: string | null;
  reliability_score: number;
  raw_text: string | null;
  created_at: string;
}

export interface EventDetail extends ConflictEvent {
  sources: Source[];
  nearby: ConflictEvent[];
}

export interface StatsResult {
  total_events: number;
  high_confidence_events: number;
  missile_drone_events: number;
  countries_affected: number;
  hotspots_count: number;
  last_event_at: string | null;
}

export interface TimelineBucket {
  bucket: string;
  count: number;
  event_type: EventType;
}

export interface MapLayer {
  id: string;
  name: string;
  event_type: EventType;
  color: string;
  visible: boolean;
}

export interface Filters {
  country: string;
  eventType: EventType | "";
  verificationStatus: VerificationStatus | "";
  minConfidence: number;
  start: string;
  end: string;
  timeRange: "24h" | "7d" | "30d";
}

export interface WsMessage {
  type: "connected" | "new_event" | "update_event"
    | "trending_spikes" | "breaking_alerts" | "convergence_alerts" | "temporal_anomalies"
    | "hotspot_escalation" | "focal_points";
  payload: unknown;
}

// ─── Trending ───────────────────────────────────────────────────────

export interface TrendingSpike {
  term: string;
  count: number;
  baseline: number;
  multiplier: number;
  uniqueSources: number;
  headlines: Array<{ title: string; source: string; link: string; publishedAt: number }>;
}

// ─── Breaking ───────────────────────────────────────────────────────

export interface BreakingAlert {
  id: string;
  title: string;
  source: string;
  tier: number;
  url: string;
  threat: { level: string; category: string };
  detectedAt: number;
  category: string;
}

// ─── Convergence ────────────────────────────────────────────────────

export interface ConvergenceAlert {
  cellKey: string;
  lat: number;
  lon: number;
  locationName: string;
  types: string[];
  eventCount: number;
  score: number;
}

// ─── Country Instability ────────────────────────────────────────────

export interface CountryInstability {
  country: string;
  score: number;
  level: "critical" | "high" | "elevated" | "moderate" | "low";
  trend: "accelerating" | "stable" | "decelerating";
  recentEventCount: number;
  topCategories: Array<{ category: string; count: number }>;
}

// ─── News Cluster ───────────────────────────────────────────────────

export interface NewsCluster {
  id: string;
  headline: string;
  articles: Array<{ id: string; title: string; source: string; tier: number }>;
  sources: string[];
  bestTier: number;
}

// ─── Hotspot Escalation ─────────────────────────────────────────────

export type EscalationTrend = "escalating" | "de-escalating" | "stable";

export interface HotspotEscalation {
  hotspotId: string;
  name: string;
  staticBaseline: number;
  dynamicScore: number;
  combinedScore: number;
  trend: EscalationTrend;
  components: {
    newsActivity: number;
    ciiContribution: number;
    geoConvergence: number;
    militaryActivity: number;
  };
  lastUpdated: string;
  change24h?: { change: number; start: number; end: number } | null;
}

// ─── Focal Points ───────────────────────────────────────────────────

export type FocalPointUrgency = "watch" | "elevated" | "critical";

export interface FocalPoint {
  id: string;
  entityId: string;
  entityType: string;
  displayName: string;
  newsMentions: number;
  newsVelocity: number;
  topHeadlines: Array<{ title: string; source?: string }>;
  signalCount: number;
  signalDescriptions: string[];
  focalScore: number;
  urgency: FocalPointUrgency;
  narrative: string;
  correlationEvidence: string[];
}

export interface FocalPointSummary {
  timestamp: string;
  focalPoints: FocalPoint[];
  topCountries: FocalPoint[];
  topGroups: FocalPoint[];
}

// ─── Infrastructure Cascade ─────────────────────────────────────────

export type CascadeImpactLevel = "critical" | "high" | "medium" | "low";

export interface CascadeCountryImpact {
  country: string;
  countryName: string;
  impactLevel: CascadeImpactLevel;
  affectedCapacity: number;
}

export interface CascadeResult {
  source: { id: string; type: string; name: string };
  countriesAffected: CascadeCountryImpact[];
  affectedNodes: Array<{ node: { name: string; type: string }; impactLevel: CascadeImpactLevel; pathLength: number }>;
  redundancies: Array<{ id: string; name: string; capacityShare: number }>;
}

// ─── Population Exposure ────────────────────────────────────────────

export interface PopulationExposure {
  eventId: string;
  eventName: string;
  eventType: string;
  lat: number;
  lon: number;
  exposedPopulation: number;
  exposureRadiusKm: number;
}

export const EVENT_COLORS: Record<EventType, string> = {
  explosion: "#ef4444",
  airstrike: "#f97316",
  missile: "#f59e0b",
  drone: "#eab308",
  infrastructure: "#a855f7",
  troop_movement: "#3b82f6",
  alert: "#06b6d4",
  earthquake: "#92400e",
  cyber: "#10b981",
  nuclear: "#dc2626",
  political: "#6366f1",
  economic: "#f59e0b",
  health: "#14b8a6",
  unrest: "#fb923c",
  maritime: "#0ea5e9",
  aviation: "#8b5cf6",
};

export const EVENT_LABELS: Record<EventType, string> = {
  explosion: "Explosion",
  airstrike: "Airstrike",
  missile: "Missile",
  drone: "Drone",
  infrastructure: "Infrastructure",
  troop_movement: "Troop Movement",
  alert: "Alert",
  earthquake: "Earthquake",
  cyber: "Cyber",
  nuclear: "Nuclear",
  political: "Political",
  economic: "Economic",
  health: "Health",
  unrest: "Unrest",
  maritime: "Maritime",
  aviation: "Aviation",
};

export const VERIFICATION_COLORS: Record<VerificationStatus, string> = {
  verified: "#00ff88",
  partial: "#ffa500",
  unverified: "#ff3355",
};
