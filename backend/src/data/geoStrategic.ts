/**
 * Static geo-strategic data adapted from worldmonitor.
 * Contains intel hotspots, conflict zones, strategic waterways,
 * military bases, nuclear sites, undersea cables, etc.
 */

// ─── Intel Hotspots ────────────────────────────────────────────────────────

export interface Hotspot {
  id: string;
  name: string;
  subtext: string;
  lat: number;
  lon: number;
  location: string;
  keywords: string[];
  description: string;
  status: "active" | "monitoring" | "stable";
}

export const INTEL_HOTSPOTS: Hotspot[] = [
  {
    id: "sahel",
    name: "Sahel Crisis",
    subtext: "Mali · Niger · Burkina Faso",
    lat: 15.0,
    lon: 2.0,
    location: "Sahel Region, West Africa",
    keywords: ["sahel", "mali", "niger", "burkina faso", "wagner", "junta", "coup"],
    description: "Escalating jihadist insurgency, military juntas, and Wagner/Africa Corps presence",
    status: "active",
  },
  {
    id: "horn-africa",
    name: "Horn of Africa",
    subtext: "Ethiopia · Somalia · Sudan",
    lat: 8.0,
    lon: 42.0,
    location: "Horn of Africa",
    keywords: ["ethiopia", "somalia", "al-shabaab", "tigray", "eritrea", "djibouti"],
    description: "Confluent crises — civil conflicts, piracy corridor, and Red Sea instability",
    status: "active",
  },
  {
    id: "moscow",
    name: "Moscow",
    subtext: "Russia",
    lat: 55.75,
    lon: 37.62,
    location: "Moscow, Russia",
    keywords: ["kremlin", "russia", "putin", "defense ministry", "mod"],
    description: "Russian political and military command center",
    status: "active",
  },
  {
    id: "beijing",
    name: "Beijing",
    subtext: "China",
    lat: 39.9,
    lon: 116.4,
    location: "Beijing, China",
    keywords: ["beijing", "china", "ccp", "pla", "xi jinping", "zhongnanhai"],
    description: "Chinese political center and PLA headquarters",
    status: "monitoring",
  },
  {
    id: "kyiv",
    name: "Kyiv",
    subtext: "Ukraine",
    lat: 50.45,
    lon: 30.52,
    location: "Kyiv, Ukraine",
    keywords: ["kyiv", "kiev", "ukraine", "zelensky", "donbas", "crimea"],
    description: "Ukrainian capital and center of Russia-Ukraine war",
    status: "active",
  },
  {
    id: "taipei",
    name: "Taipei",
    subtext: "Taiwan",
    lat: 25.03,
    lon: 121.56,
    location: "Taipei, Taiwan",
    keywords: ["taiwan", "taipei", "tsmc", "strait", "pla", "blockade"],
    description: "Taiwan Strait flashpoint — global semiconductor hub",
    status: "monitoring",
  },
  {
    id: "tehran",
    name: "Tehran",
    subtext: "Iran",
    lat: 35.69,
    lon: 51.39,
    location: "Tehran, Iran",
    keywords: ["iran", "tehran", "irgc", "khamenei", "nuclear", "proxy"],
    description: "Iranian political center and IRGC command",
    status: "active",
  },
  {
    id: "tel-aviv",
    name: "Tel Aviv",
    subtext: "Israel",
    lat: 32.08,
    lon: 34.78,
    location: "Tel Aviv, Israel",
    keywords: ["israel", "tel aviv", "idf", "mossad", "netanyahu"],
    description: "Israeli defense establishment and intelligence hub",
    status: "active",
  },
  {
    id: "pyongyang",
    name: "Pyongyang",
    subtext: "North Korea",
    lat: 39.02,
    lon: 125.75,
    location: "Pyongyang, DPRK",
    keywords: ["north korea", "dprk", "pyongyang", "kim jong un", "missile test"],
    description: "North Korean nuclear and missile development center",
    status: "monitoring",
  },
  {
    id: "riyadh",
    name: "Riyadh",
    subtext: "Saudi Arabia",
    lat: 24.71,
    lon: 46.67,
    location: "Riyadh, Saudi Arabia",
    keywords: ["saudi", "riyadh", "mbs", "aramco", "opec"],
    description: "Saudi political center, OPEC decisions hub",
    status: "monitoring",
  },
  {
    id: "cairo",
    name: "Cairo",
    subtext: "Egypt",
    lat: 30.04,
    lon: 31.24,
    location: "Cairo, Egypt",
    keywords: ["egypt", "cairo", "suez", "rafah", "sisi"],
    description: "Rafah crossing controller, Suez Canal governance",
    status: "active",
  },
  {
    id: "baghdad",
    name: "Baghdad",
    subtext: "Iraq",
    lat: 33.31,
    lon: 44.37,
    location: "Baghdad, Iraq",
    keywords: ["iraq", "baghdad", "militia", "pmu", "al-assad"],
    description: "Iraqi political center, Iran-backed militia operations",
    status: "active",
  },
  {
    id: "damascus",
    name: "Damascus",
    subtext: "Syria",
    lat: 33.51,
    lon: 36.29,
    location: "Damascus, Syria",
    keywords: ["syria", "damascus", "assad", "hts", "idlib"],
    description: "Syrian civil war aftermath, HTS governance transition",
    status: "active",
  },
  {
    id: "doha",
    name: "Doha",
    subtext: "Qatar",
    lat: 25.29,
    lon: 51.53,
    location: "Doha, Qatar",
    keywords: ["qatar", "doha", "mediator", "al jazeera", "lng"],
    description: "Regional mediator, Hamas diplomacy, LNG exporter",
    status: "monitoring",
  },
  {
    id: "ankara",
    name: "Ankara",
    subtext: "Turkey",
    lat: 39.93,
    lon: 32.85,
    location: "Ankara, Turkey",
    keywords: ["turkey", "ankara", "erdogan", "nato", "bosphorus"],
    description: "NATO member, Bosphorus controller, drone exporter",
    status: "monitoring",
  },
  {
    id: "beirut",
    name: "Beirut",
    subtext: "Lebanon",
    lat: 33.89,
    lon: 35.5,
    location: "Beirut, Lebanon",
    keywords: ["lebanon", "beirut", "hezbollah", "ceasefire"],
    description: "Hezbollah operations center, Israel-Lebanon front",
    status: "active",
  },
  {
    id: "sanaa",
    name: "Sana'a",
    subtext: "Yemen",
    lat: 15.35,
    lon: 44.2,
    location: "Sana'a, Yemen",
    keywords: ["yemen", "houthi", "sanaa", "red sea", "bab el-mandeb"],
    description: "Houthi capital, Red Sea shipping attacks",
    status: "active",
  },
  {
    id: "caracas",
    name: "Caracas",
    subtext: "Venezuela",
    lat: 10.49,
    lon: -66.88,
    location: "Caracas, Venezuela",
    keywords: ["venezuela", "caracas", "maduro", "oil", "sanctions"],
    description: "Venezuelan political crisis, oil sanctions impact",
    status: "monitoring",
  },
  {
    id: "washington-dc",
    name: "Washington DC",
    subtext: "United States",
    lat: 38.9,
    lon: -77.04,
    location: "Washington DC, USA",
    keywords: ["pentagon", "white house", "state department", "congress", "cia"],
    description: "US military/foreign policy command center",
    status: "monitoring",
  },
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    subtext: "UAE",
    lat: 24.45,
    lon: 54.65,
    location: "Abu Dhabi, UAE",
    keywords: ["uae", "abu dhabi", "dubai", "mbz", "dp world"],
    description: "UAE political center, logistics hub, AI investment",
    status: "monitoring",
  },
];

