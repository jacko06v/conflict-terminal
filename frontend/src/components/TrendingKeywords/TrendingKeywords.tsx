import { useAppStore } from "../../stores/useAppStore";
import { useTrending } from "../../hooks/useAnalytics";

export default function TrendingKeywords() {
  const wsSpikes = useAppStore((s) => s.trendingSpikes);
  const { data } = useTrending();
  const spikes = wsSpikes.length > 0 ? wsSpikes : data?.data ?? [];

  if (spikes.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-terminal">
      <h3 className="text-[10px] font-mono text-terminal-dim uppercase tracking-wider mb-1.5">
        ▲ Trending
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {spikes.slice(0, 8).map((spike) => (
          <span
            key={spike.term}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-terminal-cyan/10 text-terminal-cyan border border-terminal-cyan/20"
            title={`${spike.count} mentions across ${spike.uniqueSources} sources (baseline: ${spike.baseline.toFixed(1)})`}
          >
            {spike.term}
            <span className="text-[9px] text-terminal-dim">×{spike.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
