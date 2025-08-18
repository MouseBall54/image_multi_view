import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import type { FolderKey, MatchedItem } from '../types';
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_STEP } from '../config';
import { FolderControl } from '../components/FolderControl';
import { ALL_FILTERS } from '../components/FilterControls';

type DrawableImage = ImageBitmap | HTMLImageElement;

interface PinpointImage {
  file: File | null;
  refPoint: { x: number, y: number } | null;
  sourceKey?: FolderKey;
}

// A new component for individual scale control
import { PinpointRotationControl } from '../components/PinpointRotationControl';
import { PinpointScaleControl } from '../components/PinpointScaleControl';

export interface PinpointModeHandle {
  capture: (options: { showLabels: boolean, showCrosshair: boolean }) => Promise<string | null>;
}

interface PinpointModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
}

export const PinpointMode = forwardRef<PinpointModeHandle, PinpointModeProps>(({ numViewers, bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { 
    current, setCurrent, setViewport, viewport, 
    pinpointScales, setPinpointScale, pinpointGlobalScale, setPinpointGlobalScale, 
    activeCanvasKey, setActiveCanvasKey, stripExt, setStripExt, clearFolder,
    openFilterEditor, viewerFilters, viewerFilterParams
  } = useStore();
  const [pinpointImages, setPinpointImages] = useState<Partial<Record<FolderKey, PinpointImage>>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  const getFilterName = (type: FilterType | undefined) => {
    if (!type || type === 'none') return null;
    return ALL_FILTERS.find(f => f.type === type)?.name || 'Unknown';
  };

  const canvasRefs = FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showCrosshair }) => {
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
        handle.drawToContext(tempCtx, showCrosshair);
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
          const pinpointImage = pinpointImages[key];
          const sourceFolderAlias = pinpointImage?.sourceKey ? (allFolders[pinpointImage.sourceKey]?.alias || pinpointImage.sourceKey) : (allFolders[key]?.alias || key);
          const filterName = getFilterName(viewerFilters[key]);

          const lines: string[] = [];
          lines.push(sourceFolderAlias);

          if (pinpointImage?.file) {
            lines.push(pinpointImage.file.name);
          }
          
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

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);

  const activeFolders = useMemo(() => {
    return activeKeys.reduce((acc, key) => {
      if (allFolders[key]?.data.files) {
        acc[key] = allFolders[key]!.data.files;
      }
      return acc;
    }, {} as Record<FolderKey, Map<string, File>>);
  }, [activeKeys, allFolders]);

  const fileList = useMemo(() => {
    const filesWithSource: { file: File, source: string, folderKey: FolderKey }[] = [];
    
    const addFilesFromKey = (key: FolderKey) => {
      const folderState = allFolders[key];
      if (folderState?.data.files) {
        const sourceAlias = folderState.alias || key;
        folderState.data.files.forEach(file => {
          filesWithSource.push({ file, source: sourceAlias, folderKey: key });
        });
      }
    };

    if (folderFilter === 'all') {
      activeKeys.forEach(key => {
        addFilesFromKey(key);
      });
    } else {
      addFilesFromKey(folderFilter);
    }

    return filesWithSource.sort((a, b) => {
      if (a.file.name < b.file.name) return -1;
      if (a.file.name > b.file.name) return 1;
      if (a.source < b.source) return -1;
      if (a.source > b.source) return 1;
      return 0;
    });
  }, [folderFilter, allFolders, activeKeys]);

  const filteredFileList = useMemo(() => {
    if (!searchQuery) return fileList;
    return fileList.filter(({ file }) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fileList, searchQuery]);

  const handlePinpointFileSelect = (key: FolderKey, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPinpointImages(prev => ({
        ...prev,
        [key]: { file, refPoint: { x: 0.5, y: 0.5 } }
      }));
      setPinpointScale(key, 1);
      setViewport({ refScreenX: undefined, refScreenY: undefined });
    }
  };
  
  useEffect(() => {
    const primaryFile = pinpointImages['A']?.file;
    setPrimaryFile(primaryFile || null);
  }, [pinpointImages, setPrimaryFile]);

  const handleSetRefPoint = (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => {
    setPinpointImages(prev => {
      const currentImage = prev[key];
      if (!currentImage) return prev;
      return {
        ...prev,
        [key]: { ...currentImage, refPoint: imgPoint }
      };
    });
    setViewport({ refScreenX: screenPoint.x, refScreenY: screenPoint.y });
  };

  const handleFileListItemClick = (file: File, sourceKey: FolderKey) => {
    if (!activeCanvasKey) {
      console.warn("No active viewer. Click a viewer to select it first.");
      return;
    }

    setCurrent(null); 

    const oldPinpointImage = pinpointImages[activeCanvasKey];
    const refPoint = (oldPinpointImage && oldPinpointImage.file?.name === file.name)
      ? oldPinpointImage.refPoint
      : { x: 0.5, y: 0.5 };
    
    setPinpointImages(prev => ({
      ...prev,
      [activeCanvasKey]: { file, refPoint, sourceKey }
    }));
  };

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': Math.ceil(Math.sqrt(numViewers)),
  } as React.CSSProperties;

  return (
    <>
      {showControls && <div className="controls">
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
      </div>}
      <main className="pinpoint-mode-main">
        <aside className="filelist">
          <div className="filelist-header">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="filelist-options">
              <div className="count">Files: {filteredFileList.length}</div>
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                {activeKeys.map(key => (
                  allFolders[key] && <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                ))}
              </select>
            </div>
          </div>
          <ul>
            {filteredFileList.map(({ file, source, folderKey }) => {
              const isFileActive = Object.values(pinpointImages).some(img => 
                img?.file === file && img.sourceKey === folderKey
              );
              
              return (
                <li key={`${folderKey}-${file.webkitRelativePath || file.name}-${file.lastModified}`}
                    className={isFileActive ? "active" : ""}
                    onClick={() => handleFileListItemClick(file, folderKey)}>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-source">from {source}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
        <section 
          className="viewers" 
          style={gridStyle}
          onClick={(e) => {
            // If the click is on the background grid itself, deactivate the canvas
            if (e.target === e.currentTarget) {
              setActiveCanvasKey(null);
            }
          }}
        >
          {activeKeys.map(key => {
            const pinpointImage = pinpointImages[key];
            const sourceFolderAlias = pinpointImage?.sourceKey ? (allFolders[pinpointImage.sourceKey]?.alias || pinpointImage.sourceKey) : (allFolders[key]?.alias || key);
            const filterName = getFilterName(viewerFilters[key]);

            const lines: string[] = [];
            lines.push(sourceFolderAlias);
            
            if (pinpointImage?.file) {
              lines.push(pinpointImage.file.name);
            }

            if (filterName) {
              lines.push(`[${filterName}]`);
            }
            const label = lines.join('\n');

            return (
              <div key={key} className="viewer-container">
                <ImageCanvas 
                  ref={canvasRefs[key]}
                  label={label}
                  file={pinpointImage?.file}
                  isReference={key === 'A'} 
                  cache={bitmapCache.current}
                  appMode="pinpoint"
                  overrideScale={pinpointScales[key]}
                  refPoint={pinpointImage?.refPoint}
                  onSetRefPoint={handleSetRefPoint}
                  folderKey={key}
                  onClick={setActiveCanvasKey}
                  isActive={activeCanvasKey === key}
                  overrideFilterType={viewerFilters[key]}
                  overrideFilterParams={viewerFilterParams[key]}
                />
                <div className="viewer-controls">
                  <button 
                    className="viewer__filter-button" 
                    title={`Filter Settings for ${allFolders[key]?.alias || key}`}
                    onClick={() => openFilterEditor(key)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                  <PinpointRotationControl folderKey={key} />
                </div>
                <PinpointScaleControl folderKey={key} />
              </div>
            );
          })}
        </section>
      </main>
      <div style={{ display: 'none' }}>
        {FOLDER_KEYS.map(key => (
          <input key={key} ref={inputRefs[key]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(key, e)} />
        ))}
      </div>
    </>
  );
});