import { useEscalation } from "../../hooks/useAnalytics";
import type { EscalationTrend } from "../../types";

const TREND_COLORS: Record<EscalationTrend, string> = {
  escalating: "text-red-400",
  "de-escalating": "text-green-400",
  stable: "text-terminal-dim",
};

const TREND_ICONS: Record<EscalationTrend, string> = {
  escalating: "▲",
  "de-escalating": "▼",
  stable: "●",
};

function scoreColor(score: number): string {
  if (score >= 4) return "bg-red-500";
  if (score >= 3) return "bg-orange-500";
  if (score >= 2) return "bg-yellow-500";
  return "bg-green-500";
}

export default function HotspotEscalationPanel() {
  const { data, isLoading } = useEscalation();
  const scores = data ?? [];

  // Sort by combined score descending — only show top 8
  const sorted = [...scores]
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 8);

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        🔥 Hotspot Escalation
      </h3>
      {isLoading ? (
        <div className="text-[10px] text-terminal-dim font-mono">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-[10px] text-terminal-dim font-mono">No escalation data yet</div>
      ) : (
        <div className="space-y-1">
          {sorted.map((h) => (
            <div
              key={h.hotspotId}
              className="flex items-center gap-2 text-[11px] font-mono"
            >
              <span className={`text-[10px] ${TREND_COLORS[h.trend]}`}>
                {TREND_ICONS[h.trend]}
              </span>
              <span className="text-gray-300 flex-1 truncate">{h.name}</span>
              <span className="text-terminal-cyan tabular-nums w-7 text-right">
                {h.combinedScore.toFixed(1)}
              </span>
              <div className="w-14 h-1 bg-terminal rounded-full overflow-hidden flex">
                {/* 5-segment bar */}
                {[1, 2, 3, 4, 5].map((seg) => (
                  <div
                    key={seg}
                    className={`h-full flex-1 ${
                      h.combinedScore >= seg
                        ? scoreColor(seg)
                        : "bg-terminal"
                    } ${seg < 5 ? "mr-px" : ""}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
