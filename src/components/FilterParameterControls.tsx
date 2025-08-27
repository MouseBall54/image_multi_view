import React from 'react';
import type { FilterType } from '../types';
import type { FilterParams } from '../store';
import { ALL_FILTERS } from './FilterControls';
import { LAWS_KERNEL_TYPES } from '../utils/filters';

interface FilterParameterControlsProps {
  filterType: FilterType;
  filterParams: FilterParams;
  onChange: (params: FilterParams) => void;
  compact?: boolean;
}

// Reusable parameter control components


const RangeInput: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  compact?: boolean;
}> = ({ label, value, min, max, step = 1, onChange, compact = false }) => {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(String(value));

  React.useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  const fmt = (v: number) => {
    // Show up to 2 decimals without trailing zeros
    const s = Number.isFinite(v) ? Number(v.toFixed(2)).toString() : String(v);
    return s;
  };

  const commit = () => {
    const num = parseFloat(text);
    if (!isNaN(num)) {
      // clamp to [min, max]
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
    }
    setEditing(false);
  };

  return (
    <div className={`param-control ${compact ? 'compact' : ''}`}>
      <label className="param-label">
        {label}: {editing ? (
          <input
            className="inline-number-input"
            type="number"
            value={text}
            min={min}
            max={max}
            step={step}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') { setText(String(value)); setEditing(false); }
            }}
          />
        ) : (
          <span
            className="param-value"
            title="Double-click to edit"
            onDoubleClick={() => setEditing(true)}
          >
            {fmt(value)}
          </span>
        )}
      </label>
      <input
        type="range"
        className="param-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};

