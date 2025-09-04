// src/components/PinpointScaleDisplay.tsx
import React from 'react';
import { useStore } from '../store';
import type { FolderKey } from '../types';

interface Props {
  folderKey: FolderKey;
}

export function PinpointScaleDisplay({ folderKey }: Props) {
  const { pinpointScales, viewport, pinpointGlobalScale } = useStore();
  const individualScale = pinpointScales[folderKey] ?? viewport.scale;
  const totalScale = individualScale * pinpointGlobalScale;
  
  // Only show when scale is significantly different from 100%
  if (Math.abs(totalScale - 1.0) < 0.01) {
    return null;
  }
  
  return (
    <div className="viewer__scale-display">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
        <circle cx="11" cy="11" r="3"></circle>
      </svg>
      <span>{(totalScale * 100).toFixed(0)}%</span>
    </div>
  );
}