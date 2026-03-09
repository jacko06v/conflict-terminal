import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api/client";

/* ── Types ──────────────────────────────────────────── */

interface SparklinePoint {
  popularity: number | null;
  time: string;
}

interface PizzaLocation {
  id: string;
  name: string;
  currentPopularity: number | null;
  percentageOfUsual: number | null;
  isSpike: boolean;
  spikeMagnitude: number | null;
  isClosed: boolean;
  sparkline: SparklinePoint[];
}

interface PizzaData {
  activityScore: number;
  locationCount: number;
  openCount: number;
  spikeCount: number;
  locations: PizzaLocation[];
}

/* ── Level scale ────────────────────────────────────── */

const LEVELS = [
  { min: 0,  label: "NORMAL",   color: "#22c55e" },
  { min: 20, label: "GUARDED",  color: "#84cc16" },
  { min: 40, label: "ELEVATED", color: "#eab308" },
  { min: 60, label: "HIGH",     color: "#f97316" },
  { min: 80, label: "CRITICAL", color: "#ef4444" },
];

function parseLevel(score: number) {
  return [...LEVELS].reverse().find((l) => score >= l.min) ?? LEVELS[0];
}

/* ── Helpers ────────────────────────────────────────── */

/** Get the N sparkline entries closest to the current hour (including it) */
function getNearbyEntries(sparkline: SparklinePoint[], windowSize = 5): SparklinePoint[] {
  if (sparkline.length === 0) return [];
  const now = Date.now();
  // Sort by distance from now
  const sorted = [...sparkline].sort(
    (a, b) => Math.abs(new Date(a.time).getTime() - now) - Math.abs(new Date(b.time).getTime() - now),
  );
  // Take windowSize nearest, then re-sort chronologically
  return sorted.slice(0, windowSize).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

function barColor(pop: number): string {
  if (pop >= 80) return "bg-red-500";
  if (pop >= 60) return "bg-orange-500";
  if (pop >= 40) return "bg-yellow-500";
  if (pop >= 20) return "bg-green-500";
  return "bg-green-700";
}

function formatHour(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" });
  } catch {
    return "";
  }
}

function isCurrentSlot(iso: string): boolean {
  const t = new Date(iso).getTime();
  const now = Date.now();
  // Consider "current" if within ~90 minutes of now
  return Math.abs(t - now) < 90 * 60 * 1000;
}

/* ── Component ──────────────────────────────────────── */

export default function PizzaIndex() {
  const [expanded, setExpanded] = useState(false);

  const { data, isError } = useQuery<PizzaData>({
    queryKey: ["pizza-index"],
    queryFn: () => apiFetch<PizzaData>("/api/pizzaint"),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 9 * 60 * 1000,
    retry: 1,
  });

  if (isError || !data) return null;

  const lvl = parseLevel(data.activityScore);

  return (
    <div className="border-b border-terminal">
      {/* ── Summary row (always visible, clickable) ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 text-left hover:bg-terminal-cyan/5 transition-colors"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-terminal-dim uppercase tracking-widest">
            🍕 Pizza Index
          </span>
          <div className="flex items-center gap-2">
            <a
              href="https://pizzint.watch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] font-mono text-terminal-dim hover:text-terminal-cyan"
              onClick={(e) => e.stopPropagation()}
            >
              pizzint.watch
            </a>
            <span className="text-[9px] text-terminal-dim">{expanded ? "▾" : "▸"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded transition-all duration-1000"
              style={{ width: `${data.activityScore}%`, background: lvl.color }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold" style={{ color: lvl.color }}>
            {data.activityScore.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: lvl.color }}>
            ● {lvl.label}
          </span>
          <span className="text-[9px] font-mono text-terminal-dim">
            {data.spikeCount} spike{data.spikeCount !== 1 ? "s" : ""} · {data.openCount}/{data.locationCount} open
          </span>
        </div>
      </button>

      {/* ── Expanded per-location detail ── */}
      {expanded && data.locations.length > 0 && (
        <div className="px-3 pb-2 space-y-2">
          {data.locations.map((loc) => (
            <LocationRow key={loc.id} location={loc} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Per-location sparkline row ─────────────────────── */

function LocationRow({ location }: { location: PizzaLocation }) {
  const nearby = getNearbyEntries(location.sparkline, 7);

  // Compute average of non-null nearby entries
  const validPops = nearby
    .map((e) => e.popularity)
    .filter((v): v is number => v != null);
  const avgPop = validPops.length > 0
    ? Math.round(validPops.reduce((a, b) => a + b, 0) / validPops.length)
    : null;

  return (
    <div className="bg-terminal/40 rounded px-2 py-1.5">
      {/* Name + status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-gray-300 truncate flex-1">
          {location.name}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {location.isSpike && (
            <span className="text-[8px] font-mono bg-red-500/20 text-red-400 px-1 rounded">
              SPIKE
            </span>
          )}
          <span className={`text-[8px] font-mono px-1 rounded ${
            location.isClosed
              ? "bg-gray-600/30 text-gray-500"
              : "bg-green-500/20 text-green-400"
          }`}>
            {location.isClosed ? "CLOSED" : "OPEN"}
          </span>
        </div>
      </div>

      {/* Sparkline bars — contained, no overflow */}
      {nearby.length > 0 ? (
        <div className="flex items-end gap-0.5 overflow-hidden" style={{ height: 16 }}>
          {nearby.map((entry, i) => {
            const isCurrent = isCurrentSlot(entry.time);
            const pop = entry.popularity;
            const barH = pop != null && pop > 0 ? Math.max(2, Math.round((pop / 100) * 16)) : 1;
            const avgH = avgPop != null && avgPop > 0 ? Math.max(1, Math.round((avgPop / 100) * 16)) : 0;

            return (
              <div key={i} className="flex-1 relative group" style={{ height: 16 }} title={`${formatHour(entry.time)}: ${pop != null ? `${pop}%` : "n/a"}${isCurrent ? " (now)" : ""}`}>
                {/* Average marker */}
                {avgH > 0 && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-sm ${barColor(avgPop!)} opacity-20`}
                    style={{ height: avgH }}
                  />
                )}
                {/* Actual bar */}
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-sm ${
                    pop == null
                      ? "bg-gray-700"
                      : isCurrent
                        ? `${barColor(pop)} opacity-50`
                        : barColor(pop)
                  }`}
                  style={{ height: barH }}
                />
                {/* Current hour marker */}
                {isCurrent && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-terminal-cyan" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[9px] font-mono text-gray-600">No recent data</div>
      )}

      {/* Hour labels row */}
      {nearby.length > 0 && (
        <div className="flex gap-0.5 mt-0.5">
          {nearby.map((entry, i) => (
            <span key={i} className={`flex-1 text-center text-[6px] font-mono leading-none ${
              isCurrentSlot(entry.time) ? "text-terminal-cyan" : "text-gray-600"
            }`}>
              {formatHour(entry.time)}
            </span>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between mt-0.5">
        {avgPop != null ? (
          <span className="text-[8px] font-mono text-terminal-dim">
            avg: {avgPop}%
          </span>
        ) : (
          <span className="text-[8px] font-mono text-gray-600">—</span>
        )}
        {location.currentPopularity != null && (
          <span className="text-[8px] font-mono text-terminal-cyan">
            live: {location.currentPopularity}%
          </span>
        )}
      </div>
    </div>
  );
}
