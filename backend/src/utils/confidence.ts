/**
 * Confidence scoring utilities.
 *
 * Confidence is a 0-100 score representing how reliable an event report is.
 * It accounts for:
 *  - Number and reliability of sources
 *  - Geolocation precision
 *  - Corroboration between source types (satellite + news = higher)
 *  - Whether multiple source types agree (multi-modal corroboration)
 *
 * This scoring is intentionally transparent and conservative.
 * It does NOT infer facts beyond what the data supports.
 */

import { RawItem, VerificationStatus } from "../types";

interface SourceWeight {
  sourceType: string;
  reliabilityScore: number;
}

/**
 * Calculate a composite confidence score from raw source information.
 * Result is clamped to [0, 100].
 */
export function calculateConfidenceScore(
  sources: SourceWeight[],
  geolocationPrecision: string
): number {
  if (sources.length === 0) return 10;

  // Base: weighted average reliability of sources
  const totalWeight = sources.reduce((acc, s) => acc + s.reliabilityScore, 0);
  const avgReliability = totalWeight / sources.length;

  // Bonus for multiple sources
  const sourceCountBonus = Math.min((sources.length - 1) * 5, 20);

  // Bonus for multi-modal corroboration (satellite + news/manual)
  const types = new Set(sources.map((s) => s.sourceType));
  const hasMultiModal =
    (types.has("satellite") || types.has("api")) &&
    (types.has("news") || types.has("manual") || types.has("social"));
  const multiModalBonus = hasMultiModal ? 10 : 0;

  // Penalty for geolocation imprecision
  const geoPenalty =
    geolocationPrecision === "exact"
      ? 0
      : geolocationPrecision === "approximate"
      ? -5
      : -15; // area

  const score =
    avgReliability + sourceCountBonus + multiModalBonus + geoPenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine verification status from confidence score and source types.
 * - verified: score >= 80 and includes a high-reliability source (score >= 80)
 * - partial: score >= 50 or multiple sources
 * - unverified: everything else
 */
export function deriveVerificationStatus(
  confidenceScore: number,
  sources: SourceWeight[]
): VerificationStatus {
  const hasHighReliabilitySource = sources.some((s) => s.reliabilityScore >= 80);
  if (confidenceScore >= 80 && hasHighReliabilitySource) return "verified";
  if (confidenceScore >= 50 || sources.length >= 2) return "partial";
  return "unverified";
}

/**
 * Check temporal proximity: returns true if two dates are within `thresholdHours`.
 */
export function areTemporallyProximate(
  date1: Date,
  date2: Date,
  thresholdHours: number
): boolean {
  return (
    Math.abs(date1.getTime() - date2.getTime()) <=
    thresholdHours * 60 * 60 * 1000
  );
}

/**
 * Score the reliability of a source type.
 * Manual analysis by trained analysts is weighted highest.
 */
export function defaultReliabilityForSourceType(sourceType: string): number {
  const defaults: Record<string, number> = {
    manual: 80,
    satellite: 78,
    api: 75,
    news: 65,
    social: 30,
  };
  return defaults[sourceType] ?? 40;
}

/**
 * Given existing event data and a new incoming item, determine if confidence
 * should be upgraded (e.g. satellite hotspot near previously reported strike).
 * Returns the updated score, or the original if no upgrade warranted.
 */
export function mergeConfidence(
  existingScore: number,
  newSources: SourceWeight[],
  geolocationPrecision: string
): number {
  const newScore = calculateConfidenceScore(newSources, geolocationPrecision);
  // Take the higher score, but allow partial bonus for corroboration
  const merged = Math.max(existingScore, newScore) + 3;
  return Math.min(100, merged);
}

/**
 * Main entry point for confidence calculation from a RawItem.
 */
export function scoreRawItem(item: RawItem): {
  confidenceScore: number;
  verificationStatus: VerificationStatus;
} {
  const sourceWeights: SourceWeight[] = item.sources.map((s) => ({
    sourceType: s.sourceType,
    reliabilityScore: s.reliabilityScore,
  }));

  const confidenceScore = calculateConfidenceScore(
    sourceWeights,
    item.geolocationPrecision
  );
  const verificationStatus = deriveVerificationStatus(
    confidenceScore,
    sourceWeights
  );

  return { confidenceScore, verificationStatus };
}
