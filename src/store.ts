import { create } from "zustand";
import type { Viewport, AppMode, FolderKey, Pinpoint, PinpointMouseMode, MatchedItem, FilterType, GridColor } from "./types";
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
  gaborSigma: number; // Bandwidth
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
  gaborSigma: 1.5,
  lambda: 10.0,
  psi: 0,
};

interface State {
  appMode: AppMode;
  pinpointMouseMode: PinpointMouseMode;
  stripExt: boolean;
  numViewers: number;
  viewerRows: number;
  viewerCols: number;
  showMinimap: boolean;
  showGrid: boolean;
  gridColor: GridColor;
  // Minimap options
  minimapPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  minimapWidth: number; // in px
  viewport: Viewport;
  pinpoints: Partial<Record<FolderKey, Pinpoint>>;
  pinpointScales: Partial<Record<FolderKey, number>>;
  pinpointGlobalScale: number;
  pinpointRotations: Partial<Record<FolderKey, number>>;
  pinpointGlobalRotation: number;
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
  activeFilterEditor: FolderKey | number | null; // Updated to allow number for analysis mode index

  // Analysis Mode State
  analysisFile: File | null;
  analysisFileSource: string | null;
  analysisFilters: Partial<Record<number, FilterType>>;
  analysisFilterParams: Partial<Record<number, FilterParams>>;
  analysisRotation: number;
  // Compare Mode State
  compareRotation: number;


  // Toggle Modal state - viewer-based image selection
  selectedViewers: FolderKey[];  // Selected viewer keys for toggle
  toggleModalOpen: boolean;
  toggleCurrentIndex: number;


