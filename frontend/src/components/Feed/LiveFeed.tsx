import { useEffect, useRef } from "react";
import { useEvents } from "../../hooks/useEvents";
import { useAppStore } from "../../stores/useAppStore";
import { ConflictEvent } from "../../types";
import FeedItem from "./FeedItem";

export default function LiveFeed() {
  const { data: events, isLoading, isError } = useEvents();
  const liveEvents = useAppStore((s) => s.liveEvents);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Merge: live events on top, then API events (deduplicated)
  const allEvents: ConflictEvent[] = [
    ...(liveEvents ?? []),
    ...(events ?? []).filter((e) => !liveEvents.find((l) => l.id === e.id)),
  ];

  // Auto-scroll to top when new live event arrives
  useEffect(() => {
    if (liveEvents.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [liveEvents.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-red animate-pulse" />
          <span className="text-[11px] font-mono text-terminal-dim uppercase tracking-wider">
            Live Feed
          </span>
        </div>
        <span className="text-[10px] font-mono text-terminal-dim">
          {allEvents.length} events
        </span>
      </div>

      {/* Feed list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 bg-terminal-border rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-terminal-border rounded animate-pulse w-full" />
                <div className="h-2 bg-terminal-border rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-4 text-center text-terminal-red text-xs font-mono">
            <div className="mb-1">⚠ FEED ERROR</div>
            <div className="text-terminal-dim">Cannot reach API</div>
          </div>
        )}

        {!isLoading && !isError && allEvents.length === 0 && (
          <div className="p-4 text-center text-terminal-dim text-xs font-mono">
            <div className="mb-1">NO EVENTS</div>
            <div>Adjust filters or wait for ingestion</div>
          </div>
        )}

        {!isLoading && allEvents.map((event) => (
          <FeedItem
            key={event.id}
            event={event}
            isLive={liveEvents.some((l) => l.id === event.id)}
          />
        ))}
      </div>
    </div>
  );
}
