import React, { useState, useRef, useEffect } from 'react';
import { useStore } from "../store";

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
  const [maxRows, setMaxRows] = useState(2); // Start with 2 rows visible initially
  const [maxCols, setMaxCols] = useState(2); // Start with 2 cols visible initially
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { setLayoutPreview, clearLayoutPreview } = useStore();

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
    // Update live preview overlay in main view, clamped to MAX_VIEWERS
    const maxColsForRows = Math.max(1, Math.floor(MAX_VIEWERS / row));
    const previewCols = Math.min(col, maxColsForRows);
    setLayoutPreview(row, previewCols);

    // Dynamically adjust grid visible size to hover – expand and shrink
    const nextMaxRows = Math.min(Math.max(row + 1, 2), ABSOLUTE_MAX_ROWS);
    const nextMaxCols = Math.min(Math.max(col + 1, 2), ABSOLUTE_MAX_COLS);
    if (nextMaxRows !== maxRows) setMaxRows(nextMaxRows);
    if (nextMaxCols !== maxCols) setMaxCols(nextMaxCols);
  };

  const handleCellClick = (rows: number, cols: number) => {
    const totalViewers = rows * cols;
    if (totalViewers <= MAX_VIEWERS) {
      onLayoutChange(rows, cols);
      setIsOpen(false);
      clearLayoutPreview();
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // 초기 표시는 최소 2x2를 보장하되, 현재 레이아웃이 더 크면 포함하도록 확장
      const initRows = Math.max(2, Math.min(currentRows + 1, ABSOLUTE_MAX_ROWS));
      const initCols = Math.max(2, Math.min(currentCols + 1, ABSOLUTE_MAX_COLS));
      setMaxRows(initRows);
      setMaxCols(initCols);
      setHoveredRows(currentRows);
      setHoveredCols(currentCols);
      // 프리뷰는 24 한도 내에서 클램프하여 표시
      const maxColsForRows = Math.max(1, Math.floor(MAX_VIEWERS / currentRows));
      const previewCols = Math.min(currentCols, maxColsForRows);
      setLayoutPreview(currentRows, previewCols);
    }
  };

  // Clear preview when dropdown closes or unmounts
  useEffect(() => {
    if (!isOpen) clearLayoutPreview();
    return () => clearLayoutPreview();
  }, [isOpen, clearLayoutPreview]);

  const renderGrid = () => {
    const cells = [];
    
    for (let row = 1; row <= maxRows; row++) {
      for (let col = 1; col <= maxCols; col++) {
        const totalViewers = row * col;
        const isSelected = row <= hoveredRows && col <= hoveredCols;
        const isCurrent = row === currentRows && col === currentCols;
        const isOverLimit = totalViewers > MAX_VIEWERS;
        
        const hoverGuide = row === hoveredRows || col === hoveredCols;
        cells.push(
          <div
            key={`${row}-${col}`}
            className={`grid-cell ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${isOverLimit ? 'disabled' : ''} ${hoverGuide ? 'hover-guide' : ''}`}
            onMouseEnter={() => handleCellHover(row, col)}
            onClick={() => handleCellClick(row, col)}
            title={isOverLimit ? `Max ${MAX_VIEWERS}` : `${totalViewers}`}
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

  // Compute dropdown width based on a baseline of 5 columns, expanding beyond
  const CELL_SIZE = 24; // px (1.5x larger cells)
  const GAP = 2; // px (matches .grid-container gap)
  const BASE_COLS = 5; // baseline width is 5 columns
  const DROPDOWN_PADDING = 12; // px (matches .grid-selector-dropdown padding)
  const colsForWidth = Math.max(maxCols, BASE_COLS);
  const gridWidthPx = colsForWidth * CELL_SIZE + (colsForWidth - 1) * GAP;
  const dropdownContentWidth = gridWidthPx + DROPDOWN_PADDING * 2; // account for horizontal padding

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
        <div className="grid-selector-dropdown" style={{ width: dropdownContentWidth, minWidth: dropdownContentWidth }}>
          <div className={`grid-preview-text ${hoveredRows * hoveredCols > MAX_VIEWERS ? 'over-limit' : ''}`}>
            {hoveredRows}×{hoveredCols} ({hoveredRows * hoveredCols})
          </div>
          <div 
            className="grid-container"
            ref={gridRef}
            style={{ 
              // Use fixed-size tracks so cells stay tight and consistent
              gridTemplateColumns: `repeat(${maxCols}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${maxRows}, ${CELL_SIZE}px)`
            }}
            onMouseLeave={() => {
              // When leaving the grid, keep preview to current rows/cols for stability
              setHoveredRows(currentRows);
              setHoveredCols(currentCols);
              setLayoutPreview(currentRows, currentCols);
            }}
            onMouseMove={(e) => {
              if (!gridRef.current) return;
              const rect = gridRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const track = CELL_SIZE + GAP; // cell + gap
              const approxCol = Math.max(1, Math.min(ABSOLUTE_MAX_COLS, Math.ceil((x + GAP) / track)));
              const approxRow = Math.max(1, Math.min(ABSOLUTE_MAX_ROWS, Math.ceil((y + GAP) / track)));
              // Update hover based on pointer position
              setHoveredRows(approxRow);
              setHoveredCols(approxCol);
              // Smoothly expand near edges without requiring exact cell crossing
              const nearRight = rect.right - e.clientX;
              const nearBottom = rect.bottom - e.clientY;
              const EDGE_THRESHOLD = 12; // px
              let nextRows = maxRows;
              let nextCols = maxCols;
              if (nearBottom < EDGE_THRESHOLD && maxRows < ABSOLUTE_MAX_ROWS) {
                nextRows = Math.min(ABSOLUTE_MAX_ROWS, approxRow + 1);
              }
              if (nearRight < EDGE_THRESHOLD && maxCols < ABSOLUTE_MAX_COLS) {
                nextCols = Math.min(ABSOLUTE_MAX_COLS, approxCol + 1);
              }
              if (nextRows !== maxRows) setMaxRows(nextRows);
              if (nextCols !== maxCols) setMaxCols(nextCols);
              // Update preview clamped to limit
              const maxColsForRows = Math.max(1, Math.floor(MAX_VIEWERS / approxRow));
              const previewCols = Math.min(approxCol, maxColsForRows);
              setLayoutPreview(approxRow, previewCols);
            }}
          >
            {renderGrid()}
          </div>
          <div className="grid-instructions">Max <span className={`max-limit ${hoveredRows * hoveredCols > MAX_VIEWERS ? 'highlight' : ''}`}>{MAX_VIEWERS} viewers</span></div>
        </div>
      )}
    </div>
  );
};
