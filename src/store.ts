import { create } from "zustand";
import type { Viewport, AppMode, FolderKey, Pinpoint, PinpointMouseMode, MatchedItem, FilterType, GridColor, FilterChain, FilterChainItem, FilterPreset } from "./types";
import { DEFAULT_VIEWPORT } from "./config";
import { FolderData } from "./utils/folder";
import type { ToastMessage } from "./components/Toast";

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
  brightness?: number; // -100..100 (% offset)
  contrast?: number;   // 0..200 (%)
  // Gabor params
  theta: number; // Orientation
  gaborSigma: number; // Bandwidth
  lambda: number; // Wavelength
  psi: number; // Phase offset
  // Additional filter params
  sigma2?: number;
  threshold?: number;
  alpha?: number;
  sigmaColor?: number;
  sigmaSpace?: number;
  patchSize?: number;
  searchWindowSize?: number;
  h?: number;
  iterations?: number;
  kappa?: number;
  epsilon?: number;
  lawsKernelType?: string;
  // Morphology params
  morphShape?: string; // 'rect', 'ellipse', 'cross'
  morphIterations?: number;
  // Gradient-based colormap params
  sensitivity?: number; // For gradient magnitude
  centerValue?: number; // For difference map (default: 128)
  // Filter Chain params
  filterChain?: FilterChainItem[];
  chainId?: string;
  chainName?: string;
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
  brightness: 0,
  contrast: 100,
  // Gabor defaults
  theta: 0,
  gaborSigma: 1.5,
  lambda: 10.0,
  psi: 0,
  // Additional defaults
  sigma2: 2.0,
  threshold: 10,
  alpha: 0.1,
  sigmaColor: 25,
  sigmaSpace: 25,
  patchSize: 7,
  searchWindowSize: 21,
  h: 10,
  iterations: 5,
  kappa: 30,
  epsilon: 0.04,
  lawsKernelType: 'L5E5',
  // Morphology defaults
  morphShape: 'ellipse',
  morphIterations: 1,
  // Gradient-based colormap defaults
  sensitivity: 1.0,
  centerValue: 128,
};

interface State {
  appMode: AppMode;
  pinpointMouseMode: PinpointMouseMode;
  pinpointReorderMode: 'shift' | 'swap';
  // Pinpoint: rectangle zoom target
  rectZoomTarget: FolderKey | null;
  // Global rect zoom for compare/analysis
  rectZoomGlobalActive: boolean;
  stripExt: boolean;
  numViewers: number;
  viewerRows: number;
  viewerCols: number;
  // Layout preview (for ghost overlay when selecting a new layout)
  previewLayout: { rows: number; cols: number } | null;
  
  // Viewer arrangement system
  viewerArrangement: {
    compare: FolderKey[];      // [A, B, C, D] - which folder at each position
    pinpoint: FolderKey[];     // [A, B, C, D] - which folder at each position
    analysis: number[];        // [0, 1, 2, 3] - which filter index at each position
  };
  
  showMinimap: boolean;
  showGrid: boolean;
  gridColor: GridColor;
  showFilelist: boolean;
  showFilterLabels: boolean;
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
  // Image sizes used for performance estimation
  viewerImageSizes: Partial<Record<FolderKey, { width: number; height: number }>>;
  analysisImageSizes: Partial<Record<number, { width: number; height: number }>>;
  
  // Filter states
  viewerFilters: Partial<Record<FolderKey, FilterType>>;
  viewerFilterParams: Partial<Record<FolderKey, FilterParams>>;
  
  // Temp states for UI controls
  tempViewerFilter: FilterType;
  tempViewerFilterParams: FilterParams;
  activeFilterEditor: FolderKey | number | null; // Updated to allow number for analysis mode index
  
  // FilterChain editing state
  editingFilterChainItem: string | null; // ID of the FilterChainItem being edited

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

  // File Selection state for batch operations
  selectedFiles: Set<string>; // Set of file IDs (folderKey-filename) for multi-select

  // Filter Chain states
  filterChains: FilterChain[];
  activeFilterChain: FilterChain | null;
  filterCart: FilterChainItem[];
  filterPresets: FilterPreset[];
  showFilterCart: boolean;
  filterPanelTab: 'editor' | 'chain';
  
