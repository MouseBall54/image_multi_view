import React, { useState, useEffect, useRef } from "react";
import { useStore } from "./store";
import type { AppMode } from "./types";
import { CompareMode } from './modes/CompareMode';
import { ToggleMode } from './modes/ToggleMode';
import { PinpointMode } from './modes/PinpointMode';
import { ImageInfoPanel } from "./components/ImageInfoPanel";
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP, UTIF_OPTIONS } from "./config";
import { decodeTiffWithUTIF } from "./utils/utif";

type DrawableImage = ImageBitmap | HTMLImageElement;

function ViewportControls({ imageDimensions }: {
  imageDimensions: { width: number, height: number } | null,
}) {
  const { viewport, setViewport } = useStore();
  const [scaleInput, setScaleInput] = useState((viewport.scale * 100).toFixed(0));
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");

  useEffect(() => {
    setScaleInput((viewport.scale * 100).toFixed(0));
    if (imageDimensions && viewport.cx && viewport.cy) {
      setXInput(Math.round(viewport.cx * imageDimensions.width).toString());
      setYInput(Math.round(viewport.cy * imageDimensions.height).toString());
    } else {
      setXInput("");
      setYInput("");
    }
  }, [viewport, imageDimensions]);

  const applyChanges = () => {
    const newScale = parseFloat(scaleInput) / 100;
    const newCx = imageDimensions ? parseFloat(xInput) / imageDimensions.width : NaN;
    const newCy = imageDimensions ? parseFloat(yInput) / imageDimensions.height : NaN;

    const newViewport: { scale?: number, cx?: number, cy?: number } = {};
    if (!isNaN(newScale)) newViewport.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    if (!isNaN(newCx)) newViewport.cx = newCx;
    if (!isNaN(newCy)) newViewport.cy = newCy;
    
    setViewport(newViewport);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyChanges();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="viewport-controls">
      <label><span>Scale:</span><input type="text" value={scaleInput} onChange={(e) => setScaleInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/><span>%</span></label>
      <label><span>X:</span><input type="text" value={xInput} disabled={!imageDimensions} onChange={(e) => setXInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/><span>px</span></label>
      <label><span>Y:</span><input type="text" value={yInput} disabled={!imageDimensions} onChange={(e) => setYInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/><span>px</span></label>
    </div>
  );
}

export default function App() {
  const { appMode, setAppMode, syncMode, setSyncMode, pinpointMouseMode, setPinpointMouseMode, setViewport, fitScaleFn, current } = useStore();
  const [numViewers, setNumViewers] = useState(2);
  const [stripExt, setStripExt] = useState(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const bitmapCache = useRef(new Map<string, DrawableImage>());
  
  const primaryFileRef = useRef<File | null>(null);

  const resetView = () => {
    const newScale = fitScaleFn ? fitScaleFn() : 1;
    if (appMode === 'pinpoint') {
      setViewport({ scale: newScale, refScreenX: undefined, refScreenY: undefined });
    } else {
      setViewport({ scale: newScale, cx: 0.5, cy: 0.5 });
    }
  };

  useEffect(() => {
    const file = primaryFileRef.current;
    if (file) {
      let isCancelled = false;
      const getDimensions = async () => {
        try {
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          let dims: { width: number, height: number };
          if (ext === 'tif' || ext === 'tiff') {
            const imgElement = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
            dims = { width: imgElement.width, height: imgElement.height };
          } else {
            const bmp = await createImageBitmap(file);
            dims = { width: bmp.width, height: bmp.height };
          }
          if (!isCancelled) setImageDimensions(dims);
        } catch (err) {
          console.error("Failed to get image dimensions:", err);
          if (!isCancelled) setImageDimensions(null);
        }
      };
      getDimensions();
      return () => { isCancelled = true; };
    } else {
      setImageDimensions(null);
    }
  }, [current, primaryFileRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      
      const { viewport } = useStore.getState();
      const KEY_PAN_AMOUNT = 50;

      switch (e.key.toLowerCase()) {
        case 'r': resetView(); break;
        case 'l': setSyncMode(syncMode === 'locked' ? 'unlocked' : 'locked'); break;
        case 'i': setShowInfoPanel(prev => !prev); break;
        case '=': case '+': setViewport({ scale: Math.min(MAX_ZOOM, (viewport.scale || 1) * WHEEL_ZOOM_STEP) }); break;
        case '-': setViewport({ scale: Math.max(MIN_ZOOM, (viewport.scale || 1) / WHEEL_ZOOM_STEP) }); break;
        case 'arrowup': e.preventDefault(); if (imageDimensions && viewport.cy) setViewport({ cy: viewport.cy - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); break;
        case 'arrowdown': e.preventDefault(); if (imageDimensions && viewport.cy) setViewport({ cy: viewport.cy + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); break;
        case 'arrowleft': e.preventDefault(); if (imageDimensions && viewport.cx) setViewport({ cx: viewport.cx - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); break;
        case 'arrowright': e.preventDefault(); if (imageDimensions && viewport.cx) setViewport({ cx: viewport.cx + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncMode, setSyncMode, setViewport, resetView, imageDimensions]);

  const renderCurrentMode = () => {
    const setPrimaryFile = (file: File | null) => {
      primaryFileRef.current = file;
    };

    switch (appMode) {
      case 'compare':
        return <CompareMode numViewers={numViewers} stripExt={stripExt} setStripExt={setStripExt} bitmapCache={bitmapCache} indicator={null} setPrimaryFile={setPrimaryFile} />;
      case 'toggle':
        return <ToggleMode stripExt={stripExt} bitmapCache={bitmapCache} indicator={null} setPrimaryFile={setPrimaryFile} />;
      case 'pinpoint':
        return <PinpointMode numViewers={numViewers} bitmapCache={bitmapCache} indicator={null} setPrimaryFile={setPrimaryFile} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header>
        <div className="title-container">
          <h1 className="app-title">CompareX</h1>
        </div>
        <div className="top-controls-wrapper">
          <div className="controls-main">
            <label><span>Mode:</span>
              <select value={appMode} onChange={e => setAppMode(e.target.value as AppMode)}>
                <option value="compare">Compare</option>
                <option value="toggle">Toggle</option>
                <option value="pinpoint">Pinpoint</option>
              </select>
            </label>
            {(appMode === 'compare' || appMode === 'pinpoint') && (
              <label><span>Viewers:</span>
                <select value={numViewers} onChange={e => setNumViewers(Number(e.target.value))}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            )}
            <label><span>Sync:</span>
              <select value={syncMode} onChange={e => setSyncMode(e.target.value as any)}>
                <option value="locked">locked</option>
                <option value="unlocked">unlocked</option>
              </select>
            </label>
            {appMode === 'pinpoint' && (
              <label><span>Mouse:</span>
                <select value={pinpointMouseMode} onChange={e => setPinpointMouseMode(e.target.value as any)}>
                  <option value="pin">Pin</option>
                  <option value="pan">Pan</option>
                </select>
              </label>
            )}
            <button onClick={resetView}>Reset View</button>
          </div>
          <ViewportControls imageDimensions={imageDimensions} />
        </div>
      </header>
      
      {renderCurrentMode()}

      {showInfoPanel && 
        <ImageInfoPanel 
          file={primaryFileRef.current || undefined} 
          dimensions={imageDimensions} 
          onClose={() => setShowInfoPanel(false)} 
        />
      }
    </div>
  );
}