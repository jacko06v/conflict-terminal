import { useFocalPoints } from "../../hooks/useAnalytics";
import type { FocalPointUrgency } from "../../types";

const URGENCY_COLORS: Record<FocalPointUrgency, string> = {
  critical: "border-red-500/60 bg-red-500/5",
  elevated: "border-orange-500/50 bg-orange-500/5",
  watch: "border-terminal-dim/30 bg-transparent",
};

const URGENCY_BADGE: Record<FocalPointUrgency, string> = {
  critical: "bg-red-500/20 text-red-400",
  elevated: "bg-orange-500/20 text-orange-400",
  watch: "bg-gray-500/20 text-terminal-dim",
};

export default function FocalPointsPanel() {
  const { data, isLoading } = useFocalPoints();
  const focalPoints = data?.focalPoints ?? [];

  // Show top 5 by score
  const top = [...focalPoints]
    .sort((a, b) => b.focalScore - a.focalScore)
    .slice(0, 5);

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        🎯 Intelligence Focal Points
      </h3>
      {isLoading ? (
        <div className="text-[10px] text-terminal-dim font-mono">Loading…</div>
      ) : top.length === 0 ? (
        <div className="text-[10px] text-terminal-dim font-mono">No focal points detected</div>
      ) : (
        <div className="space-y-1.5">
          {top.map((fp) => (
            <div
              key={fp.id}
              className={`rounded border px-2 py-1.5 ${URGENCY_COLORS[fp.urgency]}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`text-[9px] font-mono uppercase px-1 py-px rounded ${URGENCY_BADGE[fp.urgency]}`}
                >
                  {fp.urgency}
                </span>
                <span className="text-[11px] font-mono text-gray-200 truncate flex-1">
                  {fp.displayName}
                </span>
                <span className="text-[10px] text-terminal-cyan tabular-nums">
                  {fp.focalScore.toFixed(0)}
                </span>
              </div>
              <p className="text-[10px] font-mono text-terminal-dim leading-tight line-clamp-2">
                {fp.narrative}
              </p>
              {fp.topHeadlines.length > 0 && (
                <p className="text-[9px] font-mono text-gray-500 mt-0.5 truncate">
                  → {fp.topHeadlines[0].title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
