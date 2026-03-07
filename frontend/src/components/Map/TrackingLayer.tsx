import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useAircraft, useVessels, TrackedAircraft, TrackedVessel } from "../../hooks/useTracking";

// Affiliation → color
const AFFIL_COLORS: Record<string, string> = {
  usa:     "#4a9eff",
  israel:  "#a855f7",
  iran:    "#ef4444",
  russia:  "#f97316",
  uk:      "#60a5fa",
  france:  "#3b82f6",
  saudi:   "#22c55e",
  uae:     "#14b8a6",
  turkey:  "#dc2626",
  iraq:    "#84cc16",
  egypt:   "#eab308",
  unknown: "#6b7280",
};

function affiliationColor(affil: string) {
  return AFFIL_COLORS[affil] ?? AFFIL_COLORS.unknown;
}

function toAircraftGeoJSON(aircraft: TrackedAircraft[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: aircraft.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.lon, a.lat] },
      properties: {
        id:           a.id,
        callsign:     a.callsign,
        country:      a.country,
        altitude:     a.altitude,
        speed:        a.speed,
        heading:      a.heading,
        on_ground:    a.on_ground,
        is_military:  a.is_military,
        affiliation:  a.affiliation,
        aircraft_type: a.aircraft_type,
        registration: a.registration,
        color:        affiliationColor(a.affiliation),
      },
    })),
  };
}

function toVesselGeoJSON(vessels: TrackedVessel[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: vessels.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.lon, v.lat] },
      properties: {
        mmsi:        v.mmsi,
        name:        v.name,
        flag:        v.flag,
        type_name:   v.type_name,
        speed:       v.speed,
        heading:     v.heading,
        destination: v.destination,
        is_warship:  v.is_warship,
        affiliation: v.affiliation,
        color:       affiliationColor(v.affiliation),
      },
    })),
  };
}

interface Popup {
  x: number;
  y: number;
  kind: "aircraft" | "vessel";
  data: TrackedAircraft | TrackedVessel;
}

interface Props {
  map: maplibregl.Map | null;
  mapLoaded: boolean;
}

