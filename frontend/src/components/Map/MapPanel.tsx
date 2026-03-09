import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { useEvents } from "../../hooks/useEvents";
import { useAppStore } from "../../stores/useAppStore";
import { ConflictEvent, EventType, EVENT_COLORS, EVENT_LABELS, MapLayer } from "../../types";
import Legend from "./Legend";
import LayerControls from "./LayerControls";
import TrackingLayer from "./TrackingLayer";
import InfrastructureLayer from "./InfrastructureLayer";
import RiskZonesLayer from "./RiskZonesLayer";
import StrategicLayers from "./StrategicLayers";
import { countryToIso2 } from "../../utils/countryIso";

interface StackedPicker {
  x: number;
  y: number;
  events: Array<{ id: string; title: string; event_type: string; country: string }>;
}

const DARK_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_CENTER: [number, number] = [44, 32];
const INITIAL_ZOOM = 4.5;

function eventsToGeoJSON(events: ConflictEvent[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
      properties: {
        id: e.id,
        event_type: e.event_type,
        severity: e.severity,
        verification_status: e.verification_status,
        geolocation_precision: e.geolocation_precision,
        occurred_at: e.occurred_at,
        country: e.country,
        color: EVENT_COLORS[e.event_type] ?? "#ef4444",
        is_recent:
          Date.now() - new Date(e.occurred_at).getTime() < 3 * 60 * 60 * 1000,
      },
    })),
  };
}

function applyData(map: maplibregl.Map, events: ConflictEvent[]) {
  const source = map.getSource("events");
  if (!source) {
    console.warn("[map] source 'events' not found");
    return;
  }
  const geojson = eventsToGeoJSON(events);
  console.log(`[map] setData: ${events.length} events`);
  (source as maplibregl.GeoJSONSource).setData(geojson);
}

function buildLayerFilter(
  base: maplibregl.FilterSpecification,
  visibleTypes: string[]
): maplibregl.FilterSpecification {
  if (visibleTypes.length === 0) return base;
  // ["match", expression, [label, ...], output_if_match, default]
  const typeMatch = [
    "match",
    ["get", "event_type"],
    visibleTypes,
    true,
    false,
  ] as unknown as maplibregl.FilterSpecification;
  return ["all", base, typeMatch] as unknown as maplibregl.FilterSpecification;
}

function applyLayers(map: maplibregl.Map, layers: MapLayer[]) {
  // No layers info yet → leave default visibility (show everything)
  if (layers.length === 0) return;

  const visible = layers.filter((l) => l.visible).map((l) => l.event_type);

  const pointBase = ["!", ["has", "point_count"]] as unknown as maplibregl.FilterSpecification;
  const recentBase = ["all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "is_recent"], true],
  ] as unknown as maplibregl.FilterSpecification;

  const layerConfigs: [string, maplibregl.FilterSpecification][] = [
    ["events-point",        buildLayerFilter(pointBase,  visible)],
    ["event-radius",        buildLayerFilter(pointBase,  visible)],
    ["events-recent-pulse", buildLayerFilter(recentBase, visible)],
  ];

  for (const [id, filter] of layerConfigs) {
    if (!map.getLayer(id)) continue;
    if (visible.length === 0) {
      map.setLayoutProperty(id, "visibility", "none");
    } else {
      map.setLayoutProperty(id, "visibility", "visible");
      map.setFilter(id, filter);
    }
  }
}

