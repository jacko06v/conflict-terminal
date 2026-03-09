import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useAppStore } from "../../stores/useAppStore";
import { countryToIso2 } from "../../utils/countryIso";
import { ConflictEvent } from "../../types";

function computeRisk(events: ConflictEvent[]): Map<string, number> {
  const scores = new Map<string, number>();
  const now = Date.now();

  for (const e of events) {
    const iso = countryToIso2(e.country);
    if (!iso) continue;

    const ageMins = (now - new Date(e.occurred_at).getTime()) / 60_000;
    const recency = ageMins < 360 ? 2 : ageMins < 1440 ? 1.5 : 1; // 6h / 24h
    const weight = e.severity * (e.confidence_score / 100) * recency;
    scores.set(iso, (scores.get(iso) ?? 0) + weight);
  }

  return scores;
}

// Map risk score to a color (green → yellow → red scale)
function riskColor(score: number): string {
  if (score < 5)  return "#22c55e"; // green
  if (score < 15) return "#eab308"; // yellow
  if (score < 30) return "#f97316"; // orange
  return "#ef4444";                 // red
}

function riskOpacity(score: number): number {
  if (score < 1)  return 0;
  if (score < 5)  return 0.06;
  if (score < 15) return 0.10;
  if (score < 30) return 0.16;
  return 0.22;
}

interface Props {
  map: maplibregl.Map | null;
  mapLoaded: boolean;
  allEvents: ConflictEvent[];
}

export default function RiskZonesLayer({ map, mapLoaded, allEvents }: Props) {
  const infraLayers = useAppStore((s) => s.infraLayers);
  const initialized = useRef(false);

  useEffect(() => {
    if (!map || !mapLoaded || initialized.current) return;
    initialized.current = true;

    // country-boundaries source already added in MapPanel.tsx — reuse it.
    // Add a separate fill layer for risk zones BELOW the highlight layers.
    map.addLayer(
      {
        id: "risk-zones-fill",
        type: "fill",
        source: "country-boundaries",
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0,
        },
        filter: ["in", "ISO_A2", ""], // start with nothing visible
      },
      "country-highlight-fill" // insert below highlight layers
    );
  }, [map, mapLoaded]);

  // Rebuild the data-driven expression whenever events or visibility changes
  useEffect(() => {
    if (!map || !mapLoaded || !initialized.current) return;

    const layer = map.getLayer("risk-zones-fill");
    if (!layer) return;

    if (!infraLayers.riskZones) {
      map.setLayoutProperty("risk-zones-fill", "visibility", "none");
      return;
    }

    map.setLayoutProperty("risk-zones-fill", "visibility", "visible");

    const scores = computeRisk(allEvents);
    if (scores.size === 0) return;

    // Build a match expression: ["match", ["get","ISO_A2"], iso1, color1, iso2, color2, ..., fallback]
    const colorExpr: unknown[] = ["match", ["get", "ISO_A2"]];
    const opacityExpr: unknown[] = ["match", ["get", "ISO_A2"]];

    for (const [iso, score] of scores) {
      colorExpr.push(iso, riskColor(score));
      opacityExpr.push(iso, riskOpacity(score));
    }
    colorExpr.push("transparent");
    opacityExpr.push(0);

    map.setPaintProperty("risk-zones-fill", "fill-color", colorExpr as maplibregl.ExpressionSpecification);
    map.setPaintProperty("risk-zones-fill", "fill-opacity", opacityExpr as maplibregl.ExpressionSpecification);

    // Remove the filter so all countries are rendered (opacity handles visibility)
    map.setFilter("risk-zones-fill", null);
  }, [map, mapLoaded, infraLayers.riskZones, allEvents]);

  return null;
}
