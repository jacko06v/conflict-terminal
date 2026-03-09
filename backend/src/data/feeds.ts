/**
 * 4-tier RSS feed registry adapted from worldmonitor.
 * Tier 1 = wire services (highest credibility)
 * Tier 2 = major newspapers / broadcasters
 * Tier 3 = specialist / regional
 * Tier 4 = aggregators / blogs
 */

export interface FeedEntry {
  name: string;
  url: string;
  tier: number;     // 1-4 credibility tier
  region: string;   // feed category
  lang?: string;    // ISO 639-1 if non-English
}

export const FEED_REGISTRY: FeedEntry[] = [
  // ─── Tier 1: Wire services ───────────────────────────────────────────────
  { name: "Reuters", url: "https://news.google.com/rss/search?q=site:reuters.com+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 1, region: "worldwide" },
  { name: "AP News", url: "https://news.google.com/rss/search?q=site:apnews.com+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 1, region: "worldwide" },
  { name: "AFP", url: "https://news.google.com/rss/search?q=site:france24.com+AFP+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 1, region: "worldwide" },

  // ─── Tier 2: Major broadcasters ──────────────────────────────────────────
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", tier: 2, region: "worldwide" },
  { name: "BBC Middle East", url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", tier: 2, region: "middleeast" },
  { name: "BBC Asia", url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", tier: 2, region: "asia" },
  { name: "BBC Africa", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", tier: 2, region: "africa" },
  { name: "BBC Latin America", url: "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml", tier: 2, region: "latam" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", tier: 2, region: "middleeast" },
  { name: "CNN", url: "https://news.google.com/rss/search?q=site:cnn.com+world+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "worldwide" },
  { name: "Guardian World", url: "https://www.theguardian.com/world/rss", tier: 2, region: "worldwide" },
  { name: "Guardian ME", url: "https://www.theguardian.com/world/middleeast/rss", tier: 2, region: "middleeast" },
  { name: "Guardian Americas", url: "https://www.theguardian.com/world/americas/rss", tier: 2, region: "latam" },
  { name: "NPR", url: "https://feeds.npr.org/1004/rss.xml", tier: 2, region: "us" },
  { name: "France 24", url: "https://www.france24.com/en/rss", tier: 2, region: "worldwide" },
  { name: "ABC News Intl", url: "https://abcnews.go.com/abcnews/internationalheadlines", tier: 2, region: "worldwide" },

  // ─── Tier 2: Major newspapers ────────────────────────────────────────────
  { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", tier: 2, region: "middleeast" },
  { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss", tier: 2, region: "middleeast" },
  { name: "Washington Post", url: "https://news.google.com/rss/search?q=site:washingtonpost.com+world+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "us" },
  { name: "NY Times", url: "https://news.google.com/rss/search?q=site:nytimes.com+world+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "us" },
  { name: "Financial Times", url: "https://www.ft.com/rss/home", tier: 2, region: "worldwide" },
  { name: "Le Monde", url: "https://www.lemonde.fr/en/rss/une.xml", tier: 2, region: "europe" },
  { name: "DW News", url: "https://rss.dw.com/xml/rss-en-all", tier: 2, region: "europe" },
  { name: "South China Morning Post", url: "https://news.google.com/rss/search?q=site:scmp.com+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "asia" },
  { name: "Haaretz", url: "https://news.google.com/rss/search?q=site:haaretz.com+when:7d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "middleeast" },

  // ─── Tier 2: Defense / Intelligence ──────────────────────────────────────
  { name: "Defense One", url: "https://www.defenseone.com/rss/", tier: 2, region: "defense" },
  { name: "The War Zone", url: "https://news.google.com/rss/search?q=site:thedrive.com/the-war-zone+when:3d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "defense" },
  { name: "Janes", url: "https://news.google.com/rss/search?q=site:janes.com+when:7d&hl=en-US&gl=US&ceid=US:en", tier: 2, region: "defense" },

  // ─── Tier 3: Regional specialists ────────────────────────────────────────
  { name: "Al Arabiya", url: "https://news.google.com/rss/search?q=site:english.alarabiya.net+when:2d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "middleeast" },
  { name: "Iran International", url: "https://news.google.com/rss/search?q=site:iranintl.com+when:2d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "middleeast" },
  { name: "Arab News", url: "https://news.google.com/rss/search?q=site:arabnews.com+when:7d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "middleeast" },
  { name: "The National", url: "https://news.google.com/rss/search?q=site:thenationalnews.com+when:2d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "middleeast" },
  { name: "Rudaw", url: "https://news.google.com/rss/search?q=site:rudaw.net+when:7d&hl=en&gl=US&ceid=US:en", tier: 3, region: "middleeast" },
  { name: "Kyiv Independent", url: "https://news.google.com/rss/search?q=site:kyivindependent.com+when:3d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "europe" },
  { name: "Moscow Times", url: "https://www.themoscowtimes.com/rss/news", tier: 3, region: "europe" },
  { name: "Meduza", url: "https://meduza.io/rss/all", tier: 3, region: "europe", lang: "ru" },
  { name: "The Diplomat", url: "https://thediplomat.com/feed/", tier: 3, region: "asia" },
  { name: "Nikkei Asia", url: "https://news.google.com/rss/search?q=site:asia.nikkei.com+when:3d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "asia" },
  { name: "NDTV", url: "https://feeds.feedburner.com/ndtvnews-top-stories", tier: 3, region: "asia" },
  { name: "Indian Express", url: "https://indianexpress.com/section/india/feed/", tier: 3, region: "asia" },
  { name: "News24 SA", url: "https://feeds.news24.com/articles/news24/TopStories/rss", tier: 3, region: "africa" },
  { name: "InSight Crime", url: "https://insightcrime.org/feed/", tier: 3, region: "latam" },

  // ─── Tier 3: Think tanks ─────────────────────────────────────────────────
  { name: "Foreign Policy", url: "https://foreignpolicy.com/feed/", tier: 3, region: "thinktanks" },
  { name: "Foreign Affairs", url: "https://www.foreignaffairs.com/rss.xml", tier: 3, region: "thinktanks" },
  { name: "War on the Rocks", url: "https://warontherocks.com/feed", tier: 3, region: "thinktanks" },
  { name: "RUSI", url: "https://news.google.com/rss/search?q=site:rusi.org+when:3d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "thinktanks" },
  { name: "Jamestown", url: "https://jamestown.org/feed/", tier: 3, region: "thinktanks" },
  { name: "Responsible Statecraft", url: "https://responsiblestatecraft.org/feed/", tier: 3, region: "thinktanks" },
  { name: "AEI", url: "https://www.aei.org/feed/", tier: 3, region: "thinktanks" },
  { name: "FPRI", url: "https://www.fpri.org/feed/", tier: 3, region: "thinktanks" },

  // ─── Tier 3: Crisis / Humanitarian ───────────────────────────────────────
  { name: "CrisisWatch", url: "https://www.crisisgroup.org/rss", tier: 3, region: "crisis" },
  { name: "IAEA", url: "https://www.iaea.org/feeds/topnews", tier: 3, region: "crisis" },
  { name: "WHO", url: "https://www.who.int/rss-feeds/news-english.xml", tier: 3, region: "crisis" },

  // ─── Tier 3: Government ──────────────────────────────────────────────────
  { name: "White House", url: "https://news.google.com/rss/search?q=site:whitehouse.gov&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "gov" },
  { name: "State Dept", url: "https://news.google.com/rss/search?q=site:state.gov+OR+%22State+Department%22&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "gov" },
  { name: "Pentagon", url: "https://news.google.com/rss/search?q=site:defense.gov+OR+Pentagon&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "gov" },
  { name: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml", tier: 3, region: "gov" },

  // ─── Tier 3: Energy ──────────────────────────────────────────────────────
  { name: "Oil & Gas", url: "https://news.google.com/rss/search?q=(oil+price+OR+OPEC+OR+%22natural+gas%22+OR+pipeline+OR+LNG)+when:2d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "energy" },
  { name: "Nuclear Energy", url: "https://news.google.com/rss/search?q=(%22nuclear+energy%22+OR+%22nuclear+power%22+OR+uranium+OR+IAEA)+when:3d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "energy" },

  // ─── Tier 3: Finance / Markets ───────────────────────────────────────────
  { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", tier: 3, region: "finance" },
  { name: "MarketWatch", url: "https://news.google.com/rss/search?q=site:marketwatch.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 3, region: "finance" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", tier: 3, region: "finance" },

  // ─── Tier 3: Tech / Cyber ────────────────────────────────────────────────
  { name: "Hacker News", url: "https://hnrss.org/frontpage", tier: 3, region: "tech" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", tier: 3, region: "tech" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", tier: 3, region: "tech" },

  // ─── Tier 3: Multi-language ──────────────────────────────────────────────
  { name: "ANSA", url: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml", tier: 3, region: "europe", lang: "it" },
  { name: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", tier: 3, region: "europe", lang: "es" },
  { name: "Tagesschau", url: "https://www.tagesschau.de/xml/rss2/", tier: 3, region: "europe", lang: "de" },
  { name: "NOS Nieuws", url: "https://feeds.nos.nl/nosnieuwsalgemeen", tier: 3, region: "europe", lang: "nl" },
  { name: "BBC Turkce", url: "https://feeds.bbci.co.uk/turkce/rss.xml", tier: 3, region: "europe", lang: "tr" },
  { name: "BBC Russian", url: "https://feeds.bbci.co.uk/russian/rss.xml", tier: 3, region: "europe", lang: "ru" },
  { name: "BBC Mundo", url: "https://www.bbc.com/mundo/index.xml", tier: 3, region: "latam", lang: "es" },
  { name: "BBC Persian", url: "http://feeds.bbci.co.uk/persian/tv-and-radio-37434376/rss.xml", tier: 3, region: "middleeast", lang: "fa" },

  // ─── Tier 4: Additional regional ────────────────────────────────────────
  { name: "EuroNews", url: "https://www.euronews.com/rss?format=xml", tier: 4, region: "europe" },
  { name: "TASS", url: "https://news.google.com/rss/search?q=site:tass.com+OR+TASS+Russia+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 4, region: "europe" },
  { name: "RT", url: "https://www.rt.com/rss/", tier: 4, region: "europe" },
  { name: "Xinhua", url: "https://news.google.com/rss/search?q=site:xinhuanet.com+OR+Xinhua+when:1d&hl=en-US&gl=US&ceid=US:en", tier: 4, region: "asia" },
  { name: "Fars News", url: "https://news.google.com/rss/search?q=site:farsnews.ir+when:2d&hl=en-US&gl=US&ceid=US:en", tier: 4, region: "middleeast" },
  { name: "Hurriyet", url: "https://www.hurriyet.com.tr/rss/anasayfa", tier: 4, region: "europe", lang: "tr" },
  { name: "Corriere della Sera", url: "https://www.corriere.it/rss/homepage.xml", tier: 4, region: "europe", lang: "it" },
  { name: "Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", tier: 4, region: "europe", lang: "it" },
  { name: "Der Spiegel", url: "https://www.spiegel.de/schlagzeilen/tops/index.rss", tier: 4, region: "europe", lang: "de" },
  { name: "Folha de S.Paulo", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", tier: 4, region: "latam", lang: "pt" },
  { name: "Infobae", url: "https://www.infobae.com/feeds/rss/", tier: 4, region: "latam", lang: "es" },
];

/**
 * Source domain → tier lookup.
 * Returns the tier for a given source name or URL hostname.
 */
const sourceNameToTier = new Map<string, number>();
const hostToTier = new Map<string, number>();

for (const feed of FEED_REGISTRY) {
  sourceNameToTier.set(feed.name.toLowerCase(), feed.tier);
  try {
    const url = new URL(feed.url.startsWith("http") ? feed.url : `https://${feed.url}`);
    hostToTier.set(url.hostname.replace(/^www\./, ""), feed.tier);
  } catch {
    // Google News RSS URLs for search — extract site: domain
    const siteMatch = feed.url.match(/site:([^\s+&]+)/);
    if (siteMatch) {
      hostToTier.set(siteMatch[1].replace(/^www\./, ""), feed.tier);
    }
  }
}

export function getSourceTier(sourceNameOrUrl: string): number {
  const lower = sourceNameOrUrl.toLowerCase().trim();

  // Direct name match
  const byName = sourceNameToTier.get(lower);
  if (byName) return byName;

  // Try hostname extraction
  try {
    const host = new URL(lower).hostname.replace(/^www\./, "");
    const byHost = hostToTier.get(host);
    if (byHost) return byHost;
  } catch {
    // Not a URL, try as domain
    const byDomain = hostToTier.get(lower.replace(/^www\./, ""));
    if (byDomain) return byDomain;
  }

  // Fallback: tier 4
  return 4;
}

/**
 * Get all feeds for a specific region.
 */
export function getFeedsByRegion(region: string): FeedEntry[] {
  return FEED_REGISTRY.filter((f) => f.region === region);
}

/**
 * Get feeds by tier.
 */
export function getFeedsByTier(tier: number): FeedEntry[] {
  return FEED_REGISTRY.filter((f) => f.tier === tier);
}

/**
 * Get total feed count.
 */
export function getTotalFeedCount(): number {
  return FEED_REGISTRY.length;
}

/**
 * Alert-worthy keywords for breaking news detection.
 */
export const ALERT_KEYWORDS = [
  "breaking", "urgent", "flash", "just in",
  "war declared", "invasion", "nuclear strike", "attacks iran",
  "strikes iran", "martial law", "coup", "mass casualty",
  "tsunami warning", "missile launch confirmed", "airspace closed",
  "state of emergency", "evacuate", "defcon",
];

export const ALERT_EXCLUSIONS = [
  "breaking down", "breaking point", "breaking news recap",
  "breaking barriers", "breaking records", "breaking bread",
];
