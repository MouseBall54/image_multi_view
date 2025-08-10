import { create } from "zustand";
import type { FolderKey, Viewport, SyncMode, AppMode } from "./types";
import { DEFAULT_VIEWPORT } from "./config";

interface State {
  syncMode: SyncMode;
  appMode: AppMode;
  viewport: Viewport;
  fitScaleFn: (() => number) | null;
  setSyncMode: (m: SyncMode) => void;
  setAppMode: (m: AppMode) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setFitScaleFn: (fn: () => number) => void;
}

export const useStore = create<State>((set) => ({
  syncMode: "locked",
  appMode: "compare",
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5 },
  fitScaleFn: null,
  setSyncMode: (m) => set({ syncMode: m }),
  setAppMode: (m) => set({ appMode: m }),
  setViewport: (vp) => set(s => ({ viewport: { ...s.viewport, ...vp } })),
  setFitScaleFn: (fn) => set({ fitScaleFn: fn }),
}));
