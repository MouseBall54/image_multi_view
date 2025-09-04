import { useState, useEffect, useRef, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useStore } from "./store";
import type { AppMode } from "./types";
import { CompareMode, CompareModeHandle } from './modes/CompareMode';
import { PinpointMode, PinpointModeHandle } from './modes/PinpointMode';
import { AnalysisMode, AnalysisModeHandle } from "./modes/AnalysisMode";
import { ImageInfoPanel } from "./components/ImageInfoPanel";
import { FilterCart } from "./components/FilterCart";
import { FilterPreviewModal } from "./components/FilterPreviewModal";
import ToastContainer from "./components/ToastContainer";
import { AnalysisRotationControl } from "./components/AnalysisRotationControl";
import { CompareRotationControl } from "./components/CompareRotationControl";
import ElectronUpdateManager from "./components/ElectronUpdateManager";
import { PinpointGlobalRotationControl } from "./components/PinpointGlobalRotationControl";
import { PinpointGlobalScaleControl } from "./components/PinpointGlobalScaleControl";
import { ViewToggleControls } from "./components/ViewToggleControls";
import { LayoutGridSelector } from "./components/LayoutGridSelector";
import { MAX_ZOOM, MIN_ZOOM, UTIF_OPTIONS } from "./config";
import { decodeTiffWithUTIF } from "./utils/utif";
// Custom menu bar removed; actions moved to title bar
import { initializeOpenCV } from "./utils/opencv";

type DrawableImage = ImageBitmap | HTMLImageElement;

