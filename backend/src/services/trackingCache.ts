/**
 * In-memory cache for live aircraft and vessel positions.
 * Entries older than MAX_AGE_MS are pruned on read.
 */

export interface TrackedAircraft {
  id: string;           // icao24 hex
  callsign: string;
  country: string;
  lat: number;
  lon: number;
  altitude: number;     // feet
  speed: number;        // knots
  heading: number;      // degrees true
  on_ground: boolean;
  is_military: boolean;
  affiliation: string;  // 'usa' | 'israel' | 'iran' | 'russia' | 'uk' | 'france' | 'saudi' | 'uae' | 'turkey' | 'unknown'
  aircraft_type: string;
  registration: string;
  updated_at: number;   // ms epoch
}

export interface TrackedVessel {
  mmsi: string;
  name: string;
  flag: string;         // country name derived from MMSI
  type_code: number;    // AIS ship type
  type_name: string;
  lat: number;
  lon: number;
  speed: number;        // knots
  heading: number;      // degrees
  destination: string;
  is_warship: boolean;
  affiliation: string;
  updated_at: number;
}

const MAX_AGE_MS = 8 * 60 * 1000; // 8 minutes — enough for slow-moving vessels

const _aircraft = new Map<string, TrackedAircraft>();
const _vessels  = new Map<string, TrackedVessel>();

function pruneMap<T extends { updated_at: number }>(map: Map<string, T>) {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [k, v] of map) {
    if (v.updated_at < cutoff) map.delete(k);
  }
}

export const trackingCache = {
  setAircraft(a: TrackedAircraft) { _aircraft.set(a.id, a); },
  setVessel(v: TrackedVessel)    { _vessels.set(v.mmsi, v); },

  getAircraft(): TrackedAircraft[] {
    pruneMap(_aircraft);
    return [..._aircraft.values()];
  },
  getVessels(): TrackedVessel[] {
    pruneMap(_vessels);
    return [..._vessels.values()];
  },

  aircraftCount: () => _aircraft.size,
  vesselCount:   () => _vessels.size,
};
