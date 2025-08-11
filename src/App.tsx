import React, { useMemo, useRef, useState, useEffect } from "react";
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
    if (imageDimensions) {
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
  const [stripExt, setStripExt] = useState(true);
  const [current, setCurrent] = useState<MatchedItem | null>(null);
  const { appMode, setAppMode, syncMode, setSyncMode, setViewport, fitScaleFn } = useStore();
  const [numViewers, setNumViewers] = useState(2);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [indicator, setIndicator] = useState<{ cx: number, cy: number, key: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [toggleSource, setToggleSource] = useState<FolderKey>('A');
  const bitmapCache = useRef(new Map<string, ImageBitmap>());
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [editingAlias, setEditingAlias] = useState<FolderKey | null>(null);

  const canvasRefs = {
    A: useRef<ImageCanvasHandle>(null),
    B: useRef<ImageCanvasHandle>(null),
    C: useRef<ImageCanvasHandle>(null),
    D: useRef<ImageCanvasHandle>(null),
    toggle: useRef<ImageCanvasHandle>(null),
  };

  useEffect(() => {
    const cache = bitmapCache.current;
    for (const bitmap of cache.values()) {
      bitmap.close();
    }
    cache.clear();
  }, [A, B, C, D]);

  const fileOf = (key: FolderKey, item: MatchedItem | null) => {
    if (!item) return undefined;
    const folderState = (key === "A" ? A : key === "B" ? B : key === "C" ? C : D);
    if (!folderState?.data.files) return undefined;
    const name = stripExt
      ? Array.from(folderState.data.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? folderState.data.files.get(name) : undefined;
  };

  useEffect(() => {
    const fileA = fileOf("A", current);
    if (fileA) {
      let revoked = false;
      createImageBitmap(fileA).then(bmp => {
        if (!revoked) {
          setImageDimensions({ width: bmp.width, height: bmp.height });
        }
      });
      return () => { revoked = true; };
    } else {
      setImageDimensions(null);
    }
  }, [current, A]);

  const activeFolders = useMemo(() => {
    const folders: any = { A: A?.data.files, B: B?.data.files };
    if (appMode === 'compare') {
      if (numViewers >= 3) folders.C = C?.data.files;
      if (numViewers >= 4) folders.D = D?.data.files;
    }
    return folders;
  }, [A, B, C, D, numViewers, appMode]);

  const matched = useMemo(
    () => matchFilenames(activeFolders, stripExt),
    [activeFolders, stripExt]
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
    setViewport({ scale: newScale, cx: 0.5, cy: 0.5 });
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

  const handleCapture = async () => {
    const viewersSection = document.querySelector('.viewers') as HTMLElement;
    if (!viewersSection) return;

    const { width, height } = viewersSection.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    if (appMode === 'toggle') {
      const ref = canvasRefs.toggle.current;
      if (ref) {
        ref.drawToContext(ctx);
      }
    } else {
      const gridCols = numViewers <= 2 ? numViewers : 2;
      const gridRows = Math.ceil(numViewers / 2);
      const itemWidth = width / gridCols;
      const itemHeight = height / gridRows;

      const activeCanvasRefs = [canvasRefs.A, canvasRefs.B, canvasRefs.C, canvasRefs.D].slice(0, numViewers);

      activeCanvasRefs.forEach((ref, index) => {
        if (ref.current) {
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
          }
        }
      });
    }

    setCaptureDataUrl(canvas.toDataURL('image/png'));
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
      setCaptureDataUrl(null);
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
          if (!current || filteredMatched.length === 0) return;
          const currentIndex = filteredMatched.findIndex(item => item.filename === current.filename);
          if (currentIndex > 0) setCurrent(filteredMatched[currentIndex - 1]);
          break;
        }
        case 'd': {
          if (!current || filteredMatched.length === 0) return;
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
          setViewport({ scale: Math.min(MAX_ZOOM, viewport.scale * WHEEL_ZOOM_STEP) });
          break;
        case '-':
          setViewport({ scale: Math.max(MIN_ZOOM, viewport.scale / WHEEL_ZOOM_STEP) });
          break;
        
        // Panning
        case 'arrowup':
          e.preventDefault();
          if (imageDimensions) {
            setViewport({ cy: viewport.cy - (KEY_PAN_AMOUNT / (viewport.scale * imageDimensions.height)) });
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (imageDimensions) {
            setViewport({ cy: viewport.cy + (KEY_PAN_AMOUNT / (viewport.scale * imageDimensions.height)) });
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          if (imageDimensions) {
            setViewport({ cx: viewport.cx - (KEY_PAN_AMOUNT / (viewport.scale * imageDimensions.width)) });
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (imageDimensions) {
            setViewport({ cx: viewport.cx + (KEY_PAN_AMOUNT / (viewport.scale * imageDimensions.width)) });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [current, filteredMatched, syncMode, setSyncMode, setViewport, resetView, imageDimensions, appMode]);

  const currentFolders: Partial<Record<FolderKey, FolderState>> = appMode === 'toggle' ? { A, B } : { A, B, C, D };
  const viewersCount = appMode === 'compare' ? numViewers : 1;

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

  return (
    <div className="app">
      <header>
        <div className="title-container">
          <svg className="logo" width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12C2 7.28599 2 4.92898 3.46447 3.46447C4.92898 2 7.28599 2 12 2C16.714 2 19.071 2 20.5355 3.46447C22 4.92898 22 7.28599 22 12C22 16.714 22 19.071 20.5355 20.5355C19.071 22 16.714 22 12 22C7.28599 22 4.92898 22 3.46447 20.5355C2 19.071 2 16.714 2 12Z" stroke="#f0f0f0" strokeWidth="2"/>
            <path d="M12 2V22" stroke="#f0f0f0" strokeWidth="2"/>
            <path d="M12 12L16 8" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 12L16 16" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1 className="app-title">CompareX</h1>
        </div>
        <div className="top-controls-wrapper">
          <div className="controls">
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
            <label>
              Mode:
              <select value={appMode} onChange={e => setAppMode(e.target.value as AppMode)}>
                <option value="compare">Compare</option>
                <option value="toggle">Toggle</option>
              </select>
            </label>
            {appMode === 'compare' && (
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
            <button onClick={resetView}>Reset View</button>
            <button onClick={handleCapture}>Capture</button>
          </div>
          <ViewportControls imageDimensions={imageDimensions} onViewportSet={handleViewportSet} />
        </div>
      </header>
      <main>
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
        <section className={`viewers viewers-${viewersCount}`}>
          {showInfoPanel && 
            <ImageInfoPanel 
              file={fileOf("A", current)} 
              dimensions={imageDimensions} 
              onClose={() => setShowInfoPanel(false)} 
            />
          }
          {appMode === 'compare' ? (
            <>
              <ImageCanvas ref={canvasRefs.A} label={A?.alias || 'A'} file={fileOf("A", current)} indicator={indicator} isReference={true} cache={bitmapCache.current} />
              <ImageCanvas ref={canvasRefs.B} label={B?.alias || 'B'} file={fileOf("B", current)} indicator={indicator} cache={bitmapCache.current} />
              {numViewers >= 3 && <ImageCanvas ref={canvasRefs.C} label={C?.alias || 'C'} file={fileOf("C", current)} indicator={indicator} cache={bitmapCache.current} />}
              {numViewers >= 4 && <ImageCanvas ref={canvasRefs.D} label={D?.alias || 'D'} file={fileOf("D", current)} indicator={indicator} cache={bitmapCache.current} />}
            </>
          ) : (
            <ImageCanvas 
              ref={canvasRefs.toggle}
              label={currentFolders[toggleSource]?.alias || toggleSource} 
              file={fileOf(toggleSource, current)} 
              indicator={indicator} 
              isReference={true} 
              cache={bitmapCache.current}
            />
          )}
        </section>
      </main>
      {captureDataUrl && (
        <div className="capture-modal">
          <div className="capture-modal-content">
            <h3>Capture Complete</h3>
            <img src={captureDataUrl} alt="capture-preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />
            <div className="capture-modal-actions">
              <button onClick={handleCopyToClipboard}>Copy to Clipboard</button>
              <a href={captureDataUrl} download="capture.png" onClick={() => setCaptureDataUrl(null)}>
                Save as PNG
              </a>
              <button onClick={() => setCaptureDataUrl(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
