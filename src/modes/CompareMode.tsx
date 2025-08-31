import React, { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { matchFilenames } from '../utils/match';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { FolderControl } from '../components/FolderControl';
import { ToggleModal } from '../components/ToggleModal';
import { DraggableViewer } from '../components/DraggableViewer';
import { ALL_FILTERS } from '../components/FilterControls';
import type { FolderKey, MatchedItem, FilterType } from '../types';
import type { FilterParams } from '../store';
import { generateFilterChainLabel } from '../utils/filterChainLabel';

type DrawableImage = ImageBitmap | HTMLImageElement;

export interface CompareModeHandle {
  capture: (options: { showLabels: boolean; showMinimap: boolean; showFilterLabels?: boolean }) => Promise<string | null>;
}

interface CompareModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
}

// Helper function to check if a file is a valid image
const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/svg+xml', 'image/tiff', 'image/tif'
  ];
  return validTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif)$/i.test(file.name);
};

export const CompareMode = forwardRef<CompareModeHandle, CompareModeProps>(({ numViewers, bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { 
    current, setCurrent, stripExt, setStripExt, openFilterEditor, viewerFilters, viewerFilterParams, clearFolder, viewerRows, viewerCols,
    selectedViewers, setSelectedViewers, toggleModalOpen, openToggleModal, setFolder, addToast, showFilelist, showFilterLabels, 
    reorderViewers, viewerArrangement
  } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Drag and drop states for image import
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverCounter, setDragOverCounter] = useState(0);
  const [draggedFileCount, setDraggedFileCount] = useState(0);

  const canvasRefs = FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  // Use dragOverCounter to prevent linting error
  React.useEffect(() => {
    // Drag counter tracking for proper leave detection
  }, [dragOverCounter]);

  // Helper function to find the first empty folder
  const findEmptyFolder = (): FolderKey | null => {
    for (const key of FOLDER_KEYS) {
      if (!allFolders[key]) return key;
    }
    return null;
  };

  // Helper function to create a temporary folder with images
  const createTemporaryFolder = async (folderKey: FolderKey, imageFiles: File[]): Promise<void> => {
    try {
      const fileMap = new Map<string, File>();
      imageFiles.forEach(file => {
        fileMap.set(file.name, file);
      });

      // Create folder data manually since FolderData is not directly available
      const folderData = { 
        name: `Temporary ${folderKey}`,
        files: fileMap,
        path: '' // temporary folder doesn't have real path
      };
      const folderState = {
        data: folderData,
        alias: `Temp ${folderKey} (${imageFiles.length})`
      };

      setFolder(folderKey, folderState);

      // Show success message
      if (addToast) {
        addToast({
          type: 'success',
          title: 'Images Added',
          message: `Created temporary folder ${folderKey}`,
          details: [
            `Added ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}`,
            `Files: ${imageFiles.map(f => f.name).join(', ')}`
          ],
          duration: 5000
        });
      }
    } catch (error) {
      if (addToast) {
        addToast({
          type: 'error',
          title: 'Failed to Create Temporary Folder',
          message: `Could not create folder ${folderKey}`,
          details: [error instanceof Error ? error.message : 'Unknown error'],
          duration: 5000
        });
      }
    }
  };

  // Drag and drop handlers for image import
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCounter(prev => prev + 1);
    
    // Count image files and show drag over state if we have any
    if (e.dataTransfer.items) {
      let imageFileCount = 0;
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          imageFileCount++;
        }
      }
      if (imageFileCount > 0) {
        setIsDragOver(true);
        setDraggedFileCount(imageFileCount);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCounter(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsDragOver(false);
        setDraggedFileCount(0);
        return 0;
      }
      return newCount;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragOverCounter(0);
    setDraggedFileCount(0);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => isValidImageFile(file));

    if (imageFiles.length === 0) {
      if (addToast) {
        addToast({
          type: 'warning',
          title: 'No Valid Images',
          message: 'No valid image files found in the dropped items',
          details: ['Please drop image files (JPG, PNG, GIF, WebP, BMP, SVG, TIFF)'],
          duration: 5000
        });
      }
      return;
    }

    // Find first empty folder
    const emptyFolder = findEmptyFolder();
    if (!emptyFolder) {
      if (addToast) {
        addToast({
          type: 'error',
          title: 'No Empty Folders',
          message: 'All folders are already in use',
          details: ['Please clear a folder first or use fewer folders'],
          duration: 5000
        });
      }
      return;
    }

    // Create temporary folder with the images
    await createTemporaryFolder(emptyFolder, imageFiles);
  };

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showMinimap, showFilterLabels = true }) => {
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
        handle.drawToContext(tempCtx, false, showMinimap); // No crosshair in compare mode
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
          const key = activeKeys[index];
          const lines: string[] = [];
          const folderLabel = allFolders[key]?.alias || key;
          lines.push(folderLabel);

          if (current?.filename) {
            lines.push(current.filename);
          }

          const filterName = getFilterName(viewerFilters[key], viewerFilterParams[key]);
          if (filterName && showFilterLabels) {
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
      ? (Array.from(folderState.data.files.keys()) as string[]).find((n: string) => n.replace(/\.[^/.]+$/, "") === item.filename)
      : item.filename;
    return name ? folderState.data.files.get(name) : undefined;
  };

  useEffect(() => {
    const primaryKey = viewerArrangement.compare[0]; // First position is primary
    const primaryFile = fileOf(primaryKey, current);
    setPrimaryFile(primaryFile || null);
  }, [current, allFolders, setPrimaryFile, viewerArrangement]);

  const activeFolders = useMemo(() => {
    const activeKeys = viewerArrangement.compare.slice(0, numViewers);
    return activeKeys.reduce((acc: Record<FolderKey, Map<string, File>>, key: FolderKey) => {
      if (allFolders[key]?.data.files) {
        acc[key] = allFolders[key]!.data.files;
      }
      return acc;
    }, {} as Record<FolderKey, Map<string, File>>);
  }, [allFolders, numViewers, viewerArrangement]);

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
  
  const getFilterName = (type: FilterType | undefined, params?: FilterParams) => {
    if (!type || type === 'none') return null;
    if (type === 'filterchain' && params?.filterChain) {
      return generateFilterChainLabel(params.filterChain);
    }
    return ALL_FILTERS.find(f => f.type === type)?.name || 'custom filter';
  };

  // Viewer selection for toggle functionality
  const handleViewerSelect = (key: FolderKey) => {
    const newSelected = selectedViewers.includes(key)
      ? selectedViewers.filter((k: FolderKey) => k !== key)
      : [...selectedViewers, key];
    setSelectedViewers(newSelected);
  };

  const handleToggleMode = () => {
    if (selectedViewers.length === 0 || !current) return;
    openToggleModal();
  };

  // Space key handler for opening toggle modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !toggleModalOpen && selectedViewers.length > 0 && current) {
        e.preventDefault();
        handleToggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleModalOpen, selectedViewers.length, current]);

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': viewerCols,
    '--rows': viewerRows,
  } as React.CSSProperties;

  const { previewLayout } = useStore();
  const showPreview = !!previewLayout;

  return (
    <>
      {showControls && <div className="controls">
        {Array.from({ length: numViewers }).map((_, position) => {
          const key = viewerArrangement.compare[position];
          return (
            <FolderControl
              key={position}
              folderKey={key}
              folderState={allFolders[key]}
              onSelect={pick}
              onClear={clearFolder}
              onUpdateAlias={updateAlias}
            />
          );
        })}
        <div style={{ display: 'none' }}>
          {FOLDER_KEYS.map(key => (
            <input
              key={key}
              ref={inputRefs[key]}
              type="file"
              multiple
              onChange={(e) => onInput(key, e)}
              {...({ webkitdirectory: '' } as any)}
            />
          ))}
        </div>
      </div>}
      <main className={`compare-mode-main ${showFilelist ? '' : 'filelist-hidden'}`}>
        {showFilelist && (
          <aside 
            className={`filelist ${isDragOver ? 'drag-over' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
          {/* Drag and Drop Overlay */}
          {isDragOver && (
            <div className="drag-overlay">
              <div className="drag-overlay-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                <h3>
                  {draggedFileCount > 1 
                    ? `Drop ${draggedFileCount} Images`
                    : 'Drop Image'
                  }
                </h3>
                <p>
                  {(() => {
                    const emptyFolder = findEmptyFolder();
                    return emptyFolder 
                      ? `Create temporary folder ${emptyFolder} with ${draggedFileCount} image${draggedFileCount > 1 ? 's' : ''}`
                      : 'No empty folders available';
                  })()}
                </p>
              </div>
            </div>
          )}

          <div className="filelist-header">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="filelist-options">
              <div className="count">Matched: {filteredMatched.length}</div>
              {/* Toggle moved to header controls-main */}
              <label className="strip-ext-label">
                <input type="checkbox" checked={stripExt} onChange={(e)=>setStripExt(e.target.checked)} />
                <span>Ignore extension</span>
              </label>
            </div>
          </div>
          <ul>
            {filteredMatched.length === 0 && !isDragOver ? (
              <li className="empty-state">
                <div className="empty-state-content">
                  <p>No files to compare</p>
                  <small>Drop images here or select folders to compare</small>
                </div>
              </li>
            ) : (
              filteredMatched.map(m => (
                <li key={m.filename}
                    className={current?.filename === m.filename ? "active": ""}
                    onClick={()=>setCurrent(m)}>
                  {m.filename}
                </li>
              ))
            )}
          </ul>
          </aside>
        )}
        <section className="viewers" style={gridStyle}>
          {showPreview && (
            <div
              className="viewers-preview-overlay"
              aria-hidden
              style={{
                gridTemplateColumns: `repeat(${previewLayout!.cols}, 1fr)`,
                gridTemplateRows: `repeat(${previewLayout!.rows}, 1fr)`
              } as React.CSSProperties}
            >
              {Array.from({ length: (previewLayout!.rows * previewLayout!.cols) }).map((_, i) => (
                <div key={i} className="preview-cell" />
              ))}
            </div>
          )}
          {Array.from({ length: numViewers }).map((_, position) => {
            // Get the FolderKey for this position using the arrangement
            const key = viewerArrangement.compare[position];
            
            const lines: string[] = [];
            const folderLabel = allFolders[key]?.alias || key;
            lines.push(folderLabel);

            if (current?.filename) {
              lines.push(current.filename);
            }

            const filterName = getFilterName(viewerFilters[key], viewerFilterParams[key]);
            if (filterName && showFilterLabels) {
              lines.push(`[${filterName}]`);
            }
            const finalLabel = lines.join('\n');

            return (
              <DraggableViewer 
                key={position} 
                position={position}
                onReorder={reorderViewers}
                className={`viewer-container ${selectedViewers.includes(key) ? 'selected' : ''}`}
              >
                <ImageCanvas
                  ref={canvasRefs[key as FolderKey]}
                  label={finalLabel}
                  file={fileOf(key, current)}
                  isReference={key === 'A'}
                  cache={bitmapCache.current}
                  appMode="compare"
                  folderKey={key}
                />
                <div className="viewer-controls">
                  <button 
                    className={`viewer-select-btn ${selectedViewers.includes(key) ? 'selected' : ''}`}
                    onClick={() => handleViewerSelect(key)}
                    title={`Select viewer ${key} for toggle`}
                  >
                    {selectedViewers.includes(key) ? '✓' : '○'}
                  </button>
                  <button 
                    className="viewer__filter-button" 
                    title={`Filter Settings for ${allFolders[key]?.alias || key}`}
                    onClick={() => openFilterEditor(key)}
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
                  {fileOf(key, current) && (
                    <button
                      className="viewer__download-button"
                      title={`Download image from viewer ${key}`}
                      onClick={() => {
                        const handle = canvasRefs[key as FolderKey].current;
                        const canvas = handle?.getCanvas();
                        const srcFile = fileOf(key, current);
                        if (!canvas || !srcFile) return;
                        const base = srcFile.name.replace(/\.[^/.]+$/, "");
                        const suggested = `${base}.png`;
                        const name = (window.prompt("파일명을 입력하세요", suggested) || suggested).trim();
                        canvas.toBlob((blob) => {
                          if (!blob) return;
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = name.endsWith('.png') ? name : `${name}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }, 'image/png');
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  )}
                </div>
              </DraggableViewer>
            );
          })}
        </section>
      </main>
      
      <ToggleModal bitmapCache={bitmapCache} />
    </>
  );
});
