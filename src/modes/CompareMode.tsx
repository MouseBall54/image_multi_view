import React, { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { FolderControl } from '../components/FolderControl';
import { ALL_FILTERS } from '../components/FilterControls';
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
  const { current, setCurrent, stripExt, setStripExt, openFilterEditor, viewerFilters, clearFolder } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const canvasRefs = FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels }) => {
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
        handle.drawToContext(tempCtx, false); // No crosshair in compare mode
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
          const lines: string[] = [];
          const folderLabel = allFolders[key]?.alias || key;
          lines.push(folderLabel);

          if (current?.filename) {
            lines.push(current.filename);
          }

          const filterName = getFilterName(viewerFilters[key]);
          if (filterName) {
            lines.push(`[${filterName}]`);
          }
          
          finalCtx.font = '16px sans-serif';
          const lineHeight = 20;
          const textMetrics = lines.map(line => finalCtx.measureText(line));
          const maxWidth = Math.max(...textMetrics.map(m => m.width));

          finalCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          finalCtx.fillRect(dx + 5, dy + 5, maxWidth + 10, lines.length * lineHeight);
          
          finalCtx.fillStyle = 'white';
          lines.forEach((line, i) => {
            finalCtx.fillText(line, dx + 10, dy + 22 + (i * (lineHeight - 4)));
          });
        }
      });

      return finalCanvas.toDataURL('image/png');
    }
  }));

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
  
  const getFilterName = (type: FilterType | undefined) => {
    if (!type || type === 'none') return null;
    return ALL_FILTERS.find(f => f.type === type)?.name || 'Unknown';
  };

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': Math.ceil(Math.sqrt(numViewers)),
  } as React.CSSProperties;

  return (
    <>
      <div className="controls">
        {FOLDER_KEYS.slice(0, numViewers).map(key => (
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
          {FOLDER_KEYS.slice(0, numViewers).map(key => {
            const lines: string[] = [];
            const folderLabel = allFolders[key]?.alias || key;
            lines.push(folderLabel);

            if (current?.filename) {
              lines.push(current.filename);
            }

            const filterName = getFilterName(viewerFilters[key]);
            if (filterName) {
              lines.push(`[${filterName}]`);
            }
            const finalLabel = lines.join('\n');

            return (
              <div key={key} className="viewer-container">
                <ImageCanvas
                  ref={canvasRefs[key]}
                  label={finalLabel}
                  file={fileOf(key, current)}
                  isReference={key === 'A'}
                  cache={bitmapCache.current}
                  appMode="compare"
                  folderKey={key}
                />
                <div className="viewer-controls">
                  <button 
                    className="viewer__filter-button" 
                    title={`Filter Settings for ${allFolders[key]?.alias || key}`}
                    onClick={() => openFilterEditor(key)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
});