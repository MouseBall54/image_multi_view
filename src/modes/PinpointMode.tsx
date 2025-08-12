import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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

interface PinpointModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  indicator: { cx: number, cy: number, key: number } | null;
  setPrimaryFile: (file: File | null) => void;
}

export const PinpointMode: React.FC<PinpointModeProps> = ({ numViewers, bitmapCache, indicator, setPrimaryFile }) => {
  const { A, B, C, D, pick, inputRefs, onInput, updateAlias } = useFolderPickers();
  const { current, setCurrent, setViewport } = useStore();
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
      const fileToLoad = fileOf(activeCanvasKey, item);
      if (fileToLoad) {
        setPinpointImages(prev => ({
          ...prev,
          [activeCanvasKey]: { file: fileToLoad, refPoint: prev[activeCanvasKey]?.refPoint || null }
        }));
      }
    }
  }, [activeCanvasKey, fileOf, setCurrent]);

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
};