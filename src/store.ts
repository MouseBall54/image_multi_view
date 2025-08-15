import { create } from "zustand";
import type { Viewport, SyncMode, AppMode, FolderKey, Pinpoint, PinpointMouseMode, MatchedItem, FilterType } from "./types";
import { DEFAULT_VIEWPORT } from "./config";
import { FolderData } from "./utils/folder";

export interface FolderState {
  data: FolderData;
  alias: string;
}

export interface FilterParams {
  kernelSize: number;
  sigma: number;
  sharpenAmount: number;
  lowThreshold: number;
  highThreshold: number;
  clipLimit: number;
  gridSize: number;
  gamma: number;
  cutoff: number;
  // Gabor params
  theta: number; // Orientation
  sigma: number; // Bandwidth
  lambda: number; // Wavelength
  psi: number; // Phase offset
}

const defaultFilterParams: FilterParams = {
  kernelSize: 5,
  sigma: 1.5,
  sharpenAmount: 1,
  lowThreshold: 50,
  highThreshold: 100,
  clipLimit: 2,
  gridSize: 8,
  gamma: 1.0,
  cutoff: 30,
  // Gabor defaults
  theta: 0,
  lambda: 10.0,
  psi: 0,
};

interface State {
  appMode: AppMode;
  syncMode: SyncMode;
  pinpointMouseMode: PinpointMouseMode;
  stripExt: boolean;
  numViewers: number;
  showMinimap: boolean;
  viewport: Viewport;
  pinpoints: Partial<Record<FolderKey, Pinpoint>>;
  pinpointScales: Partial<Record<FolderKey, number>>;
  pinpointGlobalScale: number;
  pinpointRotations: Partial<Record<FolderKey, number>>;
  activeCanvasKey: FolderKey | null;
  fitScaleFn: (() => number) | null;
  current: MatchedItem | null;
  indicator: { cx: number, cy: number, key: number } | null;
  folders: Partial<Record<FolderKey, FolderState>>;
  
  // Filter states
  viewerFilters: Partial<Record<FolderKey, FilterType>>;
  viewerFilterParams: Partial<Record<FolderKey, FilterParams>>;
  
  // Temp states for UI controls
  tempViewerFilter: FilterType;
  tempViewerFilterParams: FilterParams;
  activeFilterEditor: FolderKey | null;


  setAppMode: (m: AppMode) => void;
  setSyncMode: (m: SyncMode) => void;
  setPinpointMouseMode: (m: PinpointMouseMode) => void;
  setStripExt: (strip: boolean) => void;
  setNumViewers: (n: number) => void;
  setShowMinimap: (show: boolean) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setPinpoint: (key: FolderKey, pinpoint: Pinpoint) => void;
  clearPinpoints: () => void;
  setPinpointScale: (key: FolderKey, scale: number) => void;
  clearPinpointScales: () => void;
  setPinpointGlobalScale: (scale: number) => void;
  setPinpointRotation: (key: FolderKey, angle: number) => void;
  setActiveCanvasKey: (key: FolderKey | null) => void;
  setFitScaleFn: (fn: () => number) => void;
  setCurrent: (item: MatchedItem | null) => void;
  triggerIndicator: (cx: number, cy: number) => void;
  setFolder: (key: FolderKey, folderState: FolderState) => void;
  updateFolderAlias: (key: FolderKey, alias: string) => void;

  // Filter actions
  openFilterEditor: (key: FolderKey) => void;
  closeFilterEditor: () => void;
  setTempFilterType: (type: FilterType) => void;
  setTempFilterParams: (params: Partial<FilterParams>) => void;
  applyTempFilterSettings: () => void;
}

export const useStore = create<State>((set, get) => ({
  appMode: "compare",
  syncMode: "locked",
  pinpointMouseMode: "pin",
  stripExt: true,
  numViewers: 2,
  showMinimap: false,
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5, refScreenX: undefined, refScreenY: undefined },
  pinpoints: {},
  pinpointScales: {},
  pinpointGlobalScale: 1,
  pinpointRotations: {},
  activeCanvasKey: null,
  fitScaleFn: null,
  current: null,
  indicator: null,
  folders: {},
  
  // Filter states
  viewerFilters: {},
  viewerFilterParams: {},
  tempViewerFilter: 'none',
  tempViewerFilterParams: defaultFilterParams,
  activeFilterEditor: null,

  setAppMode: (m) => set({ appMode: m }),
  setSyncMode: (m) => set({ syncMode: m }),
  setPinpointMouseMode: (m) => set({ pinpointMouseMode: m }),
  setStripExt: (strip) => set({ stripExt: strip }),
  setNumViewers: (n) => set({ numViewers: n }),
  setShowMinimap: (show) => set({ showMinimap: show }),
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
  setPinpointRotation: (key, angle) => set(state => ({
    pinpointRotations: { ...state.pinpointRotations, [key]: angle }
  })),
  setActiveCanvasKey: (key) => set({ activeCanvasKey: key }),
  setFitScaleFn: (fn) => set({ fitScaleFn: fn }),
  setCurrent: (item) => set({ current: item }),
  triggerIndicator: (cx, cy) => set({ indicator: { cx, cy, key: Date.now() } }),
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

  // Filter actions
  openFilterEditor: (key) => set(state => ({
    activeFilterEditor: key,
    tempViewerFilter: state.viewerFilters[key] || 'none',
    tempViewerFilterParams: state.viewerFilterParams[key] || defaultFilterParams,
  })),
  closeFilterEditor: () => set({ activeFilterEditor: null }),
  setTempFilterType: (type) => set({ tempViewerFilter: type }),
  setTempFilterParams: (params) => set(state => ({
    tempViewerFilterParams: { ...state.tempViewerFilterParams, ...params }
  })),
  applyTempFilterSettings: () => set(state => {
    const key = state.activeFilterEditor;
    if (!key) return {};
    return {
      viewerFilters: { ...state.viewerFilters, [key]: state.tempViewerFilter },
      viewerFilterParams: { ...state.viewerFilterParams, [key]: state.tempViewerFilterParams },
      activeFilterEditor: null,
    }
  }),
}));

useStore.subscribe((state, prevState) => {
  if (state.appMode !== prevState.appMode) {
    console.log(`App mode changed from ${prevState.appMode} to ${state.appMode}`);
    if (state.appMode !== 'pinpoint') {
      const { fitScaleFn } = useStore.getState();
      const newScale = fitScaleFn ? fitScaleFn() : 1;
      useStore.setState({
        viewport: { scale: newScale, cx: 0.5, cy: 0.5 },
        pinpoints: {},
        pinpointScales: {},
        pinpointGlobalScale: 1,
        pinpointRotations: {},
      });
    }
  }
});

