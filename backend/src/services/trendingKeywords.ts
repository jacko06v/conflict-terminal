/**
 * Trending keywords detection service.
 * Adapted from worldmonitor's trending-keywords.ts.
 *
 * Tracks term frequency across RSS headlines in a rolling 2h window
 * vs a 7-day baseline. Detects spikes when a term appears significantly
 * more than its baseline rate across multiple sources.
 *
 * Server-side adaptation: no localStorage, no ML worker, no i18n.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrendingHeadlineInput {
  title: string;
  pubDate: Date;
  source: string;
  link?: string;
}

interface StoredHeadline {
  title: string;
  source: string;
  link: string;
  publishedAt: number;
  ingestedAt: number;
}

interface TermRecord {
  timestamps: number[];
  baseline7d: number;
  lastSpikeAlertMs: number;
  displayTerm: string;
  headlines: StoredHeadline[];
}

export interface TrendingSpike {
  term: string;
  count: number;
  baseline: number;
  multiplier: number;
  windowMs: number;
  uniqueSources: number;
  headlines: StoredHeadline[];
}

export interface TrendingConfig {
  blockedTerms: string[];
  minSpikeCount: number;
  spikeMultiplier: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ROLLING_WINDOW_MS = 2 * HOUR_MS;
const BASELINE_WINDOW_MS = 7 * DAY_MS;
const BASELINE_REFRESH_MS = HOUR_MS;
const SPIKE_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_TRACKED_TERMS = 10_000;
const MIN_TOKEN_LENGTH = 3;
const MIN_SPIKE_SOURCE_COUNT = 2;

// Stopwords — terms that are too generic
const SUPPRESSED_TERMS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "are", "was", "were",
  "has", "have", "had", "been", "but", "not", "its", "you", "all", "can",
  "her", "his", "will", "one", "our", "out", "say", "she", "how", "their",
  "what", "when", "who", "which", "than", "more", "some", "very", "just",
  "also", "about", "into", "over", "after", "before", "between", "being",
  "most", "other", "only", "could", "would", "should", "them", "then",
  "these", "those", "each", "where", "there", "here", "they", "does",
  "did", "been", "many", "well", "back", "even", "give", "still",
  "news", "report", "reports", "says", "said", "according", "new",
  "update", "updates", "live", "latest", "breaking",
  "war", "attack", "attacks", "killed", "people", "country", "government",
  "military", "forces", "russia", "ukraine", "china", "iran", "israel",
]);

const CVE_PATTERN = /CVE-\d{4}-\d{4,}/gi;
const APT_PATTERN = /APT\d+/gi;

const LEADER_NAMES = [
  "putin", "zelensky", "xi jinping", "biden", "trump", "netanyahu",
  "khamenei", "erdogan", "modi", "macron", "scholz", "starmer",
  "orban", "milei", "kim jong un", "al-sisi",
];
const LEADER_PATTERNS = LEADER_NAMES.map((name) => ({
  name,
  pattern: new RegExp(`\\b${escapeRegex(name)}\\b`, "i"),
}));

// ─── State ──────────────────────────────────────────────────────────────────

const termFrequency = new Map<string, TermRecord>();
const seenHeadlines = new Map<string, number>();
let lastBaselineRefreshMs = 0;

const config: TrendingConfig = {
  blockedTerms: [],
  minSpikeCount: 5,
  spikeMultiplier: 3,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTermKey(term: string): string {
  return term.trim().toLowerCase();
}

function asDisplayTerm(term: string): string {
  if (/^(cve-\d{4}-\d{4,}|apt\d+)$/i.test(term)) return term.toUpperCase();
  return term.toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH);
}

/**
 * Extract known entities (CVEs, APTs, leaders) from text.
 */
