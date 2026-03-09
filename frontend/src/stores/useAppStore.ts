import { create } from "zustand";
import { ConflictEvent, EventType, Filters, MapLayer, VerificationStatus, TrendingSpike, BreakingAlert, ConvergenceAlert, HotspotEscalation, FocalPointSummary } from "../types";

interface InfraLayers {
  military: boolean;
  nuclear: boolean;
  riskZones: boolean;
  pipelines: boolean;
  waterways: boolean;
  hotspots: boolean;
  spaceports: boolean;
}

interface AppState {
  // Selected event (for detail panel)
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;

  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  // Map layers visibility
  layers: MapLayer[];
  setLayerVisibility: (eventType: EventType, visible: boolean) => void;
  setLayers: (layers: MapLayer[]) => void;

  // Infrastructure overlay layers
  infraLayers: InfraLayers;
  setInfraLayer: (key: keyof InfraLayers, visible: boolean) => void;

  // Live events injected via WebSocket
  liveEvents: ConflictEvent[];
  addLiveEvent: (event: ConflictEvent) => void;

  // Filter panel open
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;

  // ── Advanced analytics state ──────────────────────────────────────
  trendingSpikes: TrendingSpike[];
  addTrendingSpikes: (spikes: TrendingSpike[]) => void;

  breakingAlerts: BreakingAlert[];
  addBreakingAlerts: (alerts: BreakingAlert[]) => void;
  dismissBreakingAlert: (id: string) => void;

  convergenceAlerts: ConvergenceAlert[];
  setConvergenceAlerts: (alerts: ConvergenceAlert[]) => void;

  // ── Escalation & Focal Points (from WS) ───────────────────────────
  escalationScores: HotspotEscalation[];
  setEscalationScores: (scores: HotspotEscalation[]) => void;

  focalSummary: FocalPointSummary | null;
  setFocalSummary: (summary: FocalPointSummary) => void;
}

const DEFAULT_FILTERS: Filters = {
  country: "",
  eventType: "",
  verificationStatus: "",
  minConfidence: 0,
  start: "",
  end: "",
  timeRange: "30d",
};

export const useAppStore = create<AppState>((set) => ({
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),

  filters: DEFAULT_FILTERS,
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  layers: [],
  setLayers: (layers) => set({ layers }),
  setLayerVisibility: (eventType, visible) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.event_type === eventType ? { ...l, visible } : l
      ),
    })),

  infraLayers: { military: false, nuclear: false, riskZones: false, pipelines: false, waterways: false, hotspots: false, spaceports: false },
  setInfraLayer: (key, visible) =>
    set((state) => ({
      infraLayers: { ...state.infraLayers, [key]: visible },
    })),

  liveEvents: [],
  addLiveEvent: (event) =>
    set((state) => ({
      liveEvents: [event, ...state.liveEvents].slice(0, 50),
    })),

  filtersOpen: false,
  setFiltersOpen: (open) => set({ filtersOpen: open }),

  // ── Advanced analytics ──────────────────────────────────────────────
  trendingSpikes: [],
  addTrendingSpikes: (spikes) =>
    set((state) => ({
      trendingSpikes: [...spikes, ...state.trendingSpikes].slice(0, 30),
    })),

  breakingAlerts: [],
  addBreakingAlerts: (alerts) =>
    set((state) => ({
      breakingAlerts: [...alerts, ...state.breakingAlerts].slice(0, 20),
    })),
  dismissBreakingAlert: (id) =>
    set((state) => ({
      breakingAlerts: state.breakingAlerts.filter((a) => a.id !== id),
    })),

  convergenceAlerts: [],
  setConvergenceAlerts: (alerts) => set({ convergenceAlerts: alerts }),

  escalationScores: [],
  setEscalationScores: (scores) => set({ escalationScores: scores }),

  focalSummary: null,
  setFocalSummary: (summary) => set({ focalSummary: summary }),
}));
