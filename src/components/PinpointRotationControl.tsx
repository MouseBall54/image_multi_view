// src/components/PinpointRotationControl.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    rotationSpeedRef.current = 0; // 0: initial, 1: slow, 2: medium, 3: fast

    const loop = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;

      // Acceleration logic
      if (elapsedTime > 2000) rotationSpeedRef.current = 3; // Fast
      else if (elapsedTime > 1000) rotationSpeedRef.current = 2; // Medium
      else if (elapsedTime > 400) rotationSpeedRef.current = 1; // Slow
      
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

    // Initial rotation and start loop
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
    <div className="pinpoint-rotation-control">
      <button 
        onMouseDown={() => startRotation(-1)}
        onMouseUp={stopRotation}
        onMouseLeave={stopRotation}
        title="Rotate Left (Hold for speed)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L22 2"/></svg>
      </button>
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
      <button 
        onMouseDown={() => startRotation(1)}
        onMouseUp={stopRotation}
        onMouseLeave={stopRotation}
        title="Rotate Right (Hold for speed)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 22v-6h6M21.5 2v6h-6M22 12.5a10 10 0 0 1-18.8 4.3L2 22"/></svg>
      </button>
      <button onClick={() => updateRotation(0)} title="Reset Rotation">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/></svg>
      </button>
    </div>
  );
}
