import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { matchFilenames } from "./utils/match";
import { filesFromInput, pickDirectory, FolderData } from "./utils/folder";
import { ImageCanvas, ImageCanvasHandle } from "./components/ImageCanvas";
import { ImageInfoPanel } from "./components/ImageInfoPanel";
import { useStore } from "./store";
import type { FolderKey, MatchedItem, AppMode } from "./types";
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP } from "./config";

interface FolderState {
  data: FolderData;
  alias: string;
}

interface PinpointImage {
  file: File;
  refPoint: { x: number, y: number } | null;
}

function useFolderPickers() {
  const [A, setA] = useState<FolderState | undefined>();
  const [B, setB] = useState<FolderState | undefined>();
  const [C, setC] = useState<FolderState | undefined>();
  const [D, setD] = useState<FolderState | undefined>();

  const pick = async (key: FolderKey) => {
    try {
      const folderData = await pickDirectory();
      const newState = { data: folderData, alias: folderData.name };
      if (key === "A") setA(newState);
      if (key === "B") setB(newState);
      if (key === "C") setC(newState);
      if (key === "D") setD(newState);
    } catch (error) {
      console.error("Error picking directory:", error);
      if (inputRefs[key].current) {
        inputRefs[key].current?.click();
      }
    }
  };

  const inputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
    C: useRef<HTMLInputElement>(null),
    D: useRef<HTMLInputElement>(null),
  };

  const onInput = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const folderData = filesFromInput(e.target.files);
    if (!folderData) return;
    const newState = { data: folderData, alias: folderData.name };
    if (key === "A") setA(newState);
    if (key === "B") setB(newState);
    if (key === "C") setC(newState);
    if (key === "D") setD(newState);
  };

  const updateAlias = (key: FolderKey, newAlias: string) => {
    if (key === "A") setA(prev => prev ? { ...prev, alias: newAlias } : undefined);
    if (key === "B") setB(prev => prev ? { ...prev, alias: newAlias } : undefined);
    if (key === "C") setC(prev => prev ? { ...prev, alias: newAlias } : undefined);
    if (key === "D") setD(prev => prev ? { ...prev, alias: newAlias } : undefined);
  };

  return { A, B, C, D, pick, inputRefs, onInput, updateAlias };
}

