import { create } from "zustand";
import type { Viewport, SyncMode, AppMode, FolderKey, Pinpoint, PinpointMouseMode, MatchedItem } from "./types";
import { DEFAULT_VIEWPORT } from "./config";
import { FolderData } from "./utils/folder";

export interface FolderState {
  data: FolderData;
  alias: string;
}

interface State {
  appMode: AppMode;
  syncMode: SyncMode;
  pinpointMouseMode: PinpointMouseMode;
  stripExt: boolean;
  viewport: Viewport;
  pinpoints: Partial<Record<FolderKey, Pinpoint>>;
  pinpointScales: Partial<Record<FolderKey, number>>; // For individual scales
  pinpointGlobalScale: number; // For global scaling in pinpoint mode
  activeCanvasKey: FolderKey | null; // To track the active canvas
  fitScaleFn: (() => number) | null;
  current: MatchedItem | null;
  indicator: { cx: number, cy: number, key: number } | null; // For animation trigger
  folders: Partial<Record<FolderKey, FolderState>>;
  setAppMode: (m: AppMode) => void;
  setSyncMode: (m: SyncMode) => void;
  setPinpointMouseMode: (m: PinpointMouseMode) => void;
  setStripExt: (strip: boolean) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setPinpoint: (key: FolderKey, pinpoint: Pinpoint) => void;
  clearPinpoints: () => void;
  setPinpointScale: (key: FolderKey, scale: number) => void;
  clearPinpointScales: () => void;
  setPinpointGlobalScale: (scale: number) => void;
  setActiveCanvasKey: (key: FolderKey | null) => void;
  setFitScaleFn: (fn: () => number) => void;
  setCurrent: (item: MatchedItem | null) => void;
  triggerIndicator: (cx: number, cy: number) => void; // To trigger animation
  setFolder: (key: FolderKey, folderState: FolderState) => void;
  updateFolderAlias: (key: FolderKey, alias: string) => void;
}

export const useStore = create<State>((set) => ({
  appMode: "compare",
  syncMode: "locked",
  pinpointMouseMode: "pin",
  stripExt: true,
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5, refScreenX: undefined, refScreenY: undefined },
  pinpoints: {},
  pinpointScales: {}, // Initial value
  pinpointGlobalScale: 1, // Initial value
  activeCanvasKey: null, // Initial value
  fitScaleFn: null,
  current: null,
  indicator: null, // Initial value
  folders: {},
  setAppMode: (m) => set({ appMode: m }),
  setSyncMode: (m) => set({ syncMode: m }),
  setPinpointMouseMode: (m) => set({ pinpointMouseMode: m }),
  setStripExt: (strip) => set({ stripExt: strip }),
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
  setActiveCanvasKey: (key) => set({ activeCanvasKey: key }),
  setFitScaleFn: (fn) => set({ fitScaleFn: fn }),
  setCurrent: (item) => set({ current: item }),
  triggerIndicator: (cx, cy) => set({ indicator: { cx, cy, key: Date.now() } }), // Implementation
  setFolder: (key, folderState) => set(state => ({
    folders: { ...state.folders, [key]: folderState }
  })),
  updateFolderAlias: (key, alias) => set(state => {
    const folder = state.folders[key];
    if (folder) {
      return {
        folders: {
          ...state.folders,
          [key]: { ...folder, alias }
        }
      };
    }
    return {};
  }),
}));

useStore.subscribe((state, prevState) => {
  if (state.appMode !== prevState.appMode) {
    console.log(`App mode changed from ${prevState.appMode} to ${state.appMode}`);
    // Reset viewport when mode changes, except for pinpoint mode which has its own logic
    if (state.appMode !== 'pinpoint') {
      const { fitScaleFn } = useStore.getState();
      const newScale = fitScaleFn ? fitScaleFn() : 1;
      useStore.setState({
        viewport: { scale: newScale, cx: 0.5, cy: 0.5 },
        pinpoints: {},
        pinpointScales: {},
        pinpointGlobalScale: 1,
      });
    }
  }
});
