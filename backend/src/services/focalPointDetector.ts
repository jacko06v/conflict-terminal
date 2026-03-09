/**
 * Focal Point Detector — adapted from worldmonitor focal-point-detector.ts
 *
 * Correlates news entities from headline clustering with geo-signals
 * (convergence alerts, escalation scores, instability) to identify
 * "main characters" — countries, groups, or leaders that appear across
 * multiple intelligence streams.
 *
 * Simplified server-side version: uses our entity index + clustering +
 * geo convergence, without the browser-side signal aggregator.
 */

import { extractEntities, type Entity } from "../utils/entityIndex";

/* ── Types ─────────────────────────────────────────── */

export type FocalPointUrgency = "watch" | "elevated" | "critical";

export interface HeadlineRef {
  title: string;
  source?: string;
}

export interface EntityMention {
  entityId: string;
  entityType: Entity["type"];
  displayName: string;
  mentionCount: number;
  clusterIds: string[];
  topHeadlines: HeadlineRef[];
}

export interface FocalPoint {
  id: string;
  entityId: string;
  entityType: Entity["type"];
  displayName: string;
  newsMentions: number;
  newsVelocity: number;
  topHeadlines: HeadlineRef[];
  signalCount: number;
  signalDescriptions: string[];
  focalScore: number;
  urgency: FocalPointUrgency;
  narrative: string;
  correlationEvidence: string[];
}

export interface FocalPointSummary {
  timestamp: Date;
  focalPoints: FocalPoint[];
  topCountries: FocalPoint[];
  topGroups: FocalPoint[];
}

/* ── Input types from other services ───────────────── */

export interface ClusterInput {
  id: string;
  headline: string;
  articleCount: number;
  sources: string[];
}

export interface GeoSignalInput {
  country?: string;
  convergenceScore?: number;
  instabilityScore?: number;
  escalationScore?: number;
  hasBreaking?: boolean;
}

/* ── State ─────────────────────────────────────────── */

let lastSummary: FocalPointSummary | null = null;

/* ── Core analysis ─────────────────────────────────── */

/**
 * Analyze current news clusters + geo signals to produce focal points.
 */
export function analyze(
  clusters: ClusterInput[],
  geoSignals: Map<string, GeoSignalInput>,
): FocalPointSummary {
  // Step 1: Extract entities from all cluster headlines
  const entityMentions = aggregateEntitiesFromClusters(clusters);

  // Step 2: Build focal points by merging news mentions with geo signals
  const focalPoints = buildFocalPoints(entityMentions, geoSignals);

  // Sort by score descending
  focalPoints.sort((a, b) => b.focalScore - a.focalScore);

  lastSummary = {
    timestamp: new Date(),
    focalPoints,
    topCountries: focalPoints.filter((fp) => fp.entityType === "country").slice(0, 5),
    topGroups: focalPoints.filter((fp) => fp.entityType === "group").slice(0, 3),
  };

  return lastSummary;
}

function aggregateEntitiesFromClusters(clusters: ClusterInput[]): Map<string, EntityMention> {
  const mentions = new Map<string, EntityMention>();

  for (const cluster of clusters) {
    const entities = extractEntities(cluster.headline);

    for (const entity of entities) {
      const existing = mentions.get(entity.id);
      if (existing) {
        existing.mentionCount += cluster.articleCount;
        existing.clusterIds.push(cluster.id);
        if (existing.topHeadlines.length < 3) {
          existing.topHeadlines.push({
            title: cluster.headline,
            source: cluster.sources[0],
          });
        }
      } else {
        mentions.set(entity.id, {
          entityId: entity.id,
          entityType: entity.type,
          displayName: entity.name,
          mentionCount: cluster.articleCount,
          clusterIds: [cluster.id],
          topHeadlines: [{ title: cluster.headline, source: cluster.sources[0] }],
        });
      }
    }
  }

  return mentions;
}

function buildFocalPoints(
  entityMentions: Map<string, EntityMention>,
  geoSignals: Map<string, GeoSignalInput>,
): FocalPoint[] {
  const focalPoints: FocalPoint[] = [];

  for (const [entityId, mention] of entityMentions) {
    // Try to find matching geo signals by entity id or country code
    const signal = geoSignals.get(entityId) || geoSignals.get(entityId.toUpperCase());

    const focalPoint = createFocalPoint(mention, signal ?? null);
    if (focalPoint.focalScore >= 5) {
      focalPoints.push(focalPoint);
    }
  }

  // Also add geo-signal-only countries not in news
  for (const [countryCode, signal] of geoSignals) {
    if (!entityMentions.has(countryCode) && !entityMentions.has(countryCode.toLowerCase())) {
      const signalScore = calculateSignalScore(signal);
      if (signalScore > 20) {
        focalPoints.push({
          id: `fp-${countryCode}`,
          entityId: countryCode,
          entityType: "country",
          displayName: countryCode,
          newsMentions: 0,
          newsVelocity: 0,
          topHeadlines: [],
          signalCount: countSignals(signal),
          signalDescriptions: describeSignals(signal),
          focalScore: signalScore,
          urgency: determineUrgency(signalScore, countSignals(signal)),
          narrative: `Geo signals only: ${describeSignals(signal).join(", ")}`,
          correlationEvidence: [],
        });
      }
    }
  }

  return focalPoints;
}

