import { useEffect, useState, useCallback, useRef } from "react";
import { useMapLayers } from "./hooks/useEvents";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAppStore } from "./stores/useAppStore";
import Header from "./components/Header/Header";
import MapPanel from "./components/Map/MapPanel";
import LiveFeed from "./components/Feed/LiveFeed";
import StatsCards from "./components/Stats/StatsCards";
import TimelineChart from "./components/Timeline/TimelineChart";
import FiltersPanel from "./components/Filters/FiltersPanel";
import EventDetailDrawer from "./components/EventDetail/EventDetailDrawer";

const MIN_TIMELINE_H = 80;
const MAX_TIMELINE_H = 400;
const DEFAULT_TIMELINE_H = 112;

export default function App() {
  const { data: layers } = useMapLayers();
  const setLayers = useAppStore((s) => s.setLayers);
  const filtersOpen = useAppStore((s) => s.filtersOpen);

  // ── Draggable timeline height ────────────────────────────────────────────
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE_H);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = timelineHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [timelineHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - e.clientY;
      const next = Math.min(MAX_TIMELINE_H, Math.max(MIN_TIMELINE_H, startH.current + delta));
      setTimelineHeight(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useWebSocket();

  useEffect(() => {
    if (layers) setLayers(layers);
  }, [layers, setLayers]);

  return (
    <div className="flex flex-col h-screen bg-terminal overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Filters sidebar */}
        {filtersOpen && (
          <aside className="w-72 flex-shrink-0 bg-terminal-surface border-r border-terminal overflow-y-auto z-10">
            <FiltersPanel />
          </aside>
        )}

        {/* Map - central */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <StatsCards />
          <div className="flex-1 relative">
            <MapPanel />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="h-1.5 flex-shrink-0 cursor-row-resize bg-terminal-surface border-y border-terminal hover:bg-terminal-cyan/20 transition-colors group flex items-center justify-center"
          >
            <div className="w-10 h-0.5 rounded bg-terminal-dim/40 group-hover:bg-terminal-cyan/60 transition-colors" />
          </div>

          <div style={{ height: timelineHeight }} className="flex-shrink-0">
            <TimelineChart />
          </div>
        </main>

        {/* Right: Live feed */}
        <aside className="w-80 flex-shrink-0 bg-terminal-surface border-l border-terminal overflow-hidden flex flex-col">
          <LiveFeed />
        </aside>
      </div>

      <EventDetailDrawer />
    </div>
  );
}
