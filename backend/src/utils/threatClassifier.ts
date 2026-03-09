/**
 * Threat classifier — multi-level threat classification.
 * Adapted from worldmonitor. Classifies headlines into 5 threat levels
 * (critical/high/medium/low/info) and 14 categories.
 * Pure keyword-based, no ML dependencies.
 */

export type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

export type EventCategory =
  | "conflict" | "protest" | "disaster" | "diplomatic" | "economic"
  | "terrorism" | "cyber" | "health" | "environmental" | "military"
  | "crime" | "infrastructure" | "tech" | "general";

export interface ThreatClassification {
  level: ThreatLevel;
  category: EventCategory;
  confidence: number;
}

export const THREAT_COLORS: Record<ThreatLevel, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  info: "#3b82f6",
};

export const THREAT_PRIORITY: Record<ThreatLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

type KeywordMap = Record<string, EventCategory>;

const CRITICAL_KEYWORDS: KeywordMap = {
  "nuclear strike": "military",
  "nuclear attack": "military",
  "nuclear war": "military",
  "invasion": "conflict",
  "declaration of war": "conflict",
  "declares war": "conflict",
  "all-out war": "conflict",
  "full-scale war": "conflict",
  "martial law": "military",
  "coup": "military",
  "coup attempt": "military",
  "genocide": "conflict",
  "ethnic cleansing": "conflict",
  "chemical attack": "terrorism",
  "biological attack": "terrorism",
  "dirty bomb": "terrorism",
  "mass casualty": "conflict",
  "massive strikes": "military",
  "military strikes": "military",
  "retaliatory strikes": "military",
  "launches strikes": "military",
  "launch attacks on iran": "military",
  "attacks on iran": "military",
  "strikes on iran": "military",
  "strikes iran": "military",
  "bombs iran": "military",
  "attacks iran": "military",
  "attack on iran": "military",
  "attack iran": "military",
  "attacked iran": "military",
  "bombing iran": "military",
  "bombed iran": "military",
  "war with iran": "conflict",
  "war on iran": "conflict",
  "war against iran": "conflict",
  "iran retaliates": "military",
  "iran strikes": "military",
  "iran launches": "military",
  "iran attacks": "military",
  "pandemic declared": "health",
  "health emergency": "health",
  "nato article 5": "military",
  "evacuation order": "disaster",
  "meltdown": "disaster",
  "nuclear meltdown": "disaster",
  "major combat operations": "military",
  "declared war": "conflict",
};

const HIGH_KEYWORDS: KeywordMap = {
  "war": "conflict",
  "armed conflict": "conflict",
  "airstrike": "conflict",
  "airstrikes": "conflict",
  "air strike": "conflict",
  "air strikes": "conflict",
  "drone strike": "conflict",
  "drone strikes": "conflict",
  "strikes": "conflict",
  "missile": "military",
  "missile launch": "military",
  "missiles fired": "military",
  "troops deployed": "military",
  "military escalation": "military",
  "military operation": "military",
  "ground offensive": "military",
  "bombing": "conflict",
  "bombardment": "conflict",
  "shelling": "conflict",
  "casualties": "conflict",
  "killed in": "conflict",
  "hostage": "terrorism",
  "terrorist": "terrorism",
  "terror attack": "terrorism",
  "assassination": "crime",
  "cyber attack": "cyber",
  "ransomware": "cyber",
  "data breach": "cyber",
  "sanctions": "economic",
  "embargo": "economic",
  "earthquake": "disaster",
  "tsunami": "disaster",
  "hurricane": "disaster",
  "typhoon": "disaster",
  "strike on": "conflict",
  "strikes on": "conflict",
  "attack on": "conflict",
  "attack against": "conflict",
  "attacks on": "conflict",
  "launched attack": "conflict",
  "launched attacks": "conflict",
  "launches attack": "conflict",
  "launches attacks": "conflict",
  "explosions": "conflict",
  "military operations": "military",
  "combat operations": "military",
  "retaliatory strike": "military",
  "retaliatory attack": "military",
  "retaliatory attacks": "military",
  "preemptive strike": "military",
  "preemptive attack": "military",
  "ballistic missile": "military",
  "cruise missile": "military",
  "air defense intercepted": "military",
  "forces struck": "conflict",
};

const MEDIUM_KEYWORDS: KeywordMap = {
  "protest": "protest",
  "protests": "protest",
  "riot": "protest",
  "riots": "protest",
  "unrest": "protest",
  "demonstration": "protest",
  "strike action": "protest",
  "military exercise": "military",
  "naval exercise": "military",
  "arms deal": "military",
  "weapons sale": "military",
  "diplomatic crisis": "diplomatic",
  "ambassador recalled": "diplomatic",
  "expel diplomats": "diplomatic",
  "trade war": "economic",
  "tariff": "economic",
  "recession": "economic",
  "inflation": "economic",
  "market crash": "economic",
  "flood": "disaster",
  "flooding": "disaster",
  "wildfire": "disaster",
  "volcano": "disaster",
  "eruption": "disaster",
  "outbreak": "health",
  "epidemic": "health",
  "infection spread": "health",
  "oil spill": "environmental",
  "pipeline explosion": "infrastructure",
  "blackout": "infrastructure",
  "power outage": "infrastructure",
  "internet outage": "infrastructure",
  "derailment": "infrastructure",
};