// ─── Strategic Waterways ────────────────────────────────────────────────────

export interface StrategicWaterway {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description: string;
}

export const STRATEGIC_WATERWAYS: StrategicWaterway[] = [
  { id: "taiwan-strait", name: "Taiwan Strait", lat: 24.0, lon: 119.0, description: "China-Taiwan flashpoint, global shipping route" },
  { id: "malacca", name: "Strait of Malacca", lat: 2.5, lon: 101.5, description: "World's busiest shipping lane — 25% of global trade" },
  { id: "hormuz", name: "Strait of Hormuz", lat: 26.56, lon: 56.25, description: "21% of global oil transit — Iran-controlled chokepoint" },
  { id: "bosphorus", name: "Bosphorus", lat: 41.12, lon: 29.05, description: "Russia's Black Sea access — Turkey controls transit" },
  { id: "suez", name: "Suez Canal", lat: 30.46, lon: 32.34, description: "12% of global trade — Egypt sovereignty" },
  { id: "panama", name: "Panama Canal", lat: 9.08, lon: -79.68, description: "5% of global trade — drought vulnerability" },
  { id: "gibraltar", name: "Strait of Gibraltar", lat: 35.96, lon: -5.35, description: "Mediterranean-Atlantic gateway" },
  { id: "bab-el-mandeb", name: "Bab el-Mandeb", lat: 12.6, lon: 43.3, description: "Red Sea chokepoint — Houthi attack zone" },
  { id: "dardanelles", name: "Dardanelles", lat: 40.2, lon: 26.4, description: "Aegean-Marmara passage — Montreux Convention" },
];

