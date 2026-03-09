/**
 * News Importance Scoring — ported from worldmonitor ALGORITHMS.md
 *
 * Ranks news items by geopolitical significance using a multi-signal
 * importance scoring algorithm with 5 severity tiers, source confirmation
 * boost, and demotion keywords.
 */

/* ── Scoring tiers ─────────────────────────────────── */

interface ScoringTier {
  category: string;
  baseScore: number;
  perMatchBonus: number;
  keywords: string[];
}

const SCORING_TIERS: ScoringTier[] = [
  {
    category: 'violence',
    baseScore: 100,
    perMatchBonus: 25,
    keywords: [
      'killed', 'dead', 'death', 'shot', 'casualty', 'casualties',
      'massacre', 'crackdown', 'slaughter', 'execution', 'bombing',
      'suicide bomb', 'car bomb', 'mass shooting', 'fatalities',
    ],
  },
  {
    category: 'military',
    baseScore: 80,
    perMatchBonus: 20,
    keywords: [
      'war', 'invasion', 'airstrike', 'missile', 'troops', 'combat',
      'fleet', 'artillery', 'drone strike', 'military operation',
      'naval blockade', 'carrier group', 'nuclear weapon', 'warhead',
      'ballistic missile', 'cruise missile', 'air defense',
    ],
  },
  {
    category: 'unrest',
    baseScore: 40,
    perMatchBonus: 15,
    keywords: [
      'protest', 'uprising', 'riot', 'demonstration', 'revolution',
      'coup', 'martial law', 'state of emergency', 'curfew',
      'civil unrest', 'clashes', 'tear gas', 'crackdown',
    ],
  },
  {
    category: 'flashpoint',
    baseScore: 0,
    perMatchBonus: 20,
    keywords: [
      'iran', 'russia', 'china', 'taiwan', 'ukraine', 'israel',
      'gaza', 'north korea', 'syria', 'yemen', 'hamas', 'hezbollah',
      'nato', 'kremlin', 'pentagon', 'pyongyang', 'tehran',
    ],
  },
  {
    category: 'crisis',
    baseScore: 0,
    perMatchBonus: 10,
    keywords: [
      'sanctions', 'escalation', 'breaking', 'urgent', 'humanitarian',
      'ceasefire', 'peace talks', 'nuclear deal', 'crisis',
      'emergency', 'evacuation', 'refugee', 'displaced',
    ],
  },
];

/* ── Demotion keywords (business/corporate noise) ── */

const DEMOTION_KEYWORDS = [
  'ceo', 'earnings', 'stock', 'startup', 'revenue', 'ipo',
  'quarterly', 'profit', 'shareholder', 'dividend', 'market cap',
  'acquisition', 'merger', 'venture capital', 'tech layoffs',
];

const DEMOTION_PENALTY = -30;

/* ── Scoring interface ─────────────────────────────── */

export interface ScoredNewsItem {
  id: string;
  title: string;
  importanceScore: number;
  matchedCategories: string[];
  sourceCount: number;
}

export interface NewsItemInput {
  id: string;
  title: string;
  source?: string;
  sourceTier?: number;
}

/* ── Core scoring function ─────────────────────────── */

function scoreSingleItem(title: string): { score: number; categories: string[] } {
  const lower = title.toLowerCase();
  let totalScore = 0;
  const matchedCategories: string[] = [];

  for (const tier of SCORING_TIERS) {
    let tierMatches = 0;

    for (const kw of tier.keywords) {
      if (lower.includes(kw)) {
        tierMatches++;
      }
    }

    if (tierMatches > 0) {
      // Base score (once per category) + per-match bonus
      totalScore += tier.baseScore + tierMatches * tier.perMatchBonus;
      matchedCategories.push(tier.category);
    }
  }

  // Demotion check
  for (const kw of DEMOTION_KEYWORDS) {
    if (lower.includes(kw)) {
      totalScore += DEMOTION_PENALTY;
      break; // only demote once
    }
  }

  return { score: Math.max(0, totalScore), categories: matchedCategories };
}

/**
 * Score a single headline. Returns the importance score (0+).
 */
export function scoreHeadline(title: string): number {
  return scoreSingleItem(title).score;
}

/**
 * Score and rank a batch of news items.
 *
 * - Groups items by similar title for source confirmation boost (+10 per extra source)
 * - Returns sorted descending by importance score
 */
export function rankNewsByImportance(items: NewsItemInput[]): ScoredNewsItem[] {
  // Group by near-identical titles for source-confirmation
  const groups = new Map<string, NewsItemInput[]>();

  for (const item of items) {
    // Normalize: lowercase, strip punctuation for grouping
    const key = item.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .slice(0, 80);

    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const scored: ScoredNewsItem[] = [];

  for (const [, group] of groups) {
    const representative = group[0]!;
    const { score, categories } = scoreSingleItem(representative.title);

    // Source confirmation boost: +10 per additional independent source
    const sourceConfirmation = Math.max(0, group.length - 1) * 10;

    // Source tier bonus: Tier 1 = +15, Tier 2 = +5
    let tierBonus = 0;
    for (const item of group) {
      if (item.sourceTier === 1) { tierBonus = Math.max(tierBonus, 15); }
      else if (item.sourceTier === 2) { tierBonus = Math.max(tierBonus, 5); }
    }

    scored.push({
      id: representative.id,
      title: representative.title,
      importanceScore: score + sourceConfirmation + tierBonus,
      matchedCategories: categories,
      sourceCount: group.length,
    });
  }

  return scored.sort((a, b) => b.importanceScore - a.importanceScore);
}

/**
 * Quick filter: only items above a minimum importance threshold.
 */
export function filterSignificant(items: NewsItemInput[], minScore = 40): ScoredNewsItem[] {
  return rankNewsByImportance(items).filter(i => i.importanceScore >= minScore);
}