  setAppMode: (m: AppMode) => void;
  setPinpointMouseMode: (m: PinpointMouseMode) => void;
  setStripExt: (strip: boolean) => void;
  setNumViewers: (n: number) => void;
  setViewerLayout: (rows: number, cols: number) => void;
  setShowMinimap: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridColor: (color: GridColor) => void;
  setMinimapPosition: (pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  setMinimapWidth: (w: number) => void;
  setViewport: (vp: Partial<Viewport>) => void;
  setPinpoint: (key: FolderKey, pinpoint: Pinpoint) => void;
  clearPinpoints: () => void;
  setPinpointScale: (key: FolderKey, scale: number) => void;
  clearPinpointScales: () => void;
  setPinpointGlobalScale: (scale: number) => void;
  setPinpointRotation: (key: FolderKey, angle: number) => void;
  setPinpointGlobalRotation: (angle: number) => void;
  setActiveCanvasKey: (key: FolderKey | null) => void;
  setFitScaleFn: (fn: () => number) => void;
  setCurrent: (item: MatchedItem | null) => void;
  triggerIndicator: (cx: number, cy: number) => void;
  setFolder: (key: FolderKey, folderState: FolderState) => void;
  updateFolderAlias: (key: FolderKey, alias: string) => void;
  clearFolder: (key: FolderKey) => void;

  // Analysis Mode Actions
  setAnalysisFile: (file: File | null, source?: string) => void;
  setAnalysisRotation: (angle: number) => void;
  // Compare Mode Actions
  setCompareRotation: (angle: number) => void;


  // Toggle actions
  setSelectedViewers: (viewers: FolderKey[]) => void;
  openToggleModal: () => void;
  closeToggleModal: () => void;
  setToggleCurrentIndex: (index: number) => void;

  // Filter actions
  openFilterEditor: (key: FolderKey | number) => void;
  closeFilterEditor: () => void;
  setTempFilterType: (type: FilterType) => void;
  setTempFilterParams: (params: Partial<FilterParams>) => void;
  applyTempFilterSettings: () => void;

}

export const useStore = create<State>((set) => ({
  appMode: "compare",
  pinpointMouseMode: "pin",
  stripExt: true,
  numViewers: 2,
  viewerRows: 1,
  viewerCols: 2,
  showMinimap: false,
  showGrid: false,
  gridColor: 'white',
  minimapPosition: 'bottom-right',
  minimapWidth: 150,
  viewport: { scale: DEFAULT_VIEWPORT.scale, cx: 0.5, cy: 0.5, refScreenX: undefined, refScreenY: undefined },
  pinpoints: {},
  pinpointScales: {},
  pinpointGlobalScale: 1,
  pinpointRotations: {},
  pinpointGlobalRotation: 0,
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

  // Analysis Mode State
  analysisFile: null,
  analysisFileSource: null,
  analysisFilters: {},
  analysisFilterParams: {},
  analysisRotation: 0,
  compareRotation: 0,


  // Toggle state
  selectedViewers: [],
  toggleModalOpen: false,
  toggleCurrentIndex: 0,


  setAppMode: (m) => set({ appMode: m }),
  setPinpointMouseMode: (m) => set({ pinpointMouseMode: m }),
  setStripExt: (strip) => set({ stripExt: strip }),
  setNumViewers: (n) => set({ numViewers: n }),
  setViewerLayout: (rows, cols) => set({ viewerRows: rows, viewerCols: cols, numViewers: rows * cols }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  setShowGrid: (show) => set({ showGrid: show }),
  setGridColor: (color) => set({ gridColor: color }),
  setMinimapPosition: (pos) => set({ minimapPosition: pos }),
  setMinimapWidth: (w) => set({ minimapWidth: w }),
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
  setPinpointGlobalRotation: (angle) => set({ pinpointGlobalRotation: angle }),
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
  clearFolder: (key) => set(state => {
    const { [key]: _, ...remainingFolders } = state.folders;
    const { [key]: __, ...remainingFilters } = state.viewerFilters;
    const { [key]: ___, ...remainingFilterParams } = state.viewerFilterParams;
    return { 
      folders: remainingFolders,
      viewerFilters: remainingFilters,
      viewerFilterParams: remainingFilterParams
    };
  }),

  // Analysis Mode Actions
  setAnalysisFile: (file, source) => set({ 
    analysisFile: file, 
    analysisFileSource: source,
    analysisFilters: {}, 
    analysisFilterParams: {} 
  }),
  setAnalysisRotation: (angle) => set({ analysisRotation: angle }),
  setCompareRotation: (angle) => set({ compareRotation: angle }),


  // Toggle actions
  setSelectedViewers: (viewers) => set({ selectedViewers: viewers }),
  openToggleModal: () => set({ toggleModalOpen: true, toggleCurrentIndex: 0 }),
  closeToggleModal: () => set({ toggleModalOpen: false }),
  setToggleCurrentIndex: (index) => set({ toggleCurrentIndex: index }),

  // Filter actions
  openFilterEditor: (key) => set(state => {
    if (typeof key === 'number') { // Analysis Mode
      return {
        activeFilterEditor: key,
        tempViewerFilter: state.analysisFilters[key] || 'none',
        tempViewerFilterParams: state.analysisFilterParams[key] || defaultFilterParams,
      }
    } else { // Folder-based modes
      return {
        activeFilterEditor: key,
        tempViewerFilter: state.viewerFilters[key] || 'none',
        tempViewerFilterParams: state.viewerFilterParams[key] || defaultFilterParams,
      }
    }
  }),
  closeFilterEditor: () => set({ activeFilterEditor: null }),
  setTempFilterType: (type) => set({ tempViewerFilter: type }),
  setTempFilterParams: (params) => set(state => ({
    tempViewerFilterParams: { ...state.tempViewerFilterParams, ...params }
  })),
  applyTempFilterSettings: () => set(state => {
    const key = state.activeFilterEditor;
    if (key === null) return {};

    if (typeof key === 'number') { // Analysis Mode
      return {
        analysisFilters: { ...state.analysisFilters, [key]: state.tempViewerFilter },
        analysisFilterParams: { ...state.analysisFilterParams, [key]: state.tempViewerFilterParams },
        activeFilterEditor: null,
      }
    } else { // Folder-based modes
      return {
        viewerFilters: { ...state.viewerFilters, [key]: state.tempViewerFilter },
        viewerFilterParams: { ...state.viewerFilterParams, [key]: state.tempViewerFilterParams },
        activeFilterEditor: null,
      }
    }
  }),

}));

useStore.subscribe((state, prevState) => {
  if (state.appMode !== prevState.appMode) {
    console.log(`App mode changed from ${prevState.appMode} to ${state.appMode}`);
    
    // Reset viewport and other relevant states when mode changes
    const { fitScaleFn } = useStore.getState();
    const newScale = fitScaleFn ? fitScaleFn() : 1;
    useStore.setState({
      viewport: { scale: newScale, cx: 0.5, cy: 0.5 },
      pinpoints: {},
      pinpointScales: {},
      pinpointGlobalScale: 1,
      pinpointRotations: {},
      analysisRotation: 0,
      compareRotation: 0,
      // Reset toggle selection when mode changes
      selectedViewers: [],
      toggleModalOpen: false,
      toggleCurrentIndex: 0,
    });

    // Clear analysis file if leaving analysis mode
    if (prevState.appMode === 'analysis' && state.appMode !== 'analysis') {
      useStore.setState({ analysisFile: null, analysisFilters: {}, analysisFilterParams: {} });
    }
  }

  // Reset viewport when layout changes (레이아웃 변경 시 뷰포트 리셋)
  if (state.viewerRows !== prevState.viewerRows || state.viewerCols !== prevState.viewerCols) {
    console.log(`Layout changed from ${prevState.viewerRows}x${prevState.viewerCols} to ${state.viewerRows}x${state.viewerCols}`);
    
    // fitScaleFn은 ResizeObserver에 의해 업데이트될 예정이므로 약간의 지연 후 적용
    setTimeout(() => {
      const { fitScaleFn } = useStore.getState();
      const newScale = fitScaleFn ? fitScaleFn() : 1;
      useStore.setState({
        viewport: { scale: newScale, cx: 0.5, cy: 0.5, refScreenX: undefined, refScreenY: undefined },
        pinpointGlobalScale: 1,
      });
    }, 100);
  }
});

