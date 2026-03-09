/**
 * Breaking news alert pipeline.
 * Adapted from worldmonitor's breaking-news-alerts.ts.
 *
 * Detects breaking news from high-tier sources using keyword matching
 * and deduplication with cooldown windows. Emits alerts for WebSocket
 * broadcast rather than DOM events.
 *
 * Server-side adaptation: no localStorage, no DOM events.
 */

import { classifyThreatLevel, ThreatClassification } from "../utils/threatClassifier.js";
import { getSourceTier } from "../data/feeds.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BreakingAlert {
  id: string;
  title: string;
  source: string;
  tier: number;
  url: string;
  threat: ThreatClassification;
  detectedAt: number;
  category: string;
}

export interface AlertSettings {
  enabled: boolean;
  /** Only sources with tier <= this value trigger alerts */
  maxTier: number;
  /** Cooldown between alerts with similar titles (ms) */
  cooldownMs: number;
  /** Minimum threat level to trigger an alert */
  minThreatLevel: "critical" | "high" | "medium";
  /** Grace period after startup before alerting (ms) */
  startupGraceMs: number;
}

interface AlertInput {
  title: string;
  source: string;
  url: string;
  pubDate?: Date;
}

// ─── State ──────────────────────────────────────────────────────────────────

const MAX_HISTORY = 500;
const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;
const DEFAULT_STARTUP_GRACE_MS = 2 * 60 * 1000;

const alertHistory: BreakingAlert[] = [];
const titleDedup = new Map<string, number>(); // normalized title → last alert time
const startedAt = Date.now();

const settings: AlertSettings = {
  enabled: true,
  maxTier: 2,
  cooldownMs: DEFAULT_COOLDOWN_MS,
  minThreatLevel: "high",
  startupGraceMs: DEFAULT_STARTUP_GRACE_MS,
};

const pendingAlerts: BreakingAlert[] = [];

// ─── Alert keywords for quick gating ────────────────────────────────────────

const BREAKING_PATTERNS = [
  /\bbreaking\b/i,
  /\burgent\b/i,
  /\bjust\s+in\b/i,
  /\bdeveloping\b/i,
  /\bflash\b/i,
  /\bexclusive\b/i,
  /\bexplosion/i,
  /\bmissile\s+(strike|launch|attack)/i,
  /\bnuclear\s+(test|launch|strike|weapon)/i,
  /\binvasion\b/i,
  /\bcoup\b/i,
  /\bassassination/i,
  /\bterror(ist)?\s+(attack|bomb|strike)/i,
  /\bearthquake.*magn/i,
  /\btsunami\s+warning/i,
  /\bsiren/i,
  /\bair\s+raid/i,
  /\bemergency\s+(landing|declaration|alert)/i,
  /\bshot\s+down\b/i,
  /\bdeclares?\s+war/i,
  /\bceasefire/i,
  /\bsurrender/i,
  /\bcyber\s*attack/i,
  /\bdata\s+breach/i,
  /\bmarket\s+(crash|collapse)/i,
  /\bdefault(ed|s)?\s+on\s+debt/i,
];

const EXCLUSION_PATTERNS = [
  /\bopinion\b/i,
  /\beditorial\b/i,
  /\breview\b/i,
  /\bsatire\b/i,
  /\bpodcast\b/i,
  /\binterview\b/i,
  /\banalysis\b/i,
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateAlertId(): string {
  return `ba_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Core logic ─────────────────────────────────────────────────────────────

function isInGracePeriod(): boolean {
  return Date.now() - startedAt < settings.startupGraceMs;
}

function hasBreakingSignal(title: string): boolean {
  return BREAKING_PATTERNS.some((pat) => pat.test(title));
}

function isExcluded(title: string): boolean {
  return EXCLUSION_PATTERNS.some((pat) => pat.test(title));
}

function isDuplicate(normalized: string, now: number): boolean {
  const prev = titleDedup.get(normalized);
  if (!prev) return false;
  return now - prev < settings.cooldownMs;
}

function threatMeetsMinimum(level: string): boolean {
  const hierarchy = ["critical", "high", "medium", "low", "info"];
  const minIdx = hierarchy.indexOf(settings.minThreatLevel);
  const curIdx = hierarchy.indexOf(level);
  return curIdx >= 0 && curIdx <= minIdx;
}

function pruneDedup(now: number): void {
  for (const [title, ts] of titleDedup) {
    if (now - ts > settings.cooldownMs * 2) titleDedup.delete(title);
  }
  while (alertHistory.length > MAX_HISTORY) alertHistory.shift();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Evaluate an incoming headline for breaking news alert potential.
 * Returns the alert if one is generated, null otherwise.
 */
export function evaluateForBreakingAlert(input: AlertInput): BreakingAlert | null {
  if (!settings.enabled) return null;
  if (isInGracePeriod()) return null;
  if (!input.title?.trim()) return null;
  if (isExcluded(input.title)) return null;

  const now = Date.now();
  const tier = getSourceTier(input.source);

  // Only high-tier sources trigger alerts
  if (tier > settings.maxTier) return null;

  // Must have breaking signal or critical threat classification
  const threat = classifyThreatLevel(input.title);
  const hasSignal = hasBreakingSignal(input.title);
  const hasThreat = threatMeetsMinimum(threat.level);

  if (!hasSignal && !hasThreat) return null;

  // Dedup
  const normalized = normalizeTitle(input.title);
  if (isDuplicate(normalized, now)) return null;

  titleDedup.set(normalized, now);
  pruneDedup(now);

  const alert: BreakingAlert = {
    id: generateAlertId(),
    title: input.title,
    source: input.source,
    tier,
    url: input.url,
    threat,
    detectedAt: now,
    category: threat.category ?? "general",
  };

  alertHistory.push(alert);
  pendingAlerts.push(alert);

  return alert;
}

/**
 * Evaluate a batch of headlines and return all generated alerts.
 */
export function evaluateBatch(inputs: AlertInput[]): BreakingAlert[] {
  const alerts: BreakingAlert[] = [];
  for (const input of inputs) {
    const alert = evaluateForBreakingAlert(input);
    if (alert) alerts.push(alert);
  }
  return alerts;
}

/**
 * Drain pending alerts for WebSocket broadcast.
 */
export function drainBreakingAlerts(): BreakingAlert[] {
  return pendingAlerts.splice(0, pendingAlerts.length);
}

/**
 * Get recent alert history.
 */
export function getAlertHistory(limit = 50): BreakingAlert[] {
  return alertHistory.slice(-limit);
}

/**
 * Get current settings.
 */
export function getAlertSettings(): AlertSettings {
  return { ...settings };
}

/**
 * Update alert settings.
 */
export function updateAlertSettings(update: Partial<AlertSettings>): AlertSettings {
  if (update.enabled !== undefined) settings.enabled = update.enabled;
  if (update.maxTier !== undefined) settings.maxTier = Math.max(1, Math.min(4, update.maxTier));
  if (update.cooldownMs !== undefined) settings.cooldownMs = Math.max(0, update.cooldownMs);
  if (update.minThreatLevel !== undefined) settings.minThreatLevel = update.minThreatLevel;
  if (update.startupGraceMs !== undefined) settings.startupGraceMs = Math.max(0, update.startupGraceMs);
  return { ...settings };
}
