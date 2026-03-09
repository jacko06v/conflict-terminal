/**
 * Entity Index — NER without ML.
 * Maps keywords/aliases in headlines to known geopolitical entities.
 * Adapted from worldmonitor for server-side use.
 */

export type EntityType = "country" | "organization" | "leader" | "military" | "location" | "group";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  country?: string;
  aliases: string[];
  keywords: string[];
}

const ENTITIES: Entity[] = [
  // ── Countries & Governments ──────────────────────────────────────
  { id: "us", name: "United States", type: "country", country: "US", aliases: ["usa", "america", "washington"], keywords: ["pentagon", "white house", "state department", "us military", "us forces", "american forces", "us navy", "us air force", "centcom"] },
  { id: "ru", name: "Russia", type: "country", country: "RU", aliases: ["russia", "russian federation"], keywords: ["kremlin", "moscow", "russian military", "russian forces", "russian navy", "russian air force"] },
  { id: "cn", name: "China", type: "country", country: "CN", aliases: ["china", "prc", "people's republic"], keywords: ["beijing", "pla", "chinese military", "chinese navy", "south china sea"] },
  { id: "ir", name: "Iran", type: "country", country: "IR", aliases: ["iran", "islamic republic"], keywords: ["tehran", "irgc", "revolutionary guard", "iranian military", "iranian forces", "iranian navy"] },
  { id: "il", name: "Israel", type: "country", country: "IL", aliases: ["israel"], keywords: ["jerusalem", "tel aviv", "idf", "israeli military", "israeli forces", "israeli air force", "mossad", "shin bet"] },
  { id: "tr", name: "Turkey", type: "country", country: "TR", aliases: ["turkey", "turkiye", "türkiye"], keywords: ["ankara", "turkish military", "turkish forces", "turkish navy"] },
  { id: "sa", name: "Saudi Arabia", type: "country", country: "SA", aliases: ["saudi arabia", "ksa", "saudi"], keywords: ["riyadh", "saudi military", "saudi forces", "saudi air force", "aramco"] },
  { id: "ua", name: "Ukraine", type: "country", country: "UA", aliases: ["ukraine"], keywords: ["kyiv", "kiev", "ukrainian military", "ukrainian forces", "zelensky"] },
  { id: "sy", name: "Syria", type: "country", country: "SY", aliases: ["syria"], keywords: ["damascus", "syrian forces", "syrian military"] },
  { id: "iq", name: "Iraq", type: "country", country: "IQ", aliases: ["iraq"], keywords: ["baghdad", "iraqi forces", "iraqi military", "pmu", "popular mobilization"] },
  { id: "lb", name: "Lebanon", type: "country", country: "LB", aliases: ["lebanon"], keywords: ["beirut", "lebanese forces"] },
  { id: "ye", name: "Yemen", type: "country", country: "YE", aliases: ["yemen"], keywords: ["sanaa", "sana'a", "aden"] },
  { id: "pk", name: "Pakistan", type: "country", country: "PK", aliases: ["pakistan"], keywords: ["islamabad", "pakistani military", "pakistani forces", "isi"] },
  { id: "eg", name: "Egypt", type: "country", country: "EG", aliases: ["egypt"], keywords: ["cairo", "suez canal", "egyptian military"] },
  { id: "jo", name: "Jordan", type: "country", country: "JO", aliases: ["jordan"], keywords: ["amman", "jordanian forces"] },
  { id: "gb", name: "United Kingdom", type: "country", country: "GB", aliases: ["uk", "britain", "united kingdom"], keywords: ["london", "british military", "royal navy", "raf", "mod"] },
  { id: "fr", name: "France", type: "country", country: "FR", aliases: ["france"], keywords: ["paris", "french military", "french navy", "french forces"] },
  { id: "in", name: "India", type: "country", country: "IN", aliases: ["india"], keywords: ["new delhi", "indian military", "indian navy", "indian forces"] },
  { id: "kp", name: "North Korea", type: "country", country: "KP", aliases: ["north korea", "dprk"], keywords: ["pyongyang", "kim jong un"] },

  // ── Armed Groups ─────────────────────────────────────────────────
  { id: "hamas", name: "Hamas", type: "group", country: "PS", aliases: ["hamas"], keywords: ["hamas", "al-qassam", "qassam brigades", "izz ad-din al-qassam"] },
  { id: "hezbollah", name: "Hezbollah", type: "group", country: "LB", aliases: ["hezbollah", "hizbollah", "hizballah"], keywords: ["hezbollah", "nasrallah", "party of god"] },
  { id: "houthis", name: "Houthis", type: "group", country: "YE", aliases: ["houthis", "ansar allah", "ansarallah"], keywords: ["houthi", "ansar allah", "houthi rebels"] },
  { id: "irgc", name: "IRGC", type: "military", country: "IR", aliases: ["irgc", "islamic revolutionary guard corps"], keywords: ["revolutionary guard", "quds force", "irgc navy", "irgc aerospace"] },
  { id: "pmu", name: "Popular Mobilization Forces", type: "group", country: "IQ", aliases: ["pmu", "pmf", "hashd al-shaabi"], keywords: ["popular mobilization", "hashd", "iraqi militias"] },
  { id: "isis", name: "ISIS", type: "group", aliases: ["isis", "isil", "daesh", "islamic state"], keywords: ["isis", "isil", "daesh", "islamic state"] },
  { id: "taliban", name: "Taliban", type: "group", country: "AF", aliases: ["taliban"], keywords: ["taliban", "islamic emirate"] },
  { id: "pkk", name: "PKK", type: "group", aliases: ["pkk"], keywords: ["pkk", "kurdistan workers party"] },

  // ── International Orgs ──────────────────────────────────────────
  { id: "nato", name: "NATO", type: "organization", aliases: ["nato"], keywords: ["nato", "north atlantic treaty", "atlantic alliance"] },
  { id: "un", name: "United Nations", type: "organization", aliases: ["un", "united nations"], keywords: ["un security council", "unsc", "general assembly", "un peacekeeping", "unifil"] },
  { id: "eu", name: "European Union", type: "organization", aliases: ["eu", "european union"], keywords: ["brussels", "european council", "european commission"] },
  { id: "iaea", name: "IAEA", type: "organization", aliases: ["iaea"], keywords: ["iaea", "international atomic energy", "nuclear inspectors", "nuclear watchdog"] },

  // ── Key Leaders ─────────────────────────────────────────────────
  { id: "putin", name: "Vladimir Putin", type: "leader", country: "RU", aliases: ["putin"], keywords: ["putin"] },
  { id: "zelensky", name: "Volodymyr Zelensky", type: "leader", country: "UA", aliases: ["zelensky", "zelenskyy"], keywords: ["zelensky"] },
  { id: "xi", name: "Xi Jinping", type: "leader", country: "CN", aliases: ["xi jinping", "xi"], keywords: ["xi jinping"] },
  { id: "netanyahu", name: "Benjamin Netanyahu", type: "leader", country: "IL", aliases: ["netanyahu", "bibi"], keywords: ["netanyahu"] },
  { id: "khamenei", name: "Ali Khamenei", type: "leader", country: "IR", aliases: ["khamenei"], keywords: ["khamenei", "supreme leader"] },
  { id: "erdogan", name: "Recep Tayyip Erdogan", type: "leader", country: "TR", aliases: ["erdogan"], keywords: ["erdogan"] },
  { id: "trump", name: "Donald Trump", type: "leader", country: "US", aliases: ["trump"], keywords: ["trump", "mar-a-lago"] },
  { id: "biden", name: "Joe Biden", type: "leader", country: "US", aliases: ["biden"], keywords: ["biden"] },
  { id: "modi", name: "Narendra Modi", type: "leader", country: "IN", aliases: ["modi"], keywords: ["modi"] },
  { id: "macron", name: "Emmanuel Macron", type: "leader", country: "FR", aliases: ["macron"], keywords: ["macron", "élysée"] },
  { id: "mbs", name: "Mohammed bin Salman", type: "leader", country: "SA", aliases: ["mbs", "bin salman"], keywords: ["bin salman", "crown prince", "mbs"] },
];