export const FilterParameterControls: React.FC<FilterParameterControlsProps> = ({
  filterType,
  filterParams,
  onChange,
  compact = false
}) => {
  const updateParam = (param: string, value: any) => {
    onChange({ ...filterParams, [param]: value });
  };

  const renderControls = () => {
    switch (filterType) {
      case 'gaussianblur':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize || 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma"
              value={(filterParams as any).sigma || 1.0}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
            />
          </>
        );

      case 'localhistogramequalization':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize || 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );

      case 'canny':
        return (
          <>
            <RangeInput
              label="Low Threshold"
              value={(filterParams as any).lowThreshold ?? 20}
              min={1}
              max={254}
              step={1}
              onChange={(value) => updateParam('lowThreshold', value)}
              compact={compact}
            />
            <RangeInput
              label="High Threshold"
              value={(filterParams as any).highThreshold ?? 50}
              min={1}
              max={254}
              step={1}
              onChange={(value) => updateParam('highThreshold', value)}
              compact={compact}
            />
          </>
        );

      case 'boxblur':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize || 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );

      case 'median':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize || 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );

      case 'sharpen':
        return (
          <>
            <RangeInput
              label="Sharpen Amount"
              value={(filterParams as any).sharpenAmount || 1.0}
              min={0.1}
              max={5.0}
              step={0.1}
              onChange={(value) => updateParam('sharpenAmount', value)}
              compact={compact}
            />
          </>
        );

      case 'gammacorrection':
        return (
          <>
            <RangeInput
              label="Gamma"
              value={(filterParams as any).gamma ?? 1.0}
              min={0.2}
              max={2.2}
              step={0.1}
              onChange={(value) => updateParam('gamma', value)}
              compact={compact}
            />
          </>
        );

      case 'histogramequalization':
        // No adjustable params in params-container
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'clahe':
        return (
          <>
            <RangeInput
              label="Clip Limit"
              value={(filterParams as any).clipLimit ?? 2.0}
              min={1}
              max={10}
              step={0.5}
              onChange={(value) => updateParam('clipLimit', value)}
              compact={compact}
            />
            <RangeInput
              label="Grid Size"
              value={(filterParams as any).gridSize ?? 8}
              min={2}
              max={16}
              step={1}
              onChange={(value) => updateParam('gridSize', value)}
              compact={compact}
            />
          </>
        );

      case 'adaptivehistogramequalization':
        return (
          <>
            <RangeInput
              label="Grid Size"
              value={(filterParams as any).gridSize ?? 8}
              min={2}
              max={16}
              step={1}
              onChange={(value) => updateParam('gridSize', value)}
              compact={compact}
            />
          </>
        );

      case 'bilateral':
        // Not exposed in params-container; fallback to no params
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'nonlocalmeans':
        // Not exposed in params-container; fallback to no params
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'anisotropicdiffusion':
        // Not exposed in params-container; fallback to no params
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'gabor':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 15}
              min={3}
              max={31}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Theta (θ)"
              value={(filterParams as any).theta ?? 0}
              min={0}
              max={3.14}
              step={0.1}
              onChange={(value) => updateParam('theta', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma (σ)"
              value={(filterParams as any).sigma ?? 4.0}
              min={1}
              max={10}
              step={0.5}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
            />
            <RangeInput
              label="Lambda (λ)"
              value={(filterParams as any).lambda ?? 10.0}
              min={3}
              max={20}
              step={1}
              onChange={(value) => updateParam('lambda', value)}
              compact={compact}
            />
            <RangeInput
              label="Gamma (γ)"
              value={(filterParams as any).gamma ?? 0.5}
              min={0.2}
              max={1}
              step={0.1}
              onChange={(value) => updateParam('gamma', value)}
              compact={compact}
            />
            <RangeInput
              label="Psi (ψ)"
              value={(filterParams as any).psi ?? 0}
              min={0}
              max={3.14}
              step={0.1}
              onChange={(value) => updateParam('psi', value)}
              compact={compact}
            />
          </>
        );

      case 'lbp':
        // Not exposed in params-container; fallback to no params
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'morph_open':
      case 'morph_close':
      case 'morph_tophat':
      case 'morph_blackhat':
      case 'morph_gradient':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 3}
              min={3}
              max={25}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );

      case 'unsharpmask':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 5}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma"
              value={(filterParams as any).sigma ?? 1.0}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
            />
            <RangeInput
              label="Amount"
              value={(filterParams as any).sharpenAmount ?? 1.0}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(value) => updateParam('sharpenAmount', value)}
              compact={compact}
            />
          </>
        );

      case 'weightedmedian':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );

      case 'alphatrimmedmean':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Alpha"
              value={(filterParams as any).alpha ?? 0.0}
              min={0}
              max={0.5}
              step={0.05}
              onChange={(value) => updateParam('alpha', value)}
              compact={compact}
            />
          </>
        );

      case 'dog':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma 1"
              value={(filterParams as any).sigma ?? 1.0}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma 2"
              value={(filterParams as any).sigma2 ?? 2.0}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(value) => updateParam('sigma2', value)}
              compact={compact}
            />
          </>
        );

      case 'log':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 3}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma"
              value={(filterParams as any).sigma || 1.0}
              min={0.1}
              max={10.0}
              step={0.1}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
            />
          </>
        );

      case 'marrhildreth':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 9}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma"
              value={(filterParams as any).sigma ?? 1.4}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
            />
            <RangeInput
              label="Threshold"
              value={(filterParams as any).threshold ?? 10}
              min={0}
              max={255}
              step={1}
              onChange={(value) => updateParam('threshold', value)}
              compact={compact}
            />
          </>
        );

      case 'guided':
        return (
          <>
            <RangeInput
              label="Radius"
              value={(filterParams as any).kernelSize ?? 5}
              min={1}
              max={20}
              step={1}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Epsilon"
              value={(filterParams as any).epsilon ?? 0.04}
              min={0.01}
              max={0.2}
              step={0.01}
              onChange={(value) => updateParam('epsilon', value)}
              compact={compact}
            />
          </>
        );

      case 'edgepreserving':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 5}
              min={3}
              max={21}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma Color"
              value={(filterParams as any).sigmaColor ?? 25}
              min={1}
              max={100}
              step={1}
              onChange={(value) => updateParam('sigmaColor', value)}
              compact={compact}
            />
            <RangeInput
              label="Sigma Space"
              value={(filterParams as any).sigmaSpace ?? 25}
              min={1}
              max={100}
              step={1}
              onChange={(value) => updateParam('sigmaSpace', value)}
              compact={compact}
            />
          </>
        );

      case 'linearstretch':
        // No adjustable params in params-container
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'lawstextureenergy':
        return (
          <>
            <div className={`param-control ${compact ? 'compact' : ''}`}>
              <label className="param-label">Kernel Type</label>
              <select
                className="param-range"
                value={(filterParams as any).lawsKernelType ?? 'L5E5'}
                onChange={(e) => updateParam('lawsKernelType', e.target.value)}
              >
                {LAWS_KERNEL_TYPES.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <RangeInput
              label="Energy Window"
              value={(filterParams as any).kernelSize ?? 15}
              min={3}
              max={25}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );

      case 'wavelet':
        // Not exposed in params-container; fallback to no params
        return (
          <div className="param-control">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );
      case 'laplacian':
        return (
          <>
            <RangeInput
              label="Kernel Size"
              value={(filterParams as any).kernelSize ?? 3}
              min={1}
              max={7}
              step={2}
              onChange={(value) => updateParam('kernelSize', value)}
              compact={compact}
            />
          </>
        );
      case 'distancetransform':
        return (
          <>
            <RangeInput
              label="Threshold"
              value={(filterParams as any).lowThreshold ?? 128}
              min={0}
              max={255}
              step={1}
              onChange={(value) => updateParam('lowThreshold', value)}
              compact={compact}
            />
          </>
        );

      // Gradient-based Colormaps with advanced parameters
      case 'colormap_gradient_magnitude':
        return (
          <>
            <RangeInput
              label="Intensity"
              value={(filterParams as any).gamma ?? 1.0}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={(value) => updateParam('gamma', value)}
              compact={compact}
            />
            <RangeInput
              label="Sensitivity"
              value={(filterParams as any).sensitivity ?? 1.0}
              min={0.1}
              max={5.0}
              step={0.1}
              onChange={(value) => updateParam('sensitivity', value)}
              compact={compact}
            />
          </>
        );

      case 'colormap_edge_intensity':
        return (
          <>
            <RangeInput
              label="Intensity"
              value={(filterParams as any).gamma ?? 1.0}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={(value) => updateParam('gamma', value)}
              compact={compact}
            />
            <RangeInput
              label="Threshold"
              value={(filterParams as any).threshold ?? 0.1}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={(value) => updateParam('threshold', value)}
              compact={compact}
            />
          </>
        );

      case 'colormap_difference':
        return (
          <>
            <RangeInput
              label="Intensity"
              value={(filterParams as any).gamma ?? 1.0}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={(value) => updateParam('gamma', value)}
              compact={compact}
            />
            <RangeInput
              label="Center Value"
              value={(filterParams as any).centerValue ?? 128}
              min={0}
              max={255}
              step={1}
              onChange={(value) => updateParam('centerValue', value)}
              compact={compact}
            />
          </>
        );

      // Regular Colormaps with intensity parameter
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
            <RangeInput
              label="Intensity"
              value={(filterParams as any).gamma ?? 1.0}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={(value) => updateParam('gamma', value)}
              compact={compact}
            />
          </>
        );

      default:
        return (
          <div className="param-control">
            <p className="no-params-message">
              This filter has no adjustable parameters or parameter editing is not yet implemented.
            </p>
          </div>
        );
    }
  };

  const filterName = ALL_FILTERS.find(f => f.type === filterType)?.name || filterType;

  return (
    <div className={`filter-parameter-controls ${compact ? 'compact' : ''}`}>
      <div className="param-header">
        <h4 className="param-title">{filterName}</h4>
      </div>
      <div className="param-body">
        {renderControls()}
      </div>
    </div>
  );
};
