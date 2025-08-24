import React, { useState, useRef, useEffect } from 'react';

interface LayoutGridSelectorProps {
  currentRows: number;
  currentCols: number;
  onLayoutChange: (rows: number, cols: number) => void;
  className?: string;
}

export const LayoutGridSelector: React.FC<LayoutGridSelectorProps> = ({
  currentRows,
  currentCols,
  onLayoutChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRows, setHoveredRows] = useState(1);
  const [hoveredCols, setHoveredCols] = useState(1);
  const [maxRows, setMaxRows] = useState(6); // Start with 6 rows visible
  const [maxCols, setMaxCols] = useState(6); // Start with 6 cols visible
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Maximum grid size - 24 viewers limit with various combinations
  const ABSOLUTE_MAX_ROWS = 12;
  const ABSOLUTE_MAX_COLS = 12;
  const MAX_VIEWERS = 24;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleCellHover = (row: number, col: number) => {
    setHoveredRows(row);
    setHoveredCols(col);
    
    // Dynamically expand grid if hovering near edges
    if (row >= maxRows - 1 && maxRows < ABSOLUTE_MAX_ROWS) {
      setMaxRows(Math.min(row + 2, ABSOLUTE_MAX_ROWS));
    }
    if (col >= maxCols - 1 && maxCols < ABSOLUTE_MAX_COLS) {
      setMaxCols(Math.min(col + 2, ABSOLUTE_MAX_COLS));
    }
  };

  const handleCellClick = (rows: number, cols: number) => {
    const totalViewers = rows * cols;
    if (totalViewers <= MAX_VIEWERS) {
      onLayoutChange(rows, cols);
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Reset grid size when opening
      setMaxRows(Math.max(6, currentRows + 1));
      setMaxCols(Math.max(6, currentCols + 1));
      setHoveredRows(currentRows);
      setHoveredCols(currentCols);
    }
  };

  const renderGrid = () => {
    const cells = [];
    
    for (let row = 1; row <= maxRows; row++) {
      for (let col = 1; col <= maxCols; col++) {
        const totalViewers = row * col;
        const hoveredViewers = hoveredRows * hoveredCols;
        const isSelected = row <= hoveredRows && col <= hoveredCols;
        const isCurrent = row === currentRows && col === currentCols;
        const isOverLimit = totalViewers > MAX_VIEWERS;
        const hoveredOverLimit = hoveredViewers > MAX_VIEWERS;
        
        cells.push(
          <div
            key={`${row}-${col}`}
            className={`grid-cell ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${isOverLimit ? 'disabled' : ''} ${hoveredOverLimit && isSelected ? 'over-limit' : ''}`}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
            title={isOverLimit ? `${totalViewers} viewers (max: ${MAX_VIEWERS})` : `${totalViewers} viewers`}
          />
        );
      }
    }
    
    return cells;
  };

  const getDisplayText = () => {
    return `${currentRows}×${currentCols} (${currentRows * currentCols})`;
  };

  const getPreviewText = () => {
    if (isOpen) {
      const hoveredViewers = hoveredRows * hoveredCols;
      return `${hoveredRows}×${hoveredCols} (${hoveredViewers})`;
    }
    return getDisplayText();
  };

  return (
    <div className={`layout-grid-selector ${className}`} ref={dropdownRef}>
      <button
        className={`grid-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        type="button"
      >
        <div className="selector-content">
          <span className="selector-label">Layout:</span>
          <span className="selector-value">{getPreviewText()}</span>
          <svg 
            className={`selector-icon ${isOpen ? 'rotated' : ''}`}
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="grid-selector-dropdown">
          <div className={`grid-preview-text ${hoveredRows * hoveredCols > MAX_VIEWERS ? 'over-limit' : ''}`}>
            {hoveredRows}×{hoveredCols} ({hoveredRows * hoveredCols} viewers)
          </div>
          <div 
            className="grid-container"
            ref={gridRef}
            style={{ 
              gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
              gridTemplateRows: `repeat(${maxRows}, 1fr)`
            }}
          >
            {renderGrid()}
          </div>
          <div className="grid-instructions">
            Hover to preview, click to select • Max <span className={`max-limit ${hoveredRows * hoveredCols > MAX_VIEWERS ? 'highlight' : ''}`}>{MAX_VIEWERS} viewers</span>
          </div>
        </div>
      )}
    </div>
  );
};