// ─── Conflict Zones ────────────────────────────────────────────────────────

export interface ConflictZone {
  id: string;
  name: string;
  center: [number, number]; // [lon, lat]
  intensity: "high" | "medium" | "low";
  parties: string[];
  keywords: string[];
  startDate: string;
  description: string;
}

export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: "iran-war-theater",
    name: "Iran War Theater",
    center: [53.0, 32.0],
    intensity: "high",
    parties: ["Iran", "Israel", "USA", "IRGC", "Proxies"],
    keywords: ["iran", "tehran", "isfahan", "irgc", "natanz", "bushehr", "kharg island"],
    startDate: "2024-04",
    description: "Active military theater encompassing Iranian nuclear, military and energy infrastructure",
  },
  {
    id: "hormuz-crisis",
    name: "Strait of Hormuz Crisis",
    center: [56.5, 26.5],
    intensity: "high",
    parties: ["Iran", "USA", "IRGC Navy", "Coalition"],
    keywords: ["hormuz", "persian gulf", "oil tanker", "naval", "irgc navy"],
    startDate: "2024-04",
    description: "Maritime escalation zone — 21% of global oil transit",
  },
  {
    id: "ukraine",
    name: "Ukraine Conflict",
    center: [36.0, 48.5],
    intensity: "high",
    parties: ["Russia", "Ukraine", "NATO (support)"],
    keywords: ["ukraine", "donbas", "crimea", "kherson", "zaporizhzhia"],
    startDate: "2022-02",
    description: "Full-scale Russian invasion, frontline warfare",
  },
  {
    id: "gaza",
    name: "Gaza Conflict",
    center: [34.45, 31.42],
    intensity: "high",
    parties: ["Israel", "Hamas", "PIJ"],
    keywords: ["gaza", "hamas", "rafah", "khan younis", "idf"],
    startDate: "2023-10",
    description: "Israel-Hamas war following Oct 7 attack",
  },
  {
    id: "south-lebanon",
    name: "South Lebanon",
    center: [35.5, 33.3],
    intensity: "medium",
    parties: ["Israel", "Hezbollah"],
    keywords: ["hezbollah", "south lebanon", "litani", "unifil"],
    startDate: "2023-10",
    description: "Israel-Hezbollah border escalation, ceasefire monitoring",
  },
  {
    id: "yemen-red-sea",
    name: "Yemen / Red Sea",
    center: [44.0, 15.0],
    intensity: "high",
    parties: ["Houthis", "Saudi Coalition", "USA", "UK"],
    keywords: ["houthi", "yemen", "red sea", "bab el-mandeb", "shipping"],
    startDate: "2023-11",
    description: "Houthi anti-shipping campaign, US/UK strikes",
  },
  {
    id: "sudan",
    name: "Sudan Civil War",
    center: [32.5, 15.5],
    intensity: "high",
    parties: ["SAF", "RSF"],
    keywords: ["sudan", "khartoum", "darfur", "rsf", "saf"],
    startDate: "2023-04",
    description: "SAF vs RSF civil war, humanitarian catastrophe",
  },
  {
    id: "myanmar",
    name: "Myanmar Civil War",
    center: [96.0, 20.0],
    intensity: "medium",
    parties: ["Tatmadaw", "NUG", "Ethnic Armed Organizations"],
    keywords: ["myanmar", "burma", "tatmadaw", "resistance", "rohingya"],
    startDate: "2021-02",
    description: "Post-coup civil war, ethnic armed resistance",
  },
  {
    id: "korean-dmz",
    name: "Korean DMZ",
    center: [127.0, 38.0],
    intensity: "low",
    parties: ["North Korea", "South Korea", "USA"],
    keywords: ["dmz", "korea", "pyongyang", "icbm", "38th parallel"],
    startDate: "1953-07",
    description: "Frozen conflict with periodic escalation (missile tests)",
  },
  {
    id: "pak-afghan",
    name: "Pakistan-Afghanistan Border",
    center: [70.0, 34.0],
    intensity: "medium",
    parties: ["Pakistan", "Taliban", "TTP", "ISIS-K"],
    keywords: ["pakistan", "afghanistan", "taliban", "ttp", "waziristan"],
    startDate: "2021-08",
    description: "Cross-border terrorism, TTP insurgency",
  },
];

