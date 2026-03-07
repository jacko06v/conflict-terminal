/**
 * AIS vessel tracking via aisstream.io WebSocket.
 *
 * Free registration at https://aisstream.io — generates an API key.
 * Set AIS_API_KEY in backend/.env. If not set, this provider is skipped silently.
 *
 * Maintains a persistent WebSocket connection and feeds vessel positions
 * into trackingCache.
 */

import WebSocket from "ws";
import { trackingCache, TrackedVessel } from "../services/trackingCache";

// Middle East + Red Sea + Arabian Sea + Persian Gulf
const BOUNDING_BOX = [[10, 20], [45, 70]]; // [SW lat/lon, NE lat/lon]

// MMSI MID (first 3 digits) → country name
const MID_COUNTRY: Record<string, string> = {
  "338": "United States", "366": "United States", "367": "United States",
  "368": "United States", "369": "United States",
  "428": "Israel",
  "422": "Iran",
  "235": "United Kingdom", "232": "United Kingdom", "233": "United Kingdom", "234": "United Kingdom",
  "226": "France", "227": "France", "228": "France",
  "273": "Russia",
  "432": "Saudi Arabia",
  "470": "United Arab Emirates",
  "271": "Turkey",
  "447": "Iraq",
  "470": "UAE",
  "455": "Taiwan",
  "401": "India",
  "412": "China", "413": "China",
};

const COUNTRY_AFFILIATION: Record<string, string> = {
  "United States": "usa", "Israel": "israel", "Iran": "iran",
  "Russia": "russia", "United Kingdom": "uk", "France": "france",
  "Saudi Arabia": "saudi", "United Arab Emirates": "uae", "UAE": "uae",
  "Turkey": "turkey", "Iraq": "iraq",
};

const AIS_SHIP_TYPES: Record<number, string> = {
  0: "Unknown", 30: "Fishing", 31: "Towing", 32: "Towing (large)",
  33: "Dredger", 34: "Diving", 35: "Military", 36: "Sailing", 37: "Pleasure",
  50: "Pilot", 51: "SAR", 52: "Tug", 53: "Port tender", 55: "Law enforcement",
  60: "Passenger", 69: "Passenger", 70: "Cargo", 79: "Cargo",
  80: "Tanker", 89: "Tanker", 90: "Other",
};

function shipTypeName(code: number): string {
  if (code >= 60 && code < 70) return "Passenger";
  if (code >= 70 && code < 80) return "Cargo";
  if (code >= 80 && code < 90) return "Tanker";
  return AIS_SHIP_TYPES[code] ?? "Other";
}

function flagFromMmsi(mmsi: string): string {
  const mid = mmsi.slice(0, 3);
  return MID_COUNTRY[mid] ?? "Unknown";
}

function affiliationFromFlag(flag: string): string {
  return COUNTRY_AFFILIATION[flag] ?? "unknown";
}

let wsClient: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

// Ship name cache (from static data messages)
const nameCache = new Map<string, string>();
const destCache = new Map<string, string>();
const typeCache = new Map<string, number>();

function connect(apiKey: string) {
  if (wsClient) { wsClient.terminate(); wsClient = null; }
  if (reconnectTimeout) { clearTimeout(reconnectTimeout); reconnectTimeout = null; }

  const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
  wsClient = ws;

  ws.on("open", () => {
    console.log("[ais] Connected to aisstream.io");
    ws.send(JSON.stringify({
      APIKey: apiKey,
      BoundingBoxes: [BOUNDING_BOX],
      FilterMessageTypes: ["PositionReport", "ShipStaticData", "StandardClassBPositionReport"],
    }));
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      const type = msg.MessageType as string;
      const meta = msg.MetaData as Record<string, unknown>;
      const mmsi = String(meta?.MMSI ?? "");
      if (!mmsi || mmsi === "0") return;

      if (type === "ShipStaticData") {
        const d = (msg.Message as Record<string, Record<string, unknown>>)?.ShipStaticData ?? {};
        if (d.Name) nameCache.set(mmsi, String(d.Name).trim());
        if (d.Destination) destCache.set(mmsi, String(d.Destination).trim());
        if (d.TypeOfShipAndCargo) typeCache.set(mmsi, Number(d.TypeOfShipAndCargo));
        return;
      }

      if (type === "PositionReport" || type === "StandardClassBPositionReport") {
        const lat = Number(meta.latitude);
        const lon = Number(meta.longitude);
        if (!lat || !lon || Math.abs(lat) > 90) return;

        const report = (msg.Message as Record<string, Record<string, unknown>>)?.[type] ?? {};
        const speed   = Number(report.Sog ?? 0);
        const heading = Number(report.TrueHeading ?? report.Cog ?? 0);
        const typeCode = typeCache.get(mmsi) ?? 0;
        const flag     = flagFromMmsi(mmsi);

        // Only track warships (AIS type 35) — skip commercial/civilian vessels
        if (typeCode !== 35) return;

        const vessel: TrackedVessel = {
          mmsi,
          name:        nameCache.get(mmsi) ?? meta.ShipName as string ?? mmsi,
          flag,
          type_code:   typeCode,
          type_name:   shipTypeName(typeCode),
          lat,
          lon,
          speed:       speed > 102 ? 0 : speed, // 102.3 = not available in AIS
          heading:     heading > 360 ? 0 : heading,
          destination: destCache.get(mmsi) ?? "",
          is_warship:  typeCode === 35,
          affiliation: affiliationFromFlag(flag),
          updated_at:  Date.now(),
        };
        trackingCache.setVessel(vessel);
      }
    } catch {
      // malformed message — ignore
    }
  });

  ws.on("close", () => {
    console.log("[ais] Disconnected, reconnecting in 30s...");
    wsClient = null;
    reconnectTimeout = setTimeout(() => connect(apiKey), 30_000);
  });

  ws.on("error", (err) => {
    console.warn("[ais] WebSocket error:", err.message);
  });
}

export function startAisStream(): void {
  const key = process.env.AIS_API_KEY;
  if (!key) {
    console.log("[ais] AIS_API_KEY not set — vessel tracking disabled");
    return;
  }
  connect(key);
}

export function stopAisStream(): void {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  wsClient?.terminate();
  wsClient = null;
}
