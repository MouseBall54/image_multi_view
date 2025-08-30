import React from 'react';
import { useStore } from '../store';
import type { FilterType } from '../types';
import { LAWS_KERNEL_TYPES } from '../utils/filters';
import { 
  calculatePerformanceMetrics, 
  formatPerformanceEstimate
} from '../utils/opencvFilters';
import { FilterModeToggle } from './FilterModeToggle';

// Inline editable number: click value to edit, blur/Enter to commit, Esc to cancel
const InlineNumber: React.FC<{
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (v: number) => void;
}> = ({ value, min, max, step, onCommit }) => {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(String(value));

  React.useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  // Format up to 2 decimal places, trimming trailing zeros
  const fmt = (v: number) => {
    const rounded = Number.isFinite(v) ? Number(v.toFixed(2)) : v;
    const s = rounded.toFixed(2);
    return s.replace(/\.?0+$/, '');
  };

  return (
    <span className="inline-number-wrap">
      {editing ? (
        <input
          className="inline-number-input"
          type="number"
          value={text}
          min={min}
          max={max}
          step={step}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const num = parseFloat(text);
            if (!isNaN(num)) onCommit(Number(num.toFixed(2)));
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = parseFloat(text);
              if (!isNaN(num)) onCommit(Number(num.toFixed(2)));
              setEditing(false);
            } else if (e.key === 'Escape') {
              setText(String(value));
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="inline-number" onClick={() => setEditing(true)}>
          {fmt(value)}
        </span>
      )}
    </span>
  );
};

// Basic filters for simplified mode (7 essential filters)
export const BASIC_FILTERS: FilterType[] = [
  'none',
  'brightness', 
  'contrast',
  'grayscale',
  'gaussianblur',
  'histogramequalization',
  'sharpen'
];