interface StackedEventPickerProps {
  picker: StackedPicker;
  eventsById: Map<string, ConflictEvent>;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function StackedEventPicker({ picker, eventsById, onSelect, onClose }: StackedEventPickerProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  // Ensure the picker stays within the viewport
  const maxH = 300;
  const safeTop = Math.min(picker.y - 8, window.innerHeight - maxH - 16);
  const safeLeft = Math.min(picker.x + 12, window.innerWidth - 320);

  return (
    <div
      ref={parentRef}
      className="absolute z-30 bg-gray-950 border border-green-900 rounded shadow-xl text-xs font-mono min-w-[220px] max-w-[300px] flex flex-col"
      style={{ left: Math.max(4, safeLeft), top: Math.max(4, safeTop), maxHeight: maxH }}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-green-900 text-green-500 flex-shrink-0">
        <span>{picker.events.length} events at this location</span>
        <button onClick={onClose} className="text-green-700 hover:text-green-400 ml-2">✕</button>
      </div>
      <ul className="overflow-y-auto min-h-0 flex-1">
        {picker.events.map((ev) => {
          const full = eventsById.get(ev.id);
          const color = EVENT_COLORS[ev.event_type as EventType] ?? "#ef4444";
          const label = EVENT_LABELS[ev.event_type as EventType] ?? ev.event_type;
          return (
            <li key={ev.id}>
              <button
                className="w-full text-left px-3 py-2 hover:bg-green-950 border-b border-green-950 last:border-0"
                onClick={() => onSelect(ev.id)}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-green-600 uppercase tracking-wide text-[9px]">{label}</span>
                  <span className="text-green-800 ml-auto">{ev.country}</span>
                </div>
                <div className="text-green-300 leading-snug line-clamp-2">
                  {full?.title ?? ev.id}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<maplibregl.Map | null>(null);
  const popupRef    = useRef<maplibregl.Popup | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [picker, setPicker] = useState<StackedPicker | null>(null);

  const { data: apiEvents } = useEvents();
  const layers         = useAppStore((s) => s.layers);
  const liveEvents     = useAppStore((s) => s.liveEvents);
  const setSelectedId  = useAppStore((s) => s.setSelectedEventId);
  const selectedEventId = useAppStore((s) => s.selectedEventId);

  // Stable merged event list
  const allEvents = useMemo<ConflictEvent[]>(() => {
    const api = apiEvents ?? [];
    const live = liveEvents ?? [];
    const liveIds = new Set(live.map((e) => e.id));
    return [...live, ...api.filter((e) => !liveIds.has(e.id))];
  }, [apiEvents, liveEvents]);

  // ── Map init ─────────────────────────────────────────────────────────────
  const handleSetSelectedId = useCallback(setSelectedId, [setSelectedId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    mapRef.current = map;

    map.on("load", () => {
      console.log("[map] style loaded");

      // Country boundary source — Natural Earth 110m, CORS-open, ~500KB
      map.addSource("country-boundaries", {
        type: "geojson",
        data: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
      });
      map.addLayer({
        id: "country-highlight-fill",
        type: "fill",
        source: "country-boundaries",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.12 },
        filter: ["==", ["get", "ISO_A2"], ""],
      });
      map.addLayer({
        id: "country-highlight-border",
        type: "line",
        source: "country-boundaries",
        paint: { "line-color": "#60a5fa", "line-width": 1.5, "line-opacity": 0.6 },
        filter: ["==", ["get", "ISO_A2"], ""],
      });

      map.addSource("events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 9,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#1c4a3a", 5, "#2d5a3a", 15, "#3d6a2a",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            16, 5, 22, 15, 28,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#00ff88",
          "circle-opacity": 0.85,
        },
      });

      // Cluster count label — use a font from CartoDB's glyph set
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#00ff88" },
      });

      // Approximate-location radius halo
      map.addLayer({
        id: "event-radius",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 24,
          "circle-color": ["get", "color"],
          "circle-opacity": [
            "case",
            ["==", ["get", "geolocation_precision"], "exact"], 0,
            ["==", ["get", "geolocation_precision"], "approximate"], 0.07,
            0.04,
          ],
          "circle-stroke-width": 0,
        },
      });

      // Main event dot
      map.addLayer({
        id: "events-point",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "severity"],
            1, 5, 5, 11,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.92,
          "circle-stroke-width": [
            "case",
            ["==", ["get", "verification_status"], "verified"], 2,
            ["==", ["get", "verification_status"], "partial"],  1.5,
            0.5,
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "verification_status"], "verified"], "#00ff88",
            ["==", ["get", "verification_status"], "partial"],  "#ffa500",
            "#ff3355",
          ],
        },
      });

      // Recent-event pulse ring
      map.addLayer({
        id: "events-recent-pulse",
        type: "circle",
        source: "events",
        filter: ["all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "is_recent"], true],
        ],
        paint: {
          "circle-radius": 18,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.12,
          "circle-stroke-width": 1,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.4,
        },
      });

