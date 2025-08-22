import React from 'react';
import { useStore } from '../store';
import type { FilterType } from '../types';
import { LAWS_KERNEL_TYPES } from '../utils/filters';
import { 
  calculatePerformanceMetrics, 
  formatPerformanceEstimate
} from '../utils/opencvFilters';

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

export const ALL_FILTERS: { name: string; type: FilterType; group: string }[] = [
  // Tone & Basics
  { name: 'None', type: 'none', group: 'Tone & Basics' },
  { name: 'Grayscale', type: 'grayscale', group: 'Tone & Basics' },
  { name: 'Invert', type: 'invert', group: 'Tone & Basics' },
  { name: 'Sepia', type: 'sepia', group: 'Tone & Basics' },
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
  'Frequency Domain (Experimental)'
];

export const FilterControls: React.FC = () => {
  const {
    activeFilterEditor,
    tempViewerFilter,
    tempViewerFilterParams,
    closeFilterEditor,
    setTempFilterType,
    setTempFilterParams,
    applyTempFilterSettings,
    current,
    viewerImageSizes,
    analysisImageSizes,
    addToFilterCart,
    setShowFilterCart,
    showFilterCart,
    openPreviewModal,
    updatePreviewModal,
    folders,
    analysisFile,
  } = useStore();

  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = React.useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
        return folder && folder.data.files ? folder.data.files.get(current.filename) : undefined;
      } else if (typeof activeFilterEditor === 'number') {
        return analysisFile || undefined;
      }
      return undefined;
    })();

    // Update preview modal if open
    if (sourceFile) {
      updatePreviewModal({ sourceFile });
    }
  }, [current?.filename, analysisFile]);

  if (activeFilterEditor === null) return null;

  // Get current image file for preview
  const getCurrentImageFile = (): File | undefined => {
    if (typeof activeFilterEditor === 'string') {
      // Viewer mode - get from folder
      if (!current) return undefined;
      const folder = folders[activeFilterEditor];
      if (folder && folder.data.files) {
        return folder.data.files.get(current.filename);
      }
    } else if (typeof activeFilterEditor === 'number') {
      // Analysis mode - get from analysisFile
      return analysisFile || undefined;
    }
    
    return undefined;
  };

  const handleParamChange = (param: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTempFilterParams({ [param]: numValue });
      
      // Update preview modal if it's open with real-time updates
      updatePreviewModal({
        filterParams: { ...tempViewerFilterParams, [param]: numValue }
      });
    }
  };

  const handleStringParamChange = (param: string, value: string) => {
    setTempFilterParams({ [param]: value });
    
    // Update preview modal if it's open with real-time updates
    updatePreviewModal({
      filterParams: { ...tempViewerFilterParams, [param]: value }
    });
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
                onCommit={(v)=> setTempFilterParams({ sigma: v })}
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
                onCommit={(v)=> setTempFilterParams({ sigma: v })}
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
                onCommit={(v)=> setTempFilterParams({ clipLimit: v })}
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
              onCommit={(v)=> setTempFilterParams({ gamma: v })}
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
                onCommit={(v)=> setTempFilterParams({ sigma: v })}
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
                onCommit={(v)=> setTempFilterParams({ sharpenAmount: v })}
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
              <InlineNumber value={tempViewerFilterParams.theta ?? 0} min={0} max={3.14} step={0.01} onCommit={(v)=> setTempFilterParams({ theta: v })} />
            </div>
            <div className="control-row">
              <label>Sigma (σ)</label>
              <input type="range" min="1" max="10" step="0.5" value={tempViewerFilterParams.sigma ?? 4.0} onChange={(e) => handleParamChange('sigma', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.sigma ?? 4.0} min={1} max={10} step={0.01} onCommit={(v)=> setTempFilterParams({ sigma: v })} />
            </div>
            <div className="control-row">
              <label>Lambda (λ)</label>
              <input type="range" min="3" max="20" step="1" value={tempViewerFilterParams.lambda ?? 10.0} onChange={(e) => handleParamChange('lambda', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.lambda ?? 10.0} min={3} max={20} step={0.01} onCommit={(v)=> setTempFilterParams({ lambda: v })} />
            </div>
            <div className="control-row">
              <label>Gamma (γ)</label>
              <input type="range" min="0.2" max="1" step="0.1" value={tempViewerFilterParams.gamma ?? 0.5} onChange={(e) => handleParamChange('gamma', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.gamma ?? 0.5} min={0.2} max={1} step={0.01} onCommit={(v)=> setTempFilterParams({ gamma: v })} />
            </div>
            <div className="control-row">
              <label>Psi (ψ)</label>
              <input type="range" min="0" max="3.14" step="0.1" value={tempViewerFilterParams.psi ?? 0} onChange={(e) => handleParamChange('psi', e.target.value)} />
              <InlineNumber value={tempViewerFilterParams.psi ?? 0} min={0} max={3.14} step={0.01} onCommit={(v)=> setTempFilterParams({ psi: v })} />
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
              <InlineNumber value={tempViewerFilterParams.epsilon ?? 0.04} min={0.01} max={0.2} step={0.01} onCommit={(v)=> setTempFilterParams({ epsilon: v })} />
            </div>
          </>
        );
      default:
        return <p>No parameters for this filter.</p>;
    }
  };

  const panelStyle: React.CSSProperties = panelPos ? { position: 'fixed', left: panelPos.left, top: panelPos.top, transform: 'none', cursor: isDragging ? 'grabbing' as const : undefined } : {};

  return (
    <div className="filter-controls-overlay">
      <div className="filter-controls-panel" ref={panelRef} style={panelStyle}>
        <div className="panel-header" onMouseDown={onHeaderMouseDown} style={{ cursor: 'grab' }}>
          <h3>Filter Editor (View {activeFilterEditor})</h3>
          <button onClick={closeFilterEditor} className="close-btn">&times;</button>
        </div>
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
              {filterGroups.map(group => (
                <optgroup label={group} key={group}>
                  {ALL_FILTERS.filter(f => f.group === group).map(f => (
                    <option key={f.type} value={f.type}>{f.name}</option>
                  ))}
                </optgroup>
              ))}
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
                const sourceFile = getCurrentImageFile();
                if (sourceFile && tempViewerFilter !== 'none') {
                  openPreviewModal({
                    mode: 'single',
                    filterType: tempViewerFilter,
                    filterParams: tempViewerFilterParams,
                    title: `Filter Preview: ${ALL_FILTERS.find(f => f.type === tempViewerFilter)?.name || tempViewerFilter}`,
                    sourceFile,
                    realTimeUpdate: true,
                    position: 'sidebar'
                  });
                }
              }}
              className="btn btn-icon btn-theme-primary"
              disabled={tempViewerFilter === 'none' || !getCurrentImageFile()}
              title="Open filter preview with real-time updates"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
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
          <button onClick={applyTempFilterSettings} className="btn btn-icon btn-theme-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
