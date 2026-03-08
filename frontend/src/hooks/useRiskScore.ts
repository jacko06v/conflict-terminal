import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { ConflictEvent } from "../types";

const TYPE_WEIGHT: Record<string, number> = {
  missile:        4,
  airstrike:      4,
  explosion:      3,
  drone:          2,
  infrastructure: 2,
  troop_movement: 1,
  alert:          1,
};

export interface RiskResult {
  score: number;          // 0.0 – 5.0
  level: number;          // 0 – 4 (index)
  label: string;
  color: string;
  eventCount: number;
}

const LEVELS = [
  { label: "MINIMAL",  color: "#22c55e" },
  { label: "GUARDED",  color: "#84cc16" },
  { label: "ELEVATED", color: "#eab308" },
  { label: "HIGH",     color: "#f97316" },
  { label: "CRITICAL", color: "#ef4444" },
];

function compute(events: ConflictEvent[]): RiskResult {
  const now   = Date.now();
  const h24   = now - 24 * 60 * 60 * 1000;
  const h6    = now - 6  * 60 * 60 * 1000;

  let raw = 0;
  let count = 0;

  for (const e of events) {
    const t = new Date(e.occurred_at).getTime();
    if (t < h24) continue;
    count++;
    const w       = TYPE_WEIGHT[e.event_type] ?? 1;
    const recency = t > h6 ? 2 : 1;
    raw += w * e.severity * e.confidence_score * recency;
  }

  const score = Math.min(5, Math.sqrt(raw / 10));
  const level = Math.min(4, Math.floor(score));

  return {
    score,
    level,
    label: LEVELS[level].label,
    color: LEVELS[level].color,
    eventCount: count,
  };
}

export function useRiskScore(): RiskResult {
  const { data: events = [] } = useQuery({
    queryKey: ["risk-events"],
    queryFn: () =>
      apiFetch<{ data: ConflictEvent[] }>("/api/events", {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        limit: 5000,
      }).then((r) => r.data),
    refetchInterval: 10 * 60 * 1000,
    staleTime:        9 * 60 * 1000,
  });

  return compute(events);
}
