import { create } from "zustand";
import type { Viewport, SyncMode, AppMode, FolderKey, Pinpoint, PinpointMouseMode } from "./types";
import { DEFAULT_VIEWPORT } from "./config";

interface State {
  appMode: AppMode;
  syncMode: SyncMode;
  pinpointMouseMode: PinpointMouseMode;
  viewport: Viewport;
  pinpoints: Partial<Record<FolderKey, Pinpoint>>;
  fitScaleFn: (() => number) | null;
  setAppMode: (m: AppMode) => void;
  setSyncMode: (m: SyncMode) => void;
  setPinpointMouseMode: (m: PinpointMouseMode) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setPinpoint: (key: FolderKey, pinpoint: Pinpoint) => void;
  clearPinpoints: () => void;
  setFitScaleFn: (fn: () => number) => void;
}

export const useStore = create<State>((set) => ({
  appMode: "compare",
  syncMode: "locked",
  pinpointMouseMode: "pin",
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5, refScreenX: 0, refScreenY: 0 },
  pinpoints: {},
  fitScaleFn: null,
  setAppMode: (m) => set({ appMode: m }),
  setSyncMode: (m) => set({ syncMode: m }),
  setPinpointMouseMode: (m) => set({ pinpointMouseMode: m }),
  setViewport: (vp) => set(s => ({ viewport: { ...s.viewport, ...vp } })),
  setPinpoint: (key, pinpoint) => set(state => ({
    pinpoints: { ...state.pinpoints, [key]: pinpoint }
  })),
  clearPinpoints: () => set({ pinpoints: {} }),
  setFitScaleFn: (fn) => set({ fitScaleFn: fn }),
}));