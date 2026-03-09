import { useState } from "react";
import { useCascade, useCascadeStats } from "../../hooks/useAnalytics";
import type { CascadeImpactLevel } from "../../types";

const IMPACT_COLORS: Record<CascadeImpactLevel, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const PRESETS = [
  { id: "chokepoint:suez", label: "Suez Canal" },
  { id: "chokepoint:hormuz", label: "Strait of Hormuz" },
  { id: "chokepoint:malacca", label: "Malacca Strait" },
  { id: "chokepoint:panama", label: "Panama Canal" },
  { id: "chokepoint:bosphorus", label: "Bosphorus" },
  { id: "chokepoint:bab-el-mandeb", label: "Bab el-Mandeb" },
  { id: "chokepoint:gibraltar", label: "Gibraltar" },
  { id: "chokepoint:taiwan-strait", label: "Taiwan Strait" },
  { id: "chokepoint:dardanelles", label: "Dardanelles" },
];

export default function InfrastructureCascadePanel() {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const { data: stats } = useCascadeStats();
  const { data: cascade, isLoading } = useCascade(selectedSource);

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        🌐 Infrastructure Cascade
        {stats && (
          <span className="ml-1 text-terminal-cyan">
            ({stats.nodes}N/{stats.edges}E)
          </span>
        )}
      </h3>

      {/* Preset chokepoints */}
      <div className="flex flex-wrap gap-1 mb-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedSource(selectedSource === p.id ? null : p.id)}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              selectedSource === p.id
                ? "border-terminal-cyan text-terminal-cyan bg-terminal-cyan/10"
                : "border-terminal text-terminal-dim hover:text-gray-300 hover:border-gray-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!selectedSource ? (
        <div className="text-[10px] text-terminal-dim font-mono">
          Select a chokepoint to simulate disruption
        </div>
      ) : isLoading ? (
        <div className="text-[10px] text-terminal-dim font-mono">Calculating cascade…</div>
      ) : !cascade ? (
        <div className="text-[10px] text-terminal-dim font-mono">No cascade data</div>
      ) : (
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-gray-400 mb-1">
            {cascade.countriesAffected.length} countries affected
          </div>
          {cascade.countriesAffected.slice(0, 8).map((c) => (
            <div
              key={c.country}
              className="flex items-center gap-2 text-[11px] font-mono"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${IMPACT_COLORS[c.impactLevel]}`}
              />
              <span className="text-gray-300 flex-1 truncate">
                {c.countryName || c.country}
              </span>
              <span className="text-[9px] text-terminal-dim uppercase">
                {c.impactLevel}
              </span>
            </div>
          ))}
          {cascade.redundancies.length > 0 && (
            <div className="mt-1 text-[9px] font-mono text-green-500/70">
              ✓ {cascade.redundancies.length} redundant routes available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
