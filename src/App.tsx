import React, { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "./store";
import type { AppMode } from "./types";
import { CompareMode, CompareModeHandle } from './modes/CompareMode';
import { ToggleMode, ToggleModeHandle } from './modes/ToggleMode';
import { PinpointMode, PinpointModeHandle } from './modes/PinpointMode';
import { ImageInfoPanel } from "./components/ImageInfoPanel";
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP, UTIF_OPTIONS } from "./config";
import { decodeTiffWithUTIF } from "./utils/utif";

type DrawableImage = ImageBitmap | HTMLImageElement;

function ViewportControls({ imageDimensions }: {
  imageDimensions: { width: number, height: number } | null,
}) {
  const { viewport, setViewport, triggerIndicator } = useStore();
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

    // Trigger indicator animation if coordinates changed
    if (!isNaN(newCx) && !isNaN(newCy)) {
      triggerIndicator(newCx, newCy);
    }
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
  const { appMode, setAppMode, syncMode, setSyncMode, pinpointMouseMode, setPinpointMouseMode, setViewport, fitScaleFn, current, clearPinpointScales, setPinpointGlobalScale } = useStore();
  const [numViewers, setNumViewers] = useState(2);
  const [stripExt, setStripExt] = useState(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const bitmapCache = useRef(new Map<string, DrawableImage>());
  
  const primaryFileRef = useRef<File | null>(null);
  const compareModeRef = useRef<CompareModeHandle>(null);
  const toggleModeRef = useRef<ToggleModeHandle>(null);
  const pinpointModeRef = useRef<PinpointModeHandle>(null);

  const [isCaptureModalOpen, setCaptureModalOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureOptions, setCaptureOptions] = useState({ showLabels: true, showCrosshair: true });
  const [clipboardStatus, setClipboardStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const runCapture = useCallback(async () => {
    if (!isCaptureModalOpen) return;
    let dataUrl: string | null = null;
    const opts = { ...captureOptions };

    if (appMode === 'compare' && compareModeRef.current) {
      dataUrl = await compareModeRef.current.capture(opts);
    } else if (appMode === 'toggle' && toggleModeRef.current) {
      dataUrl = await toggleModeRef.current.capture(opts);
    } else if (appMode === 'pinpoint' && pinpointModeRef.current) {
      dataUrl = await pinpointModeRef.current.capture(opts);
    }
    if (dataUrl) {
      setCapturedImage(dataUrl);
    }
  }, [appMode, isCaptureModalOpen, captureOptions]);

  useEffect(() => {
    runCapture();
  }, [runCapture]);

  const handleOpenCaptureModal = () => {
    setClipboardStatus('idle');
    setCaptureModalOpen(true);
  };

  const handleCopyToClipboard = async () => {
    if (!capturedImage) return;
    try {
      const blob = await (await fetch(capturedImage)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setClipboardStatus('success');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setClipboardStatus('error');
    }
  };

  const resetView = () => {
    const newScale = fitScaleFn ? fitScaleFn() : 1;
    if (appMode === 'pinpoint') {
      clearPinpointScales();
      setPinpointGlobalScale(1);
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
      
      const state = useStore.getState();
      const { viewport, appMode, activeCanvasKey, pinpointScales, pinpointGlobalScale, syncMode, setAppMode, setSyncMode, setViewport, setShowInfoPanel } = state;
      const KEY_PAN_AMOUNT = 50;

      const key = e.key.toLowerCase();

      if (appMode === 'pinpoint' && activeCanvasKey && (key === '=' || key === '+' || key === '-')) {
        e.preventDefault();
        const individualScale = pinpointScales[activeCanvasKey] ?? viewport.scale;
        const increment = 0.01; // 1% increment
        const direction = (key === '=' || key === '+') ? 1 : -1;
        const newIndividualScale = individualScale + (increment * direction);
        
        const totalScale = newIndividualScale * pinpointGlobalScale;
        if (totalScale > MAX_ZOOM || totalScale < MIN_ZOOM) return;

        state.setPinpointScale(activeCanvasKey, newIndividualScale);
        return;
      }

      switch (key) {
        case '1': setAppMode('compare'); break;
        case '2': setAppMode('toggle'); break;
        case '3': setAppMode('pinpoint'); break;
        case 'r': resetView(); break;
        case 'l': setSyncMode(syncMode === 'locked' ? 'unlocked' : 'locked'); break;
        case 'i': setShowInfoPanel(prev => !prev); break;
        case '=': case '+': setViewport({ scale: Math.min(MAX_ZOOM, (viewport.scale || 1) + 0.01) }); break;
        case '-': setViewport({ scale: Math.max(MIN_ZOOM, (viewport.scale || 1) - 0.01) }); break;
        case 'arrowup': e.preventDefault(); if (imageDimensions && viewport.cy) setViewport({ cy: viewport.cy - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); break;
        case 'arrowdown': e.preventDefault(); if (imageDimensions && viewport.cy) setViewport({ cy: viewport.cy + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); break;
        case 'arrowleft': e.preventDefault(); if (imageDimensions && viewport.cx) setViewport({ cx: viewport.cx - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); break;
        case 'arrowright': e.preventDefault(); if (imageDimensions && viewport.cx) setViewport({ cx: viewport.cx + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncMode, setSyncMode, setViewport, resetView, imageDimensions, setAppMode]);

  const renderCurrentMode = () => {
    const setPrimaryFile = (file: File | null) => {
      primaryFileRef.current = file;
    };

    switch (appMode) {
      case 'compare':
        return <CompareMode ref={compareModeRef} numViewers={numViewers} stripExt={stripExt} setStripExt={setStripExt} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} />;
      case 'toggle':
        return <ToggleMode ref={toggleModeRef} numViewers={numViewers} stripExt={stripExt} setStripExt={setStripExt} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} />;
      case 'pinpoint':
        return <PinpointMode ref={pinpointModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} />;
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
            {(appMode === 'compare' || appMode === 'pinpoint' || appMode === 'toggle') && (
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
            <button onClick={resetView}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
              Reset View
            </button>
            <button onClick={handleOpenCaptureModal}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path><path d="M21 4H14.82A2 2 0 0 0 13 2H8a2 2 0 0 0-1.82 2H3v16h18v-8Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              Capture
            </button>
          </div>
          {appMode !== 'pinpoint' && <ViewportControls imageDimensions={imageDimensions} />}
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

      {isCaptureModalOpen && (
        <div className="capture-modal" onClick={() => setCaptureModalOpen(false)}>
          <div className="capture-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Capture Options</h3>
            <div className="capture-modal-preview">
              {capturedImage ? <img src={capturedImage} alt="Captured content" /> : <div className="loading-spinner"></div>}
            </div>
            <div className="capture-modal-options">
              <label>
                <input type="checkbox" checked={captureOptions.showLabels} onChange={(e) => setCaptureOptions(o => ({...o, showLabels: e.target.checked}))} />
                Show Labels
              </label>
              {appMode === 'pinpoint' && (
                <label>
                  <input type="checkbox" checked={captureOptions.showCrosshair} onChange={(e) => setCaptureOptions(o => ({...o, showCrosshair: e.target.checked}))} />
                  Show Crosshair
                </label>
              )}
            </div>
            <div className="capture-modal-actions">
              <button onClick={handleCopyToClipboard}>
                {clipboardStatus === 'idle' && 'Copy to Clipboard'}
                {clipboardStatus === 'success' && 'Copied!'}
                {clipboardStatus === 'error' && 'Error!'}
              </button>
              {capturedImage && <a href={capturedImage} download={`capture-${new Date().toISOString()}.png`}>Save as File...</a>}
              <button onClick={() => setCaptureModalOpen(false)} className="close-button">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}