const LOW_KEYWORDS: KeywordMap = {
  "election": "diplomatic",
  "vote": "diplomatic",
  "referendum": "diplomatic",
  "summit": "diplomatic",
  "treaty": "diplomatic",
  "agreement": "diplomatic",
  "negotiation": "diplomatic",
  "talks": "diplomatic",
  "peacekeeping": "diplomatic",
  "humanitarian aid": "diplomatic",
  "ceasefire": "diplomatic",
  "peace treaty": "diplomatic",
  "climate change": "environmental",
  "emissions": "environmental",
  "pollution": "environmental",
  "deforestation": "environmental",
  "drought": "environmental",
  "vaccine": "health",
  "vaccination": "health",
  "disease": "health",
  "virus": "health",
  "public health": "health",
  "interest rate": "economic",
  "gdp": "economic",
  "unemployment": "economic",
  "regulation": "economic",
};

const EXCLUSIONS = [
  "protein", "couples", "relationship", "dating", "diet", "fitness",
  "recipe", "cooking", "shopping", "fashion", "celebrity", "movie",
  "tv show", "sports", "game", "concert", "festival", "wedding",
  "vacation", "travel tips", "life hack", "self-care", "wellness",
  "strikes deal", "strikes agreement", "strikes partnership",
];

const SHORT_KEYWORDS = new Set([
  "war", "coup", "ban", "vote", "riot", "riots", "hack", "talks", "ipo", "gdp",
  "virus", "disease", "flood", "strikes",
]);

const TRAILING_BOUNDARY_KEYWORDS = new Set([
  "attack iran", "attacked iran", "attack on iran", "attack against iran",
  "attacks on iran", "launch attacks on iran", "launch attack on iran",
  "bombing iran", "bombed iran", "strikes iran", "attacks iran",
  "bombs iran", "war on iran", "war with iran", "war against iran",
  "iran retaliates", "iran strikes", "iran launches", "iran attacks",
]);

const keywordRegexCache = new Map<string, RegExp>();

function getKeywordRegex(kw: string): RegExp {
  let re = keywordRegexCache.get(kw);
  if (!re) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (SHORT_KEYWORDS.has(kw)) {
      re = new RegExp(`\\b${escaped}\\b`);
    } else if (TRAILING_BOUNDARY_KEYWORDS.has(kw)) {
      re = new RegExp(`${escaped}(?![\\w-])`);
    } else {
      re = new RegExp(escaped);
    }
    keywordRegexCache.set(kw, re);
  }
  return re;
}

function matchKeywords(
  titleLower: string,
  keywords: KeywordMap
): { keyword: string; category: EventCategory } | null {
  for (const [kw, cat] of Object.entries(keywords)) {
    if (getKeywordRegex(kw).test(titleLower)) {
      return { keyword: kw, category: cat };
    }
  }
  return null;
}

// Compound escalation: HIGH military/conflict + critical geopolitical target → CRITICAL
const ESCALATION_ACTIONS = /\b(attack|attacks|attacked|strike|strikes|struck|bomb|bombs|bombed|bombing|shell|shelled|shelling|missile|missiles|intercept|intercepted|retaliates|retaliating|retaliation|killed|casualties|offensive|invaded|invades)\b/;
const ESCALATION_TARGETS = /\b(iran|tehran|isfahan|tabriz|russia|moscow|china|beijing|taiwan|taipei|north korea|pyongyang|nato|us base|us forces|american forces|us military)\b/;

function shouldEscalateToCritical(lower: string, matchCat: EventCategory): boolean {
  if (matchCat !== "conflict" && matchCat !== "military") return false;
  return ESCALATION_ACTIONS.test(lower) && ESCALATION_TARGETS.test(lower);
}

/**
 * Classify a headline into threat level + category using keyword matching.
 */
export function classifyThreatLevel(title: string): ThreatClassification {
  const lower = title.toLowerCase();

  if (EXCLUSIONS.some((ex) => lower.includes(ex))) {
    return { level: "info", category: "general", confidence: 0.3 };
  }

  // Priority cascade: critical → high → medium → low → info
  let match = matchKeywords(lower, CRITICAL_KEYWORDS);
  if (match) return { level: "critical", category: match.category, confidence: 0.9 };

  match = matchKeywords(lower, HIGH_KEYWORDS);
  if (match) {
    if (shouldEscalateToCritical(lower, match.category)) {
      return { level: "critical", category: match.category, confidence: 0.85 };
    }
    return { level: "high", category: match.category, confidence: 0.8 };
  }

  match = matchKeywords(lower, MEDIUM_KEYWORDS);
  if (match) return { level: "medium", category: match.category, confidence: 0.7 };

  match = matchKeywords(lower, LOW_KEYWORDS);
  if (match) return { level: "low", category: match.category, confidence: 0.6 };

  return { level: "info", category: "general", confidence: 0.3 };
}

/**
 * Aggregate threats from multiple items into a single classification.
 */
export function aggregateThreats(
  items: Array<{ threat?: ThreatClassification; tier?: number }>
): ThreatClassification {
  const withThreat = items.filter((i) => i.threat);
  if (withThreat.length === 0) {
    return { level: "info", category: "general", confidence: 0.3 };
  }

  let maxLevel: ThreatLevel = "info";
  let maxPriority = 0;
  for (const item of withThreat) {
    const p = THREAT_PRIORITY[item.threat!.level];
    if (p > maxPriority) {
      maxPriority = p;
      maxLevel = item.threat!.level;
    }
  }

  const catCounts = new Map<EventCategory, number>();
  for (const item of withThreat) {
    const cat = item.threat!.category;
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  let topCat: EventCategory = "general";
  let topCount = 0;
  for (const [cat, count] of catCounts) {
    if (count > topCount) { topCount = count; topCat = cat; }
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const item of withThreat) {
    const weight = item.tier ? 6 - Math.min(item.tier, 5) : 1;
    weightedSum += item.threat!.confidence * weight;
    weightTotal += weight;
  }

  return {
    level: maxLevel,
    category: topCat,
    confidence: weightTotal > 0 ? weightedSum / weightTotal : 0.5,
  };
}
