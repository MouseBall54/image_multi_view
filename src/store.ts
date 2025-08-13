import { create } from "zustand";
import type { Viewport, SyncMode, AppMode, FolderKey, Pinpoint, PinpointMouseMode, MatchedItem } from "./types";
import { DEFAULT_VIEWPORT } from "./config";

interface State {
  appMode: AppMode;
  syncMode: SyncMode;
  pinpointMouseMode: PinpointMouseMode;
  viewport: Viewport;
  pinpoints: Partial<Record<FolderKey, Pinpoint>>;
  pinpointScales: Partial<Record<FolderKey, number>>; // For individual scales
  pinpointGlobalScale: number; // For global scaling in pinpoint mode
  fitScaleFn: (() => number) | null;
  current: MatchedItem | null;
  indicator: { cx: number, cy: number, key: number } | null; // For animation trigger
  setAppMode: (m: AppMode) => void;
  setSyncMode: (m: SyncMode) => void;
  setPinpointMouseMode: (m: PinpointMouseMode) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setPinpoint: (key: FolderKey, pinpoint: Pinpoint) => void;
  clearPinpoints: () => void;
  setPinpointScale: (key: FolderKey, scale: number) => void;
  clearPinpointScales: () => void;
  setPinpointGlobalScale: (scale: number) => void;
  setFitScaleFn: (fn: () => number) => void;
  setCurrent: (item: MatchedItem | null) => void;
  triggerIndicator: (cx: number, cy: number) => void; // To trigger animation
}

export const useStore = create<State>((set) => ({
  appMode: "compare",
  syncMode: "locked",
  pinpointMouseMode: "pin",
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5, refScreenX: undefined, refScreenY: undefined },
  pinpoints: {},
  pinpointScales: {}, // Initial value
  pinpointGlobalScale: 1, // Initial value
  fitScaleFn: null,
  current: null,
  indicator: null, // Initial value
  setAppMode: (m) => set({ appMode: m }),
  setSyncMode: (m) => set({ syncMode: m }),
  setPinpointMouseMode: (m) => set({ pinpointMouseMode: m }),
  setViewport: (vp) => set(s => ({ viewport: { ...s.viewport, ...vp } })),
  setPinpoint: (key, pinpoint) => set(state => ({
    pinpoints: { ...state.pinpoints, [key]: pinpoint }
  })),
  clearPinpoints: () => set({ pinpoints: {} }),
  setPinpointScale: (key, scale) => set(state => ({
    pinpointScales: { ...state.pinpointScales, [key]: scale }
  })),
  clearPinpointScales: () => set({ pinpointScales: {} }),
  setPinpointGlobalScale: (scale) => set({ pinpointGlobalScale: scale }),
  setFitScaleFn: (fn) => set({ fitScaleFn: fn }),
  setCurrent: (item) => set({ current: item }),
  triggerIndicator: (cx, cy) => set({ indicator: { cx, cy, key: Date.now() } }), // Implementation
}));