  // Preview Modal states
  previewModal: {
    isOpen: boolean;
    mode: 'single' | 'chain';
    filterType?: FilterType;
    filterParams?: FilterParams;
    chainItems?: FilterChainItem[];
    title?: string;
    sourceFile?: File;
    realTimeUpdate?: boolean;
    position?: 'modal' | 'sidebar';
    size?: 'S' | 'M' | 'L';
    stepIndex?: number;
    stickySource?: boolean; // When true, don't auto-sync sourceFile
  };
  previewSize: 'S' | 'M' | 'L';
  originalResolution: boolean;

  // Toast notification states
  toasts: ToastMessage[];

  setAppMode: (m: AppMode) => void;
  setPinpointMouseMode: (m: PinpointMouseMode) => void;
  setPinpointReorderMode: (m: 'shift' | 'swap') => void;
  setStripExt: (strip: boolean) => void;
  setNumViewers: (n: number) => void;
  setViewerLayout: (rows: number, cols: number) => void;
  setLayoutPreview: (rows: number, cols: number) => void;
  clearLayoutPreview: () => void;
  setShowMinimap: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridColor: (color: GridColor) => void;
  setShowFilelist: (show: boolean) => void;
  setShowFilterLabels: (show: boolean) => void;
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
  setViewerImageSize: (key: FolderKey, size: { width: number; height: number }) => void;
  setAnalysisImageSize: (index: number, size: { width: number; height: number }) => void;

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

  // File Selection actions
  toggleFileSelection: (fileId: string) => void;
  clearFileSelection: () => void;
  selectAllFiles: () => void;
  autoPlaceSelectedFiles: () => void;

  // Filter actions
  openFilterEditor: (key: FolderKey | number) => void;
  closeFilterEditor: () => void;
  setTempFilterType: (type: FilterType) => void;
  setTempFilterParams: (params: Partial<FilterParams>) => void;
  applyTempFilterSettings: () => void;
  
  // FilterChain editing actions
  setEditingFilterChainItem: (itemId: string | null) => void;

  // Filter Chain actions
  addToFilterCart: () => void;
  removeFromFilterCart: (itemId: string) => void;
  reorderFilterCart: (fromIndex: number, toIndex: number) => void;
  clearFilterCart: () => void;
  toggleFilterCartItem: (itemId: string) => void;
  updateFilterCartItem: (itemId: string, updates: Partial<FilterChainItem>) => void;
  
  // Filter Chain management
  createFilterChain: (name: string) => void;
  updateFilterChain: (chainId: string, updates: Partial<FilterChain>) => void;
  deleteFilterChain: (chainId: string) => void;
  setActiveFilterChain: (chain: FilterChain | null) => void;
  applyFilterChain: (chain: FilterChain, viewerKey: FolderKey | number) => void;
  importFilterChain: (chain: FilterChain) => void;
  loadFilterChainToCart: (chainId: string) => void;
  exportFilterChain: (chainId: string) => void;
  exportCurrentCart: (name: string, description?: string) => void;
  
  // Filter Preset management  
  saveFilterPreset: (name: string, description?: string, tags?: string[]) => void;
  loadFilterPreset: (presetId: string) => void;
  deleteFilterPreset: (presetId: string) => void;
  
  // UI controls
  setShowFilterCart: (show: boolean) => void;
  setFilterPanelTab: (tab: 'editor' | 'chain') => void;
  
  // Preview Modal actions
  openPreviewModal: (config: {
    mode: 'single' | 'chain';
    filterType?: FilterType;
    filterParams?: FilterParams;
    chainItems?: FilterChainItem[];
    title?: string;
    sourceFile?: File;
    realTimeUpdate?: boolean;
    position?: 'modal' | 'sidebar';
    size?: 'S' | 'M' | 'L';
    stepIndex?: number;
    stickySource?: boolean;
  }) => void;
  setPreviewSize: (size: 'S' | 'M' | 'L') => void;
  setOriginalResolution: (originalResolution: boolean) => void;
  closePreviewModal: () => void;
  updatePreviewModal: (updates: Partial<{
    isOpen: boolean;
    mode: 'single' | 'chain';
    filterType?: FilterType;
    filterParams?: FilterParams;
    chainItems?: FilterChainItem[];
    title?: string;
    sourceFile?: File;
    realTimeUpdate?: boolean;
    position?: 'modal' | 'sidebar';
  }>) => void;

  // Viewer arrangement actions
  reorderViewers: (fromPosition: number, toPosition: number) => void;
  getViewerContentAtPosition: (position: number, mode: AppMode) => FolderKey | number;
  resetViewerArrangement: () => void;

