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


type ConstraintType = 'integer' | 'positive' | 'odd' | 'even' | 'float';

const RangeInput: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  compact?: boolean;
  constraint?: ConstraintType;
}> = ({ label, value, min, max, step = 1, onChange, compact = false, constraint = 'float' }) => {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(String(value));

  React.useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  const fmt = (v: number) => {
    // Format display based on constraint type
    if (constraint === 'integer' || constraint === 'positive' || constraint === 'odd' || constraint === 'even') {
      return Math.round(v).toString();
    } else {
      // Show up to 2 decimals without trailing zeros
      const s = Number.isFinite(v) ? Number(v.toFixed(2)).toString() : String(v);
      return s;
    }
  };

  const applyConstraint = (num: number): number => {
    switch (constraint) {
      case 'integer':
        return Math.round(num);
      case 'positive':
        return Math.max(0, Math.round(Math.abs(num)));
      case 'odd': {
        const rounded = Math.round(num);
        return rounded % 2 === 0 ? rounded + 1 : rounded;
      }
      case 'even': {
        const rounded = Math.round(num);
        return rounded % 2 === 1 ? rounded + 1 : rounded;
      }
      case 'float':
      default:
        return num;
    }
  };

  const commit = () => {
    const num = parseFloat(text);
    if (!isNaN(num)) {
      // Apply constraint first, then clamp to [min, max]
      let constrained = applyConstraint(num);
      constrained = Math.min(max, Math.max(min, constrained));
      
      // For odd/even constraints, ensure the clamped value still satisfies the constraint
      if (constraint === 'odd' && constrained % 2 === 0) {
        constrained = constrained > num ? constrained - 1 : constrained + 1;
        constrained = Math.min(max, Math.max(min, constrained));
      } else if (constraint === 'even' && constrained % 2 === 1) {
        constrained = constrained > num ? constrained - 1 : constrained + 1;
        constrained = Math.min(max, Math.max(min, constrained));
      }
      
      onChange(constrained);
    }
    setEditing(false);
  };

  return (
    <div className={`control-row ${compact ? 'compact' : ''}`}>
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
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
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') { setText(String(value)); setEditing(false); }
            }}
          />
        ) : (
          <span
            className="inline-number"
            title="Click to edit"
            onClick={() => setEditing(true)}
          >
            {fmt(value)}
          </span>
        )}
      </span>
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
      case 'brightness':
        return (
          <>
            <RangeInput
              label="Brightness"
              value={(filterParams as any).brightness ?? 0}
              min={-100}
              max={100}
              step={1}
              onChange={(value) => updateParam('brightness', value)}
              compact={compact}
              constraint="integer"
            />
          </>
        );
      case 'contrast':
        return (
          <>
            <RangeInput
              label="Contrast"
              value={(filterParams as any).contrast ?? 100}
              min={0}
              max={200}
              step={1}
              onChange={(value) => updateParam('contrast', value)}
              compact={compact}
              constraint="positive"
            />
          </>
        );
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
              constraint="odd"
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
              constraint="odd"
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
              constraint="positive"
            />
            <RangeInput
              label="High Threshold"
              value={(filterParams as any).highThreshold ?? 50}
              min={1}
              max={254}
              step={1}
              onChange={(value) => updateParam('highThreshold', value)}
              compact={compact}
              constraint="positive"
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
              constraint="odd"
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
              constraint="odd"
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
          <div className="control-row">
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
              constraint="positive"
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
              constraint="positive"
            />
          </>
        );

      case 'bilateral':
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
              constraint="odd"
            />
            <RangeInput
              label="Sigma Color"
              value={(filterParams as any).sigmaColor ?? 25}
              min={1}
              max={100}
              step={1}
              onChange={(value) => updateParam('sigmaColor', value)}
              compact={compact}
              constraint="positive"
            />
            <RangeInput
              label="Sigma Space"
              value={(filterParams as any).sigmaSpace ?? 25}
              min={1}
              max={100}
              step={1}
              onChange={(value) => updateParam('sigmaSpace', value)}
              compact={compact}
              constraint="positive"
            />
          </>
        );

      case 'nonlocalmeans':
        return (
          <>
            <RangeInput
              label="Filter Strength"
              value={(filterParams as any).h ?? 10}
              min={1}
              max={30}
              step={1}
              onChange={(value) => updateParam('h', value)}
              compact={compact}
              constraint="positive"
            />
            <RangeInput
              label="Template Window Size"
              value={(filterParams as any).templateWindowSize ?? 7}
              min={3}
              max={15}
              step={2}
              onChange={(value) => updateParam('templateWindowSize', value)}
              compact={compact}
              constraint="odd"
            />
            <RangeInput
              label="Search Window Size"
              value={(filterParams as any).searchWindowSize ?? 21}
              min={7}
              max={35}
              step={2}
              onChange={(value) => updateParam('searchWindowSize', value)}
              compact={compact}
              constraint="odd"
            />
          </>
        );

      case 'anisotropicdiffusion':
        return (
          <>
            <RangeInput
              label="Iterations"
              value={(filterParams as any).iterations ?? 10}
              min={1}
              max={50}
              step={1}
              onChange={(value) => updateParam('iterations', value)}
              compact={compact}
              constraint="positive"
            />
            <RangeInput
              label="Lambda"
              value={(filterParams as any).lambda ?? 0.2}
              min={0.05}
              max={0.5}
              step={0.05}
              onChange={(value) => updateParam('lambda', value)}
              compact={compact}
              constraint="float"
            />
            <RangeInput
              label="Kappa"
              value={(filterParams as any).kappa ?? 30}
              min={10}
              max={100}
              step={5}
              onChange={(value) => updateParam('kappa', value)}
              compact={compact}
              constraint="positive"
            />
          </>
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
        return (
          <>
            <RangeInput
              label="Radius"
              value={(filterParams as any).radius ?? 3}
              min={1}
              max={10}
              step={1}
              onChange={(value) => updateParam('radius', value)}
              compact={compact}
              constraint="positive"
            />
            <RangeInput
              label="Neighbors"
              value={(filterParams as any).neighbors ?? 8}
              min={4}
              max={16}
              step={1}
              onChange={(value) => updateParam('neighbors', value)}
              compact={compact}
              constraint="positive"
            />
          </>
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
              constraint="odd"
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
              constraint="integer"
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
          <div className="control-row">
            <p className="no-params-message">No adjustable parameters.</p>
          </div>
        );

      case 'lawstextureenergy':
        return (
          <>
            <div className={`control-row ${compact ? 'compact' : ''}`}>
              <label>Kernel Type</label>
              <select
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
              constraint="odd"
            />
          </>
        );

      case 'wavelet':
        return (
          <>
            <RangeInput
              label="Levels"
              value={(filterParams as any).levels ?? 3}
              min={1}
              max={6}
              step={1}
              onChange={(value) => updateParam('levels', value)}
              compact={compact}
              constraint="positive"
            />
            <RangeInput
              label="Sigma"
              value={(filterParams as any).sigma ?? 1.0}
              min={0.1}
              max={5.0}
              step={0.1}
              onChange={(value) => updateParam('sigma', value)}
              compact={compact}
              constraint="float"
            />
          </>
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
          <div className="control-row">
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