export const ALL_FILTERS: { name: string; type: FilterType; group: string }[] = [
  // Tone & Basics
  { name: 'None', type: 'none', group: 'Tone & Basics' },
  { name: 'Grayscale', type: 'grayscale', group: 'Tone & Basics' },
  { name: 'Invert', type: 'invert', group: 'Tone & Basics' },
  { name: 'Sepia', type: 'sepia', group: 'Tone & Basics' },
  { name: 'Brightness', type: 'brightness', group: 'Tone & Basics' },
  { name: 'Contrast', type: 'contrast', group: 'Tone & Basics' },
  { name: 'Linear Contrast Stretching', type: 'linearstretch', group: 'Tone & Basics' },
  { name: 'Gamma Correction', type: 'gammacorrection', group: 'Tone & Basics' },

  // Contrast Enhancement
  { name: 'Histogram Equalization', type: 'histogramequalization', group: 'Contrast Enhancement' },
  { name: 'CLAHE (Contrast Limited Adaptive Histogram Equalization)', type: 'clahe', group: 'Contrast Enhancement' },
  { name: 'Local Histogram Equalization', type: 'localhistogramequalization', group: 'Contrast Enhancement' },
  { name: 'Adaptive Histogram Equalization (AHE)', type: 'adaptivehistogramequalization', group: 'Contrast Enhancement' },

  // Noise Reduction & Blurring
  { name: 'Box Blur', type: 'boxblur', group: 'Noise Reduction & Blurring' },
  { name: 'Gaussian Blur', type: 'gaussianblur', group: 'Noise Reduction & Blurring' },
  { name: 'Median Blur', type: 'median', group: 'Noise Reduction & Blurring' },
  { name: 'Weighted Median', type: 'weightedmedian', group: 'Noise Reduction & Blurring' },
  { name: 'Alpha-trimmed Mean', type: 'alphatrimmedmean', group: 'Noise Reduction & Blurring' },

  // Edge-Preserving Smoothing
  { name: 'Guided Filter', type: 'guided', group: 'Edge-Preserving Smoothing' },
  { name: 'Edge-preserving (Approx.)', type: 'edgepreserving', group: 'Edge-Preserving Smoothing' },

  // Sharpening
  { name: 'Sharpen', type: 'sharpen', group: 'Sharpening' },
  { name: 'Unsharp Masking', type: 'unsharpmask', group: 'Sharpening' },
  { name: 'High-pass Filter', type: 'highpass', group: 'Sharpening' },

  // Edge Detection - Basic
  { name: 'Sobel', type: 'sobel', group: 'Edge Detection - Basic' },
  { name: 'Scharr', type: 'scharr', group: 'Edge Detection - Basic' },
  { name: 'Laplacian', type: 'laplacian', group: 'Edge Detection - Basic' },

  // Edge Detection - Advanced
  { name: 'Canny', type: 'canny', group: 'Edge Detection - Advanced' },
  { name: 'LoG (Laplacian of Gaussian)', type: 'log', group: 'Edge Detection - Advanced' },
  { name: 'DoG (Difference of Gaussians)', type: 'dog', group: 'Edge Detection - Advanced' },
  { name: 'Marr-Hildreth', type: 'marrhildreth', group: 'Edge Detection - Advanced' },
  { name: 'Prewitt', type: 'prewitt', group: 'Edge Detection - Advanced' },
  { name: 'Roberts Cross', type: 'robertscross', group: 'Edge Detection - Advanced' },

  // Texture Analysis
  { name: 'Gabor Filter', type: 'gabor', group: 'Texture Analysis' },
  { name: 'Laws Texture Energy', type: 'lawstextureenergy', group: 'Texture Analysis' },
  { name: 'Local Binary Patterns (LBP)', type: 'lbp', group: 'Texture Analysis' },

  // Morphology & Distance
  { name: 'Morphology - Opening', type: 'morph_open', group: 'Morphology & Distance' },
  { name: 'Morphology - Closing', type: 'morph_close', group: 'Morphology & Distance' },
  { name: 'Morphology - Top-hat', type: 'morph_tophat', group: 'Morphology & Distance' },
  { name: 'Morphology - Black-hat', type: 'morph_blackhat', group: 'Morphology & Distance' },
  { name: 'Morphology - Gradient', type: 'morph_gradient', group: 'Morphology & Distance' },
  { name: 'Distance Transform', type: 'distancetransform', group: 'Morphology & Distance' },

  // Frequency Domain (Experimental)
  { name: 'Discrete Fourier Transform (DFT)', type: 'dft', group: 'Frequency Domain (Experimental)' },
  { name: 'Discrete Cosine Transform (DCT)', type: 'dct', group: 'Frequency Domain (Experimental)' },
  { name: 'Wavelet Transform', type: 'wavelet', group: 'Frequency Domain (Experimental)' },

  // Colormap - Perceptually Uniform (Recommended)
  { name: 'Viridis (Recommended)', type: 'colormap_viridis', group: 'Colormap - Perceptually Uniform' },
  { name: 'Inferno (High Contrast)', type: 'colormap_inferno', group: 'Colormap - Perceptually Uniform' },
  { name: 'Plasma (Vivid)', type: 'colormap_plasma', group: 'Colormap - Perceptually Uniform' },
  { name: 'Magma (Dark Tones)', type: 'colormap_magma', group: 'Colormap - Perceptually Uniform' },
  { name: 'Parula (MATLAB)', type: 'colormap_parula', group: 'Colormap - Perceptually Uniform' },

  // Colormap - Rainbow/Legacy
  { name: 'Jet (Legacy)', type: 'colormap_jet', group: 'Colormap - Rainbow/Legacy' },
  { name: 'HSV (Rainbow)', type: 'colormap_hsv', group: 'Colormap - Rainbow/Legacy' },
  { name: 'Hot (Heat)', type: 'colormap_hot', group: 'Colormap - Rainbow/Legacy' },

  // Colormap - Aesthetic Gradients  
  { name: 'Cool (Cyan-Magenta)', type: 'colormap_cool', group: 'Colormap - Aesthetic' },
  { name: 'Warm (Red-Yellow)', type: 'colormap_warm', group: 'Colormap - Aesthetic' },
  { name: 'Spring (Magenta-Yellow)', type: 'colormap_spring', group: 'Colormap - Aesthetic' },
  { name: 'Summer (Green-Yellow)', type: 'colormap_summer', group: 'Colormap - Aesthetic' },
  { name: 'Autumn (Red-Yellow)', type: 'colormap_autumn', group: 'Colormap - Aesthetic' },
  { name: 'Winter (Blue-Green)', type: 'colormap_winter', group: 'Colormap - Aesthetic' },

  // Colormap - Specialized
  { name: 'Bone (Gray-Blue)', type: 'colormap_bone', group: 'Colormap - Specialized' },
  { name: 'Copper (Black-Copper)', type: 'colormap_copper', group: 'Colormap - Specialized' },
  { name: 'Pink (Sepia-like)', type: 'colormap_pink', group: 'Colormap - Specialized' },

  // Colormap - Diverging (Change-based)
  { name: 'Red-Blue Diverging (Recommended)', type: 'colormap_rdbu', group: 'Colormap - Diverging' },
  { name: 'Red-Yellow-Blue', type: 'colormap_rdylbu', group: 'Colormap - Diverging' },
  { name: 'Blue-White-Red', type: 'colormap_bwr', group: 'Colormap - Diverging' },
  { name: 'Seismic (Geophysics)', type: 'colormap_seismic', group: 'Colormap - Diverging' },
  { name: 'Cool-Warm (ParaView)', type: 'colormap_coolwarm', group: 'Colormap - Diverging' },
  { name: 'Spectral (Rainbow Diverging)', type: 'colormap_spectral', group: 'Colormap - Diverging' },

  // Colormap - Gradient-based
  { name: 'Gradient Magnitude', type: 'colormap_gradient_magnitude', group: 'Colormap - Gradient-based' },
  { name: 'Edge Intensity', type: 'colormap_edge_intensity', group: 'Colormap - Gradient-based' },
  { name: 'Difference Map', type: 'colormap_difference', group: 'Colormap - Gradient-based' },
];

const filterGroups = [
  'Tone & Basics',
  'Contrast Enhancement',
  'Noise Reduction & Blurring',
  'Edge-Preserving Smoothing',
  'Sharpening',
  'Edge Detection - Basic',
  'Edge Detection - Advanced',
  'Texture Analysis',
  'Morphology & Distance',
  'Frequency Domain (Experimental)',
  'Colormap - Perceptually Uniform',
  'Colormap - Rainbow/Legacy',
  'Colormap - Aesthetic',
  'Colormap - Specialized',
  'Colormap - Diverging',
  'Colormap - Gradient-based'
];

