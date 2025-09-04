// src/components/PinpointScaleControl.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { FolderKey } from '../types';
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP } from '../config';

export function PinpointScaleControl({ folderKey, onResetRefPoint }: { folderKey: FolderKey, onResetRefPoint?: (key: FolderKey) => void }) {
  const { pinpointScales, setPinpointScale, viewport, pinpointGlobalScale, rectZoomTarget, setRectZoomTarget } = useStore();
  const individualScale = pinpointScales[folderKey] ?? viewport.scale;
  
  const [scaleInput, setScaleInput] = useState((individualScale * 100).toFixed(0));

  useEffect(() => {
    // Update input only if the value is different, to avoid interrupting user input
    if (Math.round(parseFloat(scaleInput)) !== Math.round(individualScale * 100)) {
      setScaleInput((individualScale * 100).toFixed(0));
    }
  }, [individualScale]);

  const applyScale = (newIndividualScale: number) => {
    const clampedScale = Math.max(MIN_ZOOM / pinpointGlobalScale, Math.min(MAX_ZOOM / pinpointGlobalScale, newIndividualScale));
    setPinpointScale(folderKey, clampedScale);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScaleInput(e.target.value);
  };

  const handleInputBlur = () => {
    const newScale = parseFloat(scaleInput) / 100;
    if (!isNaN(newScale) && newScale > 0) {
      applyScale(newScale);
    } else {
      setScaleInput((individualScale * 100).toFixed(0)); // Reset if invalid
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  const adjustScale = (factor: number) => {
    applyScale(individualScale * factor);
  };

  const resetScale = () => {
    // Reset this viewer's individual scale back to base viewport scale
    applyScale(viewport.scale);
    // Center its ref-point if provided by parent (PinpointMode maintains refPoint)
    onResetRefPoint?.(folderKey);
  };

  return (
    <div className="pinpoint-scale-control">
      <button
        className={`rect-zoom-btn${rectZoomTarget === folderKey ? ' active' : ''}`}
        onClick={() => setRectZoomTarget(rectZoomTarget === folderKey ? null : folderKey)}
        title="Rect Zoom (drag a rectangle)"
      >
        {/* square icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="1" ry="1"/>
        </svg>
      </button>
      <button onClick={() => adjustScale(1 / WHEEL_ZOOM_STEP)} title="Zoom Out">-</button>
      <div className="scale-input-wrapper">
        <input 
          type="number"
          value={scaleInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          title="Individual Scale (%)"
        />
        <span className="percent-symbol">%</span>
      </div>
      <button onClick={() => adjustScale(WHEEL_ZOOM_STEP)} title="Zoom In">+</button>
      <button onClick={resetScale} title="Reset Zoom (center ref-point)" aria-label="Reset Zoom">
        {/* Refresh glyph based on provided reference */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 90 90" fill="currentColor">
          <path d="M81.521 31.109c-.86-1.73-2.959-2.438-4.692-1.575-1.73.86-2.436 2.961-1.575 4.692 2.329 4.685 3.51 9.734 3.51 15.01C78.764 67.854 63.617 83 45 83S11.236 67.854 11.236 49.236c0-16.222 11.501-29.805 26.776-33.033l-3.129 4.739c-1.065 1.613-.62 3.784.992 4.85.594.392 1.264.579 1.926.579 1.136 0 2.251-.553 2.924-1.571l7.176-10.87.002-.003.018-.027c.063-.096.106-.199.159-.299.049-.093.108-.181.149-.279.087-.207.152-.419.197-.634.009-.041.008-.085.015-.126.031-.182.053-.364.055-.547 0-.014.004-.028.004-.042 0-.066-.016-.128-.019-.193-.008-.145-.018-.288-.043-.431-.018-.097-.045-.189-.071-.283-.032-.118-.065-.236-.109-.35-.037-.095-.081-.185-.125-.276-.052-.107-.107-.211-.17-.313-.054-.087-.114-.168-.175-.25-.07-.093-.143-.183-.223-.27-.074-.08-.153-.155-.234-.228-.047-.042-.085-.092-.135-.132L36.679.775c-1.503-1.213-3.708-.977-4.921.53-1.213 1.505-.976 3.709.53 4.921l3.972 3.2C17.97 13.438 4.236 29.759 4.236 49.236 4.236 71.714 22.522 90 45 90s40.764-18.286 40.764-40.764c0-6.366-1.427-12.464-4.243-18.127z"/>
        </svg>
      </button>
    </div>
  );
}
