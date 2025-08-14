// src/components/PinpointScaleControl.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { FolderKey } from '../types';
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP } from '../config';

export function PinpointScaleControl({ folderKey }: { folderKey: FolderKey }) {
  const { pinpointScales, setPinpointScale, viewport, pinpointGlobalScale } = useStore();
  const individualScale = pinpointScales[folderKey] ?? viewport.scale;
  const totalScale = individualScale * pinpointGlobalScale;
  
  const [scaleInput, setScaleInput] = useState((individualScale * 100).toFixed(0));

  useEffect(() => {
    // Update input only if the value is different, to avoid interrupting user input
    if (Math.round(parseFloat(scaleInput)) !== Math.round(individualScale * 100)) {
      setScaleInput((individualScale * 100).toFixed(0));
    }
  }, [individualScale, totalScale]);

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

  return (
    <div className="pinpoint-scale-control">
      <button onClick={() => adjustScale(1 / WHEEL_ZOOM_STEP)} title="Zoom Out">-</button>
      <div className="scale-inputs">
        <input 
          type="number"
          value={scaleInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          title="Individual Scale"
        />
        <span className="total-scale" title="Total Scale (Individual × Global)">/ {(totalScale * 100).toFixed(0)}%</span>
      </div>
      <button onClick={() => adjustScale(WHEEL_ZOOM_STEP)} title="Zoom In">+</button>
    </div>
  );
}
