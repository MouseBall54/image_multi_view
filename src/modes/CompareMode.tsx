
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useFolderPickers, FolderState } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import type { FolderKey, MatchedItem } from '../types';

type DrawableImage = ImageBitmap | HTMLImageElement;

interface CompareModeProps {
  numViewers: number;
  stripExt: boolean;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  indicator: { cx: number, cy: number, key: number } | null;
  setStripExt: (value: boolean) => void;
  setPrimaryFile: (file: File | null) => void;
}

export const CompareMode: React.FC<CompareModeProps> = ({ numViewers, stripExt, bitmapCache, indicator, setStripExt, setPrimaryFile }) => {
  const { A, B, C, D, pick, inputRefs, onInput, updateAlias } = useFolderPickers();
  const { current, setCurrent } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlias, setEditingAlias] = useState<FolderKey | null>(null);

  const canvasRefs = {
    A: useRef<ImageCanvasHandle>(null),
    B: useRef<ImageCanvasHandle>(null),
    C: useRef<ImageCanvasHandle>(null),
    D: useRef<ImageCanvasHandle>(null),
  };

  const fileOf = (key: FolderKey, item: MatchedItem | null): File | undefined => {
    if (!item) return undefined;
    const folderState = (key === "A" ? A : key === "B" ? B : key === "C" ? C : D);
    if (!folderState?.data.files) return undefined;
    const name = stripExt
      ? Array.from(folderState.data.files.keys()).find(n => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? folderState.data.files.get(name) : undefined;
  };

  useEffect(() => {
    const primaryFile = fileOf('A', current);
    setPrimaryFile(primaryFile || null);
  }, [current, A, setPrimaryFile]);


  const activeFolders = useMemo(() => {
    const folders: any = { A: A?.data.files, B: B?.data.files };
    if (numViewers >= 3) folders.C = C?.data.files;
    if (numViewers >= 4) folders.D = D?.data.files;
    return folders;
  }, [A, B, C, D, numViewers]);

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
        <section className={`viewers viewers-${numViewers}`}>
            <ImageCanvas ref={canvasRefs.A} label={A?.alias || 'A'} file={fileOf("A", current)} indicator={indicator} isReference={true} cache={bitmapCache.current} appMode="compare" folderKey="A" />
            <ImageCanvas ref={canvasRefs.B} label={B?.alias || 'B'} file={fileOf("B", current)} indicator={indicator} cache={bitmapCache.current} appMode="compare" folderKey="B" />
            {numViewers >= 3 && <ImageCanvas ref={canvasRefs.C} label={C?.alias || 'C'} file={fileOf("C", current)} indicator={indicator} cache={bitmapCache.current} appMode="compare" folderKey="C" />}
            {numViewers >= 4 && <ImageCanvas ref={canvasRefs.D} label={D?.alias || 'D'} file={fileOf("D", current)} indicator={indicator} cache={bitmapCache.current} appMode="compare" folderKey="D" />}
        </section>
      </main>
    </>
  );
};
