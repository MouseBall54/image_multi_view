import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { useStore } from '../store';
import { useFolderPickers, FolderState } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import type { FolderKey, MatchedItem } from '../types';

type DrawableImage = ImageBitmap | HTMLImageElement;

interface PinpointImage {
  file: File | null;
  refPoint: { x: number, y: number } | null;
}

export interface PinpointModeHandle {
  capture: (options: { showLabels: boolean, showCrosshair: boolean }) => Promise<string | null>;
}

interface PinpointModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  indicator: { cx: number, cy: number, key: number } | null;
  setPrimaryFile: (file: File | null) => void;
}

export const PinpointMode = forwardRef<PinpointModeHandle, PinpointModeProps>(({ numViewers, bitmapCache, indicator, setPrimaryFile }, ref) => {
  const { A, B, C, D, pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { current, setCurrent, setViewport, viewport } = useStore();
  const [pinpointImages, setPinpointImages] = useState<Partial<Record<FolderKey, PinpointImage>>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlias, setEditingAlias] = useState<FolderKey | null>(null);
  const [activeCanvasKey, setActiveCanvasKey] = useState<FolderKey | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  const pinpointFileInputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
    C: useRef<HTMLInputElement>(null),
    D: useRef<HTMLInputElement>(null),
  };

  const canvasRefs = {
    A: useRef<ImageCanvasHandle>(null),
    B: useRef<ImageCanvasHandle>(null),
    C: useRef<ImageCanvasHandle>(null),
    D: useRef<ImageCanvasHandle>(null),
  };

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showCrosshair }) => {
      const FOLDER_KEYS = (['A', 'B', 'C', 'D'] as FolderKey[]).slice(0, numViewers);
      
      const firstOnscreenCanvas = canvasRefs.A.current?.getCanvas();
      if (!firstOnscreenCanvas) return null;
      const { width, height } = firstOnscreenCanvas;

      const tempCanvases = FOLDER_KEYS.map(key => {
        const handle = canvasRefs[key].current;
        if (!handle) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;
        handle.drawToContext(tempCtx, showCrosshair);
        return tempCanvas;
      }).filter((c): c is HTMLCanvasElement => !!c);

      if (tempCanvases.length === 0) return null;

      const isGridLayout = numViewers > 2;
      const combinedWidth = isGridLayout ? width * 2 : width * tempCanvases.length;
      const combinedHeight = isGridLayout ? (numViewers === 3 ? height * 2 : height * 2) : height;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = combinedWidth;
      finalCanvas.height = combinedHeight;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) return null;

      finalCtx.fillStyle = '#111';
      finalCtx.fillRect(0, 0, combinedWidth, combinedHeight);
      const BORDER_WIDTH = 2; // px
      finalCtx.fillStyle = '#000'; // Black border

      tempCanvases.forEach((canvas, index) => {
        const key = FOLDER_KEYS[index];
        let dx = 0, dy = 0;
        if (isGridLayout) {
            dx = (index % 2) * width;
            dy = Math.floor(index / 2) * height;
        } else {
            dx = index * width;
        }
        finalCtx.drawImage(canvas, dx, dy);

        // Draw borders around the image
        if (index > 0) { // Draw vertical border for horizontal layout
          if (!isGridLayout) {
            finalCtx.fillRect(dx - BORDER_WIDTH / 2, dy, BORDER_WIDTH, height);
          }
        }
        if (isGridLayout) { // Draw borders for grid layout
          if (index % 2 > 0) { // Vertical border
            finalCtx.fillRect(dx - BORDER_WIDTH / 2, dy, BORDER_WIDTH, height);
          }
          if (Math.floor(index / 2) > 0) { // Horizontal border
            finalCtx.fillRect(dx, dy - BORDER_WIDTH / 2, width, BORDER_WIDTH);
          }
        }

        if (showLabels) {
          const label = allFolders[key]?.alias || pinpointImages[key]?.file?.name || key;
          finalCtx.font = '16px sans-serif';
          finalCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          finalCtx.fillRect(dx + 5, dy + 5, finalCtx.measureText(label).width + 10, 24);
          finalCtx.fillStyle = 'white';
          finalCtx.fillText(label, dx + 10, dy + 22);
        }
      });

      return finalCanvas.toDataURL('image/png');
    }
  }));

  const activeFolders = useMemo(() => {
    const folders: any = { A: A?.data.files, B: B?.data.files };
    if (numViewers >= 3) folders.C = C?.data.files;
    if (numViewers >= 4) folders.D = D?.data.files;
    return folders;
  }, [A, B, C, D, numViewers]);

  const matched = useMemo(
    () => matchFilenames(activeFolders, true, "union"), // Use "union" mode for pinpoint
    [activeFolders]
  );

  const filteredMatched = useMemo(() => {
    let result = matched;
    if (searchQuery) {
      result = result.filter(item =>
        item.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (folderFilter !== 'all') {
      result = result.filter(item => item.has[folderFilter]);
    }
    return result;
  }, [matched, searchQuery, folderFilter]);

  const handlePinpointFileSelect = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPinpointImages(prev => ({
        ...prev,
        [key]: { file, refPoint: null }
      }));
      setViewport({ refScreenX: undefined, refScreenY: undefined }); // Reset viewport refScreen on new image load
    }
  };
  
  const fileOf = useCallback((key: FolderKey, item: MatchedItem | null): File | undefined => {
    if (!item) return undefined;
    const folderState = (key === "A" ? A : key === "B" ? B : key === "C" ? C : D);
    if (!folderState?.data.files) return undefined;
    const name = Array.from(folderState.data.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename); // Always strip extension for matching
    return name ? folderState.data.files.get(name) : undefined;
  }, [A, B, C, D]); // Dependencies for useCallback

  useEffect(() => {
    const primaryFile = pinpointImages['A']?.file;
    setPrimaryFile(primaryFile || null);
  }, [pinpointImages, setPrimaryFile]);

  

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

  const handleAliasChange = (key: FolderKey, newAlias: string) => {
    updateAlias(key, newAlias);
    setEditingAlias(null);
  };

  const handleFileListItemClick = useCallback((item: MatchedItem) => {
    setCurrent(item); // Set the global current
    if (activeCanvasKey) {
      // Find the actual File object from any of the folders that has it
      let fileToLoad: File | undefined;
      const folderKeys: FolderKey[] = ['A', 'B', 'C', 'D']; // All possible folder keys
      for (const folderKeyIter of folderKeys) {
        if (item.has[folderKeyIter]) { // Check if this folder has the file
          const folderState = (folderKeyIter === "A" ? A : folderKeyIter === "B" ? B : folderKeyIter === "C" ? C : D);
          if (folderState?.data.files) {
            const name = Array.from(folderState.data.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename);
            if (name) {
              fileToLoad = folderState.data.files.get(name);
              break; // Found the file, no need to check other folders
            }
          }
        }
      }

      if (fileToLoad) {
        setPinpointImages(prev => ({
          ...prev,
          [activeCanvasKey]: { file: fileToLoad, refPoint: prev[activeCanvasKey]?.refPoint || null }
        }));
        setViewport({ refScreenX: undefined, refScreenY: undefined }); // Reset viewport refScreen on new image load
      } else {
        // If no file is found (e.g., due to a filter or a bug), clear the canvas
        setPinpointImages(prev => ({
          ...prev,
          [activeCanvasKey]: { file: null, refPoint: null }
        }));
        setViewport({ refScreenX: undefined, refScreenY: undefined }); // Reset viewport refScreen on clear
      }
    }
  }, [activeCanvasKey, A, B, C, D, setCurrent]);

  const handleCanvasClick = useCallback((key: FolderKey) => {
    if (current) {
      const fileToLoad = fileOf(key, current);
      if (fileToLoad) {
        setPinpointImages(prev => ({
          ...prev,
          [key]: { file: fileToLoad, refPoint: prev[key]?.refPoint || null }
        }));
      }
    }
  }, [current, fileOf]);

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
                if (e.key === 'Enter') handleAliasChange(key, (e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setEditingAlias(null);
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

  const keys: FolderKey[] = ['A', 'B', 'C', 'D'].slice(0, numViewers) as FolderKey[];

  return (
    <>
      <div className="controls">
        {renderFolderControl('A', A)}
        {renderFolderControl('B', B)}
        {numViewers >= 3 && renderFolderControl('C', C)}
        {numViewers >= 4 && renderFolderControl('D', D)}
        <div style={{ display: 'none' }}>
          <input ref={inputRefs.A} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("A", e)} />
          <input ref={inputRefs.B} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("B", e)} />
          <input ref={inputRefs.C} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("C", e)} />
          <input ref={inputRefs.D} type="file" webkitdirectory="" multiple onChange={(e)=>onInput("D", e)} />
        </div>
      </div>
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
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                <option value="A">Folder A</option>
                <option value="B">Folder B</option>
                {numViewers >= 3 && <option value="C">Folder C</option>}
                {numViewers >= 4 && <option value="D">Folder D</option>}
              </select>
              <label className="strip-ext-label">
                <input type="checkbox" checked={true} onChange={(e)=> { /* stripExt is always true for pinpoint mode */ }} />
                <span>Ignore extension</span>
              </label>
            </div>
          </div>
          <ul>
            {filteredMatched.map(m => (
              <li key={m.filename}
                  className={current?.filename === m.filename ? "active": ""}
                  onClick={() => handleFileListItemClick(m)}>
                {m.filename}
                <span className="has">
                  {m.has.A ? "A" : ""}{m.has.B ? "B" : ""}{m.has.C ? "C" : ""}{m.has.D ? "D" : ""}
                </span>
              </li>
            ))}
          </ul>
        </aside>
        <section className={`viewers viewers-${numViewers}`}>
          {keys.map(key => (
            <ImageCanvas 
              key={key}
              ref={canvasRefs[key]}
              label={pinpointImages[key]?.file?.name || key}
              file={pinpointImages[key]?.file}
              indicator={indicator} 
              isReference={key === 'A'} 
              cache={bitmapCache.current}
              appMode="pinpoint"
              refPoint={pinpointImages[key]?.refPoint}
              onSetRefPoint={handleSetRefPoint}
              folderKey={key}
              onClick={() => setActiveCanvasKey(key)} // Set active canvas on click
              isActive={activeCanvasKey === key} // Pass isActive prop
            />
          ))}
        </section>
      </main>
    </>
  );
});