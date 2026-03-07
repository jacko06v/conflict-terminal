/**
 * Rule-based event classifier.
 *
 * Classifies free-text (news title + summary) into our event taxonomy
 * using weighted keyword scoring. No external APIs, no ML model.
 *
 * Design rationale:
 *  - Conflict news titles are highly formulaic ("Airstrike kills...", "Missiles fired at...")
 *  - A small, well-curated keyword dictionary outperforms a generic model for this domain
 *  - Confidence is penalized when classification is ambiguous (close scores between types)
 */

import { EventType } from "../types";

interface ClassifierResult {
  eventType: EventType;
  severity: number;
  confidenceBonus: number; // positive or negative adjustment to overall confidence
}

// ── Keyword dictionaries ──────────────────────────────────────────────────────
// Each entry: [keyword, weight]. Higher weight = stronger signal.

const EVENT_KEYWORDS: Record<EventType, Array<[string, number]>> = {
  airstrike: [
    ["airstrike", 10], ["air strike", 10], ["airstrikes", 10], ["air strikes", 10],
    ["air raid", 9], ["air raids", 9], ["bombing run", 9],
    ["warplane", 8], ["jet fighter", 8], ["fighter jet", 8],
    ["f-35", 7], ["f-16", 7], ["f-15", 7], ["su-35", 7], ["su-34", 7],
    ["iaf", 6], ["air force", 5], ["bombed", 5], ["bombers", 6],
    ["sorties", 5], ["air campaign", 6],
    // "strikes" / "hit" used in conflict headlines
    [" strikes ", 7], ["israel strikes", 9], ["us strikes", 9], ["hit by strike", 8],
    ["killed in strike", 9], ["struck", 6], ["targeted strike", 8],
  ],
  missile: [
    ["ballistic missile", 10], ["cruise missile", 10], ["anti-ship missile", 10],
    ["missile strike", 10], ["missiles fired", 10], ["missile barrage", 10],
    ["rocket attack", 9], ["rocket fire", 9], ["rockets launched", 9],
    ["missile", 7], ["katyusha", 8], ["grad rocket", 8], ["scud", 8],
    ["fatah", 6], ["shahab", 7], ["qassem", 6], ["hypersonic", 7],
    ["iron dome", 6], ["arrow system", 6], ["intercept", 5],
    ["ballistic", 6], ["launch", 4],
  ],
  drone: [
    ["drone strike", 10], ["drone attack", 10], ["drone swarm", 10],
    ["uav attack", 10], ["kamikaze drone", 10], ["suicide drone", 10],
    ["shahed", 9], ["shaheed", 9], ["loitering munition", 9],
    ["unmanned aerial", 8], ["drone", 6], ["uav", 7], ["uas", 7],
    ["quadcopter", 6], ["sea drone", 8], ["maritime drone", 8],
  ],
  explosion: [
    ["explosion", 9], ["blast", 8], ["exploded", 9], ["detonation", 9],
    ["bomb blast", 10], ["ied", 9], ["improvised explosive", 10],
    ["car bomb", 10], ["suicide bombing", 10], ["roadside bomb", 10],
    ["detonated", 8], ["blew up", 7], ["secondary explosion", 9],
    ["large explosion", 8],
  ],
  fire: [
    ["fire", 5], ["blaze", 7], ["burning", 6], ["inferno", 8],
    ["thermal hotspot", 9], ["hotspot", 7], ["flames", 6],
    ["oil fire", 8], ["refinery fire", 8], ["wildfire", 5],
    ["smoke plume", 6], ["fire detected", 7],
  ],
  infrastructure: [
    ["infrastructure", 8], ["power plant", 9], ["electricity grid", 9],
    ["pipeline", 8], ["oil refinery", 9], ["water facility", 8],
    ["power station", 9], ["transmission tower", 8], ["blackout", 7],
    ["sabotage", 7], ["cyberattack", 8], ["port", 6], ["bridge", 5],
    ["communications", 6], ["radar", 6], ["airport", 5],
  ],
  troop_movement: [
    ["ground offensive", 9], ["ground invasion", 9], ["ground forces", 8],
    ["armored", 8], ["tanks", 7], ["troops deployed", 8],
    ["military convoy", 9], ["troop movement", 10], ["advance into", 8],
    ["soldiers", 5], ["forces enter", 8], ["mobilization", 7],
    ["naval exercise", 7], ["fleet", 6], ["warships", 7],
  ],
  alert: [
    ["alert", 5], ["warning", 5], ["sirens", 8], ["evacuation", 7],
    ["threat", 4], ["heightened alert", 8], ["standby", 5],
    ["security alert", 7], ["imminent threat", 8], ["on alert", 7],
    ["air defense activated", 9], ["defense systems", 7],
  ],
};

// ── Severity keywords ─────────────────────────────────────────────────────────
// Adjust severity score based on scale descriptors in text

