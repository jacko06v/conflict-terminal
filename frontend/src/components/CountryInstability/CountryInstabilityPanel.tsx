import { useInstabilityRanking } from "../../hooks/useAnalytics";

const LEVEL_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  elevated: "bg-yellow-500",
  moderate: "bg-blue-500",
  low: "bg-green-500",
};

const TREND_ICONS: Record<string, string> = {
  accelerating: "↑",
  stable: "→",
  decelerating: "↓",
};

export default function CountryInstabilityPanel() {
  const { data, isLoading } = useInstabilityRanking(10);
  const ranking = data?.data ?? [];

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        🌍 Country Instability
      </h3>
      {isLoading ? (
        <div className="text-[10px] text-terminal-dim font-mono">Loading…</div>
      ) : ranking.length === 0 ? (
        <div className="text-[10px] text-terminal-dim font-mono">Collecting data…</div>
      ) : (
        <div className="space-y-1">
          {ranking.map((c) => (
            <div
              key={c.country}
              className="flex items-center gap-2 text-[11px] font-mono"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${LEVEL_COLORS[c.level] ?? "bg-gray-500"}`}
              />
              <span className="text-gray-300 flex-1 truncate capitalize">
                {c.country}
              </span>
              <span className="text-terminal-dim text-[10px]">
                {TREND_ICONS[c.trend] ?? ""}
              </span>
              <span className="text-terminal-cyan tabular-nums w-6 text-right">
                {c.score}
              </span>
              <div className="w-12 h-1 bg-terminal rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${LEVEL_COLORS[c.level] ?? "bg-gray-500"}`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