export default function TrackingLayer({ map, mapLoaded }: Props) {
  const { data: aircraft = [] } = useAircraft();
  const { data: vessels = [] }  = useVessels();
  const [popup, setPopup] = useState<Popup | null>(null);
  const initialized = useRef(false);

  // ── Add sources + layers once map is ready ────────────────────────────────
  useEffect(() => {
    if (!map || !mapLoaded || initialized.current) return;
    initialized.current = true;

    // Aircraft source + layers
    map.addSource("aircraft-source", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Shadow halo
    map.addLayer({
      id: "aircraft-halo",
      type: "circle",
      source: "aircraft-source",
      paint: {
        "circle-radius": 10,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.15,
        "circle-stroke-width": 0,
      },
    });

    // Main dot
    map.addLayer({
      id: "aircraft-dot",
      type: "circle",
      source: "aircraft-source",
      paint: {
        "circle-radius": ["case", ["get", "is_military"], 6, 4],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.9,
        "circle-stroke-width": ["case", ["get", "is_military"], 1.5, 1],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.6,
      },
    });

    // Callsign label
    map.addLayer({
      id: "aircraft-label",
      type: "symbol",
      source: "aircraft-source",
      layout: {
        "text-field": ["get", "callsign"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "#000000",
        "text-halo-width": 1,
      },
    });

    // Vessels source + layers
    map.addSource("vessels-source", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Warship ring
    map.addLayer({
      id: "vessel-warship-ring",
      type: "circle",
      source: "vessels-source",
      filter: ["==", ["get", "is_warship"], true],
      paint: {
        "circle-radius": 10,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.12,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.6,
      },
    });

    // Main dot
    map.addLayer({
      id: "vessel-dot",
      type: "circle",
      source: "vessels-source",
      paint: {
        "circle-radius": ["case", ["get", "is_warship"], 5, 3],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.85,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.4,
      },
    });

    // Vessel label
    map.addLayer({
      id: "vessel-label",
      type: "symbol",
      source: "vessels-source",
      filter: ["==", ["get", "is_warship"], true], // only label warships to reduce clutter
      layout: {
        "text-field": ["get", "name"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "#000000",
        "text-halo-width": 1,
      },
    });

    // ── Click handlers ──────────────────────────────────────────────────────
    const handleAircraftClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      setPopup({
        x: e.point.x, y: e.point.y,
        kind: "aircraft",
        data: {
          id: p.id as string, callsign: p.callsign as string,
          country: p.country as string, lat: (f.geometry as GeoJSON.Point).coordinates[1],
          lon: (f.geometry as GeoJSON.Point).coordinates[0],
          altitude: p.altitude as number, speed: p.speed as number,
          heading: p.heading as number, on_ground: p.on_ground as boolean,
          is_military: p.is_military as boolean, affiliation: p.affiliation as string,
          aircraft_type: p.aircraft_type as string, registration: p.registration as string,
          updated_at: 0,
        },
      });
    };

    const handleVesselClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      setPopup({
        x: e.point.x, y: e.point.y,
        kind: "vessel",
        data: {
          mmsi: p.mmsi as string, name: p.name as string, flag: p.flag as string,
          type_code: 0, type_name: p.type_name as string,
          lat: (f.geometry as GeoJSON.Point).coordinates[1],
          lon: (f.geometry as GeoJSON.Point).coordinates[0],
          speed: p.speed as number, heading: p.heading as number,
          destination: p.destination as string, is_warship: p.is_warship as boolean,
          affiliation: p.affiliation as string, updated_at: 0,
        },
      });
    };

    map.on("click", "aircraft-dot", handleAircraftClick);
    map.on("click", "vessel-dot",   handleVesselClick);
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ["aircraft-dot", "vessel-dot"] });
      if (hits.length === 0) setPopup(null);
    });

    for (const layer of ["aircraft-dot", "aircraft-halo"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
    for (const layer of ["vessel-dot", "vessel-warship-ring"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
  }, [map, mapLoaded]);

  // ── Update GeoJSON data when tracking data changes ────────────────────────
  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const src = map.getSource("aircraft-source") as maplibregl.GeoJSONSource | undefined;
    src?.setData(toAircraftGeoJSON(aircraft));
  }, [map, mapLoaded, aircraft]);

  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const src = map.getSource("vessels-source") as maplibregl.GeoJSONSource | undefined;
    src?.setData(toVesselGeoJSON(vessels));
  }, [map, mapLoaded, vessels]);

  if (!popup) return null;

  const safeLeft = Math.min(popup.x + 12, window.innerWidth - 260);
  const safeTop  = Math.max(popup.y - 8, 4);

  return (
    <div
      className="absolute z-30 bg-gray-950 border border-green-900 rounded shadow-xl text-xs font-mono w-56"
      style={{ left: safeLeft, top: safeTop }}
    >
      {popup.kind === "aircraft" ? (
        <AircraftCard aircraft={popup.data as TrackedAircraft} onClose={() => setPopup(null)} />
      ) : (
        <VesselCard vessel={popup.data as TrackedVessel} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 py-0.5 border-b border-green-950 last:border-0">
      <span className="text-green-700 uppercase text-[9px] tracking-wide flex-shrink-0">{label}</span>
      <span className="text-green-300 text-right truncate">{value}</span>
    </div>
  );
}

function AircraftCard({ aircraft: a, onClose }: { aircraft: TrackedAircraft; onClose: () => void }) {
  const color = AFFIL_COLORS[a.affiliation] ?? AFFIL_COLORS.unknown;
  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-green-900">
        <div className="flex items-center gap-1.5">
          <span className="text-base">✈</span>
          <span className="font-bold text-[11px]" style={{ color }}>{a.callsign}</span>
          {a.is_military && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-red-900/40 text-red-400 uppercase">MIL</span>
          )}
        </div>
        <button onClick={onClose} className="text-green-700 hover:text-green-400">✕</button>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        <Row label="Country"  value={a.country} />
        {a.aircraft_type && <Row label="Type"     value={a.aircraft_type} />}
        {a.registration   && <Row label="Reg"     value={a.registration} />}
        <Row label="Alt"      value={a.on_ground ? "Ground" : `${a.altitude.toLocaleString()} ft`} />
        <Row label="Speed"    value={a.on_ground ? "—" : `${a.speed} kt`} />
        <Row label="Heading"  value={a.on_ground ? "—" : `${Math.round(a.heading)}°`} />
        <Row label="Position" value={`${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`} />
      </div>
    </>
  );
}

function VesselCard({ vessel: v, onClose }: { vessel: TrackedVessel; onClose: () => void }) {
  const color = AFFIL_COLORS[v.affiliation] ?? AFFIL_COLORS.unknown;
  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-green-900">
        <div className="flex items-center gap-1.5">
          <span className="text-base">⚓</span>
          <span className="font-bold text-[11px] truncate max-w-[130px]" style={{ color }}>{v.name}</span>
          {v.is_warship && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-red-900/40 text-red-400 uppercase">WAR</span>
          )}
        </div>
        <button onClick={onClose} className="text-green-700 hover:text-green-400">✕</button>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        <Row label="Flag"     value={v.flag} />
        <Row label="Type"     value={v.type_name} />
        <Row label="MMSI"     value={v.mmsi} />
        <Row label="Speed"    value={`${v.speed.toFixed(1)} kt`} />
        <Row label="Heading"  value={`${Math.round(v.heading)}°`} />
        {v.destination && <Row label="Dest" value={v.destination} />}
        <Row label="Position" value={`${v.lat.toFixed(3)}, ${v.lon.toFixed(3)}`} />
      </div>
    </>
  );
}