// ─── APT Groups ─────────────────────────────────────────────────────────────

export interface APTGroup {
  id: string;
  name: string;
  aka: string[];
  sponsor: string;
  lat: number;
  lon: number;
}

export const APT_GROUPS: APTGroup[] = [
  { id: "apt28", name: "APT28", aka: ["Fancy Bear", "Sofacy"], sponsor: "Russia (GRU)", lat: 55.75, lon: 37.62 },
  { id: "apt29", name: "APT29", aka: ["Cozy Bear", "Midnight Blizzard"], sponsor: "Russia (SVR)", lat: 55.75, lon: 37.62 },
  { id: "apt41", name: "APT41", aka: ["Winnti", "Double Dragon"], sponsor: "China (MSS)", lat: 39.9, lon: 116.4 },
  { id: "lazarus", name: "Lazarus Group", aka: ["Hidden Cobra", "ZINC"], sponsor: "North Korea (RGB)", lat: 39.02, lon: 125.75 },
  { id: "apt33", name: "APT33", aka: ["Elfin", "Holmium"], sponsor: "Iran (IRGC)", lat: 35.69, lon: 51.39 },
  { id: "apt35", name: "APT35", aka: ["Charming Kitten", "Phosphorus"], sponsor: "Iran (IRGC)", lat: 35.69, lon: 51.39 },
];

// ─── Military Bases (key global) ────────────────────────────────────────────

export interface MilitaryBase {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "us-nato" | "russia" | "china" | "other";
  description: string;
}

