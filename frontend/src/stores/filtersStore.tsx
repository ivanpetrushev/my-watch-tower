import { create } from "zustand";
import type { FilterPresetEntity } from "../model";

// satellite filter interfaces
export interface FrequencyFilter {
  min: number;
  max: number;
  direction: "downlink" | "uplink";
}

export interface SatelliteFilterState {
  tracked?: string;
  tag?: string;
  name?: string;
  frequencyFilters?: FrequencyFilter[];
}

// pass event interfaces
export interface TimingFilter {
  minTime: string; // "06:20"
  maxTime: string; // "18:45"
  dows: string; // "M, T, W"
}

export interface PassFilterState {
  minVisibleElevation?: string; // degrees
  minVisibleDuration?: string; // seconds
  browserLocalTzOffsetMinutes?: string;
  timingFilters?: TimingFilter[];
}

interface FilterStore {
  satelliteFilters: SatelliteFilterState;
  passEventFilters: PassFilterState;

  setSatelliteFilters: (filters: Partial<SatelliteFilterState>) => void;
  setPassEventFilters: (filters: Partial<PassFilterState>) => void;

  clearAll: () => void;
  // applyAll: () => void;

  loadPreset: (preset: FilterPresetEntity) => void;
  getCurrentAsPreset: () => {
    satelliteFilter: string;
    passEventFilter: string;
  };
}

export const useFilterStore = create<FilterStore>()((set, get) => ({
  satelliteFilters: {},
  passEventFilters: {},

  setSatelliteFilters: (filters) => {
    const cleanedData = {
      ...filters,
      frequencyFilters: filters.frequencyFilters
        ?.filter((f) => f.min !== undefined && f.max !== undefined)
        // inputs are in MHz, but API expects Hz
        .map((f) => ({
          ...f,
          min: f.min * 1_000_000, // Convert MHz to Hz
          max: f.max * 1_000_000, // Convert MHz to Hz
        })),
    };
    set(() => ({
      satelliteFilters: { ...cleanedData },
    }));
  },

  setPassEventFilters: (filters) =>
    set(() => ({
      passEventFilters: { ...filters },
    })),

  clearAll: () => set({ satelliteFilters: {}, passEventFilters: {} }),

  // no need for applyAll(), if listening on store changes
  // applyAll: () => {
  // },

  loadPreset: (preset) =>
    set({
      satelliteFilters: JSON.parse(preset.satelliteFilter),
      passEventFilters: JSON.parse(preset.passEventFilter),
    }),

  getCurrentAsPreset: () => {
    const state = get();
    return {
      satelliteFilter: JSON.stringify(state.satelliteFilters),
      passEventFilter: JSON.stringify(state.passEventFilters),
    };
  },
}));