const SEVERITY_UP_KEYWORDS = [
  ["mass", 2], ["massive", 2], ["dozens killed", 2], ["hundreds", 2],
  ["major offensive", 2], ["largest", 2], ["unprecedented", 2],
  ["catastrophic", 2], ["nuclear", 2], ["chemical", 2],
  ["killed", 1], ["casualties", 1], ["wounded", 1],
  ["multiple strikes", 1], ["barrage", 1], ["wave", 1],
] as Array<[string, number]>;

const SEVERITY_DOWN_KEYWORDS = [
  ["minor", -1], ["no injuries", -1], ["no casualties", -1],
  ["small", -1], ["limited", -1],
] as Array<[string, number]>;

// ── Source reliability by domain ──────────────────────────────────────────────
const DOMAIN_RELIABILITY: Record<string, number> = {
  "reuters.com": 90,
  "apnews.com": 90,
  "bbc.com": 88,
  "bbc.co.uk": 88,
  "aljazeera.com": 82,
  "theguardian.com": 82,
  "nytimes.com": 85,
  "wsj.com": 85,
  "timesofisrael.com": 80,
  "haaretz.com": 80,
  "middleeasteye.net": 75,
  "al-monitor.com": 78,
  "france24.com": 82,
  "dw.com": 82,
  "arabnews.com": 72,
  "thenationalnews.com": 75,
  "jpost.com": 75,
  "ynet.co.il": 72,
  "rudaw.net": 74,
  "Kurdistan24.net": 74,
  "tasnimnews.com": 45,  // state media — low reliability
  "irna.ir": 45,
  "presstv.ir": 35,
  "almasirah.net": 35,   // Houthi media
  "almanar.com.lb": 35,  // Hezbollah media
};

const DEFAULT_DOMAIN_RELIABILITY = 58;

export function reliabilityForDomain(domain: string): number {
  const lower = domain.toLowerCase().replace(/^www\./, "");
  for (const [key, val] of Object.entries(DOMAIN_RELIABILITY)) {
    if (lower.includes(key)) return val;
  }
  return DEFAULT_DOMAIN_RELIABILITY;
}

// ── Main classifier ───────────────────────────────────────────────────────────

/**
 * Classify a piece of text into an event type.
 * Returns the best-match event type, severity, and a confidence adjustment.
 *
 * @param text - concatenation of title + summary to classify
 * @param domain - source domain (optional, for reliability scoring)
 */
export function classifyText(
  text: string,
  domain?: string
): ClassifierResult {
  const lower = text.toLowerCase();

  // Score each event type
  const scores = new Map<EventType, number>();
  for (const [type, keywords] of Object.entries(EVENT_KEYWORDS) as [EventType, Array<[string, number]>][]) {
    let score = 0;
    for (const [kw, weight] of keywords) {
      if (lower.includes(kw)) score += weight;
    }
    if (score > 0) scores.set(type, score);
  }

  // Pick the winner
  let bestType: EventType = "alert";
  let bestScore = 0;
  let secondScore = 0;

  for (const [type, score] of scores) {
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestType = type;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  // Confidence bonus: high if the winner is clear, low if scores are close
  const margin = bestScore - secondScore;
  const confidenceBonus =
    bestScore === 0 ? -20  // no keywords matched — classification uncertain
    : margin >= 10 ? 10   // clear winner
    : margin >= 5  ? 5    // reasonably clear
    : margin >= 2  ? 0    // ambiguous
    : -5;                 // very ambiguous

  // Domain reliability → confidence adjustment
  const reliability = domain ? reliabilityForDomain(domain) : DEFAULT_DOMAIN_RELIABILITY;
  const reliabilityBonus = Math.round((reliability - 60) / 4); // -15 to +15 range

  // Severity scoring
  let severity = 2; // default
  for (const [kw, delta] of SEVERITY_UP_KEYWORDS) {
    if (lower.includes(kw)) severity += delta;
  }
  for (const [kw, delta] of SEVERITY_DOWN_KEYWORDS) {
    if (lower.includes(kw)) severity += delta;
  }
  severity = Math.max(1, Math.min(5, severity));

  return {
    eventType: bestType,
    severity,
    confidenceBonus: confidenceBonus + reliabilityBonus,
  };
}

/**
 * Check if a text contains any conflict-relevant keywords worth processing.
 * Pre-filter to avoid wasting time on irrelevant articles.
 */
const CONFLICT_KEYWORDS = [
  "airstrike", "missile", "rocket", "drone", "explosion", "blast", "attack",
  "bomb", "strike", "killed", "casualties", "military", "war", "offensive",
  "troops", "forces", "fire", "burning", "irgc", "hezbollah", "hamas",
  "houthi", "idf", "air defense", "intercepted", "launch", "warplane",
];

export function isConflictRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFLICT_KEYWORDS.some((kw) => lower.includes(kw));
}
