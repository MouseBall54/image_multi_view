
import React, { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../store';
import { useFolderPickers, FolderState } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import type { FolderKey, MatchedItem, FilterType } from '../types';

type DrawableImage = ImageBitmap | HTMLImageElement;

export interface CompareModeHandle {
  capture: (options: { showLabels: boolean }) => Promise<string | null>;
}

interface CompareModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
}

export const CompareMode = forwardRef<CompareModeHandle, CompareModeProps>(({ numViewers, bitmapCache, setPrimaryFile }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { current, setCurrent, stripExt, setStripExt, setViewerFilter } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlias, setEditingAlias] = useState<FolderKey | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, key: FolderKey } | null>(null);

  const canvasRefs = FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels }) => {
      // ... (capture logic remains the same)
    }
  }));

  const handleContextMenu = (event: React.MouseEvent, key: FolderKey) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, key });
  };

  const handleFilterSelect = (key: FolderKey, filter: FilterType) => {
    setViewerFilter(key, filter);
    setContextMenu(null);
  };

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
    const primaryFile = fileOf('A', current);
    setPrimaryFile(primaryFile || null);
  }, [current, allFolders, setPrimaryFile]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  const activeFolders = useMemo(() => {
    return FOLDER_KEYS.slice(0, numViewers).reduce((acc, key) => {
      if (allFolders[key]?.data.files) {
        acc[key] = allFolders[key]!.data.files;
      }
      return acc;
    }, {} as Record<FolderKey, Map<string, File>>);
  }, [allFolders, numViewers]);

  const matched = useMemo(
    () => matchFilenames(activeFolders, stripExt),
    [activeFolders, stripExt]
  );

  const filteredMatched = useMemo(() => {
    if (!searchQuery) return matched;
    return matched.filter(item =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [matched, searchQuery]);
  
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

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': Math.ceil(Math.sqrt(numViewers)),
  } as React.CSSProperties;

  return (
    <>
      <div className="controls">
        {FOLDER_KEYS.slice(0, numViewers).map(key => (
          <React.Fragment key={key}>
            {renderFolderControl(key)}
          </React.Fragment>
        ))}
        <div style={{ display: 'none' }}>
          {FOLDER_KEYS.map(key => (
            <input key={key} ref={inputRefs[key]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(key, e)} />
          ))}
        </div>
      </div>
      <main className="compare-mode-main">
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
        <section className="viewers" style={gridStyle}>
          {FOLDER_KEYS.slice(0, numViewers).map(key => (
            <ImageCanvas 
              key={key}
              ref={canvasRefs[key]} 
              label={allFolders[key]?.alias || key} 
              file={fileOf(key, current)} 
              isReference={key === 'A'} 
              cache={bitmapCache.current} 
              appMode="compare" 
              folderKey={key} 
              onContextMenu={(e) => handleContextMenu(e, key)}
            />
          ))}
        </section>
        {contextMenu && (
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <ul>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'none')}>None</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'grayscale')}>Grayscale</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'invert')}>Invert</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'sepia')}>Sepia</li>
              <hr />
              <li onClick={() => handleFilterSelect(contextMenu.key, 'boxblur')}>Box Blur</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'gaussianblur')}>Gaussian Blur</li>
              <hr />
              <li onClick={() => handleFilterSelect(contextMenu.key, 'sharpen')}>Sharpen</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'laplacian')}>Laplacian</li>
              <hr />
              <li onClick={() => handleFilterSelect(contextMenu.key, 'sobel')}>Sobel</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'prewitt')}>Prewitt</li>
              <li onClick={() => handleFilterSelect(contextMenu.key, 'scharr')}>Scharr</li>
            </ul>
          </div>
        )}
      </main>
    </>
  );
});
