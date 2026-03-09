import { useAppStore } from "../../stores/useAppStore";

const THREAT_COLORS: Record<string, string> = {
  critical: "bg-red-600/20 border-red-500 text-red-400",
  high: "bg-orange-600/20 border-orange-500 text-orange-400",
  medium: "bg-yellow-600/20 border-yellow-500 text-yellow-400",
};

export default function BreakingNewsBanner() {
  const alerts = useAppStore((s) => s.breakingAlerts);
  const dismiss = useAppStore((s) => s.dismissBreakingAlert);

  if (alerts.length === 0) return null;
  const latest = alerts[0];
  const colorClasses = THREAT_COLORS[latest.threat?.level] ?? THREAT_COLORS.medium;

  return (
    <div
      className={`mx-2 mt-1 px-3 py-2 rounded border text-xs font-mono flex items-center justify-between gap-2 animate-pulse ${colorClasses}`}
    >
      <div className="flex-1 min-w-0">
        <span className="uppercase text-[10px] tracking-wider opacity-70 mr-2">
          ⚡ Breaking
        </span>
        <a
          href={latest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline truncate"
        >
          {latest.title}
        </a>
        <span className="text-[10px] text-terminal-dim ml-2">
          — {latest.source}
        </span>
      </div>
      <button
        onClick={() => dismiss(latest.id)}
        className="text-terminal-dim hover:text-white text-sm flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
