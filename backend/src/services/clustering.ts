/**
 * Headline clustering service.
 * Adapted from worldmonitor's clustering.ts.
 *
 * Groups related headlines using Jaccard similarity on title tokens.
 * No ML/semantic similarity — pure set-overlap approach with
 * tier-aware merging.
 *
 * Server-side adaptation: no browser ML worker.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClusterInput {
  id: string;
  title: string;
  source: string;
  tier: number;
  publishedAt: number;
  link?: string;
}

export interface NewsCluster {
  id: string;
  /** Representative headline (from the highest-tier source) */
  headline: string;
  articles: ClusterInput[];
  sources: string[];
  bestTier: number;
  createdAt: number;
  updatedAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const JACCARD_THRESHOLD = 0.30;
const MIN_TOKEN_LENGTH = 3;
const MAX_CLUSTERS = 200;
const CLUSTER_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "are", "was",
  "were", "has", "have", "had", "been", "but", "not", "its", "you",
  "all", "can", "her", "his", "will", "one", "our", "out", "say",
  "she", "they", "how", "their", "what", "when", "who",
]);

// ─── State ──────────────────────────────────────────────────────────────────

const clusters: Map<string, NewsCluster> = new Map();
let clusterSeq = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  return inter / (a.size + b.size - inter);
}

function generateClusterId(): string {
  return `cluster_${++clusterSeq}`;
}

function pickRepresentative(articles: ClusterInput[]): ClusterInput {
  return articles.reduce((best, cur) => {
    if (cur.tier < best.tier) return cur;
    if (cur.tier === best.tier && cur.publishedAt > best.publishedAt) return cur;
    return best;
  });
}

// ─── Core logic ─────────────────────────────────────────────────────────────

function pruneExpiredClusters(now: number): void {
  for (const [id, cluster] of clusters) {
    if (now - cluster.updatedAt > CLUSTER_TTL_MS) clusters.delete(id);
  }
  // Cap total clusters
  if (clusters.size <= MAX_CLUSTERS) return;
  const sorted = Array.from(clusters.entries())
    .sort(([, a], [, b]) => a.updatedAt - b.updatedAt);
  for (const [id] of sorted) {
    if (clusters.size <= MAX_CLUSTERS) break;
    clusters.delete(id);
  }
}

/**
 * Find existing cluster best matching the input, or null.
 */
function findBestCluster(tokens: Set<string>): NewsCluster | null {
  let best: NewsCluster | null = null;
  let bestScore = 0;

  for (const cluster of clusters.values()) {
    // Compare against all articles in the cluster
    for (const article of cluster.articles) {
      const artTokens = tokenize(article.title);
      const score = jaccardSimilarity(tokens, artTokens);
      if (score > bestScore && score >= JACCARD_THRESHOLD) {
        bestScore = score;
        best = cluster;
      }
    }
  }
  return best;
}

function addToCluster(cluster: NewsCluster, article: ClusterInput, now: number): void {
  // Avoid duplicates
  if (cluster.articles.some((a) => a.id === article.id)) return;
  cluster.articles.push(article);
  cluster.updatedAt = now;
  if (!cluster.sources.includes(article.source)) {
    cluster.sources.push(article.source);
  }
  if (article.tier < cluster.bestTier) {
    cluster.bestTier = article.tier;
  }
  // Update representative headline
  const rep = pickRepresentative(cluster.articles);
  cluster.headline = rep.title;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Cluster a batch of headlines. Returns updated/new clusters.
 */
export function clusterHeadlines(inputs: ClusterInput[]): NewsCluster[] {
  const now = Date.now();
  pruneExpiredClusters(now);

  const touchedClusters = new Set<string>();

  for (const input of inputs) {
    if (!input.title?.trim()) continue;

    const tokens = tokenize(input.title);
    if (tokens.size < 2) continue;

    const existing = findBestCluster(tokens);
    if (existing) {
      addToCluster(existing, input, now);
      touchedClusters.add(existing.id);
    } else {
      const id = generateClusterId();
      const cluster: NewsCluster = {
        id,
        headline: input.title,
        articles: [input],
        sources: [input.source],
        bestTier: input.tier,
        createdAt: now,
        updatedAt: now,
      };
      clusters.set(id, cluster);
      touchedClusters.add(id);
    }
  }

  return Array.from(touchedClusters)
    .map((id) => clusters.get(id)!)
    .filter(Boolean)
    .sort((a, b) => b.articles.length - a.articles.length);
}

/**
 * Get all active clusters, sorted by article count descending.
 */
export function getActiveClusters(minArticles = 2): NewsCluster[] {
  return Array.from(clusters.values())
    .filter((c) => c.articles.length >= minArticles)
    .sort((a, b) => b.articles.length - a.articles.length);
}

/**
 * Get a specific cluster by ID.
 */
export function getClusterById(id: string): NewsCluster | undefined {
  return clusters.get(id);
}

/**
 * Get stats.
 */
export function getClusterStats(): { totalClusters: number; multiArticleClusters: number; totalArticles: number } {
  let totalArticles = 0;
  let multiArticle = 0;
  for (const c of clusters.values()) {
    totalArticles += c.articles.length;
    if (c.articles.length >= 2) multiArticle++;
  }
  return { totalClusters: clusters.size, multiArticleClusters: multiArticle, totalArticles };
}
