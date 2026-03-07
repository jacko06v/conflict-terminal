import { ConflictEvent, EVENT_COLORS, EVENT_LABELS, VERIFICATION_COLORS } from "../../types";
import { useAppStore } from "../../stores/useAppStore";

interface Props {
  event: ConflictEvent;
  isLive?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedItem({ event, isLive }: Props) {
  const setSelectedEventId = useAppStore((s) => s.setSelectedEventId);
  const selectedId = useAppStore((s) => s.selectedEventId);
  const isSelected = selectedId === event.id;

  const typeColor = EVENT_COLORS[event.event_type];
  const verifyColor = VERIFICATION_COLORS[event.verification_status];

  return (
    <button
      onClick={() => setSelectedEventId(isSelected ? null : event.id)}
      className={`w-full text-left px-3 py-2.5 border-b border-terminal hover:bg-terminal-muted transition-colors ${
        isSelected ? "bg-terminal-muted border-l-2" : "border-l-2 border-l-transparent"
      }`}
      style={isSelected ? { borderLeftColor: typeColor } : {}}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Event type badge */}
          <span
            className="text-[9px] font-mono font-bold px-1 py-0.5 rounded uppercase tracking-wider"
            style={{
              backgroundColor: typeColor + "20",
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {EVENT_LABELS[event.event_type]}
          </span>

          {/* Verification badge */}
          <span
            className="text-[9px] font-mono px-1 py-0.5 rounded capitalize"
            style={{
              color: verifyColor,
              border: `1px solid ${verifyColor}40`,
            }}
          >
            {event.verification_status}
          </span>

          {isLive && (
            <span className="text-[9px] font-mono text-terminal-red animate-pulse">
              ● NEW
            </span>
          )}
        </div>

        <span className="text-[9px] text-terminal-dim font-mono whitespace-nowrap flex-shrink-0">
          {timeAgo(event.occurred_at)}
        </span>
      </div>

      {/* Title */}
      <div className="text-xs font-mono text-gray-200 leading-snug mb-1 line-clamp-2">
        {event.title.replace("[DEMO] ", "")}
      </div>

      {/* Location + confidence */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-terminal-dim font-mono">
          {[event.city, event.region, event.country].filter(Boolean).join(", ")}
        </div>
        <div className="flex items-center gap-2">
          {event.source_count !== undefined && (
            <span className="text-[9px] text-terminal-dim font-mono">
              {event.source_count} src
            </span>
          )}
          <ConfidenceBar score={event.confidence_score} />
        </div>
      </div>
    </button>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "#00ff88" : score >= 50 ? "#ffa500" : "#ff3355";
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1 bg-terminal-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
