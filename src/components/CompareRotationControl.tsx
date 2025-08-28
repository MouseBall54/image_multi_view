// src/components/CompareRotationControl.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

export function CompareRotationControl() {
  const { compareRotation, setCompareRotation } = useStore();

  const currentAngle = compareRotation;
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
    setCompareRotation(normalizedAngle);
  }, [setCompareRotation]);

  const handleRotate = useCallback((degrees: number) => {
    const current = useStore.getState().compareRotation;
    updateRotation(current + degrees);
  }, [updateRotation]);

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
      <button onClick={() => useStore.getState().startLeveling('compare', null)} title="Level horizontally (pick 2 points)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <circle cx="8" cy="12" r="2"></circle>
          <circle cx="16" cy="12" r="2"></circle>
        </svg>
      </button>
      <button onClick={() => useStore.getState().startLeveling('compare', null, 'vertical')} title="Level vertically (pick 2 points)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <circle cx="12" cy="8" r="2"></circle>
          <circle cx="12" cy="16" r="2"></circle>
        </svg>
      </button>
    </div>
  );
}