  // Toast notification actions
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;

  // Leveling (two-point horizontal alignment)
  levelingCapture: {
    active: boolean;
    mode: AppMode | null;
    targetKey?: FolderKey | number | null;
    points: { x: number; y: number }[];
    axis: 'horizontal' | 'vertical';
  };
  startLeveling: (mode: AppMode, targetKey?: FolderKey | number | null, axis?: 'horizontal' | 'vertical') => void;
  cancelLeveling: () => void;
  addLevelingPoint: (canvasKey: FolderKey | number, point: { x: number; y: number }) => void;

  // Rect Zoom actions
  setRectZoomTarget: (key: FolderKey | null) => void;
  setRectZoomGlobalActive: (active: boolean) => void;

  // Sync-capture to propagate filter settings
  syncCapture: {
    active: boolean;
    mode: AppMode | null;
  };
  startSync: (mode: AppMode) => void;
  cancelSync: () => void;
  confirmSyncFromTarget: (target: FolderKey | number) => void;
}

export const useStore = create<State>((set, get) => ({
  appMode: "pinpoint",
  pinpointMouseMode: "pan",
  pinpointReorderMode: 'shift',
  rectZoomTarget: null,
  rectZoomGlobalActive: false,
  stripExt: true,
  numViewers: 2,
  viewerRows: 1,
  viewerCols: 2,
  previewLayout: null,
  
  // Default viewer arrangement (A-Z = 26 viewers)
  viewerArrangement: {
    compare: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
    pinpoint: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],  
    analysis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
  },
  
  showMinimap: false,
  showGrid: false,
  gridColor: 'white',
  showFilelist: true,
  showFilterLabels: true,
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
  viewerImageSizes: {},
  analysisImageSizes: {},
  
  // Filter states
  viewerFilters: {},
  viewerFilterParams: {},
  tempViewerFilter: 'none',
  tempViewerFilterParams: defaultFilterParams,
  activeFilterEditor: null,
  editingFilterChainItem: null,

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

  // File Selection state
  selectedFiles: new Set(),

  // Filter Chain states
  filterChains: [],
  activeFilterChain: null,
  filterCart: [],
  filterPresets: [],
  showFilterCart: false,
  filterPanelTab: 'chain',
  
  // Preview Modal states
  previewModal: {
    isOpen: false,
    mode: 'single',
    stickySource: false,
  },
  
  // Sync-capture defaults
  syncCapture: { active: false, mode: null },
  previewSize: 'M',
  originalResolution: false,
  
  // Toast notification states
  toasts: [],

  // Leveling state defaults
  levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' },


  setAppMode: (m) => set({ appMode: m }),
  setPinpointMouseMode: (m) => set({ pinpointMouseMode: m }),
  setPinpointReorderMode: (m) => set({ pinpointReorderMode: m }),
  setStripExt: (strip) => set({ stripExt: strip }),
  setNumViewers: (n) => set({ numViewers: n }),
  setViewerLayout: (rows, cols) => set({ viewerRows: rows, viewerCols: cols, numViewers: rows * cols }),
  setLayoutPreview: (rows, cols) => set({ previewLayout: { rows, cols } }),
  clearLayoutPreview: () => set({ previewLayout: null }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  setShowGrid: (show) => set({ showGrid: show }),
  setGridColor: (color) => set({ gridColor: color }),
  setShowFilelist: (show) => set({ showFilelist: show }),
  setShowFilterLabels: (show) => set({ showFilterLabels: show }),
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
  setViewerImageSize: (key, size) => set(state => ({
    viewerImageSizes: { ...state.viewerImageSizes, [key]: size }
  })),
  setAnalysisImageSize: (index, size) => set(state => ({
    analysisImageSizes: { ...state.analysisImageSizes, [index]: size }
  })),

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

  // File Selection actions
  toggleFileSelection: (fileId) => set((state) => {
    const newSelected = new Set(state.selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    return { selectedFiles: newSelected };
  }),
  clearFileSelection: () => set({ selectedFiles: new Set() }),
  selectAllFiles: () => set((state) => {
    const allFileIds = new Set<string>();
    Object.entries(state.folders).forEach(([folderKey, folderState]) => {
      if (folderState?.data.files) {
        for (const [fileName] of folderState.data.files) {
          allFileIds.add(`${folderKey}-${fileName}`);
        }
      }
    });
    return { selectedFiles: allFileIds };
  }),
  autoPlaceSelectedFiles: () => set((state) => {
    // This will be implemented in PinpointMode component
    return state;
  }),

  // Filter actions
  openFilterEditor: (key) => set(state => {
    if (typeof key === 'number') { // Analysis Mode
      // Determine if this analysis view already has a chain applied
      const existingType = state.analysisFilters[key];
      const existingParams = state.analysisFilterParams[key];
      const chainItems = (existingType === 'filterchain' && existingParams && existingParams.filterChain)
        ? existingParams.filterChain
        : [];

      return {
        activeFilterEditor: key,
        tempViewerFilter: existingType || 'none',
        tempViewerFilterParams: existingParams || defaultFilterParams,
        // Sync the cart with the view-specific chain
        filterCart: [...chainItems],
        showFilterCart: true,
        filterPanelTab: 'editor',
      }
    } else { // Folder-based modes
      // Ensure a current item exists so previews can resolve a source file
      let nextCurrent = state.current;
      const folder = state.folders[key];
      if (!nextCurrent && folder && folder.data && folder.data.files && folder.data.files.size > 0) {
        const firstFilename = folder.data.files.keys().next().value as string | undefined;
        if (firstFilename) {
          // Build a has-map across folders for this filename
          const has: any = {};
      for (const k of Object.keys(state.folders) as (keyof typeof state.folders)[]) {
        const f = state.folders[k as FolderKey];
        (has as any)[k] = !!(f && (f as any).data && (f as any).data.files && (f as any).data.files.has(firstFilename));
      }
          nextCurrent = { filename: firstFilename, has } as any;
        }
      }

      // Determine if this viewer already has a chain applied
      const existingType = state.viewerFilters[key];
      const existingParams = state.viewerFilterParams[key];
      const chainItems = (existingType === 'filterchain' && existingParams && existingParams.filterChain)
        ? existingParams.filterChain
        : [];

      return {
        activeFilterEditor: key,
        tempViewerFilter: existingType || 'none',
        tempViewerFilterParams: existingParams || defaultFilterParams,
        // Sync the cart with the view-specific chain
        filterCart: [...chainItems],
        showFilterCart: true,
        filterPanelTab: 'editor',
        current: nextCurrent || state.current,
      }
    }
  }),
  closeFilterEditor: () => set({ activeFilterEditor: null }),
  setTempFilterType: (type) => set({ tempViewerFilter: type }),
  setTempFilterParams: (params) => set(state => ({
    tempViewerFilterParams: { ...state.tempViewerFilterParams, ...params }
  })),
  
  // FilterChain editing actions
  setEditingFilterChainItem: (itemId: string | null) => set({ editingFilterChainItem: itemId }),
  applyTempFilterSettings: () => set(state => {
    const key = state.activeFilterEditor;
    if (key === null) return {};

    if (typeof key === 'number') { // Analysis Mode
      return {
        analysisFilters: { ...state.analysisFilters, [key]: state.tempViewerFilter },
        analysisFilterParams: { ...state.analysisFilterParams, [key]: state.tempViewerFilterParams },
        // Keep editor open in integrated panel workflow
        activeFilterEditor: key,
        filterPanelTab: 'editor',
        showFilterCart: true,
      }
    } else { // Folder-based modes
      return {
        viewerFilters: { ...state.viewerFilters, [key]: state.tempViewerFilter },
        viewerFilterParams: { ...state.viewerFilterParams, [key]: state.tempViewerFilterParams },
        // Keep editor open in integrated panel workflow
        activeFilterEditor: key,
        filterPanelTab: 'editor',
        showFilterCart: true,
      }
    }
  }),

  // Filter Chain actions
  addToFilterCart: () => set(state => {
    const newItem: FilterChainItem = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filterType: state.tempViewerFilter,
      params: { ...state.tempViewerFilterParams },
      enabled: true,
    };
    return { filterCart: [...state.filterCart, newItem] };
  }),

  removeFromFilterCart: (itemId) => set(state => ({
    filterCart: state.filterCart.filter(item => item.id !== itemId)
  })),

  reorderFilterCart: (fromIndex, toIndex) => set(state => {
    const newCart = [...state.filterCart];
    const [movedItem] = newCart.splice(fromIndex, 1);
    newCart.splice(toIndex, 0, movedItem);
    return { filterCart: newCart };
  }),

  clearFilterCart: () => set({ filterCart: [] }),

  toggleFilterCartItem: (itemId) => set(state => ({
    filterCart: state.filterCart.map(item => 
      item.id === itemId ? { ...item, enabled: !item.enabled } : item
    )
  })),

  updateFilterCartItem: (itemId, updates) => set(state => ({
    filterCart: state.filterCart.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    )
  })),

  // Filter Chain management
  createFilterChain: (name) => set(state => {
    const newChain: FilterChain = {
      id: `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      items: [...state.filterCart],
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    return { 
      filterChains: [...state.filterChains, newChain],
      activeFilterChain: newChain
    };
  }),

  updateFilterChain: (chainId, updates) => set(state => ({
    filterChains: state.filterChains.map(chain =>
      chain.id === chainId ? { ...chain, ...updates, modifiedAt: Date.now() } : chain
    ),
    activeFilterChain: state.activeFilterChain?.id === chainId 
      ? { ...state.activeFilterChain, ...updates, modifiedAt: Date.now() }
      : state.activeFilterChain
  })),

  deleteFilterChain: (chainId) => set(state => ({
    filterChains: state.filterChains.filter(chain => chain.id !== chainId),
    activeFilterChain: state.activeFilterChain?.id === chainId ? null : state.activeFilterChain
  })),

  setActiveFilterChain: (chain) => set({ activeFilterChain: chain }),

  importFilterChain: (chain) => set(state => {
    console.log('🔄 Store: importFilterChain called with:', chain);
    console.log('📊 Current filterChains count:', state.filterChains.length);
    
    // Add to filter chains list
    const newState = {
      filterChains: [...state.filterChains, chain],
      // Set as active chain for immediate visibility
      activeFilterChain: chain
    };
    
    console.log('📊 New filterChains count:', newState.filterChains.length);
    console.log('✅ Store: Filter chain imported and activated');
    return newState;
  }),

  loadFilterChainToCart: (chainId) => set(state => {
    console.log('🔄 Loading filter chain to cart:', chainId);
    const chain = state.filterChains.find(c => c.id === chainId);
    if (!chain) {
      console.log('❌ Chain not found:', chainId);
      return state;
    }
    
    console.log('✅ Loading chain items to cart:', chain.items);
    return {
      filterCart: [...chain.items],
      activeFilterChain: chain
    };
  }),

  exportFilterChain: (chainId) => {
    const state = get();
    const chain = state.filterChains.find((c: any) => c.id === chainId);
    if (chain) {
      import('./utils/filterExport').then(({ exportFilterChain }) => {
        exportFilterChain(chain);
      });
    }
  },

  exportCurrentCart: (name, description) => {
    const state = get();
    if (state.filterCart.length > 0) {
      import('./utils/filterExport').then(({ exportFilterCart }) => {
        exportFilterCart(state.filterCart, name, description);
      });
    }
  },

  applyFilterChain: (chain, viewerKey) => set(state => {
    // For now, we'll store the chain directly and let the ImageCanvas handle the sequential processing
    // This approach allows for more sophisticated caching and progress reporting
    const enabledItems = chain.items.filter(item => item.enabled);
    if (enabledItems.length === 0) return {};

    // Store the filter chain as a special filter type with chain data in params
    const chainFilter: FilterType = 'filterchain';
    const chainParams: FilterParams = { 
      ...defaultFilterParams,
      filterChain: enabledItems,
      chainId: chain.id,
      chainName: chain.name 
    };

    if (typeof viewerKey === 'number') { // Analysis Mode
      return {
        analysisFilters: { ...state.analysisFilters, [viewerKey]: chainFilter },
        analysisFilterParams: { ...state.analysisFilterParams, [viewerKey]: chainParams },
      };
    } else { // Folder-based modes
      return {
        viewerFilters: { ...state.viewerFilters, [viewerKey]: chainFilter },
        viewerFilterParams: { ...state.viewerFilterParams, [viewerKey]: chainParams },
      };
    }
  }),

  // Filter Preset management
  saveFilterPreset: (name, description = '', tags = []) => set(state => {
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      chain: [...state.filterCart],
      tags,
      description,
      createdAt: Date.now(),
    };
    return { filterPresets: [...state.filterPresets, newPreset] };
  }),

  loadFilterPreset: (presetId) => set(state => {
    const preset = state.filterPresets.find(p => p.id === presetId);
    if (!preset) return {};
    return { filterCart: [...preset.chain] };
  }),

  deleteFilterPreset: (presetId) => set(state => ({
    filterPresets: state.filterPresets.filter(preset => preset.id !== presetId)
  })),

  // UI controls
  setShowFilterCart: (show) => set(() => {
    if (show) return { showFilterCart: true };
    return {
      showFilterCart: false,
      activeFilterEditor: null,
    };
  }),
  setFilterPanelTab: (tab) => set({ filterPanelTab: tab }),
  
  // Preview Modal actions
  openPreviewModal: (config) => set(state => ({
    previewModal: {
      ...state.previewModal,
      isOpen: true,
      size: config.size || state.previewSize,
      // Do not carry stickySource across opens unless explicitly requested
      stickySource: config.stickySource ?? false,
      ...config
    }
  })),

  setPreviewSize: (size) => set({ previewSize: size }),
  setOriginalResolution: (originalResolution) => set({ originalResolution }),
  
  closePreviewModal: () => set(state => ({
    previewModal: {
      ...state.previewModal,
      isOpen: false,
      realTimeUpdate: false,
      stickySource: false
    },
    editingFilterChainItem: null
  })),
  
  updatePreviewModal: (updates) => set(state => ({
    previewModal: {
      ...state.previewModal,
      ...updates
    }
  })),

  // Toast notification actions
  addToast: (toast) => set(state => ({
    toasts: [...state.toasts, {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }]
  })),

  removeToast: (id) => set(state => ({
    toasts: state.toasts.filter(toast => toast.id !== id)
  })),

  clearAllToasts: () => set({ toasts: [] }),

  // Rect Zoom
  setRectZoomTarget: (key) => set({ rectZoomTarget: key }),
  setRectZoomGlobalActive: (active) => set({ rectZoomGlobalActive: active }),

  // Sync-capture actions
  startSync: (mode) => set({ syncCapture: { active: true, mode } }),
  cancelSync: () => set({ syncCapture: { active: false, mode: null } }),
  confirmSyncFromTarget: (target) => set((state) => {
    if (!state.syncCapture.active || !state.syncCapture.mode) return state as any;
    const mode = state.syncCapture.mode;

    if (mode === 'analysis') {
      const idx = typeof target === 'number' ? target : 0;
      const type = state.analysisFilters[idx] || 'none';
      const params = state.analysisFilterParams[idx];
      const nextFilters: Partial<Record<number, any>> = { ...state.analysisFilters };
      const nextParams: Partial<Record<number, any>> = { ...state.analysisFilterParams };
      for (let i = 0; i < state.numViewers; i++) {
        (nextFilters as any)[i] = type;
        if (params == null) {
          delete (nextParams as any)[i];
        } else {
          (nextParams as any)[i] = params;
        }
      }
      return {
        analysisFilters: nextFilters,
        analysisFilterParams: nextParams,
        syncCapture: { active: false, mode: null },
      } as any;
    } else {
      const key = String(target) as FolderKey;
      const type = state.viewerFilters[key] || 'none';
      const params = state.viewerFilterParams[key];
      const nextFilters: Partial<Record<FolderKey, any>> = { ...state.viewerFilters };
      const nextParams: Partial<Record<FolderKey, any>> = { ...state.viewerFilterParams };
      const arrangement = state.viewerArrangement[mode] as FolderKey[];
      const activeKeys = arrangement.slice(0, state.numViewers);
      for (const k of activeKeys) {
        (nextFilters as any)[k] = type;
        if (params == null) {
          delete (nextParams as any)[k];
        } else {
          (nextParams as any)[k] = params;
        }
      }
      return {
        viewerFilters: nextFilters,
        viewerFilterParams: nextParams,
        syncCapture: { active: false, mode: null },
      } as any;
    }
  }),

  // Leveling state actions
  startLeveling: (mode, targetKey = null, axis = 'horizontal') => set({ levelingCapture: { active: true, mode, targetKey, points: [], axis } }),
  cancelLeveling: () => set({ levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' } }),
  addLevelingPoint: (canvasKey, point) => set((state) => {
    const cap = state.levelingCapture;
    if (!cap.active || !cap.mode) return state as any;
    // Determine targetKey on first click for compare/analysis
    let targetKey = cap.targetKey;
    if ((cap.mode === 'compare' || cap.mode === 'analysis') && (targetKey == null)) {
      targetKey = canvasKey;
    }
    const newPoints = [...cap.points, point];
    if (newPoints.length < 2) {
      return { levelingCapture: { ...cap, targetKey, points: newPoints } } as any;
    }
    // Compute angle from two canvas points (screen/canvas coords)
    const [p1, p2] = newPoints;
    const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angleDeg = angleRad * 180 / Math.PI;
    const delta = cap.axis === 'vertical' ? (angleDeg - 90) : angleDeg; // rotate by -delta

    if (cap.mode === 'pinpoint') {
      if (typeof targetKey === 'string') {
        // Individual image rotation
        const current = state.pinpointRotations[targetKey] || 0;
        const newAngle = current - delta;
        return {
          levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' },
          pinpointRotations: { ...state.pinpointRotations, [targetKey]: newAngle }
        } as any;
      } else if (targetKey === null) {
        // Global rotation
        const current = state.pinpointGlobalRotation || 0;
        const newAngle = ((current - delta) % 360 + 360) % 360;
        return {
          levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' },
          pinpointGlobalRotation: newAngle
        } as any;
      }
    }
    if (cap.mode === 'compare') {
      const current = state.compareRotation || 0;
      const newAngle = ((current - delta) % 360 + 360) % 360;
      return {
        levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' },
        compareRotation: newAngle
      } as any;
    }
    if (cap.mode === 'analysis') {
      const current = state.analysisRotation || 0;
      const newAngle = ((current - delta) % 360 + 360) % 360;
      return {
        levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' },
        analysisRotation: newAngle
      } as any;
    }
    return { levelingCapture: { active: false, mode: null, targetKey: null, points: [], axis: 'horizontal' } } as any;
  }),

  // Position-based viewer reordering
  reorderViewers: (fromPosition: number, toPosition: number) => set((state) => {
    if (fromPosition === toPosition) return state;

    const { appMode, pinpointReorderMode } = state;
    const newArrangement = { ...state.viewerArrangement } as any;

    // Get the array for current mode
    const currentArrangement = [...(newArrangement[appMode] as any)];

    if (pinpointReorderMode === 'swap') {
      // Swap two positions
      const tmp = currentArrangement[fromPosition];
      currentArrangement[fromPosition] = currentArrangement[toPosition];
      currentArrangement[toPosition] = tmp;
    } else {
      // Shift/move the item
      const [movedItem] = currentArrangement.splice(fromPosition, 1);
      currentArrangement.splice(toPosition, 0, movedItem);
    }

    newArrangement[appMode] = currentArrangement as any;

    return {
      ...state,
      viewerArrangement: newArrangement
    };
  }),

  // Get content (FolderKey or number) for a position in specific mode
  getViewerContentAtPosition: (position: number, mode: AppMode): FolderKey | number => {
    const state = get();
    return state.viewerArrangement[mode][position];
  },

  // Reset arrangement to default
  resetViewerArrangement: () => set((state) => ({
    ...state,
    viewerArrangement: {
      compare: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
      pinpoint: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],  
      analysis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
    }
  })),

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
      // Reset all applied filters across modes when switching modes
      viewerFilters: {},
      viewerFilterParams: {},
      analysisFilters: {},
      analysisFilterParams: {},
      // Reset toggle selection when mode changes
      selectedViewers: [],
      toggleModalOpen: false,
      toggleCurrentIndex: 0,
      // Reset file selection when mode changes
      selectedFiles: new Set(),
      // Clear any sticky preview source when switching modes
      previewModal: {
        ...state.previewModal,
        stickySource: false,
        sourceFile: undefined,
      },
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
      const currentState = useStore.getState();
      const { fitScaleFn, appMode } = currentState;
      const newScale = fitScaleFn ? fitScaleFn() : 1;
      
      // ✅ FIX: In pinpoint mode, preserve existing local scales as-is during layout changes
      
      useStore.setState({
        viewport: { scale: newScale, cx: 0.5, cy: 0.5, refScreenX: undefined, refScreenY: undefined },
        // ✅ FIX: Only reset global scale if not in pinpoint mode to preserve zoom state
        ...(appMode !== 'pinpoint' ? { pinpointGlobalScale: 1 } : {}),
        // ✅ FIX: Preserve existing local scales completely in pinpoint mode - no changes needed!
      });
    }, 100);
  }
});