function ViewportControls({ imageDimensions, onViewportSet }: {
  imageDimensions: { width: number, height: number } | null,
  onViewportSet: (vp: { scale?: number, cx?: number, cy?: number }) => void
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
    }
  }, [viewport, imageDimensions]);

  const applyChanges = () => {
    const newScale = parseFloat(scaleInput) / 100;
    const newCx = imageDimensions ? parseFloat(xInput) / imageDimensions.width : NaN;
    const newCy = imageDimensions ? parseFloat(yInput) / imageDimensions.height : NaN;

    const newViewport: { scale?: number, cx?: number, cy?: number } = {};
    if (!isNaN(newScale)) {
      newViewport.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    }
    if (!isNaN(newCx)) {
      newViewport.cx = newCx;
    }
    if (!isNaN(newCy)) {
      newViewport.cy = newCy;
    }
    
    setViewport(newViewport);
    onViewportSet(newViewport);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyChanges();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="viewport-controls">
      <label>
        <span>Scale:</span>
        <input
          type="text"
          value={scaleInput}
          onChange={(e) => setScaleInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        <span>%</span>
      </label>
      <label>
        <span>X:</span>
        <input
          type="text"
          value={xInput}
          disabled={!imageDimensions}
          onChange={(e) => setXInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        <span>px</span>
      </label>
      <label>
        <span>Y:</span>
        <input
          type="text"
          value={yInput}
          disabled={!imageDimensions}
          onChange={(e) => setYInput(e.target.value)}
          onBlur={applyChanges}
          onKeyDown={handleKeyDown}
        />
        <span>px</span>
      </label>
    </div>
  );
}

export default function App() {
  const { A, B, C, D, pick, inputRefs, onInput, updateAlias } = useFolderPickers();
  const [pinpointImages, setPinpointImages] = useState<Partial<Record<FolderKey, PinpointImage>>>({});
  const [stripExt, setStripExt] = useState(true);
  const [current, setCurrent] = useState<MatchedItem | null>(null);
  const { appMode, setAppMode, syncMode, setSyncMode, pinpointMouseMode, setPinpointMouseMode, setViewport, fitScaleFn } = useStore();
  const [numViewers, setNumViewers] = useState(2);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [indicator, setIndicator] = useState<{ cx: number, cy: number, key: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [toggleSource, setToggleSource] = useState<FolderKey>('A');
  const bitmapCache = useRef(new Map<string, ImageBitmap>());
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureWithLabels, setCaptureWithLabels] = useState(true);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [editingAlias, setEditingAlias] = useState<FolderKey | null>(null);

  const pinpointFileInputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
    C: useRef<HTMLInputElement>(null),
    D: useRef<HTMLInputElement>(null),
  };

  const handlePinpointFileSelect = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPinpointImages(prev => ({
        ...prev,
        [key]: { file, refPoint: null }
      }));
    }
  };

  const handleSetRefPoint = useCallback((key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => {
    setPinpointImages(prev => {
      const currentImage = prev[key];
      if (!currentImage) return prev;
      return {
        ...prev,
        [key]: { ...currentImage, refPoint: imgPoint }
      };
    });
    // Update global viewport's reference screen point
    setViewport({ refScreenX: screenPoint.x, refScreenY: screenPoint.y });
  }, [setViewport]);

  const canvasRefs = {
    A: useRef<ImageCanvasHandle>(null),
    B: useRef<ImageCanvasHandle>(null),
    C: useRef<ImageCanvasHandle>(null),
    D: useRef<ImageCanvasHandle>(null),
    toggle: useRef<ImageCanvasHandle>(null),
  };

  const fileOf = (key: FolderKey, item: MatchedItem | null): File | undefined => {
    if (appMode === 'pinpoint') {
      return pinpointImages[key]?.file;
    }
    if (!item) return undefined;
    const folderState = (key === "A" ? A : key === "B" ? B : key === "C" ? C : D);
    if (!folderState?.data.files) return undefined;
    const name = stripExt
      ? Array.from(folderState.data.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? folderState.data.files.get(name) : undefined;
  };

  useEffect(() => {
    const firstFile = appMode === 'pinpoint' ? pinpointImages.A?.file : fileOf("A", current);
    if (firstFile) {
      let revoked = false;
      createImageBitmap(firstFile).then(bmp => {
        if (!revoked) {
          setImageDimensions({ width: bmp.width, height: bmp.height });
        }
      });
      return () => { revoked = true; };
    } else {
      setImageDimensions(null);
    }
  }, [current, A, appMode, pinpointImages]);

  const activeFolders = useMemo(() => {
    if (appMode !== 'compare') return {};
    const folders: any = { A: A?.data.files, B: B?.data.files };
    if (numViewers >= 3) folders.C = C?.data.files;
    if (numViewers >= 4) folders.D = D?.data.files;
    return folders;
  }, [A, B, C, D, numViewers, appMode]);

  const matched = useMemo(
    () => appMode === 'compare' ? matchFilenames(activeFolders, stripExt) : [],
    [activeFolders, stripExt, appMode]
  );

  const filteredMatched = useMemo(() => {
    if (!searchQuery) {
      return matched;
    }
    return matched.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matched, searchQuery]);

  const resetView = () => {
    const newScale = fitScaleFn ? fitScaleFn() : 1;
    if (appMode === 'pinpoint') {
      setViewport({ scale: newScale, refScreenX: undefined, refScreenY: undefined });
      // Optionally, clear all pinpoints when resetting view in pinpoint mode
      // setPinpointImages({}); 
    } else {
      setViewport({ scale: newScale, cx: 0.5, cy: 0.5 });
    }
  };

  const handleViewportSet = (vp: { cx?: number, cy?: number }) => {
    if (vp.cx !== undefined && vp.cy !== undefined) {
      setIndicator({ cx: vp.cx, cy: vp.cy, key: Date.now() });
      setTimeout(() => setIndicator(null), 2000);
    }
  };

  const handleAliasChange = (key: FolderKey, newAlias: string) => {
    updateAlias(key, newAlias);
    setEditingAlias(null);
  };

  const currentFolders: Partial<Record<FolderKey, FolderState>> = appMode === 'toggle' ? { A, B } : { A, B, C, D };
  const viewersCount = appMode === 'pinpoint' ? numViewers : (appMode === 'compare' ? numViewers : 1);

  const generateCapture = useCallback((withLabels: boolean): string | null => {
    const viewersSection = document.querySelector('.viewers') as HTMLElement;
    if (!viewersSection) return null;

    const { width, height } = viewersSection.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    const drawLabel = (label: string, x: number, y: number) => {
      const fontSize = 24;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const padding = 8;
      
      ctx.fillRect(x + padding / 2, y + padding / 2, textWidth + padding, fontSize + padding);

      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x + padding, y + padding);
    };

    if (appMode === 'toggle') {
      const ref = canvasRefs.toggle.current;
      if (ref) {
        ref.drawToContext(ctx);
        if (withLabels) {
          const label = currentFolders[toggleSource]?.alias || toggleSource;
          drawLabel(label, 0, 0);
        }
      }
    } else {
      const gridCols = viewersCount <= 2 ? viewersCount : 2;
      const gridRows = Math.ceil(viewersCount / 2);
      const itemWidth = width / gridCols;
      const itemHeight = height / gridRows;

      const activeCanvasKeys: FolderKey[] = ['A', 'B', 'C', 'D'].slice(0, viewersCount) as FolderKey[];

      activeCanvasKeys.forEach((key, index) => {
        const ref = canvasRefs[key];
        if (ref?.current) {
          const row = Math.floor(index / gridCols);
          const col = index % gridCols;
          const x = col * itemWidth;
          const y = row * itemHeight;

          const subCanvas = document.createElement('canvas');
          subCanvas.width = itemWidth;
          subCanvas.height = itemHeight;
          const subCtx = subCanvas.getContext('2d');
          if (subCtx) {
            ref.current.drawToContext(subCtx);
            ctx.drawImage(subCanvas, x, y);
            if (withLabels) {
              const label = appMode === 'pinpoint' 
                ? (pinpointImages[key]?.file.name || key)
                : ((key === 'A' ? A : key === 'B' ? B : key === 'C' ? C : D)?.alias || key);
              drawLabel(label, x, y);
            }
          }
        }
      });
    }

    return canvas.toDataURL('image/png');
  }, [appMode, numViewers, viewersCount, canvasRefs, A, B, C, D, toggleSource, currentFolders, pinpointImages]);

  useEffect(() => {
    if (showCaptureModal) {
      const url = generateCapture(captureWithLabels);
      setCaptureDataUrl(url);
    }
  }, [showCaptureModal, captureWithLabels, generateCapture]);

  const handleCaptureClick = () => {
    setShowCaptureModal(true);
  };

  const handleCloseCaptureModal = () => {
    setShowCaptureModal(false);
    setCaptureDataUrl(null);
  };

  const handleCopyToClipboard = async () => {
    if (!captureDataUrl) return;
    try {
      const blob = await (await fetch(captureDataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy to clipboard.');
    } finally {
      handleCloseCaptureModal();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      
      if (appMode === 'toggle' && e.key === ' ') {
        e.preventDefault();
        setToggleSource(prev => prev === 'A' ? 'B' : 'A');
        return;
      }

      const { viewport } = useStore.getState();
      const KEY_PAN_AMOUNT = 50; // pixels

      switch (e.key.toLowerCase()) {
        // Image navigation
        case 'a': {
          if (appMode !== 'compare' || !current || filteredMatched.length === 0) return;
          const currentIndex = filteredMatched.findIndex(item => item.filename === current.filename);
          if (currentIndex > 0) setCurrent(filteredMatched[currentIndex - 1]);
          break;
        }
        case 'd': {
          if (appMode !== 'compare' || !current || filteredMatched.length === 0) return;
          const currentIndex = filteredMatched.findIndex(item => item.filename === current.filename);
          if (currentIndex < filteredMatched.length - 1) setCurrent(filteredMatched[currentIndex + 1]);
          break;
        }

        // View controls
        case 'r':
          resetView();
          break;
        case 'l':
          setSyncMode(syncMode === 'locked' ? 'unlocked' : 'locked');
          break;
        case 'i':
          setShowInfoPanel(prev => !prev);
          break;
        case '=':
        case '+':
          setViewport({ scale: Math.min(MAX_ZOOM, (viewport.scale || 1) * WHEEL_ZOOM_STEP) });
          break;
        case '-':
          setViewport({ scale: Math.max(MIN_ZOOM, (viewport.scale || 1) / WHEEL_ZOOM_STEP) });
          break;
        
        // Panning
        case 'arrowup':
          e.preventDefault();
          if (imageDimensions && viewport.cy) {
            setViewport({ cy: viewport.cy - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) });
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (imageDimensions && viewport.cy) {
            setViewport({ cy: viewport.cy + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) });
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          if (imageDimensions && viewport.cx) {
            setViewport({ cx: viewport.cx - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) });
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (imageDimensions && viewport.cx) {
            setViewport({ cx: viewport.cx + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [current, filteredMatched, syncMode, setSyncMode, setViewport, resetView, imageDimensions, appMode]);

  const renderFolderControl = (key: FolderKey, state: FolderState | undefined) => {
    if (!state) {
      return (
        <button className="folder-picker-initial" onClick={() => pick(key)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span>Folder {key}</span>
        </button>
      );
    }

    return (
      <div className="folder-control">
        <span className="folder-key-label">{key}</span>
        <div className="alias-editor">
          {editingAlias === key ? (
            <input
              type="text"
              defaultValue={state.alias}
              onBlur={(e) => handleAliasChange(key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAliasChange(key, (e.target as HTMLInputElement).value);
                }
                if (e.key === 'Escape') {
                  setEditingAlias(null);
                }
              }}
              autoFocus
            />
          ) : (
            <span className="alias-text" onClick={() => setEditingAlias(key)} title={state.alias}>{state.alias}</span>
          )}
        </div>
        <button onClick={() => pick(key)} className="repick-button" title={`Repick Folder ${key}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="m15 14-3 3-3-3"></path></svg>
        </button>
      </div>
    );
  };

  const renderPinpointControl = (key: FolderKey) => {
    const image = pinpointImages[key];
    return (
      <div className="pinpoint-control">
        <span className="folder-key-label">{key}</span>
        <button onClick={() => pinpointFileInputRefs[key].current?.click()}>
          {image ? image.file.name : `Select Image ${key}`}
        </button>
        <input 
          ref={pinpointFileInputRefs[key]} 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={(e) => handlePinpointFileSelect(key, e)}
        />
      </div>
    );
  };

  const renderControls = () => {
    if (appMode === 'pinpoint') {
      return (
        <>
          {renderPinpointControl('A')}
          {renderPinpointControl('B')}
          {numViewers >= 3 && renderPinpointControl('C')}
          {numViewers >= 4 && renderPinpointControl('D')}
        </>
      );
    }
    return (
      <>
        {renderFolderControl('A', A)}
        {renderFolderControl('B', B)}
        {appMode === 'compare' && numViewers >= 3 && renderFolderControl('C', C)}
        {appMode === 'compare' && numViewers >= 4 && renderFolderControl('D', D)}
        <div style={{ display: 'none' }}>
          <input ref={inputRefs.A} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("A", e)} />
          <input ref={inputRefs.B} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("B", e)} />
          <input ref={inputRefs.C} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("C", e)} />
          <input ref={inputRefs.D} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("D", e)} />
        </div>
      </>
    );
  };

  const renderFilelist = () => {
    if (appMode === 'pinpoint') return null; // Hide file list in pinpoint mode
    return (
      <aside className="filelist">
        <div className="filelist-header">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="filelist-options">
            <div className="count">Matched: {filteredMatched.length}</div>
            <label className="strip-ext-label">
              <input type="checkbox" checked={stripExt} onChange={(e)=>setStripExt(e.target.checked)} />
              <span>Ignore extension</span>
            </label>
          </div>
        </div>
        <ul>
          {filteredMatched.map(m => (
            <li key={m.filename}
                className={current?.filename === m.filename ? "active": ""}
                onClick={()=>setCurrent(m)}>
              {m.filename}
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  const renderViewers = () => {
    if (appMode === 'pinpoint') {
      const keys: FolderKey[] = ['A', 'B', 'C', 'D'].slice(0, numViewers) as FolderKey[];
      return keys.map(key => (
        <ImageCanvas 
          key={key}
          ref={canvasRefs[key]}
          label={pinpointImages[key]?.file.name || key}
          file={pinpointImages[key]?.file}
          indicator={indicator} 
          isReference={key === 'A'} 
          cache={bitmapCache.current}
          appMode={appMode} // Pass appMode
          refPoint={pinpointImages[key]?.refPoint} // Pass refPoint
          onSetRefPoint={handleSetRefPoint} // Pass onSetRefPoint
          folderKey={key} // Pass folderKey
        />
      ));
    }

    if (appMode === 'toggle') {
      return (
        <ImageCanvas 
          ref={canvasRefs.toggle}
          label={currentFolders[toggleSource]?.alias || toggleSource} 
          file={fileOf(toggleSource, current)}
          appMode={appMode}
          folderKey={toggleSource}
          indicator={indicator} 
          isReference={true} 
          cache={bitmapCache.current}
        />
      );
    }

    // Compare mode
    return (
      <>
        <ImageCanvas ref={canvasRefs.A} label={A?.alias || 'A'} file={fileOf("A", current)} indicator={indicator} isReference={true} cache={bitmapCache.current} appMode={appMode} folderKey="A" />
        <ImageCanvas ref={canvasRefs.B} label={B?.alias || 'B'} file={fileOf("B", current)} indicator={indicator} cache={bitmapCache.current} appMode={appMode} folderKey="B" />
        {numViewers >= 3 && <ImageCanvas ref={canvasRefs.C} label={C?.alias || 'C'} file={fileOf("C", current)} indicator={indicator} cache={bitmapCache.current} appMode={appMode} folderKey="C" />}
        {numViewers >= 4 && <ImageCanvas ref={canvasRefs.D} label={D?.alias || 'D'} file={fileOf("D", current)} indicator={indicator} cache={bitmapCache.current} appMode={appMode} folderKey="D" />}
      </>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="title-container">
          {/* ... logo ... */}
          <h1 className="app-title">CompareX</h1>
        </div>
        <div className="top-controls-wrapper">
          <div className="controls">
            {renderControls()}
            <label>
              Mode:
              <select value={appMode} onChange={e => setAppMode(e.target.value as AppMode)}>
                <option value="compare">Compare</option>
                <option value="toggle">Toggle</option>
                <option value="pinpoint">Pinpoint</option>
              </select>
            </label>
            {(appMode === 'compare' || appMode === 'pinpoint') && (
              <label>
                Viewers:
                <select value={numViewers} onChange={e => setNumViewers(Number(e.target.value))}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            )}
            <label>
              Sync:
              <select value={syncMode} onChange={e => setSyncMode(e.target.value as any)}>
                <option value="locked">locked</option>
                <option value="unlocked">unlocked</option>
              </select>
            </label>
            {appMode === 'pinpoint' && (
              <label>
                Mouse:
                <select value={pinpointMouseMode} onChange={e => setPinpointMouseMode(e.target.value as any)}>
                  <option value="pin">Pin</option>
                  <option value="pan">Pan</option>
                </select>
              </label>
            )}
            <button onClick={resetView}>Reset View</button>
            <button onClick={handleCaptureClick}>Capture</button>
          </div>
          <ViewportControls imageDimensions={imageDimensions} onViewportSet={handleViewportSet} />
        </div>
      </header>
      <main>
        {renderFilelist()}
        <section className={`viewers viewers-${viewersCount}`}>
          {showInfoPanel && 
            <ImageInfoPanel 
              file={appMode === 'pinpoint' ? pinpointImages.A?.file : fileOf("A", current)} 
              dimensions={imageDimensions} 
              onClose={() => setShowInfoPanel(false)} 
            />
          }
          {renderViewers()}
        </section>
      </main>
      {showCaptureModal && (
        <div className="capture-modal">
          <div className="capture-modal-content">
            <h3>Capture Complete</h3>
            {captureDataUrl && <img src={captureDataUrl} alt="capture-preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />}
            <div className="capture-modal-options">
              <label>
                <input type="checkbox" checked={captureWithLabels} onChange={e => setCaptureWithLabels(e.target.checked)} />
                Include Labels
              </label>
            </div>
            <div className="capture-modal-actions">
              <button onClick={handleCopyToClipboard}>Copy to Clipboard</button>
              <a href={captureDataUrl || ''} download="capture.png" onClick={() => !captureDataUrl && event.preventDefault()}>
                Save as PNG
              </a>
              <button onClick={handleCloseCaptureModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}