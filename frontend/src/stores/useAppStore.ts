import { create } from "zustand";
import { ConflictEvent, EventType, Filters, MapLayer, VerificationStatus } from "../types";

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

  // Live events injected via WebSocket
  liveEvents: ConflictEvent[];
  addLiveEvent: (event: ConflictEvent) => void;

  // Filter panel open
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
}

const DEFAULT_FILTERS: Filters = {
  country: "",
  eventType: "",
  verificationStatus: "",
  minConfidence: 0,
  start: "",
  end: "",
  timeRange: "7d",
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

  liveEvents: [],
  addLiveEvent: (event) =>
    set((state) => ({
      liveEvents: [event, ...state.liveEvents].slice(0, 50),
    })),

  filtersOpen: false,
  setFiltersOpen: (open) => set({ filtersOpen: open }),
}));
