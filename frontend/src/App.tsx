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
import RiskGauge from "./components/RiskGauge/RiskGauge";
import PizzaIndex from "./components/PizzaIndex/PizzaIndex";
import LiveWebcams from "./components/LiveWebcams/LiveWebcams";
import NewsSection from "./components/LiveNews/NewsSection";
import BreakingNewsBanner from "./components/BreakingNews/BreakingNewsBanner";
import TrendingKeywords from "./components/TrendingKeywords/TrendingKeywords";
import CountryInstabilityPanel from "./components/CountryInstability/CountryInstabilityPanel";
import NewsClusters from "./components/NewsClusters/NewsClusters";
import ConvergencePanel from "./components/Convergence/ConvergencePanel";
import HotspotEscalationPanel from "./components/Escalation/HotspotEscalationPanel";
import FocalPointsPanel from "./components/FocalPoints/FocalPointsPanel";
import InfrastructureCascadePanel from "./components/Cascade/InfrastructureCascadePanel";

const MIN_TIMELINE_H = 80;
const MAX_TIMELINE_H = 400;
const DEFAULT_TIMELINE_H = 112;

//just to check if someone is using the website
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function usePageView() {
  useEffect(() => {
    fetch(`${API_BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer }),
    }).catch(() => {});
  }, []);
}

function scrollToNews() {
  document.getElementById("live-news")?.scrollIntoView({ behavior: "smooth" });
}

export default function App() {
  usePageView();
  const { data: layers } = useMapLayers();
  const setLayers = useAppStore((s) => s.setLayers);
  const filtersOpen = useAppStore((s) => s.filtersOpen);
  const setFiltersOpen = useAppStore((s) => s.setFiltersOpen);
  const [mobileTab, setMobileTab] = useState<"map" | "feed">("map");
  const [webcamsOpen, setWebcamsOpen] = useState(false);

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
    // Outer wrapper: scrollable, no fixed height
    <div className="flex flex-col bg-terminal">

      {/* ── Main dashboard — exactly 100dvh ─────────────────────────────── */}
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        <Header onLiveClick={() => setWebcamsOpen(true)} onNewsClick={scrollToNews} />

        {/* Mobile filters — full screen overlay */}
        {filtersOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-terminal-surface overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-terminal">
              <span className="text-xs font-mono text-terminal-dim uppercase tracking-wider">Filters</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-terminal-dim hover:text-gray-200 text-sm px-2"
              >✕</button>
            </div>
            <FiltersPanel />
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop filters sidebar */}
          {filtersOpen && (
            <aside className="hidden md:block w-72 flex-shrink-0 bg-terminal-surface border-r border-terminal overflow-y-auto z-10">
              <FiltersPanel />
            </aside>
          )}

          {/* Main content area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <BreakingNewsBanner />
            <StatsCards />

            {/* Map — always mounted, hidden on mobile when feed tab active */}
            <div className={`flex-1 relative ${mobileTab === "feed" ? "hidden md:block md:flex-1" : ""}`}>
              <MapPanel />
            </div>

            {/* Mobile feed tab */}
            {mobileTab === "feed" && (
              <div className="flex-1 overflow-hidden flex flex-col md:hidden">
                <LiveFeed />
              </div>
            )}

            {/* Desktop drag handle + timeline */}
            <div
              onMouseDown={onDragStart}
              className="hidden md:flex h-1.5 flex-shrink-0 cursor-row-resize bg-terminal-surface border-y border-terminal hover:bg-terminal-cyan/20 transition-colors group items-center justify-center"
            >
              <div className="w-10 h-0.5 rounded bg-terminal-dim/40 group-hover:bg-terminal-cyan/60 transition-colors" />
            </div>

            <div style={{ height: timelineHeight }} className="hidden md:block flex-shrink-0">
              <TimelineChart />
            </div>
          </main>

          {/* Desktop right feed sidebar */}
          <aside className="hidden md:flex w-80 flex-shrink-0 bg-terminal-surface border-l border-terminal overflow-y-auto flex-col">
            <RiskGauge />
            <PizzaIndex />
            <TrendingKeywords />
            <LiveFeed />
          </aside>
        </div>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden flex border-t border-terminal bg-terminal-surface flex-shrink-0 safe-bottom">
          <button
            onClick={() => setMobileTab("map")}
            className={`flex-1 py-3 text-[11px] font-mono uppercase tracking-wider flex flex-col items-center gap-0.5 transition-colors ${
              mobileTab === "map" ? "text-terminal-green" : "text-terminal-dim"
            }`}
          >
            <span className="text-base leading-none">◉</span>
            <span>Map</span>
          </button>
          <button
            onClick={() => setMobileTab("feed")}
            className={`flex-1 py-3 text-[11px] font-mono uppercase tracking-wider flex flex-col items-center gap-0.5 transition-colors ${
              mobileTab === "feed" ? "text-terminal-green" : "text-terminal-dim"
            }`}
          >
            <span className="text-base leading-none">≡</span>
            <span>Feed</span>
          </button>
          <button
            onClick={scrollToNews}
            className="flex-1 py-3 text-[11px] font-mono uppercase tracking-wider flex flex-col items-center gap-0.5 transition-colors text-terminal-dim hover:text-red-400"
          >
            <span className="text-base leading-none">📺</span>
            <span>News</span>
          </button>
        </nav>
      </div>

      {/* ── Analytics & News — below the fold ─────────────────────────── */}
      <section className="bg-terminal border-t border-terminal">
        {/* Section header */}
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-wider">
            Intelligence & Analytics
          </h2>
        </div>

        {/* Analytics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-terminal mx-4 mb-4 border border-terminal rounded overflow-hidden">
          <div className="bg-terminal-surface">
            <HotspotEscalationPanel />
          </div>
          <div className="bg-terminal-surface">
            <FocalPointsPanel />
          </div>
          <div className="bg-terminal-surface">
            <InfrastructureCascadePanel />
          </div>
          <div className="bg-terminal-surface">
            <CountryInstabilityPanel />
          </div>
          <div className="bg-terminal-surface">
            <ConvergencePanel />
          </div>
          <div className="bg-terminal-surface">
            <NewsClusters />
          </div>
        </div>
      </section>

      {/* ── Live news section ───────────────────────────────────────────── */}
      <NewsSection />

      <EventDetailDrawer />
      {webcamsOpen && <LiveWebcams onClose={() => setWebcamsOpen(false)} />}
    </div>
  );
}
