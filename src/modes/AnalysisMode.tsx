import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ToggleModal } from '../components/ToggleModal';
import { DraggableViewer } from '../components/DraggableViewer';
import { generateFilterChainLabel } from '../utils/filterChainLabel';
import { ALL_FILTERS } from '../components/FilterControls';
import { FolderControl } from '../components/FolderControl';
import type { DrawableImage, FolderKey, FilterType } from '../types';
import { createFileComparator } from '../utils/naturalSort';

// Helper function to check if a file is a valid image
const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/svg+xml', 'image/tiff', 'image/tif'
  ];
  return validTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif)$/i.test(file.name);
};

type Props = {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
};

export interface AnalysisModeHandle {
  capture: (options: { showLabels: boolean; showMinimap: boolean; showFilterLabels?: boolean }) => Promise<string | null>;
}

export const AnalysisMode = forwardRef<AnalysisModeHandle, Props>(({ numViewers, bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const { 
    analysisFile, setAnalysisFile, 
    analysisFileSource,
    analysisFilters, analysisFilterParams, 
    analysisRotation, openFilterEditor,
    viewerRows, viewerCols,
    selectedViewers, setSelectedViewers, toggleModalOpen, openToggleModal, setFolder, addToast, clearFolder, showFilelist, showFilterLabels,
    previewLayout, reorderViewers,
  } = useStore();
  const { pick, inputRefs, onInput, allFolders, updateAlias } = useFolderPickers();
  const imageCanvasRefs = useRef<Map<number, ImageCanvasHandle>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');
  
  // Drag and drop states for image import
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverCounter, setDragOverCounter] = useState(0);
  const [draggedFileCount, setDraggedFileCount] = useState(0);

  // Use dragOverCounter to prevent linting error
  React.useEffect(() => {
    // Drag counter tracking for proper leave detection
  }, [dragOverCounter]);

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);

  // Helper function to find the first empty folder for temporary storage
  const findEmptyFolder = (): FolderKey | null => {
    for (const key of FOLDER_KEYS) {
      if (!allFolders[key]) return key;
    }
    return null;
  };

  // Helper function to create a temporary folder and set the first image for analysis
  const createTemporaryFolderAndSetImage = async (imageFiles: File[]): Promise<void> => {
    try {
      const emptyFolder = findEmptyFolder();
      if (!emptyFolder) {
        // If no empty folder, directly set the first image
        if (imageFiles.length > 0) {
          setAnalysisFile(imageFiles[0], 'Dropped Image');
          if (addToast) {
            addToast({
              type: 'success',
              title: 'Image Loaded',
              message: `Loaded "${imageFiles[0].name}" for analysis`,
              details: imageFiles.length > 1 
                ? [`Note: Only the first image was loaded. ${imageFiles.length - 1} other image${imageFiles.length > 2 ? 's were' : ' was'} ignored.`]
                : [],
              duration: 5000
            });
          }
        }
        return;
      }

      // Create temporary folder with all images
      const fileMap = new Map<string, File>();
      imageFiles.forEach(file => {
        fileMap.set(file.name, file);
      });

      const folderData = { 
        name: `Temporary ${emptyFolder}`,
        files: fileMap,
        path: '' // temporary folder doesn't have real path
      };
      const folderState = {
        data: folderData,
        alias: `Temp ${emptyFolder} (${imageFiles.length})`
      };

      setFolder(emptyFolder, folderState);

      // Set the first image for analysis
      setAnalysisFile(imageFiles[0], folderState.alias);

      // Show success message
      if (addToast) {
        addToast({
          type: 'success',
          title: 'Images Added',
          message: `Created temporary folder ${emptyFolder} and loaded "${imageFiles[0].name}" for analysis`,
          details: [
            `Added ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} to folder`,
            imageFiles.length > 1 ? 'You can select other images from the file list' : ''
          ].filter(Boolean),
          duration: 6000
        });
      }
    } catch (error) {
      if (addToast) {
        addToast({
          type: 'error',
          title: 'Failed to Load Images',
          message: 'Could not process the dropped images',
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

    // Create temporary folder and set first image for analysis
    await createTemporaryFolderAndSetImage(imageFiles);
  };

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showMinimap, showFilterLabels = true }) => {
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
          const filterName = getFilterName(analysisFilters[index], analysisFilterParams[index]);
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

    return filesWithSource.sort(createFileComparator((item: { file: File, source: string, folderKey: FolderKey }) => item.file.name));
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
  
  const getFilterName = (type: FilterType | undefined, params?: FilterParams) => {
    if (!type || type === 'none') return null;
    if (type === 'filterchain' && params?.filterChain) {
      return generateFilterChainLabel(params.filterChain);
    }
    return ALL_FILTERS.find(f => f.type === type)?.name || 'custom filter';
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
                    if (draggedFileCount === 1) {
                      return 'Load image for analysis';
                    } else if (emptyFolder) {
                      return `Create folder ${emptyFolder} and load first image for analysis`;
                    } else {
                      return 'Load first image for analysis (others ignored)';
                    }
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
              disabled={Object.keys(allFolders).length === 0}
            />
            <div className="filelist-options">
              <div className="count">Files: {filteredFileList.length}</div>
              {/* Toggle moved to header controls-main */}
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                {FOLDER_KEYS.map(key => 
                  allFolders[key] && <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                )}
              </select>
            </div>
          </div>
          <ul>
            {filteredFileList.length === 0 && !isDragOver ? (
              <li className="empty-state">
                <div className="empty-state-content">
                  <p>No files to analyze</p>
                  <small>Drop an image here or select a folder to analyze</small>
                </div>
              </li>
            ) : (
              filteredFileList.map(({ file, source }) => (
                <li key={`${source}-${file.name}`}
                    className={analysisFile?.name === file.name ? "active": ""}
                    onClick={()=> handleFileSelect(file, source)}>
                  {file.name}
                </li>
              ))
            )}
          </ul>
          </aside>
        )}
        <section className="viewers" style={gridStyle}>
          {previewLayout && (
            <div
              className="viewers-preview-overlay"
              aria-hidden
              style={{
                gridTemplateColumns: `repeat(${previewLayout.cols}, 1fr)`,
                gridTemplateRows: `repeat(${previewLayout.rows}, 1fr)`
              } as React.CSSProperties}
            >
              {Array.from({ length: (previewLayout.rows * previewLayout.cols) }).map((_, i) => (
                <div key={i} className="preview-cell" />
              ))}
            </div>
          )}
          {!analysisFile ? (
             <div className="analysis-mode-placeholder--inline">
                <p>Select a folder and then choose an image from the list to begin.</p>
             </div>
          ) : (
            Array.from({ length: numViewers }).map((_, i) => {
              const filterName = getFilterName(analysisFilters[i], analysisFilterParams[i]);
              const lines: string[] = [];
              if (analysisFileSource) {
                lines.push(analysisFileSource);
              }
              if (analysisFile) {
                lines.push(analysisFile.name);
              }
              if (filterName && showFilterLabels) {
                lines.push(`[${filterName}]`);
              }
              const label = lines.join('\n');

              const isSelected = selectedViewers.includes(i.toString() as FolderKey);
              const folderKey = FOLDER_KEYS[i]; // Convert index to FolderKey
              return (
                <DraggableViewer 
                  key={i} 
                  folderKey={folderKey} 
                  onReorder={reorderViewers}
                  className={`viewer-container ${isSelected ? 'selected' : ''}`}
                >
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
                </DraggableViewer>
              );
            })
          )}
        </section>
      </main>
      
      <ToggleModal bitmapCache={bitmapCache} />
    </>
  );
});
