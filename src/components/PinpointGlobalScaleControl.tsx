import React, { useEffect, useState } from "react";
import { useStore } from "../store";
import { MIN_ZOOM, MAX_ZOOM } from "../config";

export function PinpointGlobalScaleControl() {
  const { pinpointGlobalScale, setPinpointGlobalScale, pinpointScales, viewport, numViewers, viewerArrangement } = useStore();
  const [inputValue, setInputValue] = useState<string>((pinpointGlobalScale * 100).toFixed(0));

  useEffect(() => {
    const current = (pinpointGlobalScale * 100).toFixed(0);
    if (current !== inputValue) setInputValue(current);
  }, [pinpointGlobalScale]);

  const clampGlobal = (proposed: number): number => {
    try {
      const orderedKeys = Array.from({ length: numViewers }).map((_, pos) => viewerArrangement.pinpoint[pos]);
      const individualScales = orderedKeys.map(k => (pinpointScales[k] ?? viewport.scale) || viewport.scale);
      const minInd = Math.min(...individualScales);
      const maxInd = Math.max(...individualScales);
      const minAllowed = MIN_ZOOM / (maxInd || 1);
      const maxAllowed = MAX_ZOOM / (minInd || 1);
      return Math.min(Math.max(proposed, minAllowed), maxAllowed);
    } catch {
      return Math.min(Math.max(proposed, MIN_ZOOM), MAX_ZOOM);
    }
  };

  const commit = (valueStr: string) => {
    const v = parseFloat(valueStr);
    if (isNaN(v) || v <= 0) {
      setInputValue((pinpointGlobalScale * 100).toFixed(0));
      return;
    }
    const newScale = v / 100;
    const clamped = clampGlobal(newScale);
    setPinpointGlobalScale(clamped);
    setInputValue((clamped * 100).toFixed(0));
  };

  return (
    <div className="global-scale-control" title="Global scale for all Pinpoint viewers">
      <label>
        <span>Scale:</span>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="unit">%</span>
      </label>
    </div>
  );
}
