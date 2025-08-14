
import React, { useState, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../store';
import { useFolderPickers, FolderState } from '../hooks/useFolderPickers';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import type { FolderKey, MatchedItem } from '../types';
import { matchFilenames } from '../utils/match';

type DrawableImage = ImageBitmap | HTMLImageElement;

export interface ToggleModeHandle {
  capture: (options: { showLabels: boolean }) => Promise<string | null>;
}

interface ToggleModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  indicator: { cx: number, cy: number, key: number } | null;
  setPrimaryFile: (file: File | null) => void;
}

export const ToggleMode = forwardRef<ToggleModeHandle, ToggleModeProps>(({ numViewers, bitmapCache, indicator, setPrimaryFile }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { current, setCurrent, stripExt, setStripExt } = useStore();
  const [toggleSource, setToggleSource] = useState<FolderKey>('A');
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlias, setEditingAlias] = useState<FolderKey | null>(null);
  const canvasRef = useRef<ImageCanvasHandle>(null);

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

  
  const handleAliasChange = (key: FolderKey, newAlias: string) => {
    updateAlias(key, newAlias);
    setEditingAlias(null);
  };

  const renderFolderControl = (key: FolderKey) => {
    const state = allFolders[key];
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
          <React.Fragment key={key}>
            {renderFolderControl(key)}
          </React.Fragment>
        ))}
        <div style={{ display: 'none' }}>
          {activeKeys.map(key => (
            <input key={key} ref={inputRefs[key]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(key, e)} />
          ))}
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
        <section className="viewers viewers-1">
          <ImageCanvas 
            ref={canvasRef}
            label={(allFolders[toggleSource]?.alias) || toggleSource} 
            file={fileOf(toggleSource, current)}
            appMode="toggle"
            folderKey={toggleSource}
            indicator={indicator} 
            isReference={true} 
            cache={bitmapCache.current}
          />
        </section>
      </main>
    </>
  );
});
