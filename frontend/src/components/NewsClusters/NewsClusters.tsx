import { useState } from "react";
import { useClusters } from "../../hooks/useAnalytics";

const TIER_BADGE: Record<number, string> = {
  1: "bg-green-500/20 text-green-400",
  2: "bg-blue-500/20 text-blue-400",
  3: "bg-yellow-500/20 text-yellow-400",
  4: "bg-gray-500/20 text-gray-400",
};

export default function NewsClusters() {
  const { data, isLoading } = useClusters(2);
  const clusters = data?.data ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading || clusters.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        📰 Story Clusters ({clusters.length})
      </h3>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
        {clusters.slice(0, 12).map((cluster) => {
          const isExpanded = expandedId === cluster.id;
          return (
            <div
              key={cluster.id}
              className="text-[11px] font-mono bg-terminal/40 rounded overflow-hidden"
            >
              {/* Header — clickable */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : cluster.id)}
                className="w-full text-left px-2 py-1.5 hover:bg-terminal-cyan/5 transition-colors"
              >
                <div className="flex items-start gap-1.5">
                  <span
                    className={`inline-flex px-1 py-0 rounded text-[9px] flex-shrink-0 ${TIER_BADGE[cluster.bestTier] ?? TIER_BADGE[4]}`}
                  >
                    T{cluster.bestTier}
                  </span>
                  <span className="text-gray-300 leading-snug line-clamp-2 flex-1">
                    {cluster.headline}
                  </span>
                  <span className="text-[9px] text-terminal-dim flex-shrink-0 mt-0.5">
                    {isExpanded ? "▾" : "▸"} {cluster.articles.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-terminal-dim">
                  <span>{cluster.articles.length} articles</span>
                  <span>·</span>
                  <span>{cluster.sources.slice(0, 3).join(", ")}</span>
                </div>
              </button>

              {/* Expanded article list */}
              {isExpanded && (
                <div className="border-t border-terminal/50 px-2 py-1 space-y-1 bg-terminal/30">
                  {cluster.articles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-start gap-1.5 text-[10px]"
                    >
                      <span
                        className={`inline-flex px-0.5 rounded text-[8px] flex-shrink-0 mt-0.5 ${TIER_BADGE[article.tier] ?? TIER_BADGE[4]}`}
                      >
                        T{article.tier}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 leading-snug line-clamp-2">
                          {article.title}
                        </p>
                        <span className="text-[9px] text-terminal-dim">
                          {article.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