export const MILITARY_BASES: MilitaryBase[] = [
  // US / NATO — Middle East
  { id: "al-udeid", name: "Al Udeid Air Base", lat: 25.12, lon: 51.32, type: "us-nato", description: "CENTCOM forward HQ, Qatar" },
  { id: "al-dhafra", name: "Al Dhafra Air Base", lat: 24.25, lon: 54.55, type: "us-nato", description: "UAE, F-35/tanker operations" },
  { id: "camp-arifjan", name: "Camp Arifjan", lat: 29.12, lon: 48.1, type: "us-nato", description: "US Army Kuwait HQ" },
  { id: "incirlik", name: "Incirlik Air Base", lat: 37.0, lon: 35.43, type: "us-nato", description: "NATO Turkey, nuclear-capable" },
  { id: "al-assad", name: "Al Asad Airbase", lat: 33.78, lon: 42.44, type: "us-nato", description: "US forces Iraq" },
  { id: "djibouti", name: "Camp Lemonnier", lat: 11.55, lon: 43.15, type: "us-nato", description: "US Africa/CENTCOM, Djibouti" },
  // US / NATO — Europe
  { id: "ramstein", name: "Ramstein Air Base", lat: 49.44, lon: 7.6, type: "us-nato", description: "USAFE HQ, Germany" },
  { id: "aviano", name: "Aviano Air Base", lat: 46.03, lon: 12.6, type: "us-nato", description: "NATO Italy, F-16 wing" },
  { id: "sigonella", name: "NAS Sigonella", lat: 37.4, lon: 14.92, type: "us-nato", description: "US Navy Med hub, Sicily" },
  { id: "rota", name: "Naval Station Rota", lat: 36.64, lon: -6.35, type: "us-nato", description: "US Navy Spain, Aegis BMD" },
  { id: "lakenheath", name: "RAF Lakenheath", lat: 52.41, lon: 0.56, type: "us-nato", description: "USAF UK, F-35 wing" },
  // US — Pacific
  { id: "yokosuka", name: "Fleet Activities Yokosuka", lat: 35.28, lon: 139.67, type: "us-nato", description: "7th Fleet HQ, Japan" },
  { id: "kadena", name: "Kadena Air Base", lat: 26.35, lon: 127.77, type: "us-nato", description: "USAF Okinawa, largest Pacific base" },
  { id: "diego-garcia", name: "Diego Garcia", lat: -7.32, lon: 72.42, type: "us-nato", description: "US/UK Indian Ocean, B-2 capable" },
  { id: "guam", name: "Andersen AFB Guam", lat: 13.58, lon: 144.92, type: "us-nato", description: "Pacific bomber hub" },
  // Russia
  { id: "tartus", name: "Tartus Naval Base", lat: 34.89, lon: 35.89, type: "russia", description: "Russian Mediterranean fleet, Syria" },
  { id: "hmeimim", name: "Hmeimim Air Base", lat: 35.41, lon: 35.95, type: "russia", description: "Russian Syria operations hub" },
  { id: "kaliningrad", name: "Kaliningrad Base", lat: 54.71, lon: 20.51, type: "russia", description: "Russian Baltic exclave, Iskander missiles" },
  { id: "sevastopol", name: "Sevastopol Naval Base", lat: 44.6, lon: 33.53, type: "russia", description: "Black Sea Fleet HQ (disputed)" },
  { id: "murmansk", name: "Severomorsk Naval Base", lat: 69.07, lon: 33.42, type: "russia", description: "Northern Fleet HQ, nuclear subs" },
  { id: "vladivostok", name: "Vladivostok Naval Base", lat: 43.12, lon: 131.9, type: "russia", description: "Pacific Fleet HQ" },
  // China
  { id: "djibouti-cn", name: "PLA Support Base Djibouti", lat: 11.59, lon: 43.16, type: "china", description: "China's first overseas base" },
  { id: "woody-island", name: "Woody Island", lat: 16.83, lon: 112.33, type: "china", description: "PLA South China Sea garrison" },
  { id: "fiery-cross", name: "Fiery Cross Reef", lat: 9.55, lon: 112.89, type: "china", description: "Artificial island base, Spratly" },
];

// ─── Nuclear Facilities (key) ──────────────────────────────────────────────

export interface NuclearFacility {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "weapons" | "enrichment" | "plant";
  status: "active" | "inactive" | "contested";
}

