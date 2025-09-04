// src/components/PinpointRotationControl.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import type { FolderKey } from '../types';

interface Props {
  folderKey: FolderKey;
}

export function PinpointRotationControl({ folderKey }: Props) {
  const { 
    pinpointRotations, 
    setPinpointRotation, 
  } = useStore();

  const currentAngle = pinpointRotations[folderKey] || 0;

  const [angleInput, setAngleInput] = useState(currentAngle.toFixed(1));
  

  useEffect(() => {
    if (parseFloat(angleInput) !== currentAngle) {
      setAngleInput(currentAngle.toFixed(1));
    }
  }, [currentAngle]);

  const updateRotation = useCallback((newAngle: number) => {
    const roundedAngle = Math.round(newAngle * 10) / 10;
    const normalizedAngle = (roundedAngle % 360 + 360) % 360;
    setPinpointRotation(folderKey, normalizedAngle);
  }, [folderKey, setPinpointRotation]);

  // Removed continuous-rotation handlers to simplify and avoid undefined refs

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAngleInput(e.target.value);
  };

  const handleInputBlur = () => {
    const newAngle = parseFloat(angleInput);
    if (!isNaN(newAngle)) {
      updateRotation(newAngle);
    } else {
      setAngleInput(currentAngle.toFixed(1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="pinpoint-rotation-control">
      <div className="rotation-input-wrapper">
        <input 
          type="number" 
          step="0.1"
          value={angleInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          title="Rotation Angle"
        />
        <span className="degree-symbol">°</span>
      </div>
      <button className="reset-rotation-button" onClick={() => updateRotation(0)} title="Reset Rotation">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4v6h6"/>
          <path d="M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
      </button>
    </div>
  );
}
