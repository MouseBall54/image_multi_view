import React from 'react';
import type { FilterType } from '../types';
import type { FilterParams } from '../store';
import { ALL_FILTERS } from './FilterControls';

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
}> = ({ label, value, min, max, step = 1, onChange, compact = false }) => (
  <div className={`param-control ${compact ? 'compact' : ''}`}>
    <label className="param-label">
      {label}: <span className="param-value">{value}</span>
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
              value={(filterParams as any).lowThreshold || 20}
              min={0}
              max={255}
              step={1}
              onChange={(value) => updateParam('lowThreshold', value)}
              compact={compact}
            />
            <RangeInput
              label="High Threshold"
              value={(filterParams as any).highThreshold || 50}
              min={0}
              max={255}
              step={1}
              onChange={(value) => updateParam('highThreshold', value)}
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