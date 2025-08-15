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
  { name: 'CLAHE', type: 'clahe', group: 'Contrast' },
  { name: 'Gamma Correction', type: 'gammacorrection', group: 'Contrast' },
  { name: 'Box Blur', type: 'boxblur', group: 'Blurring' },
  { name: 'Gaussian Blur', type: 'gaussianblur', group: 'Blurring' },
  { name: 'Sharpen', type: 'sharpen', group: 'Sharpening' },
  { name: 'Laplacian', type: 'laplacian', group: 'Sharpening' },
  { name: 'Sobel', type: 'sobel', group: 'Edge Detection' },
  { name: 'Prewitt', type: 'prewitt', group: 'Edge Detection' },
  { name: 'Scharr', type: 'scharr', group: 'Edge Detection' },
  { name: 'Canny', type: 'canny', group: 'Edge Detection' },
];

const filterGroups = ['General', 'Contrast', 'Blurring', 'Sharpening', 'Edge Detection'];

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
                value={tempViewerFilterParams.kernelSize}
                onChange={(e) => handleParamChange('kernelSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.kernelSize}</span>
            </div>
            <div className="control-row">
              <label>Sigma</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={tempViewerFilterParams.sigma}
                onChange={(e) => handleParamChange('sigma', e.target.value)}
              />
              <span>{tempViewerFilterParams.sigma.toFixed(1)}</span>
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
              value={tempViewerFilterParams.sharpenAmount}
              onChange={(e) => handleParamChange('sharpenAmount', e.target.value)}
            />
            <span>{tempViewerFilterParams.sharpenAmount.toFixed(1)}</span>
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
                value={tempViewerFilterParams.lowThreshold}
                onChange={(e) => handleParamChange('lowThreshold', e.target.value)}
              />
              <span>{tempViewerFilterParams.lowThreshold}</span>
            </div>
            <div className="control-row">
              <label>High Threshold</label>
              <input
                type="range"
                min="1"
                max="254"
                value={tempViewerFilterParams.highThreshold}
                onChange={(e) => handleParamChange('highThreshold', e.target.value)}
              />
              <span>{tempViewerFilterParams.highThreshold}</span>
            </div>
          </>
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
                value={tempViewerFilterParams.clipLimit}
                onChange={(e) => handleParamChange('clipLimit', e.target.value)}
              />
              <span>{tempViewerFilterParams.clipLimit.toFixed(1)}</span>
            </div>
            <div className="control-row">
              <label>Grid Size</label>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={tempViewerFilterParams.gridSize}
                onChange={(e) => handleParamChange('gridSize', e.target.value)}
              />
              <span>{tempViewerFilterParams.gridSize}</span>
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
              value={tempViewerFilterParams.gamma}
              onChange={(e) => handleParamChange('gamma', e.target.value)}
            />
            <span>{tempViewerFilterParams.gamma.toFixed(1)}</span>
          </div>
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