export const FilterControls: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    appMode,
    activeFilterEditor,
    tempViewerFilter,
    tempViewerFilterParams,
    closeFilterEditor,
    setTempFilterType,
    setTempFilterParams,
    current,
    viewerImageSizes,
    analysisImageSizes,
    addToFilterCart,
    setShowFilterCart,
    showFilterCart,
    updatePreviewModal,
    folders,
    analysisFile,
    editingFilterChainItem,
    updateFilterCartItem,
  } = useStore();

  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = React.useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter mode state management
  const [isAdvancedMode, setIsAdvancedMode] = React.useState(() => {
    return localStorage.getItem('filterModalAdvancedMode') === 'true';
  });

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      if (!panelRef.current) return;
      const width = panelRef.current.offsetWidth || 400;
      const height = panelRef.current.offsetHeight || 500;
      const maxLeft = window.innerWidth - width;
      const maxTop = window.innerHeight - height;
      const left = Math.min(Math.max(0, ev.clientX - dragOffsetRef.current.x), Math.max(0, maxLeft));
      const top = Math.min(Math.max(0, ev.clientY - dragOffsetRef.current.y), Math.max(0, maxTop));
      setPanelPos({ left, top });
    };

    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Keep preview modal's source file in sync while editor is open and preview sidebar is visible
  React.useEffect(() => {
    const sourceFile = (() => {
      if (typeof activeFilterEditor === 'string') {
        if (!current) return undefined;
        const folder = folders[activeFilterEditor];
        if (!folder || !folder.data || !folder.data.files) return undefined;
        const files: Map<string, File> = folder.data.files;
        let f = files.get(current.filename);
        if (f) return f;
        const base = current.filename.replace(/\.[^/.]+$/, '');
        for (const [name, file] of files) {
          if (name === current.filename) return file;
          const nb = name.replace(/\.[^/.]+$/, '');
          if (nb === current.filename || nb === base) return file;
        }
        return undefined;
      } else if (typeof activeFilterEditor === 'number') {
        return analysisFile || undefined;
      }
      return undefined;
    })();

    // Update preview modal if open (unless stickySource is set)
    const state = useStore.getState();
    if (sourceFile && !(state.previewModal?.stickySource)) {
      updatePreviewModal({ sourceFile });
    }
  }, [current?.filename, analysisFile, activeFilterEditor, folders]);

  if (activeFilterEditor === null) return null;

  // Get current image file for preview (robust across modes)
  const getCurrentImageFile = (): File | undefined => {
    const findFileInFolder = (folder: any, filename: string | undefined): File | undefined => {
      if (!folder || !folder.data || !folder.data.files || !filename) return undefined;
      const files: Map<string, File> = folder.data.files;
      let f = files.get(filename);
      if (f) return f;
      const base = filename.replace(/\.[^/.]+$/, '');
      for (const [name, file] of files) {
        if (name === filename) return file;
        const nb = name.replace(/\.[^/.]+$/, '');
        if (nb === filename || nb === base) return file;
      }
      return undefined;
    };

    if (typeof activeFilterEditor === 'string') {
      if (!current) return undefined;
      // Prefer the editor-targeted folder
      const primary = findFileInFolder(folders[activeFilterEditor], current.filename);
      if (primary) return primary;
      // Try active canvas key (Pinpoint)
      const state = useStore.getState();
      const ack = state.activeCanvasKey;
      if (ack && typeof ack === 'string') {
        const viaCanvas = findFileInFolder(folders[ack], current.filename);
        if (viaCanvas) return viaCanvas;
      }
      // Scan any folder that has the current filename
      for (const k in current.has) {
        if ((current.has as any)[k]) {
          const f = findFileInFolder(folders[k as any], current.filename);
          if (f) return f;
        }
      }
      return undefined;
    }
    if (typeof activeFilterEditor === 'number') {
      return analysisFile || undefined;
    }
    return undefined;
  };

  const handleParamChange = (param: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newParams = { ...tempViewerFilterParams, [param]: numValue };
      setTempFilterParams({ [param]: numValue });
      
      // Update FilterChain item if we're editing one
      if (editingFilterChainItem) {
        updateFilterCartItem(editingFilterChainItem, { params: newParams });
        
        // Update preview modal with the updated chain
        const state = useStore.getState();
        const updatedChain = state.filterCart.map(item => 
          item.id === editingFilterChainItem ? { ...item, params: newParams } : item
        );
        
        if (state.previewModal?.isOpen && state.previewModal.mode === 'chain') {
          // Find the step index being edited
          const editingStepIndex = updatedChain.findIndex(item => item.id === editingFilterChainItem);
          // Only include filters up to the step being edited
          const filtersUpToStep = updatedChain.slice(0, editingStepIndex + 1).filter(f => f.enabled);
          updatePreviewModal({ chainItems: filtersUpToStep });
        } else if (state.previewModal?.isOpen && state.previewModal.mode === 'single') {
          updatePreviewModal({ filterParams: newParams });
        }
      } else {
        // Update preview modal if it's open with real-time updates (non-chain editing)
        const state = useStore.getState();
        if (state.previewModal?.isOpen) {
          updatePreviewModal({
            filterParams: newParams
          });
        }
      }
    }
  };

  const handleStringParamChange = (param: string, value: string) => {
    const newParams = { ...tempViewerFilterParams, [param]: value };
    setTempFilterParams({ [param]: value });
    
    // Update FilterChain item if we're editing one
    if (editingFilterChainItem) {
      updateFilterCartItem(editingFilterChainItem, { params: newParams });
      
      // Update preview modal with the updated chain
      const state = useStore.getState();
      const updatedChain = state.filterCart.map(item => 
        item.id === editingFilterChainItem ? { ...item, params: newParams } : item
      );
      
      if (state.previewModal?.isOpen && state.previewModal.mode === 'chain') {
        // Find the step index being edited
        const editingStepIndex = updatedChain.findIndex(item => item.id === editingFilterChainItem);
        // Only include filters up to the step being edited
        const filtersUpToStep = updatedChain.slice(0, editingStepIndex + 1).filter(f => f.enabled);
        updatePreviewModal({ chainItems: filtersUpToStep });
      } else if (state.previewModal?.isOpen && state.previewModal.mode === 'single') {
        updatePreviewModal({ filterParams: newParams });
      }
    } else {
      // Update preview modal if it's open with real-time updates (non-chain editing)
      const state = useStore.getState();
      if (state.previewModal?.isOpen) {
        updatePreviewModal({
          filterParams: newParams
        });
      }
    }
  };

  // Helper for InlineNumber onCommit with preview updates
  const handleInlineNumberCommit = (param: string, value: number) => {
    const newParams = { ...tempViewerFilterParams, [param]: value };
    setTempFilterParams({ [param]: value });
    
    // Update FilterChain item if we're editing one
    if (editingFilterChainItem) {
      updateFilterCartItem(editingFilterChainItem, { params: newParams });
      
      // Update preview modal with the updated chain
      const state = useStore.getState();
      const updatedChain = state.filterCart.map(item => 
        item.id === editingFilterChainItem ? { ...item, params: newParams } : item
      );
      
      if (state.previewModal?.isOpen && state.previewModal.mode === 'chain') {
        // Find the step index being edited
        const editingStepIndex = updatedChain.findIndex(item => item.id === editingFilterChainItem);
        // Only include filters up to the step being edited
        const filtersUpToStep = updatedChain.slice(0, editingStepIndex + 1).filter(f => f.enabled);
        updatePreviewModal({ chainItems: filtersUpToStep });
      } else if (state.previewModal?.isOpen && state.previewModal.mode === 'single') {
        updatePreviewModal({ filterParams: newParams });
      }
    } else {
      // Update preview modal if it's open with real-time updates (non-chain editing)
      const state = useStore.getState();
      if (state.previewModal?.isOpen) {
        updatePreviewModal({
          filterParams: newParams
        });
      }
    }
  };

  // Calculate performance metrics for current filter and image
  const getPerformanceMetrics = () => {
    
    // Try to get actual image dimensions from current file
    let estimatedWidth = 1920; // Default HD width
    let estimatedHeight = 1080; // Default HD height

    // Prefer actual canvas image size from store
    if (typeof activeFilterEditor === 'string') {
      const s = viewerImageSizes[activeFilterEditor];
      if (s && s.width && s.height) {
        estimatedWidth = s.width;
        estimatedHeight = s.height;
      }
    } else if (typeof activeFilterEditor === 'number') {
      const s = analysisImageSizes[activeFilterEditor];
      if (s && s.width && s.height) {
        estimatedWidth = s.width;
        estimatedHeight = s.height;
      }
    }
    
    // Enhanced logic: try to get actual dimensions from current image
    if (current && current.filename && (!estimatedWidth || !estimatedHeight || (estimatedWidth === 1920 && estimatedHeight === 1080))) {
      // Extract resolution hints from filename if available
      const filename = current.filename;
      const resolutionMatch = filename.match(/(\d{3,4})[x×](\d{3,4})/i);
      if (resolutionMatch) {
        estimatedWidth = parseInt(resolutionMatch[1]);
        estimatedHeight = parseInt(resolutionMatch[2]);
      } else {
        // Common resolution indicators in filenames
        const filenameLower = filename.toLowerCase();
        if (filenameLower.includes('4k') || filenameLower.includes('uhd')) {
          estimatedWidth = 3840; estimatedHeight = 2160;
        } else if (filenameLower.includes('2k') || filenameLower.includes('qhd')) {
          estimatedWidth = 2560; estimatedHeight = 1440;
        } else if (filenameLower.includes('fullhd') || filenameLower.includes('1080p')) {
          estimatedWidth = 1920; estimatedHeight = 1080;
        } else if (filenameLower.includes('hd') || filenameLower.includes('720p')) {
          estimatedWidth = 1280; estimatedHeight = 720;
        }
      }
    }
    
    // Map filter types to performance calculation types
    const filterMap: Record<string, string> = {
      // Basic filters
      'none': 'none',
      'grayscale': 'grayscale',
      'invert': 'invert',
      'sepia': 'sepia',
      
      // Contrast enhancement
      'linearstretch': 'linearStretch',
      'brightness': 'linearStretch',
      'contrast': 'linearStretch',
      'histogramequalization': 'histogramEqualization',
      'localhistogramequalization': 'localHistogramEqualization',
      'adaptivehistogramequalization': 'adaptiveHistogramEqualization',
      'clahe': 'clahe',
      'gammacorrection': 'gammaCorrection',
      
      // Blurring filters
      'boxblur': 'boxBlur',
      'gaussianblur': 'gaussianBlur',
      'median': 'medianBlur',
      'weightedmedian': 'weightedMedian',
      'alphatrimmedmean': 'alphaTrimmedMean',
      
      // Sharpening filters
      'sharpen': 'sharpen',
      'unsharpmask': 'unsharpMask',
      'highpass': 'highpass',
      'laplacian': 'laplacian',
      
      // Edge detection filters
      'sobel': 'sobel',
      'prewitt': 'prewitt',
      'scharr': 'scharr',
      'canny': 'canny',
      'robertscross': 'robertsCross',
      'log': 'log',
      'dog': 'dog',
      'marrhildreth': 'marrHildreth',
      
      
      // Texture analysis filters
      'gabor': 'gabor',
      'lawstextureenergy': 'lawsTextureEnergy',
      'lbp': 'lbp',
      
      // Edge-preserving filters
      'guided': 'guidedFilter',
      'edgepreserving': 'edgePreserving',
      
      // Frequency domain filters
      'dft': 'dft',
      'dct': 'dct',
      'wavelet': 'wavelet',
      
      // Morphology filters
      'morph_open': 'morphology',
      'morph_close': 'morphology',
      'morph_tophat': 'morphology',
      'morph_blackhat': 'morphology',
      'morph_gradient': 'morphology',
      'distancetransform': 'distanceTransform',
      
      // Colormap - Perceptually Uniform (Recommended)
      'colormap_viridis': 'colormap',
      'colormap_inferno': 'colormap',
      'colormap_plasma': 'colormap',
      'colormap_magma': 'colormap',
      'colormap_parula': 'colormap',
      
      // Colormap - Rainbow/Legacy
      'colormap_jet': 'colormap',
      'colormap_hsv': 'colormap',
      'colormap_hot': 'colormap',
      
      // Colormap - Aesthetic Gradients
      'colormap_cool': 'colormap',
      'colormap_warm': 'colormap',
      'colormap_spring': 'colormap',
      'colormap_summer': 'colormap',
      'colormap_autumn': 'colormap',
      'colormap_winter': 'colormap',
      
      // Colormap - Specialized
      'colormap_bone': 'colormap',
      'colormap_copper': 'colormap',
      'colormap_pink': 'colormap',
      
      // Colormap - Diverging (Change-based)
      'colormap_rdbu': 'colormap',
      'colormap_rdylbu': 'colormap',
      'colormap_bwr': 'colormap',
      'colormap_seismic': 'colormap',
      'colormap_coolwarm': 'colormap',
      'colormap_spectral': 'colormap',
      
      // Colormap - Gradient-based
      'colormap_gradient_magnitude': 'gradient_colormap',
      'colormap_edge_intensity': 'gradient_colormap',
      'colormap_difference': 'colormap', // Less expensive than full gradient
      
      'filterchain': 'filterchain',
    };
    
    const performanceType = filterMap[tempViewerFilter] || 'default';
    return calculatePerformanceMetrics(estimatedWidth, estimatedHeight, performanceType, tempViewerFilterParams);
  };

  const performanceMetrics = getPerformanceMetrics();
  const getEstimateColor = (ms: number): string => {
    if (ms < 200) return '#10b981';
    if (ms < 800) return '#f59e0b';
    if (ms < 3000) return '#ef4444';
    return '#dc2626';
  };
  const perfDims = (() => {
    let w = 1920, h = 1080;
    if (typeof activeFilterEditor === 'string') {
      const s = viewerImageSizes[activeFilterEditor];
      if (s && s.width && s.height) { w = s.width; h = s.height; }
    } else if (typeof activeFilterEditor === 'number') {
      const s = analysisImageSizes[activeFilterEditor];
      if (s && s.width && s.height) { w = s.width; h = s.height; }
    }
    return { w, h };
  })();

  const renderParams = () => {
    switch (tempViewerFilter) {
      case 'brightness':
        return (
          <div className="control-row">
            <label>Brightness</label>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={tempViewerFilterParams.brightness ?? 0}
              onChange={(e) => handleParamChange('brightness', e.target.value)}
            />
            <InlineNumber
              value={tempViewerFilterParams.brightness ?? 0}
              min={-100}
              max={100}
              step={1}
              onCommit={(v)=> handleInlineNumberCommit('brightness', v)}
            />
          </div>
        );
      case 'contrast':
        return (
          <div className="control-row">
            <label>Contrast</label>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={tempViewerFilterParams.contrast ?? 100}
              onChange={(e) => handleParamChange('contrast', e.target.value)}
            />
            <InlineNumber
              value={tempViewerFilterParams.contrast ?? 100}
              min={0}
              max={200}
              step={1}
              onCommit={(v)=> handleInlineNumberCommit('contrast', v)}
            />
          </div>
        );
      case 'edgepreserving':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input type="range" min="3" max="21" step="2" value={tempViewerFilterParams.kernelSize ?? 5} onChange={(e)=>handleParamChange('kernelSize', e.target.value)} />
              <span>{tempViewerFilterParams.kernelSize ?? 5}</span>
            </div>
            <div className="control-row">
              <label>Sigma Color</label>
              <input type="range" min="1" max="100" step="1" value={tempViewerFilterParams.sigmaColor ?? 25} onChange={(e)=>handleParamChange('sigmaColor', e.target.value)} />
              <span>{tempViewerFilterParams.sigmaColor ?? 25}</span>
            </div>
            <div className="control-row">
              <label>Sigma Space</label>
              <input type="range" min="1" max="100" step="1" value={tempViewerFilterParams.sigmaSpace ?? 25} onChange={(e)=>handleParamChange('sigmaSpace', e.target.value)} />
              <span>{tempViewerFilterParams.sigmaSpace ?? 25}</span>
            </div>
          </>
        );
      case 'morph_open':
      case 'morph_close':
      case 'morph_tophat':
      case 'morph_blackhat':
      case 'morph_gradient':
        return (
          <div className="control-row">
            <label>Kernel Size</label>
            <input type="range" min="3" max="25" step="2" value={tempViewerFilterParams.kernelSize ?? 3} onChange={(e)=>handleParamChange('kernelSize', e.target.value)} />
            <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
          </div>
        );
      case 'distancetransform':
        return (
          <div className="control-row">
            <label>Threshold</label>
            <input type="range" min="0" max="255" step="1" value={tempViewerFilterParams.lowThreshold ?? 128} onChange={(e)=>handleParamChange('lowThreshold', e.target.value)} />
            <span>{tempViewerFilterParams.lowThreshold ?? 128}</span>
          </div>
        );
      case 'boxblur':
      case 'median':
      case 'weightedmedian':
      case 'localhistogramequalization':
        return (
          <div className="control-row">
            <label>Kernel Size</label>
            <input
              type="range"
              min="3"
              max="21"
              step="2"
              value={tempViewerFilterParams.kernelSize ?? 3}
              onChange={(e) => handleParamChange('kernelSize', e.target.value)}
            />
            <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
          </div>
        );
      case 'gaussianblur':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="3"
                max="21"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 3}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
            </div>
            <div className="control-row">
              <label>Sigma</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma ?? 1.0}
                onChange={(e) => handleParamChange('sigma', e.target.value)}
              />
              <InlineNumber
                value={tempViewerFilterParams.sigma ?? 1.0}
                min={0.1}
                max={10}
                step={0.01}
                onCommit={(v)=> handleInlineNumberCommit('sigma', v)}
              />
            </div>
          </>
        );
      case 'log':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="3"
                max="21"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 3}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
            </div>
            <div className="control-row">
              <label>Sigma</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma ?? 1.0}
                onChange={(e) => handleParamChange('sigma', e.target.value)}
              />
              <InlineNumber
                value={tempViewerFilterParams.sigma ?? 1.0}
                min={0.1}
                max={10}
                step={0.01}
                onCommit={(v)=> handleInlineNumberCommit('sigma', v)}
              />
            </div>
          </>
        );
      case 'dog':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="3"
                max="21"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 3}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
            </div>
            <div className="control-row">
              <label>Sigma 1</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma ?? 1.0}
                onChange={(e) => handleParamChange('sigma', e.target.value)}
              />
              <span>{(tempViewerFilterParams.sigma ?? 1.0).toFixed(1)}</span>
            </div>
            <div className="control-row">
              <label>Sigma 2</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma2 ?? 2.0}
                onChange={(e) => handleParamChange('sigma2', e.target.value)}
              />
              <span>{(tempViewerFilterParams.sigma2 ?? 2.0).toFixed(1)}</span>
            </div>
          </>
        );
      case 'marrhildreth':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="3"
                max="21"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 9}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 9}</span>
            </div>
            <div className="control-row">
              <label>Sigma</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma ?? 1.4}
                onChange={(e) => handleParamChange('sigma', e.target.value)}
              />
              <span>{(tempViewerFilterParams.sigma ?? 1.4).toFixed(1)}</span>
            </div>
            <div className="control-row">
              <label>Threshold</label>
              <input
                type="range"
                min="0"
                max="255"
                step="1"
                value={tempViewerFilterParams.threshold ?? 10}
                onChange={(e) => handleParamChange('threshold', e.target.value)}
              />
              <span>{tempViewerFilterParams.threshold ?? 10}</span>
            </div>
          </>
        );
      case 'alphatrimmedmean':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="3"
                max="21"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 3}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
            </div>
            <div className="control-row">
              <label>Alpha</label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={tempViewerFilterParams.alpha ?? 0.0}
                onChange={(e) => handleParamChange('alpha', e.target.value)}
              />
              <span>{(tempViewerFilterParams.alpha ?? 0.0).toFixed(2)}</span>
            </div>
          </>
        );
      case 'sharpen':
        return (
          <div className="control-row">
            <label>Amount</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={tempViewerFilterParams.sharpenAmount ?? 1.0}
              onChange={(e) => handleParamChange('sharpenAmount', e.target.value)}
            />
            <span>{(tempViewerFilterParams.sharpenAmount ?? 1.0).toFixed(1)}</span>
          </div>
        );
      case 'laplacian':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="1"
                max="7"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 3}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 3}</span>
            </div>
          </>
        );
      case 'canny':
        return (
          <>
            <div className="control-row">
              <label>Low Threshold</label>
              <input
                type="range"
                min="1"
                max="254"
                value={tempViewerFilterParams.lowThreshold ?? 20}
                onChange={(e) => handleParamChange('lowThreshold', e.target.value)}
              />
              <span>{tempViewerFilterParams.lowThreshold ?? 20}</span>
            </div>
            <div className="control-row">
              <label>High Threshold</label>
              <input
                type="range"
                min="1"
                max="254"
                value={tempViewerFilterParams.highThreshold ?? 50}
                onChange={(e) => handleParamChange('highThreshold', e.target.value)}
              />
              <span>{tempViewerFilterParams.highThreshold ?? 50}</span>
            </div>
          </>
        );
      case 'adaptivehistogramequalization':
        return (
          <div className="control-row">
            <label>Grid Size</label>
            <input
              type="range"
              min="2"
              max="16"
              step="1"
              value={tempViewerFilterParams.gridSize ?? 8}
              onChange={(e) => handleParamChange('gridSize', e.target.value)}
            />
            <span>{tempViewerFilterParams.gridSize ?? 8}</span>
          </div>
        );
      case 'clahe':
        return (
          <>
            <div className="control-row">
              <label>Clip Limit</label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={tempViewerFilterParams.clipLimit ?? 2.0}
                onChange={(e) => handleParamChange('clipLimit', e.target.value)}
              />
              <InlineNumber
                value={tempViewerFilterParams.clipLimit ?? 2.0}
                min={1}
                max={10}
                step={0.01}
                onCommit={(v)=> handleInlineNumberCommit('clipLimit', v)}
              />
            </div>
            <div className="control-row">
              <label>Grid Size</label>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={tempViewerFilterParams.gridSize ?? 8}
                onChange={(e) => handleParamChange('gridSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.gridSize ?? 8}</span>
            </div>
          </>
        );
      case 'gammacorrection':
        return (
          <div className="control-row">
            <label>Gamma</label>
            <input
              type="range"
              min="0.2"
              max="2.2"
              step="0.1"
              value={tempViewerFilterParams.gamma ?? 1.0}
              onChange={(e) => handleParamChange('gamma', e.target.value)}
            />
            <InlineNumber
              value={tempViewerFilterParams.gamma ?? 1.0}
              min={0.2}
              max={2.2}
              step={0.01}
              onCommit={(v)=> handleInlineNumberCommit('gamma', v)}
            />
          </div>
        );
      case 'unsharpmask':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input
                type="range"
                min="3"
                max="21"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 5}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 5}</span>
            </div>
            <div className="control-row">
              <label>Sigma</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma ?? 1.0}
                onChange={(e) => handleParamChange('sigma', e.target.value)}
              />
              <InlineNumber
                value={tempViewerFilterParams.sigma ?? 1.0}
                min={0.1}
                max={10}
                step={0.01}
                onCommit={(v)=> handleInlineNumberCommit('sigma', v)}
              />
            </div>
            <div className="control-row">
              <label>Amount</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={tempViewerFilterParams.sharpenAmount ?? 1.0}
                onChange={(e) => handleParamChange('sharpenAmount', e.target.value)}
              />
              <InlineNumber
                value={tempViewerFilterParams.sharpenAmount ?? 1.0}
                min={0.1}
                max={5}
                step={0.01}
                onCommit={(v)=> handleInlineNumberCommit('sharpenAmount', v)}
              />
            </div>
          </>
        );
      case 'gabor':
        return (
          <>
            <div className="control-row">
              <label>Kernel Size</label>
              <input type="range" min="3" max="31" step="2" value={tempViewerFilterParams.kernelSize ?? 15} onChange={(e) => handleParamChange('kernelSize', e.target.value)} />
              <span>{tempViewerFilterParams.kernelSize ?? 15}</span>
            </div>
            <div className="control-row">
              <label>Theta (θ)</label>
              <input type="range" min="0" max="3.14" step="0.1" value={tempViewerFilterParams.theta ?? 0} onChange={(e) => handleParamChange('theta', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.theta ?? 0} min={0} max={3.14} step={0.01} onCommit={(v)=> handleInlineNumberCommit('theta', v)} />
            </div>
            <div className="control-row">
              <label>Sigma (σ)</label>
              <input type="range" min="1" max="10" step="0.5" value={tempViewerFilterParams.sigma ?? 4.0} onChange={(e) => handleParamChange('sigma', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.sigma ?? 4.0} min={1} max={10} step={0.01} onCommit={(v)=> handleInlineNumberCommit('sigma', v)} />
            </div>
            <div className="control-row">
              <label>Lambda (λ)</label>
              <input type="range" min="3" max="20" step="1" value={tempViewerFilterParams.lambda ?? 10.0} onChange={(e) => handleParamChange('lambda', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.lambda ?? 10.0} min={3} max={20} step={0.01} onCommit={(v)=> handleInlineNumberCommit('lambda', v)} />
            </div>
            <div className="control-row">
              <label>Gamma (γ)</label>
              <input type="range" min="0.2" max="1" step="0.1" value={tempViewerFilterParams.gamma ?? 0.5} onChange={(e) => handleParamChange('gamma', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.gamma ?? 0.5} min={0.2} max={1} step={0.01} onCommit={(v)=> handleInlineNumberCommit('gamma', v)} />
            </div>
            <div className="control-row">
              <label>Psi (ψ)</label>
              <input type="range" min="0" max="3.14" step="0.1" value={tempViewerFilterParams.psi ?? 0} onChange={(e) => handleParamChange('psi', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.psi ?? 0} min={0} max={3.14} step={0.01} onCommit={(v)=> handleInlineNumberCommit('psi', v)} />
            </div>
          </>
        );
      case 'lawstextureenergy':
        return (
          <>
            <div className="control-row">
              <label>Kernel Type</label>
              <select
                value={tempViewerFilterParams.lawsKernelType ?? 'L5E5'}
                onChange={(e) => handleStringParamChange('lawsKernelType', e.target.value)}
              >
                {LAWS_KERNEL_TYPES.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="control-row">
              <label>Energy Window</label>
              <input
                type="range"
                min="3"
                max="25"
                step="2"
                value={tempViewerFilterParams.kernelSize ?? 15}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 15}</span>
            </div>
          </>
        );
      case 'guided':
        return (
          <>
            <div className="control-row">
              <label>Radius</label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={tempViewerFilterParams.kernelSize ?? 5}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize ?? 5}</span>
            </div>
            <div className="control-row">
              <label>Epsilon</label>
              <input
                type="range"
                min="0.01"
                max="0.2"
                step="0.01"
                value={tempViewerFilterParams.epsilon ?? 0.04}
                onChange={(e) => handleParamChange('epsilon', e.target.value)}
              />
              <InlineNumber value={tempViewerFilterParams.epsilon ?? 0.04} min={0.01} max={0.2} step={0.01} onCommit={(v)=> handleInlineNumberCommit('epsilon', v)} />
            </div>
          </>
        );

      // Gradient-based Colormap Parameters
      case 'colormap_gradient_magnitude':
        return (
          <>
            <div className="control-row">
              <label>Intensity</label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={tempViewerFilterParams.gamma ?? 1.0} onChange={(e)=>handleParamChange('gamma', e.target.value)} />
              <span>{tempViewerFilterParams.gamma ?? 1.0}</span>
            </div>
            <div className="control-row">
              <label>Sensitivity</label>
              <input type="range" min="0.1" max="5.0" step="0.1" value={tempViewerFilterParams.sensitivity ?? 1.0} onChange={(e)=>handleParamChange('sensitivity', e.target.value)} />
              <span>{tempViewerFilterParams.sensitivity ?? 1.0}</span>
            </div>
          </>
        );

      case 'colormap_edge_intensity':
        return (
          <>
            <div className="control-row">
              <label>Intensity</label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={tempViewerFilterParams.gamma ?? 1.0} onChange={(e)=>handleParamChange('gamma', e.target.value)} />
              <span>{tempViewerFilterParams.gamma ?? 1.0}</span>
            </div>
            <div className="control-row">
              <label>Threshold</label>
              <input type="range" min="0.01" max="0.5" step="0.01" value={tempViewerFilterParams.threshold ?? 0.1} onChange={(e)=>handleParamChange('threshold', e.target.value)} />
              <span>{tempViewerFilterParams.threshold ?? 0.1}</span>
            </div>
          </>
        );

      case 'colormap_difference':
        return (
          <>
            <div className="control-row">
              <label>Intensity</label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={tempViewerFilterParams.gamma ?? 1.0} onChange={(e)=>handleParamChange('gamma', e.target.value)} />
              <span>{tempViewerFilterParams.gamma ?? 1.0}</span>
            </div>
            <div className="control-row">
              <label>Center Value</label>
              <input type="range" min="0" max="255" step="1" value={tempViewerFilterParams.centerValue ?? 128} onChange={(e)=>handleParamChange('centerValue', e.target.value)} />
              <span>{tempViewerFilterParams.centerValue ?? 128}</span>
            </div>
          </>
        );

      // Regular Colormap Parameters (for intensity)
      case 'colormap_viridis':
      case 'colormap_inferno':
      case 'colormap_plasma':
      case 'colormap_magma':
      case 'colormap_parula':
      case 'colormap_jet':
      case 'colormap_hsv':
      case 'colormap_hot':
      case 'colormap_cool':
      case 'colormap_warm':
      case 'colormap_spring':
      case 'colormap_summer':
      case 'colormap_autumn':
      case 'colormap_winter':
      case 'colormap_bone':
      case 'colormap_copper':
      case 'colormap_pink':
      case 'colormap_rdbu':
      case 'colormap_rdylbu':
      case 'colormap_bwr':
      case 'colormap_seismic':
      case 'colormap_coolwarm':
      case 'colormap_spectral':
        return (
          <>
            <div className="control-row">
              <label>Intensity</label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={tempViewerFilterParams.gamma ?? 1.0} onChange={(e)=>handleParamChange('gamma', e.target.value)} />
              <span>{tempViewerFilterParams.gamma ?? 1.0}</span>
            </div>
          </>
        );

      default:
        return <p>No parameters for this filter.</p>;
    }
  };

  const panelStyle: React.CSSProperties = panelPos ? { position: 'fixed', left: panelPos.left, top: panelPos.top, transform: 'none', cursor: isDragging ? 'grabbing' as const : undefined } : {};

  const body = (
        <>
        <div className="panel-body">
          <div className="control-row">
            <label>Filter Type</label>
            <select value={tempViewerFilter} onChange={(e) => {
              const newFilterType = e.target.value as FilterType;
              setTempFilterType(newFilterType);
              
              // Reset parameters to defaults for the new filter type
              const defaultParams = {
                kernelSize: 3,
                sigma: 1.0,
                sigma2: 2.0,
                clipLimit: 2.0,
                gridSize: 8,
                gamma: 1.0,
                sharpenAmount: 1.0,
                lowThreshold: 20,
                highThreshold: 50,
                threshold: 128,
                alpha: 0.0,
                sigmaColor: 25,
                sigmaSpace: 25,
                epsilon: 0.04,
                theta: 0,
                lambda: 10.0,
                psi: 0,
                lawsKernelType: 'L5E5',
                cutoff: 30,
                gaborSigma: 1.5
              };
              setTempFilterParams(defaultParams);
              
              // Update preview modal if it's open with new filter type and default params
              updatePreviewModal({
                filterType: newFilterType,
                filterParams: defaultParams,
                title: `Filter Preview: ${ALL_FILTERS.find(f => f.type === newFilterType)?.name || newFilterType}`
              });
            }}>
              {filterGroups.map(group => {
                const groupFilters = ALL_FILTERS.filter(f => f.group === group);
                const displayFilters = isAdvancedMode ? 
                  groupFilters : 
                  groupFilters.filter(f => BASIC_FILTERS.includes(f.type));
                
                // Only show groups that have filters to display
                if (displayFilters.length === 0) return null;
                
                return (
                  <optgroup label={group} key={group}>
                    {displayFilters.map(f => (
                      <option key={f.type} value={f.type}>{f.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div className="params-container">
            {renderParams()}
          </div>
          
          {performanceMetrics && (
            <div className="performance-metrics">
              <div className="performance-header">
                <span className="performance-label">Performance Estimate</span>
                <span 
                  className="performance-badge"
                  style={{ 
                    backgroundColor: getEstimateColor(performanceMetrics.estimatedTimeMs),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  {formatPerformanceEstimate(performanceMetrics)}
                </span>
              </div>
              <div className="performance-details">
                <span className="detail-item">
                  Complexity: <strong>{performanceMetrics.complexity.replace('_', ' ')}</strong>
                </span>
                <span className="detail-item">
                  Memory: <strong>~{performanceMetrics.memoryUsageMB}MB</strong>
                </span>
              </div>
              <div className="performance-info">
                <small>Current resolution: {perfDims.w}×{perfDims.h}</small>
                {/* Removed OpenCV badge per request */}
              </div>
              {performanceMetrics.estimatedTimeMs > 1000 && (
                <div className="performance-warning">
                  ⚠️ This filter may take a while with high-resolution images
                </div>
              )}
              {performanceMetrics.estimatedTimeMs > 5000 && (
                <div className="performance-critical">
                  🔥 Very intensive operation - consider reducing parameters
                </div>
              )}
              {/* Removed all per-filter performance tips for a cleaner UI */}
            </div>
          )}
        </div>
        <div className="panel-footer">
          <div className="filter-actions">
            <button 
              onClick={() => {
                addToFilterCart();
                if (!showFilterCart) {
                  setShowFilterCart(true);
                }
              }} 
              className="btn btn-icon btn-theme-success"
              disabled={tempViewerFilter === 'none'}
              title="Add current filter to chain"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1"/>
                <circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L23 6H6"/>
                <path d="M12 13V7"/>
                <path d="M15 10L12 7L9 10"/>
              </svg>
            </button>
            {!showFilterCart && (
              <button 
                onClick={() => setShowFilterCart(true)}
                className="btn btn-icon btn-theme-secondary"
                title="Show filter chain panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  <path d="M9 14h6"/>
                  <path d="M9 18h3"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        </>
  );

  if (embedded) {
    return (
      <div className="filter-controls-embedded">
        <div className="panel-header">
          <div className="header-left">
            <h3>Filter Editor</h3>
            <FilterModeToggle 
              isAdvanced={isAdvancedMode} 
              onToggle={setIsAdvancedMode} 
            />
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="filter-controls-overlay">
      <div className="filter-controls-panel" ref={panelRef} style={panelStyle}>
        <div className="panel-header" onMouseDown={onHeaderMouseDown} style={{ cursor: 'grab' }}>
          <div className="header-left">
            <h3>Filter Editor (View {activeFilterEditor})</h3>
            <FilterModeToggle 
              isAdvanced={isAdvancedMode} 
              onToggle={setIsAdvancedMode} 
            />
          </div>
          <button onClick={closeFilterEditor} className="close-btn">&times;</button>
        </div>
        {body}
      </div>
    </div>
  );
};
