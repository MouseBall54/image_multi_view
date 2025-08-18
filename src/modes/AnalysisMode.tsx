import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ALL_FILTERS } from '../components/FilterControls';
import { AnalysisRotationControl } from '../components/AnalysisRotationControl';
import { FolderControl } from '../components/FolderControl';
import type { DrawableImage, FolderKey, MatchedItem, FilterType } from '../types';

type Props = {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
};

export interface AnalysisModeHandle {
  capture: (options: { showLabels: boolean }) => Promise<string | null>;
}

export const AnalysisMode = forwardRef<AnalysisModeHandle, Props>(({ numViewers, bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { 
    analysisFile, setAnalysisFile, 
    analysisFileSource,
    analysisFilters, analysisFilterParams, 
    analysisRotation, openFilterEditor,
    viewerRows, viewerCols
  } = useStore();
  const { pick, inputRefs, onInput, allFolders, updateAlias, clearFolder } = useFolderPickers();
  const imageCanvasRefs = useRef<Map<number, ImageCanvasHandle>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);

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

      const cols = viewerCols;
      const rows = viewerRows;
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
          const lines: string[] = [];
          if (analysisFileSource) {
            lines.push(analysisFileSource);
          }
          if (analysisFile) {
            lines.push(analysisFile.name);
          }
          const filterName = getFilterName(analysisFilters[index]);
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

  const fileList = useMemo(() => {
    const filesWithSource: { file: File, source: string }[] = [];
    
    const addFilesFromKey = (key: FolderKey) => {
      const folderState = allFolders[key];
      if (folderState?.data.files) {
        const sourceAlias = folderState.alias || key;
        folderState.data.files.forEach(file => {
          filesWithSource.push({ file, source: sourceAlias });
        });
      }
    };

    if (folderFilter === 'all') {
      FOLDER_KEYS.forEach(key => {
        if (allFolders[key]) addFilesFromKey(key);
      });
    } else {
      addFilesFromKey(folderFilter);
    }

    return filesWithSource.sort((a, b) => a.file.name.localeCompare(b.file.name));
  }, [folderFilter, allFolders]);

  const filteredFileList = useMemo(() => {
    if (!searchQuery) return fileList;
    return fileList.filter(({ file }) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fileList, searchQuery]);

  useEffect(() => {
    setPrimaryFile(analysisFile);
  }, [analysisFile, setPrimaryFile]);

  const handleFileSelect = (file: File, source: string) => {
    setAnalysisFile(file, source);
  };
  
  const getFilterName = (type: FilterType | undefined) => {
    if (!type || type === 'none') return null;
    return ALL_FILTERS.find(f => f.type === type)?.name || 'Unknown Filter';
  };

  const gridStyle = {
    '--cols': viewerCols,
    '--rows': viewerRows,
  } as React.CSSProperties;

  return (
    <>
      {showControls && <div className="controls">
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
      </div>}
      <main className="compare-mode-main">
        <aside className="filelist">
          <div className="filelist-header">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={Object.keys(allFolders).length === 0}
            />
            <div className="filelist-options">
              <div className="count">Files: {filteredFileList.length}</div>
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                {FOLDER_KEYS.map(key => (
                  allFolders[key] && <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                ))}
              </select>
            </div>
          </div>
          <ul>
            {filteredFileList.map(({ file, source }) => (
              <li key={`${source}-${file.name}`}
                  className={analysisFile?.name === file.name ? "active": ""}
                  onClick={()=> handleFileSelect(file, source)}>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-source">from {source}</span>
                </div>
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
            Array.from({ length: numViewers }).map((_, i) => {
              const filterName = getFilterName(analysisFilters[i]);
              const lines: string[] = [];
              if (analysisFileSource) {
                lines.push(analysisFileSource);
              }
              if (analysisFile) {
                lines.push(analysisFile.name);
              }
              if (filterName) {
                lines.push(`[${filterName}]`);
              }
              const label = lines.join('\n');

              return (
                <ImageCanvas
                  key={i}
                  ref={el => el ? imageCanvasRefs.current.set(i, el) : imageCanvasRefs.current.delete(i)}
                  file={analysisFile}
                  label={label}
                  cache={bitmapCache.current}
                  appMode="analysis"
                  folderKey={i}
                  onClick={() => openFilterEditor(i)}
                  isActive={false}
                  overrideFilterType={analysisFilters[i]}
                  overrideFilterParams={analysisFilterParams[i]}
                  rotation={analysisRotation}
                />
              );
            })
          )}
        </section>
      </main>
    </>
  );
});
