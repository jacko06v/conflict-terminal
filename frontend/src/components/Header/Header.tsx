import { useState, useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";

export default function Header({ onLiveClick, onNewsClick }: { onLiveClick?: () => void; onNewsClick?: () => void }) {
  const filtersOpen = useAppStore((s) => s.filtersOpen);
  const setFiltersOpen = useAppStore((s) => s.setFiltersOpen);
  const [time, setTime] = useState(new Date());
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track WS connection state via store liveEvents as proxy
  const liveEvents = useAppStore((s) => s.liveEvents);
  useEffect(() => {
    if (liveEvents.length > 0) setWsConnected(true);
  }, [liveEvents]);

  const utcTime = time.toUTCString().replace("GMT", "UTC");

  return (
    <header className="bg-terminal-surface border-b border-terminal px-3 md:px-4 py-2 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left: logo + nav */}
      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-terminal-green font-mono font-bold text-sm tracking-widest">
            ▲ CONFLICT
          </span>
          <span className="text-terminal-dim font-mono text-sm tracking-widest">
            TERMINAL
          </span>
        </div>

        <nav className="flex items-center gap-2 md:gap-4 text-xs text-terminal-dim font-mono">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 hover:text-terminal-cyan transition-colors px-2 py-1 rounded border ${
              filtersOpen
                ? "border-terminal-cyan/30 text-terminal-cyan"
                : "border-transparent"
            }`}
          >
            <span>⚙</span>
            <span>FILTERS</span>
          </button>
          <span className="hidden md:inline text-terminal-dim/40">|</span>
          <span className="hidden md:inline text-terminal-dim">MIDDLE EAST / IRAN</span>
          <span className="hidden md:inline text-terminal-dim/40">|</span>
          <button
            onClick={onLiveClick}
            className="hidden md:flex items-center gap-1 hover:text-red-400 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400">LIVE</span>
          </button>
          <span className="hidden md:inline text-terminal-dim/40">|</span>
          <button
            onClick={onNewsClick}
            className="hidden md:flex items-center gap-1 hover:text-terminal-amber transition-colors"
          >
            <span className="text-terminal-dim">📺</span>
            <span className="text-terminal-dim">NEWS</span>
          </button>
        </nav>
      </div>

      {/* Right: status indicators */}
      <div className="flex items-center gap-3 md:gap-5 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wsConnected ? "bg-terminal-green animate-pulse" : "bg-terminal-dim"
            }`}
          />
          <span className={wsConnected ? "text-terminal-green" : "text-terminal-dim"}>
            {wsConnected ? "LIVE" : "—"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-terminal-dim">
          <span className="hidden md:inline text-terminal-dim/60">UTC</span>
          <span className="text-terminal-amber tabular-nums">
            {time.toISOString().slice(11, 19)}
          </span>
        </div>

        <a
          href="https://github.com/jacko06v/conflict-terminal"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border border-terminal-cyan/30 text-terminal-cyan hover:bg-terminal-cyan/10 transition-colors text-xs"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>GITHUB</span>
        </a>
      </div>
    </header>
  );
}