export const NUCLEAR_FACILITIES: NuclearFacility[] = [
  // Iran
  { id: "natanz", name: "Natanz Enrichment", lat: 33.72, lon: 51.73, type: "enrichment", status: "active" },
  { id: "fordow", name: "Fordow Enrichment", lat: 34.88, lon: 51.39, type: "enrichment", status: "active" },
  { id: "bushehr", name: "Bushehr Nuclear Plant", lat: 28.83, lon: 50.88, type: "plant", status: "active" },
  { id: "arak", name: "Arak Heavy Water", lat: 34.05, lon: 49.25, type: "enrichment", status: "contested" },
  // Israel
  { id: "dimona", name: "Dimona Nuclear Center", lat: 31.0, lon: 35.15, type: "weapons", status: "active" },
  // North Korea
  { id: "yongbyon", name: "Yongbyon Complex", lat: 39.8, lon: 125.75, type: "weapons", status: "active" },
  { id: "punggye-ri", name: "Punggye-ri Test Site", lat: 41.28, lon: 129.08, type: "weapons", status: "active" },
  // Pakistan
  { id: "kahuta", name: "Kahuta Research Lab", lat: 33.59, lon: 73.38, type: "enrichment", status: "active" },
  { id: "khushab", name: "Khushab Complex", lat: 32.02, lon: 72.22, type: "weapons", status: "active" },
  // India
  { id: "bhabha", name: "Bhabha Atomic Research", lat: 19.01, lon: 72.92, type: "weapons", status: "active" },
  { id: "tarapur", name: "Tarapur Plant", lat: 19.83, lon: 72.65, type: "plant", status: "active" },
  // Russia
  { id: "sarov", name: "Sarov (Arzamas-16)", lat: 54.93, lon: 43.32, type: "weapons", status: "active" },
  { id: "novaya-zemlya", name: "Novaya Zemlya Test Site", lat: 73.37, lon: 54.97, type: "weapons", status: "inactive" },
  // USA
  { id: "los-alamos", name: "Los Alamos National Lab", lat: 35.88, lon: -106.3, type: "weapons", status: "active" },
  { id: "pantex", name: "Pantex Plant", lat: 35.32, lon: -101.95, type: "weapons", status: "active" },
  // China
  { id: "lop-nor", name: "Lop Nor Test Site", lat: 41.55, lon: 88.73, type: "weapons", status: "active" },
  { id: "jiuquan", name: "Jiuquan Complex", lat: 40.97, lon: 100.3, type: "weapons", status: "active" },
  // France
  { id: "gravelines", name: "Gravelines Power Station", lat: 51.01, lon: 2.11, type: "plant", status: "active" },
  // UK
  { id: "sellafield", name: "Sellafield Complex", lat: 54.42, lon: -3.5, type: "enrichment", status: "active" },
  { id: "aldermaston", name: "AWE Aldermaston", lat: 51.36, lon: -1.15, type: "weapons", status: "active" },
];

// ─── Sanctioned Countries (ISO numeric code → severity) ─────────────────────

export const SANCTIONED_COUNTRIES: Record<number, "severe" | "high" | "moderate"> = {
  408: "severe",  // DPRK
  760: "severe",  // Syria
  364: "severe",  // Iran
  643: "high",    // Russia
  112: "high",    // Belarus
  862: "moderate", // Venezuela
  170: "moderate", // Cuba (using 170 as placeholder)
  728: "moderate", // South Sudan
  736: "moderate", // Sudan
};

// ─── Economic Centers ──────────────────────────────────────────────────────

export interface EconomicCenter {
  id: string;
  name: string;
  type: "exchange" | "central-bank" | "financial-hub";
  lat: number;
  lon: number;
  country: string;
  description: string;
}

