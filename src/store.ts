// src/store.ts
import { create } from "zustand";
import type { FolderKey, Viewport, SyncMode } from "./types";
import { DEFAULT_VIEWPORT } from "./config";

interface State {
  syncMode: SyncMode;
  viewport: Viewport;              // 기준 viewport
  setSyncMode: (m: SyncMode) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  // 각 뷰어가 로컬 보정이 필요하면 per-view 로컬 상태를 추가
}

export const useStore = create<State>((set) => ({
  syncMode: "locked",
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5 },
  setSyncMode: (m) => set({ syncMode: m }),
  setViewport: (vp) => set(s => ({ viewport: { ...s.viewport, ...vp } })),
}));