function ViewportControls({ imageDimensions }: {
  imageDimensions: { width: number, height: number } | null,
}) {
  const { viewport, setViewport, triggerIndicator, appMode, rectZoomGlobalActive, setRectZoomGlobalActive } = useStore();
  const [scaleInput, setScaleInput] = useState((viewport.scale * 100).toFixed(0));
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");

  useEffect(() => {
    setScaleInput((viewport.scale * 100).toFixed(0));
    if (imageDimensions && viewport.cx != null && viewport.cy != null) {
      setXInput(Math.round((viewport.cx || 0) * imageDimensions.width).toString());
      setYInput(Math.round((viewport.cy || 0) * imageDimensions.height).toString());
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

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyChanges();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="viewport-controls">
      {(appMode === 'compare' || appMode === 'analysis') && (
        <button
          className={`rect-zoom-btn${rectZoomGlobalActive ? ' active' : ''}`}
          title="Rect Zoom (click two points)"
          onClick={() => setRectZoomGlobalActive(!rectZoomGlobalActive)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="1" ry="1"/>
          </svg>
        </button>
      )}
      <label><span>Scale:</span><input type="text" value={scaleInput} onChange={(e) => setScaleInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/><span>%</span></label>
      <label><span>X:</span><input type="text" value={xInput} disabled={!imageDimensions} onChange={(e) => setXInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/></label>
      <label><span>Y:</span><input type="text" value={yInput} disabled={!imageDimensions} onChange={(e) => setYInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/></label>
    </div>
  );
}

export default function App() {
  const { appMode, setAppMode, pinpointMouseMode, setPinpointMouseMode, setViewport, fitScaleFn, current, clearPinpointScales, setPinpointGlobalScale, numViewers, viewerRows, viewerCols, setViewerLayout, showMinimap, setShowMinimap, showGrid, setShowGrid, gridColor, setGridColor, showFilterLabels, setShowFilterLabels, selectedViewers, openToggleModal, analysisFile, minimapPosition, setMinimapPosition, minimapWidth, setMinimapWidth, previewModal, closePreviewModal, showFilterCart, pinpointReorderMode, setPinpointReorderMode } = useStore();
  const { setShowFilelist, openPreviewModal, closeToggleModal, addToast } = useStore.getState();
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showMinimapOptionsModal, setShowMinimapOptionsModal] = useState(false);
  const bitmapCache = useRef(new Map<string, DrawableImage>());
  
  const primaryFileRef = useRef<File | null>(null);
  const compareModeRef = useRef<CompareModeHandle>(null);
  const pinpointModeRef = useRef<PinpointModeHandle>(null);
  const analysisModeRef = useRef<AnalysisModeHandle>(null);

  const [isCaptureModalOpen, setCaptureModalOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureOptions, setCaptureOptions] = useState({ showLabels: true, showCrosshair: true, showMinimap: false, showFilterLabels: true });
  const [clipboardStatus, setClipboardStatus] = useState<'idle' | 'success' | 'error'>('idle');


  const runCapture = useCallback(async () => {
    if (!isCaptureModalOpen) return;
    let dataUrl: string | null = null;
    const opts = { ...captureOptions };

    if (appMode === 'compare' && compareModeRef.current) {
      dataUrl = await compareModeRef.current.capture(opts);
    } else if (appMode === 'pinpoint' && pinpointModeRef.current) {
      dataUrl = await pinpointModeRef.current.capture(opts);
    } else if (appMode === 'analysis' && analysisModeRef.current) {
      dataUrl = await analysisModeRef.current.capture(opts);
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

  const handleSaveFile = async () => {
    if (!capturedImage) return;
    
    const fileName = `capture-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    
    // Check if running in Electron
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.saveImage(capturedImage, fileName);
        if (result.success) {
          addToast({ message: result.message, type: 'success' });
        } else {
          addToast({ message: result.message, type: 'error' });
        }
      } catch (error) {
        console.error('Failed to save file:', error);
        addToast({ message: 'Failed to save file', type: 'error' });
      }
    } else {
      // Fallback for web environment
      try {
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast({ message: 'Download started', type: 'success' });
      } catch (error) {
        console.error('Failed to download file:', error);
        addToast({ message: 'Failed to download file', type: 'error' });
      }
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
    // Prefer explicit analysis file in analysis mode, otherwise use primaryFileRef
    const file = (appMode === 'analysis' ? analysisFile : primaryFileRef.current) as File | null;
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
  }, [current, analysisFile, appMode]);

  useEffect(() => {
    initializeOpenCV().catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      
      const state = useStore.getState();
      const { viewport, appMode, activeCanvasKey, pinpointScales, pinpointGlobalScale, setAppMode, setViewport } = state;
      const KEY_PAN_AMOUNT = 50;

      const key = e.key.toLowerCase();

      // UI Controls
      if (key === 'f') {
        e.preventDefault();
        setShowControls((prev: boolean) => !prev);
        return;
      }
      if (e.ctrlKey && key === 'l') {
        e.preventDefault();
        setShowFilterLabels(!showFilterLabels);
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        setShowFilelist(!state.showFilelist);
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        setShowMinimap(!showMinimap);
        return;
      }
      if (key === 'g') {
        e.preventDefault();
        setShowGrid(!showGrid);
        return;
      }

      // Open capture modal
      if (key === 'c') {
        e.preventDefault();
        handleOpenCaptureModal();
        return;
      }

      // Open filter preview modal
      if (e.ctrlKey && e.shiftKey && key === 'p') {
        e.preventDefault();
        // Resolve a source file: analysis file first, otherwise from current match
        let source: File | undefined = undefined;
        if (appMode === 'analysis' && analysisFile) {
          source = analysisFile as File;
        } else if (state.current && state.current.filename) {
          const filename = state.current.filename;
          // Prefer active canvas key if available
          const preferKeys: (keyof typeof state.folders)[] = state.activeCanvasKey ? [state.activeCanvasKey] as any : [];
          // Fallback to any folder containing the file
          const allKeys = Object.keys(state.folders) as (keyof typeof state.folders)[];
          const keysToCheck = [...preferKeys, ...allKeys.filter(k => !preferKeys.includes(k))];
          for (const k of keysToCheck) {
            const folder = state.folders[k];
            const file = folder?.data?.files?.get(filename);
            if (file) { source = file; break; }
          }
        }

        if (!source) {
          addToast({ type: 'info', title: 'No Image Selected', message: 'Load/select an image first.' });
          return;
        }

        openPreviewModal({
          mode: 'single',
          position: 'modal',
          title: 'Filter Preview',
          sourceFile: source,
        });
        return;
      }

      // Global Escape: close modals/overlays
      if (key === 'escape') {
        let handled = false;
        if (previewModal.isOpen) { closePreviewModal(); handled = true; }
        if (isCaptureModalOpen) { setCaptureModalOpen(false); handled = true; }
        if (showColorPalette) { setShowColorPalette(false); handled = true; }
        if (showMinimapOptionsModal) { setShowMinimapOptionsModal(false); handled = true; }
        if (state.toggleModalOpen) { closeToggleModal(); handled = true; }
        if (handled) { e.preventDefault(); return; }
      }

      // Disable mode switching (1/2/3) when any modal/overlay is active
      // Use both state flags and DOM presence as a safety net to avoid stale state issues
      const overlayPresent = !!(
        document.querySelector('.filter-controls-overlay') ||
        document.querySelector('.preview-modal-overlay') ||
        document.querySelector('.toggle-modal-overlay') ||
        document.querySelector('.dialog-overlay') ||
        document.querySelector('.capture-modal')
      );
      const previewBlocks = !!(state.previewModal?.isOpen && state.previewModal?.position !== 'sidebar');
      const modalActive = state.toggleModalOpen || previewBlocks || state.activeFilterEditor !== null || isCaptureModalOpen || overlayPresent;
      if (modalActive && (key === '1' || key === '2' || key === '3' || key === '4')) {
        e.preventDefault();
        return;
      }

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
        case '1': setAppMode('pinpoint'); break;
        case '2': setAppMode('analysis'); break;
        case '3': setAppMode('compare'); break;
        case 'r': resetView(); break;
        case 'i': setShowInfoPanel((prev: boolean) => !prev); break;
        case '=': case '+': setViewport({ scale: Math.min(MAX_ZOOM, (viewport.scale || 1) + 0.01) }); break;
        case '-': setViewport({ scale: Math.max(MIN_ZOOM, (viewport.scale || 1) - 0.01) }); break;
        case 'arrowup': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cy != null) setViewport({ cy: (viewport.cy || 0) - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); } break;
        case 'arrowdown': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cy != null) setViewport({ cy: (viewport.cy || 0) + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); } break;
        case 'arrowleft': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cx != null) setViewport({ cx: (viewport.cx || 0) - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); } break;
        case 'arrowright': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cx != null) setViewport({ cx: (viewport.cx || 0) + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); } break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setViewport, resetView, imageDimensions, setAppMode, isCaptureModalOpen]);

  const renderCurrentMode = () => {
    const setPrimaryFile = (file: File | null) => {
      primaryFileRef.current = file;
    };

    switch (appMode) {
      case 'compare':
        return <CompareMode ref={compareModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} showControls={showControls} />;
      case 'pinpoint':
        return <PinpointMode ref={pinpointModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} showControls={showControls} />;
      case 'analysis':
        return <AnalysisMode ref={analysisModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} showControls={showControls} />;
      default:
        return null;
    }
  };

  return (
    <div className={`app ${showFilterCart ? 'filter-cart-open' : ''} ${previewModal.isOpen && previewModal.position === 'sidebar' ? 'preview-active' : ''}`}>
      <header>
        <div className="title-container">
          <h1
            className="app-title"
            onClick={() => window.location.reload()}
            title="Reset (refresh)"
          >
            CompareX
          </h1>
          <ViewToggleControls 
            showControls={showControls} 
            onToggleControls={() => setShowControls(!showControls)} 
          />
          <div className="title-right-actions">
            <button
              className="controls-main-button"
              title="Check for Updates"
              onClick={async () => {
                try {
                  const api: any = (window as any).electronAPI;
                  if (api?.updater) await api.updater.checkForUpdates();
                } catch (e) {
                  console.error(e);
                }
              }}
              disabled={!(window as any).electronAPI?.updater}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L22 2M22 12.5a10 10 0 0 1-18.8 4.3L2 22"/>
              </svg>
            </button>
            <button
              className="controls-main-button"
              title="Toggle DevTools"
              onClick={() => {
                const api: any = (window as any).electronAPI;
                api?.windowActions?.toggleDevTools?.();
              }}
              disabled={!(window as any).electronAPI?.windowActions}
            >
              DevTools
            </button>
            <button
              className="controls-main-button"
              title="Toggle Fullscreen (F11)"
              onClick={() => {
                const api: any = (window as any).electronAPI;
                if (api?.windowActions?.toggleFullscreen) {
                  api.windowActions.toggleFullscreen();
                } else {
                  const doc: any = document;
                  if (!document.fullscreenElement) {
                    doc.documentElement.requestFullscreen?.();
                  } else {
                    document.exitFullscreen?.();
                  }
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              <span style={{ fontSize: '0.7rem', marginLeft: '4px', opacity: '0.8' }}>(F11)</span>
            </button>
          </div>
        </div>
        <div className="top-controls-wrapper">
          <div className="controls-main">
            <label><span>Mode:</span>
              <select value={appMode} onChange={e => setAppMode(e.target.value as AppMode)}>
                <option value="pinpoint">Pinpoint</option>
                <option value="analysis">Analysis</option>
                <option value="compare">Compare</option>
              </select>
            </label>
            {(appMode === 'compare' || appMode === 'pinpoint' || appMode === 'analysis') && (
              <LayoutGridSelector
                currentRows={viewerRows}
                currentCols={viewerCols}
                onLayoutChange={(rows, cols) => setViewerLayout(rows, cols)}
              />
            )}
            <button
              className={"toggle-main-btn"}
              onClick={() => openToggleModal()}
              title={"Toggle Mode (Space)"}
              disabled={
                selectedViewers.length === 0 ||
                (appMode === 'compare' && !current) ||
                (appMode === 'analysis' && !analysisFile)
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              Toggle ({selectedViewers.length})
            </button>
            {appMode === 'pinpoint' && (
              <>
                <label><span>Mouse:</span>
                  <select value={pinpointMouseMode} onChange={e => setPinpointMouseMode(e.target.value as any)}>
                    <option value="pin">Pin</option>
                    <option value="pan">Pan</option>
                  </select>
                </label>
                <div className="pinpoint-reorder-controls" title="Reorder behavior for Pinpoint drag">
                  <button
                    className={`controls-main-button ${pinpointReorderMode === 'shift' ? 'active' : ''}`}
                    onClick={() => setPinpointReorderMode('shift')}
                  >
                    Shift
                  </button>
                  <button
                    className={`controls-main-button ${pinpointReorderMode === 'swap' ? 'active' : ''}`}
                    onClick={() => setPinpointReorderMode('swap')}
                  >
                    Swap
                  </button>
                </div>
              </>
            )}
            <button className="controls-main-button capture-button" onClick={handleOpenCaptureModal}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path><path d="M21 4H14.82A2 2 0 0 0 13 2H8a2 2 0 0 0-1.82 2H3v16h18v-8Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              Capture
            </button>
            <div className="minimap-button-unified">
              <button onClick={() => setShowMinimap(!showMinimap)} className={`minimap-toggle-button ${showMinimap ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="4" height="4" rx="1" ry="1"></rect></svg>
                Minimap
              </button>
              <button
                className={`minimap-options-indicator ${showMinimap ? '' : 'disabled'}`}
                onClick={() => showMinimap && setShowMinimapOptionsModal(true)}
                title="Minimap options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 12H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51-1Z"/></svg>
              </button>
            </div>
            <div className="grid-button-unified">
              <button
                className={`grid-button-toggle ${showGrid ? 'active' : ''}`}
                onClick={() => setShowGrid(!showGrid)}
                title={showGrid ? 'Hide Grid' : 'Show Grid'}
              >
                <svg xmlns="http://www.w.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
              </button>
              <div
                className="grid-button-color-indicator"
                style={{ backgroundColor: showGrid ? gridColor : 'transparent' }}
                onClick={() => showGrid && setShowColorPalette(true)}
                title="Change Grid Color"
              />
            </div>
          </div>
          <div className="controls-right">
            {appMode === 'compare' && <CompareRotationControl />}
            {appMode === 'analysis' && <AnalysisRotationControl />}
            {appMode === 'pinpoint' && <PinpointGlobalRotationControl />}
            {appMode === 'pinpoint' && (
              <div className="global-controls-wrapper">
                <PinpointGlobalScaleControl />
              </div>
            )}
            {appMode !== 'pinpoint' && <ViewportControls imageDimensions={imageDimensions} />}
            <button onClick={resetView} title="Reset View" className="controls-main-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M12 12l-8 8M12 12l8 8M12 12l-8-8M12 12l8-8"/></svg>
            </button>
          </div>
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
              <label>
                <input type="checkbox" checked={captureOptions.showFilterLabels} onChange={(e) => setCaptureOptions(o => ({...o, showFilterLabels: e.target.checked}))} />
                Show Filter Labels
              </label>
              {appMode === 'pinpoint' && (
                <label>
                  <input type="checkbox" checked={captureOptions.showCrosshair} onChange={(e) => setCaptureOptions(o => ({...o, showCrosshair: e.target.checked}))} />
                  Show Crosshair
                </label>
              )}
              {showMinimap && (
                <label>
                  <input type="checkbox" checked={captureOptions.showMinimap} onChange={(e) => setCaptureOptions(o => ({...o, showMinimap: e.target.checked}))} />
                  Show Minimap
                </label>
              )}
            </div>
            <div className="capture-modal-actions">
              <button className="capture-copy-button" onClick={handleCopyToClipboard}>
                {clipboardStatus === 'idle' && 'Copy to Clipboard'}
                {clipboardStatus === 'success' && 'Copied!'}
                {clipboardStatus === 'error' && 'Error!'}
              </button>
              <button className="capture-save-button" onClick={handleSaveFile} disabled={!capturedImage}>Save as File...</button>
              <button onClick={() => setCaptureModalOpen(false)} className="close-button">Close</button>
            </div>
          </div>
        </div>
      )}

      {showColorPalette && showGrid && (
        <div className="grid-color-modal-overlay" onClick={() => setShowColorPalette(false)}>
          <div className="grid-color-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Select Grid Color</h3>
            <div className="grid-color-palette-modal">
              {['white', 'red', 'yellow', 'blue'].map(color => (
                <button
                  key={color}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  style={{ backgroundColor: color }}
                  className={`grid-color-swatch ${gridColor === color ? 'active' : ''}`}
                  onClick={() => {
                    setGridColor(color as any);
                    setShowColorPalette(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showMinimapOptionsModal && (
        <div className="minimap-options-modal-overlay" onClick={() => setShowMinimapOptionsModal(false)}>
          <div className="minimap-options-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="minimap-options-header">
              <h3>Minimap Options</h3>
              <button className="close-btn" onClick={() => setShowMinimapOptionsModal(false)}>×</button>
            </div>
            <div className="minimap-options-grid">
              <div className="minimap-position-preview">
                <div className={`preview-corner tl ${minimapPosition==='top-left' ? 'active':''}`} onClick={() => setMinimapPosition('top-left')} />
                <div className={`preview-corner tr ${minimapPosition==='top-right' ? 'active':''}`} onClick={() => setMinimapPosition('top-right')} />
                <div className={`preview-corner bl ${minimapPosition==='bottom-left' ? 'active':''}`} onClick={() => setMinimapPosition('bottom-left')} />
                <div className={`preview-corner br ${minimapPosition==='bottom-right' ? 'active':''}`} onClick={() => setMinimapPosition('bottom-right')} />
              </div>
              <div className="minimap-size-buttons">
                <button className={`minimap-size-button ${minimapWidth===120? 'active':''}`} onClick={() => setMinimapWidth(120)}>Small</button>
                <button className={`minimap-size-button ${minimapWidth===150? 'active':''}`} onClick={() => setMinimapWidth(150)}>Medium</button>
                <button className={`minimap-size-button ${minimapWidth===200? 'active':''}`} onClick={() => setMinimapWidth(200)}>Large</button>
                <button className={`minimap-size-button ${minimapWidth===240? 'active':''}`} onClick={() => setMinimapWidth(240)}>XL</button>
              </div>
            </div>
            <div className="minimap-options-actions">
              <button onClick={() => setShowMinimapOptionsModal(false)} className="apply-btn">OK</button>
            </div>
          </div>
        </div>
      )}

      <FilterCart />
      
      {/* Only render FilterPreviewModal for modal mode, sidebar mode is rendered within FilterCart */}
      {previewModal.position !== 'sidebar' && (
        <FilterPreviewModal
          isOpen={previewModal.isOpen}
          onClose={closePreviewModal}
          sourceFile={previewModal.sourceFile}
          previewMode={previewModal.mode}
          filterType={previewModal.filterType}
          filterParams={previewModal.filterParams}
          chainItems={previewModal.chainItems}
          title={previewModal.title}
          realTimeUpdate={previewModal.realTimeUpdate}
          position={previewModal.position}
          stepIndex={previewModal.stepIndex}
        />
      )}
      
      <ToastContainer />
      <ElectronUpdateManager autoCheck={true} checkIntervalMs={4 * 60 * 60 * 1000} />
    </div>
  );
}
