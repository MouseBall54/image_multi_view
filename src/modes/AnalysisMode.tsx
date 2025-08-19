import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ToggleModal } from '../components/ToggleModal';
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
  capture: (options: { showLabels: boolean; showMinimap: boolean }) => Promise<string | null>;
}

export const AnalysisMode = forwardRef<AnalysisModeHandle, Props>(({ numViewers, bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const { 
    analysisFile, setAnalysisFile, 
    analysisFileSource,
    analysisFilters, analysisFilterParams, 
    analysisRotation, openFilterEditor,
    viewerRows, viewerCols,
    selectedViewers, setSelectedViewers, toggleModalOpen, openToggleModal, closeToggleModal
  } = useStore();
  const { pick, inputRefs, onInput, allFolders, updateAlias, clearFolder } = useFolderPickers();
  const imageCanvasRefs = useRef<Map<number, ImageCanvasHandle>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showMinimap }) => {
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
        handle.drawToContext(tempCtx, false, showMinimap); // No crosshair in analysis mode
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

  // Viewer selection for toggle functionality
  const handleViewerSelect = (viewerIndex: number) => {
    // For analysis mode, use viewer index as string key
    const key = viewerIndex.toString() as FolderKey;
    const newSelected = selectedViewers.includes(key)
      ? selectedViewers.filter(k => k !== key)
      : [...selectedViewers, key];
    setSelectedViewers(newSelected);
  };

  const handleToggleMode = () => {
    if (selectedViewers.length === 0 || !analysisFile) return;
    openToggleModal();
  };

  // Space key handler for opening toggle modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !toggleModalOpen && selectedViewers.length > 0 && analysisFile) {
        e.preventDefault();
        handleToggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleModalOpen, selectedViewers.length, analysisFile]);

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
              <button 
                className="toggle-btn" 
                onClick={handleToggleMode}
                disabled={selectedViewers.length === 0 || !analysisFile}
                title="Toggle Mode (Space)"
              >
                Toggle ({selectedViewers.length} selected)
              </button>
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                {FOLDER_KEYS.map(key => 
                  allFolders[key] && <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                )}
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
                <div key={i} className="viewer-container">
                  <ImageCanvas
                    ref={el => el ? imageCanvasRefs.current.set(i, el) : imageCanvasRefs.current.delete(i)}
                    file={analysisFile}
                    label={label}
                    cache={bitmapCache.current}
                    appMode="analysis"
                    folderKey={i}
                    isActive={false}
                    overrideFilterType={analysisFilters[i]}
                    overrideFilterParams={analysisFilterParams[i]}
                    rotation={analysisRotation}
                  />
                  <div className="viewer-controls">
                    <button 
                      className={`viewer-select-btn ${selectedViewers.includes(i.toString() as FolderKey) ? 'selected' : ''}`}
                      onClick={() => handleViewerSelect(i)}
                      title={`Select viewer ${i + 1} for toggle`}
                    >
                      {selectedViewers.includes(i.toString() as FolderKey) ? '✓' : '○'}
                    </button>
                    <button 
                      className="viewer__filter-button" 
                      title={`Filter Settings for Viewer ${i + 1}`}
                      onClick={() => openFilterEditor(i)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="21" x2="4" y2="14"></line>
                        <line x1="4" y1="10" x2="4" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="3"></line>
                        <line x1="20" y1="21" x2="20" y2="16"></line>
                        <line x1="20" y1="12" x2="20" y2="3"></line>
                        <line x1="1" y1="14" x2="7" y2="14"></line>
                        <line x1="9" y1="8" x2="15" y2="8"></line>
                        <line x1="17" y1="16" x2="23" y2="16"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
      
      <ToggleModal bitmapCache={bitmapCache} />
    </>
  );
});