// ── Indexes ───────────────────────────────────────────────────────

const byId = new Map<string, Entity>();
const byAlias = new Map<string, Entity>();
const byKeyword = new Map<string, Entity>();

function buildIndexes() {
  for (const entity of ENTITIES) {
    byId.set(entity.id, entity);
    for (const alias of entity.aliases) {
      byAlias.set(alias.toLowerCase(), entity);
    }
    for (const kw of entity.keywords) {
      byKeyword.set(kw.toLowerCase(), entity);
    }
  }
}

buildIndexes();

export function getEntityById(id: string): Entity | undefined {
  return byId.get(id);
}

export function getEntityByAlias(alias: string): Entity | undefined {
  return byAlias.get(alias.toLowerCase());
}

/**
 * Extract all recognized entities from a text string.
 * Uses word-boundary-aware matching for keywords and aliases.
 */
export function extractEntities(text: string): Entity[] {
  const lower = text.toLowerCase();
  const found = new Map<string, Entity>();

  // Check keywords (most specific)
  for (const [kw, entity] of byKeyword) {
    if (lower.includes(kw) && !found.has(entity.id)) {
      // Simple word boundary check
      const idx = lower.indexOf(kw);
      const before = idx > 0 ? lower[idx - 1] : " ";
      const after = idx + kw.length < lower.length ? lower[idx + kw.length] : " ";
      if (/\W/.test(before!) && /\W/.test(after!)) {
        found.set(entity.id, entity);
      }
    }
  }

  // Check aliases
  for (const [alias, entity] of byAlias) {
    if (found.has(entity.id)) continue;
    if (lower.includes(alias)) {
      const idx = lower.indexOf(alias);
      const before = idx > 0 ? lower[idx - 1] : " ";
      const after = idx + alias.length < lower.length ? lower[idx + alias.length] : " ";
      if (/\W/.test(before!) && /\W/.test(after!)) {
        found.set(entity.id, entity);
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Get all entities of a specific type.
 */
export function getEntitiesByType(type: EntityType): Entity[] {
  return ENTITIES.filter((e) => e.type === type);
}

/**
 * Get all entities associated with a country code.
 */
export function getEntitiesByCountry(countryCode: string): Entity[] {
  const upper = countryCode.toUpperCase();
  return ENTITIES.filter((e) => e.country?.toUpperCase() === upper);
}
