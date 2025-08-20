import React from 'react';
import { useStore } from '../store';
import type { FilterType } from '../types';
import { LAWS_KERNEL_TYPES } from '../utils/filters';
import { 
  calculatePerformanceMetrics, 
  formatPerformanceEstimate, 
  getComplexityColor 
} from '../utils/opencvFilters';

export const ALL_FILTERS: { name: string; type: FilterType; group: string }[] = [
  { name: 'None', type: 'none', group: 'General' },
  { name: 'Grayscale', type: 'grayscale', group: 'General' },
  { name: 'Invert', type: 'invert', group: 'General' },
  { name: 'Sepia', type: 'sepia', group: 'General' },
  { name: 'Linear Contrast Stretching', type: 'linearstretch', group: 'Contrast' },
  { name: 'Histogram Equalization', type: 'histogramequalization', group: 'Contrast' },
  { name: 'Local Histogram Equalization', type: 'localhistogramequalization', group: 'Contrast' },
  { name: 'Adaptive Histogram Equalization', type: 'adaptivehistogramequalization', group: 'Contrast' },
  { name: 'CLAHE', type: 'clahe', group: 'Contrast' },
  { name: 'Gamma Correction', type: 'gammacorrection', group: 'Contrast' },
  { name: 'Box Blur', type: 'boxblur', group: 'Blurring' },
  { name: 'Gaussian Blur', type: 'gaussianblur', group: 'Blurring' },
  { name: 'Median', type: 'median', group: 'Blurring' },
  { name: 'Weighted Median', type: 'weightedmedian', group: 'Blurring' },
  { name: 'Alpha-trimmed Mean', type: 'alphatrimmedmean', group: 'Blurring' },
  { name: 'Sharpen', type: 'sharpen', group: 'Sharpening' },
  { name: 'Unsharp Masking', type: 'unsharpmask', group: 'Sharpening' },
  { name: 'High-pass Filter', type: 'highpass', group: 'Sharpening' },
  { name: 'Sobel', type: 'sobel', group: 'Edge Detection' },
  { name: 'Laplacian', type: 'laplacian', group: 'Edge Detection' },
  { name: 'Prewitt', type: 'prewitt', group: 'Edge Detection' },
  { name: 'Scharr', type: 'scharr', group: 'Edge Detection' },
  { name: 'Canny', type: 'canny', group: 'Edge Detection' },
  { name: 'Roberts Cross', type: 'robertscross', group: 'Edge Detection' },
  { name: 'LoG', type: 'log', group: 'Edge Detection' },
  { name: 'DoG', type: 'dog', group: 'Edge Detection' },
  { name: 'Marr-Hildreth', type: 'marrhildreth', group: 'Edge Detection' },
  { name: 'Gabor Filter', type: 'gabor', group: 'Texture Analysis' },
  { name: 'Laws Texture Energy', type: 'lawstextureenergy', group: 'Texture Analysis' },
  { name: 'Local Binary Patterns', type: 'lbp', group: 'Texture Analysis' },
  { name: 'Guided Filter', type: 'guided', group: 'Edge-preserving Filter' },
  { name: 'Edge-preserving (Approx.)', type: 'edgepreserving', group: 'Edge-preserving Filter' },
  { name: 'Discrete Fourier Transform (DFT)', type: 'dft', group: 'Frequency Domain' },
  { name: 'Discrete Cosine Transform (DCT)', type: 'dct', group: 'Frequency Domain' },
  { name: 'Wavelet Transform', type: 'wavelet', group: 'Frequency Domain' },
  { name: 'Morphology - Opening', type: 'morph_open', group: 'Morphology' },
  { name: 'Morphology - Closing', type: 'morph_close', group: 'Morphology' },
  { name: 'Morphology - Top-hat', type: 'morph_tophat', group: 'Morphology' },
  { name: 'Morphology - Black-hat', type: 'morph_blackhat', group: 'Morphology' },
  { name: 'Morphology - Gradient', type: 'morph_gradient', group: 'Morphology' },
  { name: 'Distance Transform', type: 'distancetransform', group: 'Morphology' },
];

