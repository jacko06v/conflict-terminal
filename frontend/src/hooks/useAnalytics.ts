import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type {
  TrendingSpike,
  BreakingAlert,
  ConvergenceAlert,
  CountryInstability,
  NewsCluster,
  HotspotEscalation,
  FocalPointSummary,
  CascadeResult,
} from "../types";

// ─── Trending Keywords ──────────────────────────────────────────────

export function useTrending() {
  return useQuery({
    queryKey: ["trending"],
    queryFn: () =>
      apiFetch<{ data: TrendingSpike[]; trackedTerms: number }>(
        "/api/analytics/trending"
      ),
    refetchInterval: 30_000,
  });
}

// ─── Breaking News ──────────────────────────────────────────────────

export function useBreakingHistory(limit = 20) {
  return useQuery({
    queryKey: ["breaking-history", limit],
    queryFn: () =>
      apiFetch<{ data: BreakingAlert[] }>("/api/analytics/breaking/history", {
        limit,
      }),
    refetchInterval: 30_000,
  });
}

// ─── Clusters ───────────────────────────────────────────────────────

export function useClusters(minArticles = 2) {
  return useQuery({
    queryKey: ["clusters", minArticles],
    queryFn: () =>
      apiFetch<{ data: NewsCluster[]; total: number }>(
        "/api/analytics/clusters",
        { minArticles }
      ),
    refetchInterval: 60_000,
  });
}

// ─── Convergence ────────────────────────────────────────────────────

export function useConvergenceAlerts() {
  return useQuery({
    queryKey: ["convergence"],
    queryFn: () =>
      apiFetch<{ data: ConvergenceAlert[]; cells: number }>(
        "/api/convergence/alerts"
      ),
    refetchInterval: 60_000,
  });
}

// ─── Country Instability ────────────────────────────────────────────

export function useInstabilityRanking(limit = 15) {
  return useQuery({
    queryKey: ["instability", limit],
    queryFn: () =>
      apiFetch<{ data: CountryInstability[]; tracked: number }>(
        "/api/instability/ranking",
        { limit }
      ),
    refetchInterval: 60_000,
  });
}

// ─── Strategic Data ─────────────────────────────────────────────────

export function useStrategicData(layer: string) {
  return useQuery({
    queryKey: ["strategic", layer],
    queryFn: () => apiFetch<{ data: unknown[] }>(`/api/strategic/${layer}`),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Hotspot Escalation ─────────────────────────────────────────────

export function useEscalation() {
  return useQuery({
    queryKey: ["escalation"],
    queryFn: async () => {
      const res = await apiFetch<{ data: HotspotEscalation[] }>("/api/strategic/escalation");
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

// ─── Focal Points ───────────────────────────────────────────────────

export function useFocalPoints() {
  return useQuery({
    queryKey: ["focal-points"],
    queryFn: async () => {
      const res = await apiFetch<{ data: FocalPointSummary | null }>("/api/strategic/focal-points");
      return res.data;
    },
    refetchInterval: 60_000,
  });
}

// ─── Infrastructure Cascade ─────────────────────────────────────────

export function useCascade(sourceId: string | null) {
  return useQuery({
    queryKey: ["cascade", sourceId],
    queryFn: async () => {
      const res = await apiFetch<{ data: CascadeResult }>(
        `/api/strategic/cascade/${encodeURIComponent(sourceId!)}`,
      );
      return res.data;
    },
    enabled: !!sourceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCascadeStats() {
  return useQuery({
    queryKey: ["cascade-stats"],
    queryFn: async () => {
      const res = await apiFetch<{ data: { nodes: number; edges: number } }>("/api/strategic/cascade/stats");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