export const ECONOMIC_CENTERS: EconomicCenter[] = [
  { id: "nyse", name: "NYSE / Wall Street", type: "exchange", lat: 40.71, lon: -74.01, country: "US", description: "World's largest stock exchange" },
  { id: "nasdaq", name: "NASDAQ", type: "exchange", lat: 40.76, lon: -73.98, country: "US", description: "Tech-heavy exchange" },
  { id: "lse", name: "London Stock Exchange", type: "exchange", lat: 51.51, lon: -0.09, country: "UK", description: "Europe's largest exchange" },
  { id: "tse", name: "Tokyo Stock Exchange", type: "exchange", lat: 35.68, lon: 139.78, country: "JP", description: "Asia's second-largest" },
  { id: "sse", name: "Shanghai Stock Exchange", type: "exchange", lat: 31.23, lon: 121.47, country: "CN", description: "China mainland primary" },
  { id: "hkex", name: "Hong Kong Exchange", type: "exchange", lat: 22.28, lon: 114.16, country: "HK", description: "Asia Pacific hub" },
  { id: "euronext", name: "Euronext Paris", type: "exchange", lat: 48.87, lon: 2.35, country: "FR", description: "Pan-European exchange" },
  { id: "dax", name: "Frankfurt Börse", type: "exchange", lat: 50.11, lon: 8.68, country: "DE", description: "DAX index home" },
  { id: "tadawul", name: "Tadawul (Saudi)", type: "exchange", lat: 24.71, lon: 46.67, country: "SA", description: "MENA's largest market" },
  { id: "fed", name: "Federal Reserve", type: "central-bank", lat: 38.89, lon: -77.05, country: "US", description: "US central bank" },
  { id: "ecb", name: "European Central Bank", type: "central-bank", lat: 50.11, lon: 8.7, country: "EU", description: "Eurozone monetary policy" },
  { id: "boj", name: "Bank of Japan", type: "central-bank", lat: 35.69, lon: 139.77, country: "JP", description: "Japanese monetary policy" },
  { id: "pboc", name: "People's Bank of China", type: "central-bank", lat: 39.91, lon: 116.35, country: "CN", description: "Chinese monetary policy" },
  { id: "boe", name: "Bank of England", type: "central-bank", lat: 51.51, lon: -0.09, country: "UK", description: "British monetary policy" },
  { id: "dubai-hub", name: "DIFC Dubai", type: "financial-hub", lat: 25.21, lon: 55.28, country: "AE", description: "MENA financial center" },
  { id: "singapore", name: "Singapore Financial District", type: "financial-hub", lat: 1.28, lon: 103.85, country: "SG", description: "Asian financial hub" },
  { id: "zurich", name: "Zurich Financial Center", type: "financial-hub", lat: 47.37, lon: 8.54, country: "CH", description: "Swiss banking hub" },
];

// ─── Spaceports ─────────────────────────────────────────────────────────────

export interface Spaceport {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  operator: string;
}

export const SPACEPORTS: Spaceport[] = [
  { id: "ksc", name: "Kennedy Space Center", lat: 28.57, lon: -80.65, country: "US", operator: "NASA/SpaceX" },
  { id: "vandenberg", name: "Vandenberg SFB", lat: 34.74, lon: -120.57, country: "US", operator: "SpaceX/USSF" },
  { id: "starbase", name: "Starbase Boca Chica", lat: 25.99, lon: -97.16, country: "US", operator: "SpaceX" },
  { id: "baikonur", name: "Baikonur Cosmodrome", lat: 45.96, lon: 63.31, country: "KZ", operator: "Roscosmos" },
  { id: "plesetsk", name: "Plesetsk Cosmodrome", lat: 62.93, lon: 40.58, country: "RU", operator: "Roscosmos" },
  { id: "vostochny", name: "Vostochny Cosmodrome", lat: 51.88, lon: 128.33, country: "RU", operator: "Roscosmos" },
  { id: "jiuquan-sp", name: "Jiuquan Launch Center", lat: 40.96, lon: 100.3, country: "CN", operator: "CNSA" },
  { id: "xichang", name: "Xichang Satellite Center", lat: 28.25, lon: 102.03, country: "CN", operator: "CNSA" },
  { id: "wenchang", name: "Wenchang Launch Center", lat: 19.61, lon: 110.96, country: "CN", operator: "CNSA" },
  { id: "kourou", name: "Guiana Space Centre", lat: 5.24, lon: -52.77, country: "FR", operator: "ESA/Arianespace" },
  { id: "sriharikota", name: "Sriharikota", lat: 13.73, lon: 80.23, country: "IN", operator: "ISRO" },
  { id: "tanegashima", name: "Tanegashima", lat: 30.4, lon: 131.0, country: "JP", operator: "JAXA" },
];
