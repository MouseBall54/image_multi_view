import { create } from "zustand";
import type { FolderKey, Viewport, SyncMode } from "./types";
import { DEFAULT_VIEWPORT } from "./config";

interface State {
  syncMode: SyncMode;
  viewport: Viewport;
  fitScaleFn: (() => number) | null;
  setSyncMode: (m: SyncMode) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setFitScaleFn: (fn: () => number) => void;
}

export const useStore = create<State>((set) => ({
  syncMode: "locked",
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5 },
  fitScaleFn: null,
  setSyncMode: (m) => set({ syncMode: m }),
  setViewport: (vp) => set(s => ({ viewport: { ...s.viewport, ...vp } })),
  setFitScaleFn: (fn) => set({ fitScaleFn: fn }),
}));
