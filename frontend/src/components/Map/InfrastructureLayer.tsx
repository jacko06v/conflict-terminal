import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useAppStore } from "../../stores/useAppStore";

interface Base {
  name: string;
  country: string;
  operator: string; // "US" | "Russia" | "UK" | "France" | "Israel" | "Iran" etc.
  lat: number;
  lon: number;
}

interface NuclearSite {
  name: string;
  country: string;
  type: string; // "enrichment" | "reactor" | "research" | "weapon"
  lat: number;
  lon: number;
}

const MILITARY_BASES: Base[] = [
  { name: "Al Udeid AB", country: "Qatar", operator: "US", lat: 25.12, lon: 51.31 },
  { name: "Incirlik AB", country: "Turkey", operator: "NATO", lat: 37.0, lon: 35.43 },
  { name: "5th Fleet / NSA Bahrain", country: "Bahrain", operator: "US", lat: 26.21, lon: 50.59 },
  { name: "Al Dhafra AB", country: "UAE", operator: "US", lat: 24.25, lon: 54.54 },
  { name: "Ali Al Salem AB", country: "Kuwait", operator: "US", lat: 29.44, lon: 47.50 },
  { name: "Camp Lemonnier", country: "Djibouti", operator: "US", lat: 11.55, lon: 43.15 },
  { name: "Hmeimim AB", country: "Syria", operator: "Russia", lat: 35.4, lon: 35.95 },
  { name: "Tartus Naval", country: "Syria", operator: "Russia", lat: 34.89, lon: 35.87 },
  { name: "Nevatim AB", country: "Israel", operator: "Israel", lat: 31.21, lon: 34.88 },
  { name: "Hatzerim AB", country: "Israel", operator: "Israel", lat: 31.23, lon: 34.66 },
  { name: "Akrotiri AB", country: "Cyprus", operator: "UK", lat: 34.59, lon: 32.98 },
  { name: "Muwaffaq-Salti AB", country: "Jordan", operator: "US", lat: 31.83, lon: 37.0 },
  { name: "Shahid Nojeh AB", country: "Iran", operator: "Iran", lat: 35.21, lon: 48.65 },
  { name: "Imam Ali Base", country: "Syria", operator: "Iran", lat: 34.56, lon: 38.71 },
];

const NUCLEAR_SITES: NuclearSite[] = [
  { name: "Natanz", country: "Iran", type: "enrichment", lat: 33.72, lon: 51.73 },
  { name: "Fordow (FFEP)", country: "Iran", type: "enrichment", lat: 34.88, lon: 50.99 },
  { name: "Bushehr NPP", country: "Iran", type: "reactor", lat: 28.83, lon: 50.89 },
  { name: "Arak (IR-40)", country: "Iran", type: "research", lat: 34.28, lon: 49.08 },
  { name: "Isfahan (UCF)", country: "Iran", type: "enrichment", lat: 32.53, lon: 51.69 },
  { name: "Dimona (Negev NRC)", country: "Israel", type: "weapon", lat: 30.97, lon: 35.15 },
  { name: "Kahuta (KRL)", country: "Pakistan", type: "enrichment", lat: 33.59, lon: 73.40 },
  { name: "Khushab", country: "Pakistan", type: "reactor", lat: 32.05, lon: 72.19 },
  { name: "Chashma NPP", country: "Pakistan", type: "reactor", lat: 32.39, lon: 71.46 },
];

const OPERATOR_COLORS: Record<string, string> = {
  US:     "#4a9eff",
  NATO:   "#60a5fa",
  Russia: "#f97316",
  UK:     "#a78bfa",
  France: "#3b82f6",
  Israel: "#a855f7",
  Iran:   "#ef4444",
};

function toBaseGeoJSON(bases: Base[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: bases.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.lon, b.lat] },
      properties: {
        name: b.name,
        country: b.country,
        operator: b.operator,
        color: OPERATOR_COLORS[b.operator] ?? "#6b7280",
      },
    })),
  };
}

function toNuclearGeoJSON(sites: NuclearSite[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sites.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: {
        name: s.name,
        country: s.country,
        type: s.type,
        color: s.type === "weapon" ? "#ef4444" : s.type === "enrichment" ? "#f97316" : "#eab308",
      },
    })),
  };
}

interface Props {
  map: maplibregl.Map | null;
  mapLoaded: boolean;
}

export default function InfrastructureLayer({ map, mapLoaded }: Props) {
  const infraLayers = useAppStore((s) => s.infraLayers);
  const initialized = useRef(false);

  // Add sources + layers once
  useEffect(() => {
    if (!map || !mapLoaded || initialized.current) return;
    initialized.current = true;

    // Military bases
    map.addSource("military-bases-source", {
      type: "geojson",
      data: toBaseGeoJSON(MILITARY_BASES),
    });

    map.addLayer({
      id: "military-bases-halo",
      type: "circle",
      source: "military-bases-source",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 12,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.15,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.5,
      },
    });

    map.addLayer({
      id: "military-bases-dot",
      type: "circle",
      source: "military-bases-source",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 5,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.95,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.7,
      },
    });

    map.addLayer({
      id: "military-bases-label",
      type: "symbol",
      source: "military-bases-source",
      layout: {
        visibility: "none",
        "text-field": ["get", "name"],
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

    // Nuclear sites
    map.addSource("nuclear-sites-source", {
      type: "geojson",
      data: toNuclearGeoJSON(NUCLEAR_SITES),
    });

    map.addLayer({
      id: "nuclear-sites-halo",
      type: "circle",
      source: "nuclear-sites-source",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 14,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.1,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.4,
      },
    });

    map.addLayer({
      id: "nuclear-sites-dot",
      type: "circle",
      source: "nuclear-sites-source",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 6,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.9,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.6,
      },
    });

    map.addLayer({
      id: "nuclear-sites-label",
      type: "symbol",
      source: "nuclear-sites-source",
      layout: {
        visibility: "none",
        "text-field": ["concat", "☢ ", ["get", "name"]],
        "text-size": 9,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
    });
  }, [map, mapLoaded]);

  // Toggle visibility when store changes
  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const vis = infraLayers.military ? "visible" : "none";
    for (const id of ["military-bases-halo", "military-bases-dot", "military-bases-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [map, mapLoaded, infraLayers.military]);

  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;
    const vis = infraLayers.nuclear ? "visible" : "none";
    for (const id of ["nuclear-sites-halo", "nuclear-sites-dot", "nuclear-sites-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [map, mapLoaded, infraLayers.nuclear]);

  return null;
}