export function extractEntities(text: string): string[] {
  const entities: string[] = [];
  for (const match of text.matchAll(CVE_PATTERN)) entities.push(match[0].toUpperCase());
  for (const match of text.matchAll(APT_PATTERN)) entities.push(match[0].toUpperCase());
  for (const { name, pattern } of LEADER_PATTERNS) {
    if (pattern.test(text)) entities.push(name);
  }
  return entities;
}

function headlineKey(headline: TrendingHeadlineInput): string {
  const publishedAt = Number.isFinite(headline.pubDate.getTime()) ? headline.pubDate.getTime() : 0;
  return [
    headline.source.trim().toLowerCase(),
    (headline.link ?? "").trim().toLowerCase(),
    headline.title.trim().toLowerCase(),
    publishedAt,
  ].join("|");
}

function stripSourceAttribution(title: string): string {
  const idx = title.lastIndexOf(" - ");
  if (idx === -1) return title;
  const after = title.slice(idx + 3).trim();
  if (after.length > 0 && after.length <= 60 && !/[.!?]/.test(after)) {
    return title.slice(0, idx).trim();
  }
  return title;
}

// ─── Core logic ─────────────────────────────────────────────────────────────

function pruneOldState(now: number): void {
  for (const [key, seenAt] of seenHeadlines) {
    if (now - seenAt > BASELINE_WINDOW_MS) seenHeadlines.delete(key);
  }
  for (const [term, record] of termFrequency) {
    record.timestamps = record.timestamps.filter((ts) => now - ts <= BASELINE_WINDOW_MS);
    record.headlines = record.headlines.filter((h) => now - h.ingestedAt <= ROLLING_WINDOW_MS);
    if (record.timestamps.length === 0) termFrequency.delete(term);
  }

  // Cap maximum tracked terms
  if (termFrequency.size <= MAX_TRACKED_TERMS) return;
  const ordered = Array.from(termFrequency.entries())
    .map(([term, rec]) => ({ term, latest: rec.timestamps[rec.timestamps.length - 1] ?? 0 }))
    .sort((a, b) => a.latest - b.latest);
  for (const { term } of ordered) {
    if (termFrequency.size <= MAX_TRACKED_TERMS) break;
    termFrequency.delete(term);
  }
}

function maybeRefreshBaselines(now: number): void {
  if (now - lastBaselineRefreshMs < BASELINE_REFRESH_MS) return;
  for (const record of termFrequency.values()) {
    const weekCount = record.timestamps.filter((ts) => now - ts <= BASELINE_WINDOW_MS).length;
    record.baseline7d = weekCount / 7;
  }
  lastBaselineRefreshMs = now;
}

function buildTermCandidates(title: string): Map<string, { display: string; isEntity: boolean }> {
  const candidates = new Map<string, { display: string; isEntity: boolean }>();
  const clean = stripSourceAttribution(title);

  for (const token of tokenize(clean)) {
    const key = toTermKey(token);
    if (!SUPPRESSED_TERMS.has(key)) {
      candidates.set(key, { display: token, isEntity: false });
    }
  }
  for (const entity of extractEntities(clean)) {
    candidates.set(toTermKey(entity), { display: entity, isEntity: true });
  }
  return candidates;
}

function recordTerms(
  candidates: Map<string, { display: string; isEntity: boolean }>,
  headline: TrendingHeadlineInput,
  now: number,
  blocked: Set<string>
): void {
  for (const [term, meta] of candidates) {
    if (blocked.has(term)) continue;
    if (!meta.isEntity && term.length < MIN_TOKEN_LENGTH) continue;

    let record = termFrequency.get(term);
    if (!record) {
      record = {
        timestamps: [],
        baseline7d: 0,
        lastSpikeAlertMs: 0,
        displayTerm: asDisplayTerm(meta.display),
        headlines: [],
      };
      termFrequency.set(term, record);
    }

    record.timestamps.push(now);
    record.headlines.push({
      title: headline.title,
      source: headline.source,
      link: headline.link ?? "",
      publishedAt: Number.isFinite(headline.pubDate.getTime()) ? headline.pubDate.getTime() : now,
      ingestedAt: now,
    });
  }
}

