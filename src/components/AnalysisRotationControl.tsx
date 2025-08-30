// src/components/AnalysisRotationControl.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';

export function AnalysisRotationControl() {
  const { 
    analysisRotation, 
    setAnalysisRotation, 
  } = useStore();

  const currentAngle = analysisRotation;

  const [angleInput, setAngleInput] = useState(currentAngle.toFixed(1));
  

  useEffect(() => {
    if (parseFloat(angleInput) !== currentAngle) {
      setAngleInput(currentAngle.toFixed(1));
    }
  }, [currentAngle]);

  const updateRotation = useCallback((newAngle: number) => {
    const roundedAngle = Math.round(newAngle * 10) / 10;
    const normalizedAngle = (roundedAngle % 360 + 360) % 360;
    setAnalysisRotation(normalizedAngle);
  }, [setAnalysisRotation]);

  // Removed continuous-rotation handlers to simplify and avoid unused refs

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
      <button onClick={() => updateRotation(0)} title="Reset Rotation">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4v6h6"/>
          <path d="M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
      </button>
      <button onClick={() => useStore.getState().startLeveling('analysis', null)} title="Level horizontally (pick 2 points)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <circle cx="8" cy="12" r="2"></circle>
          <circle cx="16" cy="12" r="2"></circle>
        </svg>
      </button>
      <button onClick={() => useStore.getState().startLeveling('analysis', null, 'vertical')} title="Level vertically (pick 2 points)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <circle cx="12" cy="8" r="2"></circle>
          <circle cx="12" cy="16" r="2"></circle>
        </svg>
      </button>
    </div>
  );
}