const filterGroups = ['General', 'Contrast', 'Blurring', 'Sharpening', 'Edge Detection', 'Texture Analysis', 'Edge-preserving Filter', 'Frequency Domain', 'Morphology'];

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
  } = useStore();

  if (activeFilterEditor === null) return null;

  const handleParamChange = (param: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTempFilterParams({ [param]: numValue });
    }
  };

  const handleStringParamChange = (param: string, value: string) => {
    setTempFilterParams({ [param]: value });
  };

  // Calculate performance metrics for current filter and image
  const getPerformanceMetrics = () => {
    if (!current) return null;
    
    // Try to get actual image dimensions from current file
    let estimatedWidth = 1920; // Default HD width
    let estimatedHeight = 1080; // Default HD height
    
    // Enhanced logic: try to get actual dimensions from current image
    if (current && typeof current === 'string') {
      // Extract resolution hints from filename if available
      const resolutionMatch = current.match(/(\d{3,4})[x×](\d{3,4})/i);
      if (resolutionMatch) {
        estimatedWidth = parseInt(resolutionMatch[1]);
        estimatedHeight = parseInt(resolutionMatch[2]);
      } else {
        // Common resolution indicators in filenames
        if (current.toLowerCase().includes('4k') || current.toLowerCase().includes('uhd')) {
          estimatedWidth = 3840; estimatedHeight = 2160;
        } else if (current.toLowerCase().includes('2k') || current.toLowerCase().includes('qhd')) {
          estimatedWidth = 2560; estimatedHeight = 1440;
        } else if (current.toLowerCase().includes('fullhd') || current.toLowerCase().includes('1080p')) {
          estimatedWidth = 1920; estimatedHeight = 1080;
        } else if (current.toLowerCase().includes('hd') || current.toLowerCase().includes('720p')) {
          estimatedWidth = 1280; estimatedHeight = 720;
        }
      }
    }
    
    // Map filter types to performance calculation types
    const filterMap: Record<string, string> = {
      // Basic filters
      'none': 'grayscale', // No processing
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
              <span>{(tempViewerFilterParams.sigma ?? 1.0).toFixed(1)}</span>
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
              <span>{(tempViewerFilterParams.sigma ?? 1.0).toFixed(1)}</span>
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
              <select
                value={tempViewerFilterParams.kernelSize ?? 3}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              >
                <option value={1}>1 (3x3 optimized)</option>
                <option value={3}>3 (3x3 standard)</option>
                <option value={5}>5 (5x5)</option>
                <option value={7}>7 (7x7)</option>
              </select>
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
              <span>{(tempViewerFilterParams.clipLimit ?? 2.0).toFixed(1)}</span>
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
            <span>{(tempViewerFilterParams.gamma ?? 1.0).toFixed(1)}</span>
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
              <span>{(tempViewerFilterParams.sigma ?? 1.0).toFixed(1)}</span>
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
              <span>{(tempViewerFilterParams.sharpenAmount ?? 1.0).toFixed(1)}</span>
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
              <span>{(tempViewerFilterParams.theta ?? 0).toFixed(2)}</span>
            </div>
            <div className="control-row">
              <label>Sigma (σ)</label>
              <input type="range" min="1" max="10" step="0.5" value={tempViewerFilterParams.sigma ?? 4.0} onChange={(e) => handleParamChange('sigma', e.target.value)} />
              <span>{(tempViewerFilterParams.sigma ?? 4.0).toFixed(1)}</span>
            </div>
            <div className="control-row">
              <label>Lambda (λ)</label>
              <input type="range" min="3" max="20" step="1" value={tempViewerFilterParams.lambda ?? 10.0} onChange={(e) => handleParamChange('lambda', e.target.value)} />
              <span>{(tempViewerFilterParams.lambda ?? 10.0).toFixed(1)}</span>
            </div>
            <div className="control-row">
              <label>Gamma (γ)</label>
              <input type="range" min="0.2" max="1" step="0.1" value={tempViewerFilterParams.gamma ?? 0.5} onChange={(e) => handleParamChange('gamma', e.target.value)} />
              <span>{(tempViewerFilterParams.gamma ?? 0.5).toFixed(1)}</span>
            </div>
            <div className="control-row">
              <label>Psi (ψ)</label>
              <input type="range" min="0" max="3.14" step="0.1" value={tempViewerFilterParams.psi ?? 0} onChange={(e) => handleParamChange('psi', e.target.value)} />
              <span>{(tempViewerFilterParams.psi ?? 0).toFixed(2)}</span>
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
              <span>{(tempViewerFilterParams.epsilon ?? 0.04).toFixed(2)}</span>
            </div>
          </>
        );
      default:
        return <p>No parameters for this filter.</p>;
    }
  };

  return (
    <div className="filter-controls-overlay">
      <div className="filter-controls-panel">
        <div className="panel-header">
          <h3>Filter Editor (View {activeFilterEditor})</h3>
          <button onClick={closeFilterEditor} className="close-btn">&times;</button>
        </div>
        <div className="panel-body">
          <div className="control-row">
            <label>Filter Type</label>
            <select value={tempViewerFilter} onChange={(e) => setTempFilterType(e.target.value as FilterType)}>
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
                    backgroundColor: getComplexityColor(performanceMetrics.complexity),
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
                <small>Estimated for 1920×1080 resolution</small>
                {['gaussianblur', 'boxblur', 'median', 'sobel', 'scharr', 'canny', 'laplacian', 'morph_open', 'morph_close', 'morph_tophat', 'morph_blackhat', 'morph_gradient', 'distancetransform', 'prewitt', 'robertscross', 'log', 'dog', 'marrhildreth'].includes(tempViewerFilter) && (
                  <div className="opencv-badge">
                    <small>🚀 OpenCV Accelerated</small>
                  </div>
                )}
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
              {/* Performance tips for specific filters */}
              {(['weightedmedian', 'alphatrimmedmean'].includes(tempViewerFilter)) && (
                <div className="performance-tip">
                  💡 Tip: Smaller kernel sizes will significantly improve performance
                </div>
              )}
              {tempViewerFilter === 'localhistogramequalization' && (
                <div className="performance-tip">
                  💡 Tip: Smaller kernel size reduces computation time significantly
                </div>
              )}
              {tempViewerFilter === 'clahe' && (
                <div className="performance-tip">
                  💡 Tip: Larger grid size = better performance
                </div>
              )}
              {tempViewerFilter === 'canny' && (
                <div className="performance-tip">
                  💡 Tip: OpenCV Canny includes automatic Gaussian blur and non-maximum suppression
                </div>
              )}
              {['sobel', 'scharr'].includes(tempViewerFilter) && (
                <div className="performance-tip">
                  💡 Tip: OpenCV version combines X & Y gradients automatically
                </div>
              )}
              {tempViewerFilter === 'laplacian' && (
                <div className="performance-tip">
                  💡 Tip: Kernel size 1 is fastest (optimized 3×3), size 7 provides finest details
                </div>
              )}
            </div>
          )}
        </div>
        <div className="panel-footer">
          <button onClick={applyTempFilterSettings} className="apply-btn">
            Apply Filter
            {performanceMetrics && ` (${formatPerformanceEstimate(performanceMetrics)})`}
          </button>
        </div>
      </div>
    </div>
  );
};
