import { useState } from "react";

interface Cam {
  id: string;
  label: string;
  videoId: string;
  region: Region;
}

type Region = "me" | "europe" | "americas" | "asia" | "space";

const CAMS: Cam[] = [
  // Middle East
  { id: "tehran",    label: "Tehran",     videoId: "-zGuR1qVKrU", region: "me" },
  { id: "telaviv",   label: "Tel Aviv",   videoId: "gmtlJ_m2r5A", region: "me" },
  { id: "jerusalem", label: "Jerusalem",  videoId: "fIurYTprwzg", region: "me" },
  { id: "mecca",     label: "Mecca",      videoId: "Cm1v4bteXbI", region: "me" },
  { id: "beirut",    label: "Beirut",     videoId: "djF-Lkgfp6k", region: "me" },
  // Europe
  { id: "kyiv",      label: "Kyiv",       videoId: "-Q7FuPINDjA", region: "europe" },
  { id: "odessa",    label: "Odessa",     videoId: "e2gC37ILQmk", region: "europe" },
  { id: "paris",     label: "Paris",      videoId: "OzYp4NRZlwQ", region: "europe" },
  { id: "london",    label: "London",     videoId: "Lxqcg1qt0XU", region: "europe" },
  { id: "spb",       label: "St. Petersburg", videoId: "CjtIYbmVfck", region: "europe" },
  // Americas
  { id: "dc",        label: "Washington DC", videoId: "1wV9lLe14aU", region: "americas" },
  { id: "nyc",       label: "New York",   videoId: "4qyZLflp-sI", region: "americas" },
  // Asia
  { id: "taipei",    label: "Taipei",     videoId: "z_fY1pj1VBw", region: "asia" },
  { id: "tokyo",     label: "Tokyo",      videoId: "4pu9sF5Qssw", region: "asia" },
  { id: "seoul",     label: "Seoul",      videoId: "-JhoMGoAfFc", region: "asia" },
  // Space
  { id: "iss",       label: "ISS",        videoId: "vytmBNhc9ig", region: "space" },
  { id: "nasatv",    label: "NASA TV",    videoId: "zPH5KtjJFaQ", region: "space" },
];

const REGIONS: { key: Region | "all"; label: string }[] = [
  { key: "all",      label: "ALL" },
  { key: "me",       label: "MID EAST" },
  { key: "europe",   label: "EUROPE" },
  { key: "americas", label: "AMERICAS" },
  { key: "asia",     label: "ASIA" },
  { key: "space",    label: "SPACE" },
];

interface Props {
  onClose: () => void;
}

export default function LiveWebcams({ onClose }: Props) {
  const [region, setRegion]   = useState<Region | "all">("me");
  const [focused, setFocused] = useState<string | null>(null);

  const visible = region === "all" ? CAMS : CAMS.filter((c) => c.region === region);
  const display = focused ? CAMS.filter((c) => c.id === focused) : visible.slice(0, 4);

  function embedUrl(videoId: string) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&modestbranding=1&playsinline=1&rel=0`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-950 border-b border-green-900 flex items-center justify-between px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">◉ Live Feeds</span>
          <div className="flex gap-1">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => { setRegion(r.key); setFocused(null); }}
                className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wide transition-colors ${
                  region === r.key
                    ? "bg-green-900 text-green-300"
                    : "text-green-700 hover:text-green-400"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-green-700 hover:text-green-300 font-mono text-sm">✕</button>
      </div>

      {/* Camera grid */}
      <div className={`flex-1 grid gap-0.5 p-0.5 overflow-hidden ${
        display.length === 1 ? "grid-cols-1" :
        display.length <= 2 ? "grid-cols-2" :
        "grid-cols-2"
      }`}>
        {display.map((cam) => (
          <div key={cam.id} className="relative bg-black group">
            <iframe
              src={embedUrl(cam.videoId)}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-mono text-green-300 uppercase">{cam.label}</span>
              <button
                onClick={() => setFocused(focused === cam.id ? null : cam.id)}
                className="text-[9px] font-mono text-green-500 hover:text-green-300"
              >
                {focused === cam.id ? "⊠" : "⊞"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Channel strip */}
      {!focused && visible.length > 4 && (
        <div className="bg-gray-950 border-t border-green-900 flex gap-1 px-2 py-1.5 overflow-x-auto flex-shrink-0">
          {visible.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setFocused(cam.id)}
              className="text-[9px] font-mono text-green-700 hover:text-green-300 whitespace-nowrap px-2 py-0.5 rounded border border-green-900 hover:border-green-700 transition-colors"
            >
              {cam.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
