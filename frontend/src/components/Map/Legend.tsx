import { EVENT_COLORS, EVENT_LABELS, EventType, VERIFICATION_COLORS } from "../../types";

const EVENT_TYPES = Object.keys(EVENT_COLORS) as EventType[];

export default function Legend() {
  return (
    <div className="absolute bottom-20 right-3 glass border border-terminal rounded p-3 z-10 text-xs font-mono">
      <div className="text-terminal-dim text-[10px] tracking-wider mb-2 uppercase">
        Event Types
      </div>
      <div className="space-y-1.5">
        {EVENT_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: EVENT_COLORS[type] }}
            />
            <span className="text-terminal-dim">{EVENT_LABELS[type]}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-terminal">
        <div className="text-terminal-dim text-[10px] tracking-wider mb-1.5 uppercase">
          Verification
        </div>
        <div className="space-y-1">
          {(["verified", "partial", "unverified"] as const).map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: VERIFICATION_COLORS[v], opacity: 0.8 }}
              />
              <span className="text-terminal-dim capitalize">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-terminal text-[9px] text-terminal-dim/50">
        Ring = approximate location
      </div>
    </div>
  );
}