function dedupeHeadlines(headlines: StoredHeadline[]): StoredHeadline[] {
  const seen = new Set<string>();
  const unique: StoredHeadline[] = [];
  for (const h of headlines) {
    const key = `${h.source}|${h.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(h);
  }
  return unique;
}

function checkForSpikes(now: number, blocked: Set<string>): TrendingSpike[] {
  const spikes: TrendingSpike[] = [];

  for (const [term, record] of termFrequency) {
    if (blocked.has(term)) continue;

    const recentCount = record.timestamps.filter((ts) => now - ts < ROLLING_WINDOW_MS).length;
    if (recentCount < config.minSpikeCount) continue;

    const baseline = record.baseline7d;
    const multiplier = baseline > 0 ? recentCount / baseline : 0;
    const isSpike = baseline > 0
      ? recentCount > baseline * config.spikeMultiplier
      : recentCount >= config.minSpikeCount;

    if (!isSpike) continue;
    if (now - record.lastSpikeAlertMs < SPIKE_COOLDOWN_MS) continue;

    const recentHeadlines = dedupeHeadlines(
      record.headlines.filter((h) => now - h.ingestedAt <= ROLLING_WINDOW_MS)
    );
    const uniqueSources = new Set(recentHeadlines.map((h) => h.source)).size;
    if (uniqueSources < MIN_SPIKE_SOURCE_COUNT) continue;

    record.lastSpikeAlertMs = now;
    spikes.push({
      term: record.displayTerm,
      count: recentCount,
      baseline,
      multiplier,
      windowMs: ROLLING_WINDOW_MS,
      uniqueSources,
      headlines: recentHeadlines,
    });
  }

  return spikes.sort((a, b) => b.count - a.count);
}

// ─── Public API ─────────────────────────────────────────────────────────────

const pendingSpikes: TrendingSpike[] = [];

/**
 * Ingest a batch of headlines for trending analysis.
 */
export function ingestHeadlines(headlines: TrendingHeadlineInput[]): void {
  if (headlines.length === 0) return;

  const now = Date.now();
  const blocked = new Set([
    ...SUPPRESSED_TERMS,
    ...config.blockedTerms.map(toTermKey),
  ]);

  for (const headline of headlines) {
    if (!headline.title?.trim()) continue;
    const key = headlineKey(headline);
    const prev = seenHeadlines.get(key);
    if (prev && now - prev <= BASELINE_WINDOW_MS) continue;
    seenHeadlines.set(key, now);

    const candidates = buildTermCandidates(headline.title);
    recordTerms(candidates, headline, now, blocked);
  }

  pruneOldState(now);
  maybeRefreshBaselines(now);

  const spikes = checkForSpikes(now, blocked);
  pendingSpikes.push(...spikes);
}

/**
 * Drain pending spikes for consumption by breaking news or WebSocket.
 */
export function drainTrendingSpikes(): TrendingSpike[] {
  return pendingSpikes.splice(0, pendingSpikes.length);
}

/**
 * Get current config.
 */
export function getTrendingConfig(): TrendingConfig {
  return { ...config };
}

/**
 * Update trending config.
 */
export function updateTrendingConfig(update: Partial<TrendingConfig>): TrendingConfig {
  if (update.blockedTerms) config.blockedTerms = update.blockedTerms;
  if (update.minSpikeCount) config.minSpikeCount = Math.max(1, update.minSpikeCount);
  if (update.spikeMultiplier) config.spikeMultiplier = Math.max(1, update.spikeMultiplier);
  return { ...config };
}

/**
 * Block a term from trending.
 */
export function suppressTerm(term: string): void {
  const key = toTermKey(term);
  if (!config.blockedTerms.includes(key)) {
    config.blockedTerms.push(key);
  }
}

/**
 * Get stats about tracked terms.
 */
export function getTrackedTermCount(): number {
  return termFrequency.size;
}
