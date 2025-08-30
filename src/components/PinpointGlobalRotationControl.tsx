// src/components/PinpointGlobalRotationControl.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

export function PinpointGlobalRotationControl() {
  const { 
    pinpointGlobalRotation, 
    setPinpointGlobalRotation,
    startLeveling,
  } = useStore();

  const currentAngle = pinpointGlobalRotation;

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
    setPinpointGlobalRotation(normalizedAngle);
  }, [setPinpointGlobalRotation]);

  const handleRotate = useCallback((degrees: number) => {
    const current = useStore.getState().pinpointGlobalRotation;
    updateRotation(current + degrees);
  }, [updateRotation]);

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
      <div className="rotation-input-wrapper">
        <input 
          type="number" 
          step="0.1"
          value={angleInput}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          title="Global Rotation Angle"
        />
        <span className="degree-symbol">°</span>
      </div>
      <button onClick={() => updateRotation(0)} title="Reset Global Rotation">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4v6h6"/>
          <path d="M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
      </button>
      <button 
        onClick={() => startLeveling('pinpoint', null)} 
        title="Level horizontally (pick 2 points)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <circle cx="8" cy="12" r="2"></circle>
          <circle cx="16" cy="12" r="2"></circle>
        </svg>
      </button>
      <button 
        onClick={() => startLeveling('pinpoint', null, 'vertical')} 
        title="Level vertically (pick 2 points)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <circle cx="12" cy="8" r="2"></circle>
          <circle cx="12" cy="16" r="2"></circle>
        </svg>
      </button>
    </div>
  );
}