import { useAppStore } from "../../stores/useAppStore";
import { useEventDetail } from "../../hooks/useEvents";
import {
  EVENT_COLORS,
  EVENT_LABELS,
  VERIFICATION_COLORS,
  ConflictEvent,
} from "../../types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-terminal/50">
      <span className="text-[10px] text-terminal-dim uppercase tracking-wider flex-shrink-0 w-28">
        {label}
      </span>
      <span className="text-xs font-mono text-gray-200 text-right">{value}</span>
    </div>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ffa500" : "#ff3355";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-terminal-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>
        {score}/100
      </span>
    </div>
  );
}

function NearbyItem({ event }: { event: ConflictEvent }) {
  const setSelectedEventId = useAppStore((s) => s.setSelectedEventId);
  const typeColor = EVENT_COLORS[event.event_type];

  return (
    <button
      onClick={() => setSelectedEventId(event.id)}
      className="w-full text-left p-2 rounded border border-terminal hover:bg-terminal-muted transition-colors"
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: typeColor }}
        />
        <span className="text-[10px] font-mono" style={{ color: typeColor }}>
          {EVENT_LABELS[event.event_type]}
        </span>
      </div>
      <div className="text-[10px] text-gray-300 line-clamp-1">
        {event.title.replace("[DEMO] ", "")}
      </div>
    </button>
  );
}

export default function EventDetailDrawer() {
  const selectedId = useAppStore((s) => s.selectedEventId);
  const setSelectedEventId = useAppStore((s) => s.setSelectedEventId);
  const { data: event, isLoading } = useEventDetail(selectedId);

  if (!selectedId) return null;

  const typeColor = event ? EVENT_COLORS[event.event_type] : "#4a5568";
  const verifyColor = event ? VERIFICATION_COLORS[event.verification_status] : "#4a5568";

  return (
    <div className="fixed inset-y-0 right-80 w-96 bg-terminal-surface border-l border-terminal z-30 flex flex-col shadow-2xl overflow-hidden max-h-screen">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-terminal flex-shrink-0"
        style={{ borderLeftColor: typeColor, borderLeftWidth: 3 }}
      >
        <div>
          <div className="text-[10px] text-terminal-dim uppercase tracking-wider mb-0.5">
            Event Detail
          </div>
          {event && (
            <div
              className="text-xs font-bold font-mono"
              style={{ color: typeColor }}
            >
              {EVENT_LABELS[event.event_type]}
            </div>
          )}
        </div>
        <button
          onClick={() => setSelectedEventId(null)}
          className="text-terminal-dim hover:text-gray-200 transition-colors text-sm px-2"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-terminal-border rounded animate-pulse" />
            ))}
          </div>
        )}

        {event && (
          <>
            {/* Title */}
            <div>
              <div className="text-gray-100 text-sm leading-snug font-mono">
                {event.title.replace("[DEMO] ", "")}
              </div>
            </div>

            {/* Summary */}
            <div className="text-terminal-dim leading-relaxed">
              {event.summary}
            </div>

            {event.description && (
              <div className="text-terminal-dim/80 leading-relaxed text-[10px] border-l-2 border-terminal pl-2">
                {event.description}
              </div>
            )}

            {/* Confidence */}
            <div className="space-y-1">
              <div className="text-[10px] text-terminal-dim uppercase tracking-wider">
                Confidence
              </div>
              <ConfidenceBar score={event.confidence_score} />
            </div>

            {/* Details grid */}
            <div className="space-y-0">
              <InfoRow
                label="Verification"
                value={
                  <span style={{ color: verifyColor }} className="capitalize">
                    {event.verification_status}
                  </span>
                }
              />
              <InfoRow label="Severity" value={`${event.severity} / 5`} />
              <InfoRow
                label="Location"
                value={
                  [event.city, event.region, event.country]
                    .filter(Boolean)
                    .join(", ")
                }
              />
              <InfoRow
                label="Precision"
                value={
                  <span className="capitalize">{event.geolocation_precision}</span>
                }
              />
              <InfoRow
                label="Coordinates"
                value={`${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`}
              />
              {event.location_radius_km && (
                <InfoRow
                  label="Radius"
                  value={`~${event.location_radius_km} km`}
                />
              )}
              <InfoRow
                label="Occurred"
                value={new Date(event.occurred_at).toLocaleString()}
              />
              <InfoRow
                label="First seen"
                value={new Date(event.first_seen_at).toLocaleString()}
              />
              <InfoRow
                label="Sources"
                value={event.sources.length}
              />
            </div>

            {/* Sources */}
            {event.sources.length > 0 && (
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-wider mb-2">
                  Sources
                </div>
                <div className="space-y-2">
                  {event.sources.map((src) => (
                    <div
                      key={src.id}
                      className="p-2 bg-terminal-muted rounded border border-terminal"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-200 text-[11px] font-bold">
                          {src.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1 py-0.5 bg-terminal-border rounded text-terminal-dim capitalize">
                            {src.source_type}
                          </span>
                          <span className="text-[9px] text-terminal-amber">
                            {src.reliability_score}%
                          </span>
                        </div>
                      </div>
                      {src.publisher && (
                        <div className="text-[10px] text-terminal-dim">
                          {src.publisher}
                        </div>
                      )}
                      {src.raw_text && (
                        <div className="mt-1 text-[9px] text-terminal-dim/70 italic line-clamp-2">
                          "{src.raw_text}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby events */}
            {event.nearby && event.nearby.length > 0 && (
              <div>
                <div className="text-[10px] text-terminal-dim uppercase tracking-wider mb-2">
                  Nearby Events (50km)
                </div>
                <div className="space-y-1.5">
                  {event.nearby.map((nearby) => (
                    <NearbyItem key={nearby.id} event={nearby} />
                  ))}
                </div>
              </div>
            )}

            {/* Data disclaimer */}
            <div className="pt-2 border-t border-terminal text-[9px] text-terminal-dim/40 leading-relaxed">
              ⚠ DEMO DATA — Synthetic and not verified. Not for operational use.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