      // ── Click handlers ──────────────────────────────────────────────────
      map.on("click", "events-point", (e) => {
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

        // Query ALL features within a 12px radius of the click, not just the top one
        const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [e.point.x - 12, e.point.y - 12],
          [e.point.x + 12, e.point.y + 12],
        ];
        const features = map.queryRenderedFeatures(bbox, { layers: ["events-point"] });

        // Deduplicate by event id (same event can appear as multiple GL features)
        const seen = new Set<string>();
        const unique = features
          .map((f) => f.properties as { id: string; event_type: string; country: string; occurred_at: string })
          .filter((p) => p?.id && !seen.has(p.id) && seen.add(p.id));

        if (unique.length === 0) return;

        if (unique.length === 1) {
          // Single event — open detail immediately
          handleSetSelectedId(unique[0].id);
          setPicker(null);
        } else {
          // Multiple stacked events — show a picker
          setPicker({
            x: e.point.x,
            y: e.point.y,
            events: unique.map((p) => ({
              id: p.id,
              title: p.id, // will be resolved from allEvents below via store
              event_type: p.event_type,
              country: p.country,
            })),
          });
          handleSetSelectedId(null);
        }
      });

      map.on("click", "clusters", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const coords = f.geometry.coordinates as [number, number];
        const clusterId = f.properties?.cluster_id as number;
        (map.getSource("events") as maplibregl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            if (zoom == null) return;
            map.easeTo({ center: coords, zoom: zoom + 0.5 });
          })
          .catch(() => {});
      });

      // Close picker when clicking empty map area
      map.on("click", (e) => {
        const fs = map.queryRenderedFeatures(e.point, {
          layers: ["events-point", "clusters"],
        });
        if (fs.length === 0) setPicker(null);
      });

      map.on("mouseenter", "events-point", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "events-point", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "clusters",      () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters",      () => { map.getCanvas().style.cursor = ""; });

      // Signal React that the map is ready — triggers effects below
      setMapLoaded(true);
    });

    map.on("error", (e) => {
      console.error("[map] error:", e.error?.message ?? e);
    });

    return () => {
      setMapLoaded(false);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // run once on mount

  // ── Push event data whenever events change OR map finishes loading ────────
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    console.log(`[map] applying ${allEvents.length} events`);
    applyData(mapRef.current, allEvents);
  }, [allEvents, mapLoaded]);

  // ── Apply layer visibility/filters whenever layers change ─────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    applyLayers(mapRef.current, layers);
  }, [layers, mapLoaded]);

  // Build a lookup map for titles (features only carry properties, not full objects)
  const eventsById = useMemo(
    () => new Map(allEvents.map((e) => [e.id, e])),
    [allEvents]
  );

  // ── Highlight selected event's country ───────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const event = selectedEventId ? eventsById.get(selectedEventId) : null;
    const iso = countryToIso2(event?.country);
    const filter = ["==", ["get", "ISO_A2"], iso] as maplibregl.FilterSpecification;
    if (mapRef.current.getLayer("country-highlight-fill"))   mapRef.current.setFilter("country-highlight-fill",   filter);
    if (mapRef.current.getLayer("country-highlight-border")) mapRef.current.setFilter("country-highlight-border", filter);
  }, [selectedEventId, eventsById, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <Legend />
      <LayerControls />

      {/* Stacked-events picker */}
      {picker && (
        <StackedEventPicker
          picker={picker}
          eventsById={eventsById}
          onSelect={(id) => {
            setPicker(null);
            handleSetSelectedId(id);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      <TrackingLayer map={mapRef.current} mapLoaded={mapLoaded} />
      <InfrastructureLayer map={mapRef.current} mapLoaded={mapLoaded} />
      <StrategicLayers map={mapRef.current} mapLoaded={mapLoaded} />
      <RiskZonesLayer map={mapRef.current} mapLoaded={mapLoaded} allEvents={allEvents} />

      {/* Debug overlay — remove in production */}
      {import.meta.env.DEV && (
        <div className="absolute top-2 right-2 z-20 bg-black/70 text-green-400 text-[9px] font-mono px-2 py-1 rounded pointer-events-none">
          {mapLoaded ? "MAP OK" : "MAP LOADING"} · {allEvents.length} events
        </div>
      )}
    </div>
  );
}
