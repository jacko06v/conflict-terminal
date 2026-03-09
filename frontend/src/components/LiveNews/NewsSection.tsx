const CHANNELS = [
  { id: "gCNeDWCI0vo", name: "Al Jazeera English",  lang: "EN" },
  { id: "bNyUyrR0PHo", name: "Al Jazeera Arabic",   lang: "AR" },
  { id: "n7eQejkXbnM", name: "Al Arabiya",           lang: "AR" },
  { id: "U--OjmpjF5o", name: "Sky News Arabia",      lang: "AR" },
  { id: "myKybZUK0IA", name: "i24 News",             lang: "EN" },
  { id: "TCnaIE_SAtM", name: "Kan 11",               lang: "HE" },
  { id: "ABfFhWzWs0s", name: "TRT World",            lang: "EN" },
  { id: "5RJ6_NMJASM", name: "France 24",            lang: "EN" },
  { id: "IojZDaoBz58", name: "DW News",              lang: "EN" },
  { id: "luqeG7ib_BQ", name: "BBC News",             lang: "EN" },
  { id: "h3MuIUNCCLI", name: "CNN International",    lang: "EN" },
];

export default function NewsSection() {
  return (
    <section id="live-news" className="bg-terminal border-t-2 border-terminal-green/30">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-terminal bg-terminal-surface sticky top-0 z-10">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-terminal-green font-mono font-bold text-sm tracking-widest">LIVE NEWS</span>
        <span className="text-terminal-dim font-mono text-xs">{CHANNELS.length} channels</span>
        <span className="ml-auto text-terminal-dim font-mono text-[10px] hidden md:inline">
          ↑ scroll up for map
        </span>
      </div>

      {/* Grid of all channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0.5 bg-black p-0.5">
        {CHANNELS.map((ch) => (
          <div key={ch.id} className="flex flex-col bg-terminal-surface">
            {/* 16:9 iframe wrapper */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ch.id}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                loading="lazy"
                title={ch.name}
              />
            </div>
            {/* Channel label */}
            <div className="flex items-center gap-2 px-2 py-1.5 border-t border-terminal flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-mono text-gray-300 truncate flex-1">{ch.name}</span>
              <span className="text-[9px] font-mono text-terminal-dim border border-terminal-dim/30 px-1 rounded flex-shrink-0">
                {ch.lang}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
