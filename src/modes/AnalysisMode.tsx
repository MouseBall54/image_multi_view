import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ALL_FILTERS } from '../components/FilterControls';
import type { DrawableImage, FolderKey, MatchedItem } from '../types';

type Props = {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
};

export interface AnalysisModeHandle {
  capture: (options: { showLabels: boolean }) => Promise<string | null>;
}

export const AnalysisMode = forwardRef<AnalysisModeHandle, Props>(({ numViewers, bitmapCache, setPrimaryFile }, ref) => {
  const { analysisFile, setAnalysisFile, analysisFilters, analysisFilterParams, openFilterEditor, stripExt, setStripExt } = useStore();
  const { pick, inputRefs, onInput, allFolders } = useFolderPickers();
  const imageCanvasRefs = useRef<Map<number, ImageCanvasHandle>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  const FOLDER_KEY: FolderKey = "A"; // Use a single key for folder picking

  useImperativeHandle(ref, () => ({
    capture: async (options) => {
      console.log('Capture requested for AnalysisMode', options);
      return null;
    },
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
              />
            ))
          )}
        </section>
      </main>
    </>
  );
});
