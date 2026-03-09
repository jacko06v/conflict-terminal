import { useState } from "react";

interface Channel {
  id: string;
  name: string;
  region: string;
  lang: string;
}

const CHANNELS: Channel[] = [
  { id: "gCNeDWCI0vo", name: "Al Jazeera English",  region: "Middle East", lang: "EN" },
  { id: "bNyUyrR0PHo", name: "Al Jazeera Arabic",   region: "Middle East", lang: "AR" },
  { id: "n7eQejkXbnM", name: "Al Arabiya",           region: "Middle East", lang: "AR" },
  { id: "U--OjmpjF5o", name: "Sky News Arabia",      region: "Middle East", lang: "AR" },
  { id: "myKybZUK0IA", name: "i24 News",             region: "Middle East", lang: "EN" },
  { id: "TCnaIE_SAtM", name: "Kan 11 (Israel)",      region: "Middle East", lang: "HE" },
  { id: "ABfFhWzWs0s", name: "TRT World",            region: "Global",     lang: "EN" },
  { id: "5RJ6_NMJASM", name: "France 24 English",    region: "Global",     lang: "EN" },
  { id: "IojZDaoBz58", name: "DW News",              region: "Global",     lang: "EN" },
  { id: "luqeG7ib_BQ", name: "BBC News",             region: "Global",     lang: "EN" },
  { id: "h3MuIUNCCLI", name: "CNN International",    region: "Global",     lang: "EN" },
];

const REGIONS = ["All", "Middle East", "Global"];

interface Props {
  onClose: () => void;
}

export default function LiveNews({ onClose }: Props) {
  const [region, setRegion] = useState("Middle East");
  const [focused, setFocused] = useState<string | null>(null);

  const filtered = region === "All" ? CHANNELS : CHANNELS.filter((c) => c.region === region);
  const gridChannels = focused ? CHANNELS.filter((c) => c.id === focused) : filtered.slice(0, 4);
  const sideChannels = focused ? filtered : filtered.slice(4);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div
        className="flex flex-col w-full h-full max-w-6xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-terminal bg-terminal-surface flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-terminal-green font-mono font-bold text-sm tracking-widest">LIVE NEWS</span>
            </div>
            <div className="flex gap-1">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRegion(r); setFocused(null); }}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    region === r
                      ? "bg-terminal-green/20 text-terminal-green border border-terminal-green/30"
                      : "text-terminal-dim hover:text-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-terminal-dim hover:text-gray-200 text-sm px-2 py-1 font-mono"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Main grid */}
        <div className="flex flex-1 overflow-hidden">
          <div
            className={`grid gap-0.5 flex-1 bg-black ${
              focused
                ? "grid-cols-1 grid-rows-1"
                : gridChannels.length === 1
                ? "grid-cols-1"
                : gridChannels.length <= 2
                ? "grid-cols-2 grid-rows-1"
                : "grid-cols-2 grid-rows-2"
            }`}
          >
            {gridChannels.map((ch) => (
              <div key={ch.id} className="relative bg-black group">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ch.id}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={ch.name}
                />
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-mono text-white">{ch.name}</span>
                  <div className="flex gap-1">
                    <span className="text-[9px] font-mono text-terminal-dim border border-terminal-dim/30 px-1 rounded">{ch.lang}</span>
                    <button
                      onClick={() => setFocused(focused === ch.id ? null : ch.id)}
                      className="text-[10px] font-mono text-terminal-cyan hover:text-white px-1"
                    >
                      {focused === ch.id ? "⊡" : "⊞"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Side channel strip (desktop) */}
          {sideChannels.length > 0 && !focused && (
            <div className="hidden lg:flex flex-col w-48 flex-shrink-0 bg-terminal-surface border-l border-terminal overflow-y-auto">
              <div className="text-[9px] font-mono text-terminal-dim uppercase tracking-wider px-3 py-2 border-b border-terminal">
                More channels
              </div>
              {sideChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setFocused(ch.id)}
                  className="flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 border-b border-terminal/50 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-gray-300 truncate">{ch.name}</div>
                    <div className="text-[9px] font-mono text-terminal-dim">{ch.lang}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
