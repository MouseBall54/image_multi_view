import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import type { FolderKey, MatchedItem } from '../types';
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP } from '../config';
import { FolderControl } from '../components/FolderControl';

type DrawableImage = ImageBitmap | HTMLImageElement;

interface PinpointImage {
  file: File | null;
  refPoint: { x: number, y: number } | null;
}

// A new component for individual scale control
import { PinpointRotationControl } from '../components/PinpointRotationControl';
import { PinpointScaleControl } from '../components/PinpointScaleControl';

export interface PinpointModeHandle {
  capture: (options: { showLabels: boolean, showCrosshair: boolean }) => Promise<string | null>;
}

interface PinpointModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
}

export const PinpointMode = forwardRef<PinpointModeHandle, PinpointModeProps>(({ numViewers, bitmapCache, setPrimaryFile }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { 
    current, setCurrent, setViewport, viewport, 
    pinpointScales, setPinpointScale, pinpointGlobalScale, setPinpointGlobalScale, 
    activeCanvasKey, setActiveCanvasKey, stripExt, setStripExt, clearFolder 
  } = useStore();
  const [pinpointImages, setPinpointImages] = useState<Partial<Record<FolderKey, PinpointImage>>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  const canvasRefs = FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showCrosshair }) => {
      const activeKeys = FOLDER_KEYS.slice(0, numViewers);
      const firstCanvas = canvasRefs[activeKeys[0]]?.current?.getCanvas();
      if (!firstCanvas) return null;
      const { width, height } = firstCanvas;

      const tempCanvases = activeKeys.map(key => {
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

      const cols = Math.ceil(Math.sqrt(numViewers));
      const rows = Math.ceil(numViewers / cols);
      const combinedWidth = width * cols;
      const combinedHeight = height * rows;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = combinedWidth;
      finalCanvas.height = combinedHeight;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) return null;

      finalCtx.fillStyle = '#111';
      finalCtx.fillRect(0, 0, combinedWidth, combinedHeight);
      const BORDER_WIDTH = 2;
      finalCtx.fillStyle = '#000';

      tempCanvases.forEach((canvas, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const dx = col * width;
        const dy = row * height;
        finalCtx.drawImage(canvas, dx, dy);

        if (col > 0) finalCtx.fillRect(dx - BORDER_WIDTH / 2, dy, BORDER_WIDTH, height);
        if (row > 0) finalCtx.fillRect(dx, dy - BORDER_WIDTH / 2, width, BORDER_WIDTH);

        if (showLabels) {
          const key = activeKeys[index];
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

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);

  const activeFolders = useMemo(() => {
    return activeKeys.reduce((acc, key) => {
      if (allFolders[key]?.data.files) {
        acc[key] = allFolders[key]!.data.files;
      }
      return acc;
    }, {} as Record<FolderKey, Map<string, File>>);
  }, [activeKeys, allFolders]);

  const matched = useMemo(
    () => matchFilenames(activeFolders, stripExt, "union"), // Use "union" mode for pinpoint
    [activeFolders, stripExt]
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
        [key]: { file, refPoint: { x: 0.5, y: 0.5 } }
      }));
      setPinpointScale(key, 1);
      setViewport({ refScreenX: undefined, refScreenY: undefined });
    }
  };
  
  useEffect(() => {
    const primaryFile = pinpointImages['A']?.file;
    setPrimaryFile(primaryFile || null);
  }, [pinpointImages, setPrimaryFile]);

  const handleSetRefPoint = (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => {
    setPinpointImages(prev => {
      const currentImage = prev[key];
      if (!currentImage) return prev;
      return {
        ...prev,
        [key]: { ...currentImage, refPoint: imgPoint }
      };
    });
    setViewport({ refScreenX: screenPoint.x, refScreenY: screenPoint.y });
  };

  const handleFileListItemClick = (item: MatchedItem) => {
    setCurrent(item);

    const getFileFromItem = (item: MatchedItem, specificFolderKey?: FolderKey): File | null => {
      // If a specific folder is requested, search only that one.
      if (specificFolderKey) {
        const folderState = allFolders[specificFolderKey];
        if (folderState?.data.files && item.has[specificFolderKey]) {
          for (const [name, file] of folderState.data.files.entries()) {
            const baseName = stripExt ? name.replace(/\.[^/.]+$/, "") : name;
            if (baseName === item.filename) {
              return file;
            }
          }
        }
        return null;
      }

      // Otherwise, find the first available file from any folder.
      for (const key of FOLDER_KEYS) {
        if (item.has[key as FolderKey]) {
          const folderState = allFolders[key as FolderKey];
          if (folderState?.data.files) {
            for (const [name, file] of folderState.data.files.entries()) {
              const baseName = stripExt ? name.replace(/\.[^/.]+$/, "") : name;
              if (baseName === item.filename) {
                return file;
              }
            }
          }
        }
      }
      return null;
    };

    // If a specific canvas is active, only change that one.
    if (activeCanvasKey) {
      const file = getFileFromItem(item); // Find file from any folder
      if (file) {
        const oldPinpointImage = pinpointImages[activeCanvasKey];
        const refPoint = (oldPinpointImage && oldPinpointImage.file?.name === file.name)
          ? oldPinpointImage.refPoint
          : { x: 0.5, y: 0.5 };
        
        setPinpointImages(prev => ({
          ...prev,
          [activeCanvasKey]: { file, refPoint }
        }));
      }
      return;
    }

    // Original behavior: update all viewers if none is active
    const newPinpointImages: Partial<Record<FolderKey, PinpointImage>> = {};
    for (const key of activeKeys) {
      const file = getFileFromItem(item, key); // Find file for this specific folder key
      if (file) {
        const oldPinpointImage = pinpointImages[key];
        const refPoint = (oldPinpointImage && oldPinpointImage.file?.name === file.name)
          ? oldPinpointImage.refPoint
          : { x: 0.5, y: 0.5 };
        newPinpointImages[key] = { file, refPoint };
      } else {
        newPinpointImages[key] = { file: null, refPoint: null };
      }
    }
    setPinpointImages(newPinpointImages);
  };

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': Math.ceil(Math.sqrt(numViewers)),
  } as React.CSSProperties;

  return (
    <>
      <div className="controls pinpoint-controls-header">
        <div className="folder-controls-wrapper">
          {activeKeys.map(key => (
            <FolderControl
              key={key}
              folderKey={key}
              folderState={allFolders[key]}
              onSelect={pick}
              onClear={clearFolder}
              onUpdateAlias={updateAlias}
            />
          ))}
        </div>
        <div className="global-controls-wrapper">
          <div className="global-scale-control">
            <label>Global Scale:</label>
            <span>{(pinpointGlobalScale * 100).toFixed(0)}%</span>
            <button onClick={() => setPinpointGlobalScale(1)}>Reset</button>
          </div>
        </div>
      </div>
      <main className="pinpoint-mode-main">
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
                {activeKeys.map(key => (
                  <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                ))}
              </select>
              <label className="strip-ext-label">
                <input type="checkbox" checked={stripExt} onChange={e => setStripExt(e.target.checked)} />
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
                  {activeKeys.map(key => m.has[key] ? key : "").join("")}
                </span>
              </li>
            ))}
          </ul>
        </aside>
        <section 
          className="viewers" 
          style={gridStyle}
          onClick={(e) => {
            // If the click is on the background grid itself, deactivate the canvas
            if (e.target === e.currentTarget) {
              setActiveCanvasKey(null);
            }
          }}
        >
          {activeKeys.map(key => (
            <div key={key} className="viewer-container">
              <ImageCanvas 
                ref={canvasRefs[key]}
                label={pinpointImages[key]?.file?.name || allFolders[key]?.alias || key}
                file={pinpointImages[key]?.file}
                isReference={key === 'A'} 
                cache={bitmapCache.current}
                appMode="pinpoint"
                overrideScale={pinpointScales[key]}
                refPoint={pinpointImages[key]?.refPoint}
                onSetRefPoint={handleSetRefPoint}
                folderKey={key}
                onClick={setActiveCanvasKey}
                isActive={activeCanvasKey === key}
              />
              <div className="viewer-controls">
                <PinpointRotationControl folderKey={key} />
              </div>
              <PinpointScaleControl folderKey={key} />
            </div>
          ))}
        </section>
      </main>
      <div style={{ display: 'none' }}>
        {FOLDER_KEYS.map(key => (
          <input key={key} ref={inputRefs[key]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(key, e)} />
        ))}
      </div>
    </>
  );
});