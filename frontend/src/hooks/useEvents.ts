import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { ConflictEvent, EventDetail, StatsResult, TimelineBucket, MapLayer, Filters } from "../types";
import { useAppStore } from "../stores/useAppStore";

function buildEventParams(filters: Filters) {
  const params: Record<string, string | number | undefined> = {};
  if (filters.country) params.country = filters.country;
  if (filters.eventType) params.eventType = filters.eventType;
  if (filters.verificationStatus) params.verificationStatus = filters.verificationStatus;
  if (filters.minConfidence > 0) params.minConfidence = filters.minConfidence;
  if (filters.start) params.start = filters.start;
  if (filters.end) params.end = filters.end;

  // Derive start from timeRange if no custom start set.
  // Round to the nearest 5 minutes so the query key is stable across renders.
  if (!filters.start) {
    const rangeMs: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const ms = rangeMs[filters.timeRange];
    if (ms) {
      const BUCKET = 5 * 60 * 1000; // 5-minute bucket
      params.start = new Date(Math.floor((Date.now() - ms) / BUCKET) * BUCKET).toISOString();
    }
  }

  return params;
}

export function useEvents() {
  const filters = useAppStore((s) => s.filters);
  const params = buildEventParams(filters);

  return useQuery({
    queryKey: ["events", params],
    queryFn: () =>
      apiFetch<{ data: ConflictEvent[] }>("/api/events", params).then(
        (r) => r.data
      ),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useEventDetail(id: string | null) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () =>
      apiFetch<{ data: EventDetail }>(`/api/events/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useStats() {
  const filters = useAppStore((s) => s.filters);
  const params = buildEventParams(filters);

  return useQuery({
    queryKey: ["stats", params],
    queryFn: () =>
      apiFetch<{ data: StatsResult }>("/api/stats", params).then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useTimeline() {
  const timeRange = useAppStore((s) => s.filters.timeRange);

  return useQuery({
    queryKey: ["timeline", timeRange],
    queryFn: () =>
      apiFetch<{ data: TimelineBucket[] }>("/api/timeline", { range: timeRange }).then(
        (r) => r.data
      ),
    refetchInterval: 60_000,
  });
}

export function useMapLayers() {
  return useQuery({
    queryKey: ["map-layers"],
    queryFn: () =>
      apiFetch<{ data: MapLayer[] }>("/api/map/layers").then((r) => r.data),
    staleTime: Infinity,
  });
}
