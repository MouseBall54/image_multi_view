// src/components/PinpointViewerControls.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import type { FolderKey } from '../types';

interface Props {
  folderKey: FolderKey;
}

export function PinpointViewerControls({ folderKey }: Props) {
  const { 
    pinpointRotations, 
    setPinpointRotation,
    startLeveling,
  } = useStore();

  const currentAngle = pinpointRotations[folderKey] || 0;
  const [angleInput, setAngleInput] = useState(currentAngle.toFixed(1));
  
  const rotationLoopRef = useRef<number | null>(null);
  const rotationSpeedRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);

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

  const handleRotate = useCallback((degrees: number) => {
    const current = useStore.getState().pinpointRotations[folderKey] || 0;
    updateRotation(current + degrees);
  }, [folderKey, updateRotation]);

  const startRotation = useCallback((direction: number) => {
    const startTime = performance.now();
    lastUpdateTimeRef.current = startTime;
    rotationSpeedRef.current = 0;

    const loop = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;

      if (elapsedTime > 2000) rotationSpeedRef.current = 3;
      else if (elapsedTime > 1000) rotationSpeedRef.current = 2;
      else if (elapsedTime > 400) rotationSpeedRef.current = 1;
      
      let step = 0;
      let interval = 0;

      switch (rotationSpeedRef.current) {
        case 1: step = 0.1; interval = 100; break;
        case 2: step = 1.0; interval = 50; break;
        case 3: step = 5.0; interval = 25; break;
        default: rotationLoopRef.current = requestAnimationFrame(loop); return;
      }

      if (currentTime - lastUpdateTimeRef.current > interval) {
        handleRotate(step * direction);
        lastUpdateTimeRef.current = currentTime;
      }
      
      rotationLoopRef.current = requestAnimationFrame(loop);
    };

    handleRotate(0.1 * direction);
    rotationLoopRef.current = requestAnimationFrame(loop);
  }, [handleRotate]);

  const stopRotation = useCallback(() => {
    if (rotationLoopRef.current) {
      cancelAnimationFrame(rotationLoopRef.current);
      rotationLoopRef.current = null;
    }
  }, []);

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
    <div className="pinpoint-viewer-controls">
      <div className="viewer-angle-input">
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
      
      <button 
        className="viewer-control-btn" 
        onClick={() => updateRotation(0)} 
        title="Reset Rotation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4v6h6"/>
          <path d="M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
      </button>
      
      <button 
        className="viewer-control-btn" 
        onClick={() => startLeveling('pinpoint', folderKey)} 
        title="Level horizontally"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <circle cx="8" cy="12" r="2"></circle>
          <circle cx="16" cy="12" r="2"></circle>
        </svg>
      </button>
      
      <button 
        className="viewer-control-btn" 
        onClick={() => startLeveling('pinpoint', folderKey, 'vertical')} 
        title="Level vertically"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <circle cx="12" cy="8" r="2"></circle>
          <circle cx="12" cy="16" r="2"></circle>
        </svg>
      </button>
    </div>
  );
}