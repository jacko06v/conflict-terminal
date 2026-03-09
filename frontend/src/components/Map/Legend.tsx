import { useState } from "react";
import { EVENT_COLORS, EVENT_LABELS, EventType, VERIFICATION_COLORS } from "../../types";

const EVENT_TYPES = Object.keys(EVENT_COLORS) as EventType[];

export default function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="hidden md:block absolute bottom-20 right-3 z-10">
      {/* Collapsed: compact toggle button */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="glass border border-terminal rounded px-2 py-1 text-[9px] font-mono text-terminal-dim hover:text-gray-300 transition-colors"
        >
          ● Legend
        </button>
      ) : (
        <div className="glass border border-terminal rounded p-2 text-xs font-mono max-h-[280px] overflow-y-auto scrollbar-thin w-[220px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-terminal-dim text-[9px] tracking-wider uppercase">Event Types</span>
            <button
              onClick={() => setOpen(false)}
              className="text-terminal-dim hover:text-gray-300 text-[10px] px-1"
            >✕</button>
          </div>

          {/* 2-column grid for event types */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {EVENT_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EVENT_COLORS[type] }}
                />
                <span className="text-[9px] text-terminal-dim truncate">{EVENT_LABELS[type]}</span>
              </div>
            ))}
          </div>

          {/* Verification */}
          <div className="mt-1.5 pt-1 border-t border-terminal">
            <div className="text-terminal-dim text-[8px] tracking-wider mb-0.5 uppercase">Verification</div>
            <div className="flex gap-3">
              {(["verified", "partial", "unverified"] as const).map((v) => (
                <div key={v} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: VERIFICATION_COLORS[v], opacity: 0.8 }}
                  />
                  <span className="text-[8px] text-terminal-dim capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
