import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ALL_FILTERS } from '../components/FilterControls';
import { AnalysisRotationControl } from '../components/AnalysisRotationControl';
import type { DrawableImage, FolderKey, MatchedItem, FilterType } from '../types';

type Props = {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
};

export interface AnalysisModeHandle {
  capture: (options: { showLabels: boolean }) => Promise<string | null>;
}

export const AnalysisMode = forwardRef<AnalysisModeHandle, Props>(({ numViewers, bitmapCache, setPrimaryFile }, ref) => {
  const { 
    analysisFile, 
    setAnalysisFile, 
    analysisFilters, 
    analysisFilterParams, 
    analysisRotation,
    openFilterEditor 
  } = useStore();
  const { pick, inputRefs, onInput, allFolders } = useFolderPickers();
  const imageCanvasRefs = useRef<Map<number, ImageCanvasHandle>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  const FOLDER_KEY: FolderKey = "A"; // Use a single key for folder picking

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels }) => {
      const firstCanvasHandle = imageCanvasRefs.current.get(0);
      if (!firstCanvasHandle) return null;
      const firstCanvas = firstCanvasHandle.getCanvas();
      if (!firstCanvas) return null;
      const { width, height } = firstCanvas;

      const tempCanvases = Array.from({ length: numViewers }).map((_, i) => {
        const handle = imageCanvasRefs.current.get(i);
        if (!handle) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;
        handle.drawToContext(tempCtx, false); // No crosshair in analysis mode
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
          const label = getFilterName(analysisFilters[index]);
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

  const folder = allFolders[FOLDER_KEY];

  const fileList = useMemo(() => {
    if (!folder) return [];
    // In analysis mode, we just want a flat list of all files.
    return Array.from(folder.data.files.values());
  }, [folder]);

  const filteredFileList = useMemo(() => {
    if (!searchQuery) return fileList;
    return fileList.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fileList, searchQuery]);

  useEffect(() => {
    setPrimaryFile(analysisFile);
  }, [analysisFile, setPrimaryFile]);

  const handleFileSelect = (file: File) => {
    setAnalysisFile(file);
  };
  
  const getFilterName = (type: FilterType | undefined) => {
    if (!type || type === 'none') return 'Original';
    return ALL_FILTERS.find(f => f.type === type)?.name || 'Unknown Filter';
  };

  const gridStyle = {
    '--cols': Math.ceil(Math.sqrt(numViewers)),
  } as React.CSSProperties;

  return (
    <>
      <div className="controls">
        <button className="folder-picker-initial" onClick={() => pick(FOLDER_KEY)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span>{folder ? `Source: ${folder.alias}` : 'Select Image Folder'}</span>
        </button>
        <div style={{ display: 'none' }}>
          <input ref={inputRefs[FOLDER_KEY]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(FOLDER_KEY, e)} />
        </div>
        {analysisFile && <AnalysisRotationControl />}
      </div>
      <main className="compare-mode-main">
        <aside className="filelist">
          <div className="filelist-header">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={!folder}
            />
            <div className="filelist-options">
              <div className="count">Files: {filteredFileList.length}</div>
            </div>
          </div>
          <ul>
            {filteredFileList.map(file => (
              <li key={file.name}
                  className={analysisFile?.name === file.name ? "active": ""}
                  onClick={()=> handleFileSelect(file)}>
                {file.name}
              </li>
            ))}
          </ul>
        </aside>
        <section className="viewers" style={gridStyle}>
          {!analysisFile ? (
             <div className="analysis-mode-placeholder--inline">
                <p>Select a folder and then choose an image from the list to begin.</p>
             </div>
          ) : (
            Array.from({ length: numViewers }).map((_, i) => (
              <ImageCanvas
                key={i}
                ref={el => el ? imageCanvasRefs.current.set(i, el) : imageCanvasRefs.current.delete(i)}
                file={analysisFile}
                label={getFilterName(analysisFilters[i])}
                cache={bitmapCache.current}
                appMode="analysis"
                folderKey={i}
                onClick={() => openFilterEditor(i)}
                isActive={false}
                overrideFilterType={analysisFilters[i]}
                overrideFilterParams={analysisFilterParams[i]}
                rotation={analysisRotation}
              />
            ))
          )}
        </section>
      </main>
    </>
  );
});
