
import React, { useState, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { FolderControl } from '../components/FolderControl';
import type { FolderKey, MatchedItem } from '../types';
import { matchFilenames } from '../utils/match';

type DrawableImage = ImageBitmap | HTMLImageElement;

export interface ToggleModeHandle {
  capture: (options: { showLabels: boolean }) => Promise<string | null>;
}

interface ToggleModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
}

export const ToggleMode = forwardRef<ToggleModeHandle, ToggleModeProps>(({ numViewers, bitmapCache, setPrimaryFile }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { current, setCurrent, stripExt, setStripExt, clearFolder, viewerFilters, viewerFilterParams } = useStore();
  const [toggleSource, setToggleSource] = useState<FolderKey>('A');
  const [searchQuery, setSearchQuery] = useState("");
  const canvasRef = useRef<ImageCanvasHandle>(null);
  const filteredBitmapCache = useRef(new Map<string, DrawableImage>());

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels }) => {
      const handle = canvasRef.current;
      if (!handle) return null;
      
      const onscreenCanvas = handle.getCanvas();
      if (!onscreenCanvas) return null;
      const { width, height } = onscreenCanvas;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return null;

      handle.drawToContext(ctx, false);

      if (showLabels) {
        const label = allFolders[toggleSource]?.alias || toggleSource;
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, ctx.measureText(label).width + 10, 24);
        ctx.fillStyle = 'white';
        ctx.fillText(label, 10, 22);
      }

      return tempCanvas.toDataURL('image/png');
    }
  }));

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);

  const activeFolders = React.useMemo(() => {
    return activeKeys.reduce((acc, key) => {
      if (allFolders[key]?.data.files) {
        acc[key] = allFolders[key]!.data.files;
      }
      return acc;
    }, {} as Record<FolderKey, Map<string, File>>);
  }, [activeKeys, allFolders]);

  const matched = React.useMemo(
    () => matchFilenames(activeFolders, stripExt),
    [activeFolders, stripExt]
  );

  const filteredMatched = React.useMemo(() => {
    if (!searchQuery) return matched;
    return matched.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matched, searchQuery]);

  const fileOf = (key: FolderKey, item: MatchedItem | null): File | undefined => {
    if (!item) return undefined;
    const folderState = allFolders[key];
    if (!folderState?.data.files) return undefined;
    const name = stripExt
      ? Array.from(folderState.data.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? folderState.data.files.get(name) : undefined;
  };

  useEffect(() => {
    const primaryFile = fileOf(toggleSource, current);
    setPrimaryFile(primaryFile || null);
  }, [current, toggleSource, allFolders, setPrimaryFile]);

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        const availableFolders = activeKeys.filter(key => allFolders[key]);
        if (availableFolders.length === 0) return;

        const currentIndex = availableFolders.indexOf(toggleSource);
        const nextIndex = (currentIndex + 1) % availableFolders.length;
        setToggleSource(availableFolders[nextIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSource, allFolders, activeKeys]);

  return (
    <>
      <div className="controls">
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
        <div style={{ display: 'none' }}>
          {activeKeys.map(key => (
            <input key={key} ref={inputRefs[key]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(key, e)} />
          ))}
        </div>
      </div>
      <main className="toggle-mode-main">
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
        <section className="viewers">
          <ImageCanvas 
            ref={canvasRef}
            label={(allFolders[toggleSource]?.alias) || toggleSource} 
            file={fileOf(toggleSource, current)}
            appMode="toggle"
            folderKey={toggleSource}
            isReference={true} 
            cache={bitmapCache.current}
            filteredCache={filteredBitmapCache.current}
            overrideFilterType={viewerFilters[toggleSource]}
            overrideFilterParams={viewerFilterParams[toggleSource]}
          />
        </section>
      </main>
    </>
  );
});
