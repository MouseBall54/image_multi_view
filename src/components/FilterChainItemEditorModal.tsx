import React from 'react';
import type { FilterChainItem } from '../types';
import type { FilterParams } from '../store';
import { FilterParameterControls } from './FilterParameterControls';
import { ALL_FILTERS } from './FilterControls';

interface FilterChainItemEditorModalProps {
  item: FilterChainItem;
  stepIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onParamsChange: (params: FilterParams) => void;
  panelStyle?: React.CSSProperties;
  onPositionChange?: (pos: { left: number; top: number }) => void;
  onDragStart?: () => void;
}

const getFilterDisplayName = (filterType: FilterChainItem['filterType']) => {
  const filter = ALL_FILTERS.find((f) => f.type === filterType);
  return filter ? filter.name : filterType;
};

export const FilterChainItemEditorModal: React.FC<FilterChainItemEditorModalProps> = ({
  item,
  stepIndex,
  isOpen,
  onClose,
  onParamsChange,
  panelStyle,
  onPositionChange,
  onDragStart,
}) => {
  const [localParams, setLocalParams] = React.useState<FilterParams>(item.params as FilterParams);
  const dragState = React.useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  React.useEffect(() => {
    setLocalParams(item.params as FilterParams);
  }, [item]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = getFilterDisplayName(item.filterType);

  const handleParamChange = (params: FilterParams) => {
    setLocalParams(params);
    onParamsChange(params);
  };

  const toNumber = (value: React.CSSProperties[keyof React.CSSProperties] | undefined) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 80,
    left: 80,
    ...panelStyle,
  };

  const handleHeaderMouseDown = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    event.preventDefault();
    const currentLeft = toNumber(panelStyle?.left ?? modalStyle.left);
    const currentTop = toNumber(panelStyle?.top ?? modalStyle.top);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: typeof currentLeft === 'number' ? currentLeft : 0,
      startTop: typeof currentTop === 'number' ? currentTop : 0,
    };
    onDragStart?.();

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const deltaX = e.clientX - dragState.current.startX;
      const deltaY = e.clientY - dragState.current.startY;
      const next = {
        left: dragState.current.startLeft + deltaX,
        top: dragState.current.startTop + deltaY,
      };
      onPositionChange?.(next);
    };

    const handleMouseUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="chain-editor-modal" style={modalStyle}>
      <div className="chain-editor-header" onMouseDown={handleHeaderMouseDown}>
        <div>
          <p className="chain-editor-step">Step {stepIndex + 1}</p>
          <h3>{title}</h3>
        </div>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close parameter editor"
          onMouseDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>
      <div className="chain-editor-body">
        <div className="params-container">
          <FilterParameterControls
            filterType={item.filterType}
            filterParams={localParams}
            onChange={handleParamChange}
            showHeader={false}
          />
        </div>
      </div>
    </div>
  );
};
