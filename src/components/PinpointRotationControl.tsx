// src/components/PinpointRotationControl.tsx
import React, { useState, useEffect } from 'react';
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
    // Update input only if the value is different, to avoid interrupting user input
    if (parseFloat(angleInput) !== currentAngle) {
      setAngleInput(currentAngle.toFixed(1));
    }
  }, [currentAngle]);

  const updateRotation = (newAngle: number) => {
    // Round to one decimal place to avoid floating point inaccuracies
    const roundedAngle = Math.round(newAngle * 10) / 10;
    // Normalize angle to be within 0-359.9
    const normalizedAngle = (roundedAngle % 360 + 360) % 360;
    setPinpointRotation(folderKey, normalizedAngle);
  };

  const handleRotate = (degrees: number) => {
    updateRotation(currentAngle + degrees);
  };

  const handleReset = () => {
    updateRotation(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAngleInput(e.target.value);
  };

  const handleInputBlur = () => {
    const newAngle = parseFloat(angleInput);
    if (!isNaN(newAngle)) {
      updateRotation(newAngle);
    } else {
      setAngleInput(currentAngle.toFixed(1)); // Reset if invalid
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
      <button onClick={() => handleRotate(-90)} title="Rotate Left 90°">↶ 90</button>
      <button onClick={() => handleRotate(-1)} title="Rotate Left 1°">↶ 1</button>
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
      <button onClick={() => handleRotate(1)} title="Rotate Right 1°">1 ↷</button>
      <button onClick={() => handleRotate(90)} title="Rotate Right 90°">90 ↷</button>
      <button onClick={handleReset} title="Reset Rotation">0</button>
    </div>
  );
}
