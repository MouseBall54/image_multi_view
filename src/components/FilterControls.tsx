import React from 'react';
import { useStore } from '../store';
import type { FilterType } from '../types';

const ALL_FILTERS: { name: string; type: FilterType; group: string }[] = [
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
  { name: 'Laplacian', type: 'laplacian', group: 'Sharpening' },
  { name: 'Sobel', type: 'sobel', group: 'Edge Detection' },
  { name: 'Prewitt', type: 'prewitt', group: 'Edge Detection' },
  { name: 'Scharr', type: 'scharr', group: 'Edge Detection' },
  { name: 'Canny', type: 'canny', group: 'Edge Detection' },
  { name: 'Roberts Cross', type: 'robertscross', group: 'Edge Detection' },
  { name: 'LoG', type: 'log', group: 'Edge Detection' },
  { name: 'DoG', type: 'dog', group: 'Edge Detection' },
  { name: 'Marr-Hildreth', type: 'marrhildreth', group: 'Edge Detection' },
  { name: 'Bilateral Filter', type: 'bilateral', group: 'Advanced Denoising' },
  { name: 'Non-local Means', type: 'nonlocalmeans', group: 'Advanced Denoising' },
  { name: 'Anisotropic Diffusion', type: 'anisotropicdiffusion', group: 'Advanced Denoising' },
];

const filterGroups = ['General', 'Contrast', 'Blurring', 'Sharpening', 'Edge Detection', 'Advanced Denoising'];

export const FilterControls: React.FC = () => {
  const {
    activeFilterEditor,
    tempViewerFilter,
    tempViewerFilterParams,
    closeFilterEditor,
    setTempFilterType,
    setTempFilterParams,
    applyTempFilterSettings,
  } = useStore();

  if (!activeFilterEditor) return null;

  const handleParamChange = (param: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTempFilterParams({ [param]: numValue });
    }
  };

  const renderParams = () => {
    switch (tempViewerFilter) {
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
      case 'bilateral':
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
              <label>Sigma Color</label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={tempViewerFilterParams.sigmaColor ?? 20}
                onChange={(e) => handleParamChange('sigmaColor', e.target.value)}
              />
              <span>{tempViewerFilterParams.sigmaColor ?? 20}</span>
            </div>
            <div className="control-row">
              <label>Sigma Space</label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={tempViewerFilterParams.sigmaSpace ?? 20}
                onChange={(e) => handleParamChange('sigmaSpace', e.target.value)}
              />
              <span>{tempViewerFilterParams.sigmaSpace ?? 20}</span>
            </div>
          </>
        );
      case 'nonlocalmeans':
        return (
          <>
            <div className="control-row">
              <label>Patch Size</label>
              <input
                type="range"
                min="3"
                max="9"
                step="2"
                value={tempViewerFilterParams.patchSize ?? 5}
                onChange={(e) => handleParamChange('patchSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.patchSize ?? 5}</span>
            </div>
            <div className="control-row">
              <label>Search Window</label>
              <input
                type="range"
                min="5"
                max="21"
                step="2"
                value={tempViewerFilterParams.searchWindowSize ?? 11}
                onChange={(e) => handleParamChange('searchWindowSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.searchWindowSize ?? 11}</span>
            </div>
            <div className="control-row">
              <label>H (Smoothing)</label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={tempViewerFilterParams.h ?? 10}
                onChange={(e) => handleParamChange('h', e.target.value)}
              />
              <span>{tempViewerFilterParams.h ?? 10}</span>
            </div>
          </>
        );
      case 'anisotropicdiffusion':
        return (
          <>
            <div className="control-row">
              <label>Iterations</label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={tempViewerFilterParams.iterations ?? 10}
                onChange={(e) => handleParamChange('iterations', e.target.value)}
              />
              <span>{tempViewerFilterParams.iterations ?? 10}</span>
            </div>
            <div className="control-row">
              <label>Kappa</label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={tempViewerFilterParams.kappa ?? 20}
                onChange={(e) => handleParamChange('kappa', e.target.value)}
              />
              <span>{tempViewerFilterParams.kappa ?? 20}</span>
            </div>
          </>
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
        </div>
        <div className="panel-footer">
          <button onClick={applyTempFilterSettings} className="apply-btn">Apply Filter</button>
        </div>
      </div>
    </div>
  );
};