function createFocalPoint(mention: EntityMention, signal: GeoSignalInput | null): FocalPoint {
  const newsScore = calculateNewsScore(mention);
  const signalScore = signal ? calculateSignalScore(signal) : 0;
  const correlationBonus = mention.mentionCount > 0 && signal ? 10 : 0;

  const rawScore = newsScore + signalScore + correlationBonus;
  const urgency = determineUrgency(rawScore, signal ? countSignals(signal) : 0);
  const urgencyMultiplier = urgency === "critical" ? 1.3 : urgency === "elevated" ? 1.15 : 1.0;
  const focalScore = Math.min(100, rawScore * urgencyMultiplier);

  const signalDescriptions = signal ? describeSignals(signal) : [];
  const narrative = generateNarrative(mention, signal, signalDescriptions);
  const correlationEvidence = getCorrelationEvidence(mention, signal);

  return {
    id: `fp-${mention.entityId}`,
    entityId: mention.entityId,
    entityType: mention.entityType,
    displayName: mention.displayName,
    newsMentions: mention.mentionCount,
    newsVelocity: mention.mentionCount / 24,
    topHeadlines: mention.topHeadlines,
    signalCount: signal ? countSignals(signal) : 0,
    signalDescriptions,
    focalScore: Math.round(focalScore * 10) / 10,
    urgency,
    narrative,
    correlationEvidence,
  };
}

/* ── Score helpers ─────────────────────────────────── */

function calculateNewsScore(mention: EntityMention): number {
  const base = Math.min(20, mention.mentionCount * 4);
  const velocity = Math.min(10, (mention.mentionCount / 24) * 2);
  const clusterDiversity = Math.min(10, mention.clusterIds.length * 3);
  return base + velocity + clusterDiversity;
}

function calculateSignalScore(signal: GeoSignalInput): number {
  let score = 0;
  if (signal.convergenceScore) score += Math.min(25, signal.convergenceScore * 5);
  if (signal.instabilityScore) score += Math.min(25, signal.instabilityScore / 4);
  if (signal.escalationScore) score += Math.min(25, signal.escalationScore * 5);
  if (signal.hasBreaking) score += 15;
  return score;
}

function countSignals(signal: GeoSignalInput): number {
  let count = 0;
  if (signal.convergenceScore && signal.convergenceScore > 0) count++;
  if (signal.instabilityScore && signal.instabilityScore > 0) count++;
  if (signal.escalationScore && signal.escalationScore > 0) count++;
  if (signal.hasBreaking) count++;
  return count;
}

function describeSignals(signal: GeoSignalInput): string[] {
  const desc: string[] = [];
  if (signal.convergenceScore && signal.convergenceScore > 0) desc.push(`convergence score ${signal.convergenceScore.toFixed(1)}`);
  if (signal.instabilityScore && signal.instabilityScore > 0) desc.push(`instability ${signal.instabilityScore.toFixed(0)}/100`);
  if (signal.escalationScore && signal.escalationScore > 0) desc.push(`escalation ${signal.escalationScore.toFixed(1)}/5`);
  if (signal.hasBreaking) desc.push("breaking news active");
  return desc;
}

function determineUrgency(score: number, signalCount: number): FocalPointUrgency {
  if (score > 70 || signalCount >= 3) return "critical";
  if (score > 50 || signalCount >= 2) return "elevated";
  return "watch";
}

function generateNarrative(
  mention: EntityMention,
  signal: GeoSignalInput | null,
  signalDescriptions: string[],
): string {
  const parts: string[] = [];

  if (mention.mentionCount > 0) {
    parts.push(`${mention.mentionCount} news mentions across ${mention.clusterIds.length} clusters`);
  }

  if (signalDescriptions.length > 0) {
    parts.push(signalDescriptions.join(", "));
  }

  if (mention.topHeadlines.length > 0 && mention.topHeadlines[0]) {
    const headline = mention.topHeadlines[0].title.slice(0, 60);
    parts.push(`"${headline}..."`);
  }

  return parts.join(" | ");
}

function getCorrelationEvidence(mention: EntityMention, signal: GeoSignalInput | null): string[] {
  const evidence: string[] = [];

  if (mention.mentionCount > 0 && signal) {
    const sigCount = countSignals(signal);
    if (sigCount > 0) {
      evidence.push(
        `${mention.displayName} appears in news (${mention.mentionCount} mentions) and ${sigCount} geo-intelligence signals`,
      );
    }
  }

  if (signal && countSignals(signal) >= 2) {
    evidence.push(`Multiple signal convergence: ${describeSignals(signal).join(" + ")}`);
  }

  return evidence;
}

/* ── Public getters ────────────────────────────────── */

export function getLastSummary(): FocalPointSummary | null {
  return lastSummary;
}

export function getCountryUrgency(
  countryCode: string,
): FocalPointUrgency | null {
  if (!lastSummary) return null;
  const fp = lastSummary.focalPoints.find(
    (fp) => fp.entityType === "country" && fp.entityId === countryCode.toLowerCase(),
  );
  return fp?.urgency ?? null;
}

export function getCountryUrgencyMap(): Map<string, FocalPointUrgency> {
  const map = new Map<string, FocalPointUrgency>();
  if (!lastSummary) return map;
  for (const fp of lastSummary.focalPoints) {
    if (fp.entityType === "country") {
      map.set(fp.entityId, fp.urgency);
    }
  }
  return map;
}
