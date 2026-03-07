import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

export interface TrackedAircraft {
  id: string;
  callsign: string;
  country: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  on_ground: boolean;
  is_military: boolean;
  affiliation: string;
  aircraft_type: string;
  registration: string;
  updated_at: number;
}

export interface TrackedVessel {
  mmsi: string;
  name: string;
  flag: string;
  type_code: number;
  type_name: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  destination: string;
  is_warship: boolean;
  affiliation: string;
  updated_at: number;
}

export function useAircraft() {
  return useQuery({
    queryKey: ["aircraft"],
    queryFn: () => apiFetch<{ data: TrackedAircraft[] }>("/api/aircraft").then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useVessels() {
  return useQuery({
    queryKey: ["vessels"],
    queryFn: () => apiFetch<{ data: TrackedVessel[] }>("/api/vessels").then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}
