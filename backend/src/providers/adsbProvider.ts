/**
 * ADS-B aircraft tracking provider.
 *
 * Sources (both free, no key required):
 *  1. adsb.fi /v1/mil  — military aircraft globally, filtered to ME bounding box
 *  2. OpenSky Network  — all aircraft in ME bbox, filtered by country of interest
 *
 * Updates cache every 60 seconds.
 */

import { trackingCache, TrackedAircraft } from "../services/trackingCache";

// Middle East + surrounding theatres bounding box
const BBOX = { latMin: 10, latMax: 45, lonMin: 20, lonMax: 70 };

// Country name → affiliation key
const COUNTRY_AFFILIATION: Record<string, string> = {
  "United States":              "usa",
  "Israel":                     "israel",
  "Iran":                       "iran",
  "Iran, Islamic Republic of":  "iran",
  "Russian Federation":         "russia",
  "Russia":                     "russia",
  "United Kingdom":             "uk",
  "France":                     "france",
  "Saudi Arabia":               "saudi",
  "United Arab Emirates":       "uae",
  "Turkey":                     "turkey",
  "Iraq":                       "iraq",
  "Jordan":                     "jordan",
  "Egypt":                      "egypt",
  "Pakistan":                   "pakistan",
};

// Countries whose military activity is relevant
const RELEVANT_COUNTRIES = new Set(Object.keys(COUNTRY_AFFILIATION));

// Known military callsign prefixes
const MILITARY_PREFIXES = [
  "RCH", "REACH", "MAGMA", "JAKE", "POLO", "HAVOC", "CHAOS", "DUKE",  // USAF
  "NAVY", "MARINE", "ARMY",                                             // US services
  "IAF", "HERON",                                                       // Israel
  "IRI", "IRGC",                                                        // Iran
  "RRR", "ASCOT", "TARTAN",                                             // UK RAF
  "FAF", "COTAM",                                                        // France
  "RFF", "RSD",                                                          // Russia
];

function inferMilitary(callsign: string, category: string): boolean {
  const cs = callsign.toUpperCase();
  return (
    MILITARY_PREFIXES.some((p) => cs.startsWith(p)) ||
    category === "A6" || category === "A7" // heavy / high-perf (often military)
  );
}

// ── ADSB.fi military endpoint ─────────────────────────────────────────────────

interface AdsbFiAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  category?: string;
  t?: string;         // type code e.g. "B52"
  r?: string;         // registration
  country?: string;
}

async function fetchAdsbFiMilitary(): Promise<void> {
  try {
    const res = await fetch("https://api.adsb.fi/v1/mil", {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "ConflictTerminal/1.0" },
    });
    if (!res.ok) return;

    const data = (await res.json()) as { ac?: AdsbFiAircraft[] };
    const now = Date.now();

    for (const ac of data.ac ?? []) {
      if (
        ac.lat == null || ac.lon == null ||
        ac.lat < BBOX.latMin || ac.lat > BBOX.latMax ||
        ac.lon < BBOX.lonMin || ac.lon > BBOX.lonMax
      ) continue;

      const country   = ac.country ?? "Unknown";
      const callsign  = (ac.flight ?? "").trim();
      const altFt     = typeof ac.alt_baro === "number" ? ac.alt_baro : 0;

      trackingCache.setAircraft({
        id:            ac.hex,
        callsign:      callsign || ac.hex,
        country,
        lat:           ac.lat,
        lon:           ac.lon,
        altitude:      altFt,
        speed:         ac.gs ?? 0,
        heading:       ac.track ?? 0,
        on_ground:     altFt < 100,
        is_military:   true,
        affiliation:   COUNTRY_AFFILIATION[country] ?? "unknown",
        aircraft_type: ac.t ?? "",
        registration:  ac.r ?? "",
        updated_at:    now,
      });
    }
  } catch {
    // silent — ADSB.fi is best-effort
  }
}

// ── OpenSky — all aircraft in bbox, filtered by relevant country ───────────────

type OpenSkyState = [
  string,       // 0 icao24
  string|null,  // 1 callsign
  string,       // 2 origin_country
  number|null,  // 3 time_position
  number,       // 4 last_contact
  number|null,  // 5 longitude
  number|null,  // 6 latitude
  number|null,  // 7 baro_altitude (meters)
  boolean,      // 8 on_ground
  number|null,  // 9 velocity (m/s)
  number|null,  // 10 true_track
  number|null,  // 11 vertical_rate
  unknown,      // 12 sensors
  number|null,  // 13 geo_altitude
  string|null,  // 14 squawk
  boolean,      // 15 spi
  number,       // 16 position_source
];

async function fetchOpenSky(): Promise<void> {
  const url = `https://opensky-network.org/api/states/all` +
    `?lamin=${BBOX.latMin}&lomin=${BBOX.lonMin}&lamax=${BBOX.latMax}&lomax=${BBOX.lonMax}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "ConflictTerminal/1.0" },
    });
    if (!res.ok) return;

    const data = (await res.json()) as { states?: OpenSkyState[] };
    const now  = Date.now();

    for (const s of data.states ?? []) {
      const country = s[2];
      if (!RELEVANT_COUNTRIES.has(country)) continue;

      const lon = s[5]; const lat = s[6];
      if (lat == null || lon == null) continue;

      const icao24   = s[0];
      const callsign = (s[1] ?? "").trim();
      const altM     = s[7] ?? 0;
      const altFt    = Math.round(altM * 3.281);
      const speedMs  = s[9] ?? 0;
      const speedKt  = Math.round(speedMs * 1.944);
      const heading  = s[10] ?? 0;
      const isMil    = inferMilitary(callsign, "");

      // Only track military aircraft from OpenSky (adsb.fi already covers all military)
      if (!isMil) continue;

      // Don't overwrite a fresh adsb.fi entry for same icao24
      const existing = trackingCache.getAircraft().find((a) => a.id === icao24);
      if (existing && now - existing.updated_at < 30_000) continue;

      trackingCache.setAircraft({
        id:            icao24,
        callsign:      callsign || icao24,
        country,
        lat,
        lon,
        altitude:      altFt,
        speed:         speedKt,
        heading,
        on_ground:     s[8],
        is_military:   isMil,
        affiliation:   COUNTRY_AFFILIATION[country] ?? "unknown",
        aircraft_type: "",
        registration:  "",
        updated_at:    now,
      });
    }
  } catch {
    // OpenSky rate-limits anonymous access — ignore failures
  }
}

export async function refreshAircraft(): Promise<void> {
  await fetchAdsbFiMilitary();
  await fetchOpenSky();
  if (process.env.NODE_ENV !== "production") {
    console.log(`[tracking] aircraft: ${trackingCache.aircraftCount()} in cache`);
  }
}
