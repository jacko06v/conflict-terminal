import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useAppStore } from "../../stores/useAppStore";
import { useStrategicData } from "../../hooks/useAnalytics";

// ─── Interfaces matching backend API shapes ─────────────────────────

interface Waterway {
  id: string;
  name: string;
  lat: number;
  lon: number;
  significance: string;
}

interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: string;
}

interface Spaceport {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

interface Pipeline {
  id: string;
  name: string;
  type: string;
  status: string;
  points: [number, number][];
  capacity?: string;
}

// ─── GeoJSON builders ───────────────────────────────────────────────

function pointsToGeoJSON<T extends { name: string; lat: number; lon: number }>(
  items: T[],
  colorFn: (item: T) => string
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [item.lon, item.lat] },
      properties: { name: item.name, color: colorFn(item) },
    })),
  };
}

function pipelinesToGeoJSON(pipes: Pipeline[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pipes
      .filter((p) => p.points && p.points.length >= 2)
      .map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: p.points,
        },
        properties: {
          name: p.name,
          type: p.type,
          status: p.status,
          color: p.type === "oil" ? "#f59e0b" : p.type === "gas" ? "#3b82f6" : "#6b7280",
        },
      })),
  };
}

// ─── Component ──────────────────────────────────────────────────────

interface Props {
  map: maplibregl.Map | null;
  mapLoaded: boolean;
}

export default function StrategicLayers({ map, mapLoaded }: Props) {
  const infraLayers = useAppStore((s) => s.infraLayers);
  const initialized = useRef(false);

  const { data: waterwayData } = useStrategicData("waterways");
  const { data: hotspotData } = useStrategicData("hotspots");
  const { data: spaceportData } = useStrategicData("spaceports");
  const { data: pipelineData } = useStrategicData("pipelines");

  // Add sources + layers once map is loaded and data arrives
  useEffect(() => {
    if (!map || !mapLoaded || initialized.current) return;
    if (!waterwayData && !hotspotData && !spaceportData && !pipelineData) return;
    initialized.current = true;

    // ── Waterways ──
    if (waterwayData?.data) {
      map.addSource("waterways-source", {
        type: "geojson",
        data: pointsToGeoJSON(
          waterwayData.data as Waterway[],
          () => "#0ea5e9"
        ),
      });

      map.addLayer({
        id: "waterways-halo",
        type: "circle",
        source: "waterways-source",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 16,
          "circle-color": "#0ea5e9",
          "circle-opacity": 0.08,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0ea5e9",
          "circle-stroke-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "waterways-dot",
        type: "circle",
        source: "waterways-source",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 6,
          "circle-color": "#0ea5e9",
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.5,
        },
      });

      map.addLayer({
        id: "waterways-label",
        type: "symbol",
        source: "waterways-source",
        layout: {
          visibility: "none",
          "text-field": ["concat", "⚓ ", ["get", "name"]],
          "text-size": 9,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#0ea5e9",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }

    // ── Hotspots ──
    if (hotspotData?.data) {
      map.addSource("hotspots-source", {
        type: "geojson",
        data: pointsToGeoJSON(
          hotspotData.data as Hotspot[],
          (h) =>
            h.status === "active"
              ? "#ef4444"
              : h.status === "escalating"
                ? "#f97316"
                : "#eab308"
        ),
      });

      map.addLayer({
        id: "hotspots-pulse",
        type: "circle",
        source: "hotspots-source",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 18,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.06,
          "circle-stroke-width": 1,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "hotspots-dot",
        type: "circle",
        source: "hotspots-source",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 5,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.6,
        },
      });

      map.addLayer({
        id: "hotspots-label",
        type: "symbol",
        source: "hotspots-source",
        layout: {
          visibility: "none",
          "text-field": ["concat", "🔥 ", ["get", "name"]],
          "text-size": 9,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }

    // ── Spaceports ──
    if (spaceportData?.data) {
      map.addSource("spaceports-source", {
        type: "geojson",
        data: pointsToGeoJSON(
          spaceportData.data as Spaceport[],
          () => "#8b5cf6"
        ),
      });

      map.addLayer({
        id: "spaceports-dot",
        type: "circle",
        source: "spaceports-source",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 6,
          "circle-color": "#8b5cf6",
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.6,
        },
      });

      map.addLayer({
        id: "spaceports-label",
        type: "symbol",
        source: "spaceports-source",
        layout: {
          visibility: "none",
          "text-field": ["concat", "🚀 ", ["get", "name"]],
          "text-size": 9,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#8b5cf6",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }

    // ── Pipelines ──
    if (pipelineData?.data) {
      map.addSource("pipelines-source", {
        type: "geojson",
        data: pipelinesToGeoJSON(pipelineData.data as Pipeline[]),
      });

      map.addLayer({
        id: "pipelines-line",
        type: "line",
        source: "pipelines-source",
        layout: {
          visibility: "none",
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2.5,
          "line-opacity": 0.7,
          "line-dasharray": [2, 1],
        },
      });

      map.addLayer({
        id: "pipelines-label",
        type: "symbol",
        source: "pipelines-source",
        layout: {
          visibility: "none",
          "symbol-placement": "line-center",
          "text-field": ["get", "name"],
          "text-size": 8,
          "text-rotation-alignment": "map",
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }
  }, [map, mapLoaded, waterwayData, hotspotData, spaceportData, pipelineData]);

  // ── Toggle visibility ──────────────────────────────────────────────

  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const vis = infraLayers.waterways ? "visible" : "none";
    for (const id of ["waterways-halo", "waterways-dot", "waterways-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [map, mapLoaded, infraLayers.waterways]);

  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const vis = infraLayers.hotspots ? "visible" : "none";
    for (const id of ["hotspots-pulse", "hotspots-dot", "hotspots-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [map, mapLoaded, infraLayers.hotspots]);

  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const vis = infraLayers.spaceports ? "visible" : "none";
    for (const id of ["spaceports-dot", "spaceports-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [map, mapLoaded, infraLayers.spaceports]);

  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const vis = infraLayers.pipelines ? "visible" : "none";
    for (const id of ["pipelines-line", "pipelines-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [map, mapLoaded, infraLayers.pipelines]);

  return null;
}
