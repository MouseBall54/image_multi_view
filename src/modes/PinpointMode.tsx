import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ToggleModal } from '../components/ToggleModal';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import type { FolderKey, FilterType } from '../types';
import { MAX_ZOOM, MIN_ZOOM } from '../config';
import { FolderControl } from '../components/FolderControl';
import { ALL_FILTERS } from '../components/FilterControls';

// Helper function to check if a file is a valid image
const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/svg+xml', 'image/tiff', 'image/tif'
  ];
  return validTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif)$/i.test(file.name);
};

type DrawableImage = ImageBitmap | HTMLImageElement;

interface PinpointImage {
  file: File | null;
  refPoint: { x: number, y: number } | null;
  sourceKey?: FolderKey;
}

// A new component for individual scale control
import { PinpointRotationControl } from '../components/PinpointRotationControl';
import { PinpointScaleControl } from '../components/PinpointScaleControl';
import { generateFilterChainLabel } from '../utils/filterChainLabel';

export interface PinpointModeHandle {
  capture: (options: { showLabels: boolean, showCrosshair: boolean, showMinimap: boolean, showFilterLabels?: boolean }) => Promise<string | null>;
}

interface PinpointModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
}

export const PinpointMode = forwardRef<PinpointModeHandle, PinpointModeProps>(({ numViewers, bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { 
    setCurrent, setViewport,
    pinpointScales, setPinpointScale,
    activeCanvasKey, setActiveCanvasKey, clearFolder,
    openFilterEditor, viewerFilters, viewerFilterParams, viewerRows, viewerCols,
    openPreviewModal,
    selectedViewers, setSelectedViewers, toggleModalOpen, openToggleModal, setFolder, addToast, showFilelist, showFilterLabels,
    selectedFiles, toggleFileSelection, clearFileSelection, selectAllFiles
  } = useStore();
  const [pinpointImages, setPinpointImages] = useState<Partial<Record<FolderKey, PinpointImage>>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');
  
  // Drag and drop states for image import
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverCounter, setDragOverCounter] = useState(0);
  const [draggedFileCount, setDraggedFileCount] = useState(0);
  
  // Drag and drop states for file list to viewer
  const [draggedFile, setDraggedFile] = useState<{ file: File; sourceKey: FolderKey } | null>(null);
  const [dragOverViewer, setDragOverViewer] = useState<FolderKey | null>(null);

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
      ? selectedViewers.filter(k => k !== key)
      : [...selectedViewers, key];
    setSelectedViewers(newSelected);
  };

  const handleToggleMode = () => {
    if (selectedViewers.length === 0) return;
    // Check if any selected viewer has an image
    const hasImages = selectedViewers.some(key => pinpointImages[key]?.file);
    if (!hasImages) return;
    openToggleModal();
  };

  // Space key handler for opening toggle modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !toggleModalOpen && selectedViewers.length > 0) {
        e.preventDefault();
        handleToggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleModalOpen, selectedViewers.length, pinpointImages]);

  const canvasRefs = FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showCrosshair, showMinimap, showFilterLabels = true }) => {
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
        handle.drawToContext(tempCtx, showCrosshair, showMinimap);
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
          const pinpointImage = pinpointImages[key];
          const sourceFolderAlias = pinpointImage?.sourceKey ? (allFolders[pinpointImage.sourceKey]?.alias || pinpointImage.sourceKey) : (allFolders[key]?.alias || key);
          const filterName = getFilterName(viewerFilters[key], viewerFilterParams[key]);

          const lines: string[] = [];
          lines.push(sourceFolderAlias);

          if (pinpointImage?.file) {
            lines.push(pinpointImage.file.name);
          }
          
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

  const activeKeys = useMemo(() => FOLDER_KEYS.slice(0, numViewers), [numViewers]);


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

  // Helper function to find all viewers where a file is displayed
  const getFileViewerKeys = (file: File, sourceKey: FolderKey): FolderKey[] => {
    const viewerKeys: FolderKey[] = [];
    for (const [viewerKey, pinpointImage] of Object.entries(pinpointImages)) {
      if (pinpointImage?.file === file && pinpointImage.sourceKey === sourceKey) {
        viewerKeys.push(viewerKey as FolderKey);
      }
    }
    // Sort alphabetically to show in order (A, B, C, D, etc.)
    return viewerKeys.sort();
  };

  // Helper function to focus on a specific viewer
  const focusViewer = (viewerKey: FolderKey) => {
    setActiveCanvasKey(viewerKey);
    const viewerElement = document.querySelector(`[data-viewer-key="${viewerKey}"]`);
    if (viewerElement) {
      viewerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // ✅ NEW: Function to unload image from viewer
  const handleUnloadImage = (key: FolderKey) => {
    setPinpointImages(prev => {
      const newImages = { ...prev };
      delete newImages[key];
      return newImages;
    });
    // Also clear any related pinpoint data for this viewer
    setPinpoint(key, { x: 0, y: 0 });
    setPinpointScale(key, viewport.scale);
    // Clear selection if this viewer was selected
    if (selectedViewers.includes(key)) {
      const newSelected = selectedViewers.filter(v => v !== key);
      setSelectedViewers(newSelected);
    }
  };

  const loadFileToViewer = (file: File, sourceKey: FolderKey, targetKey: FolderKey) => {
    // Update global 'current' so previews resolve the selected file across modes
    try {
      const filename = file.name;
      const base = filename.replace(/\.[^/.]+$/, '');
      const has: any = {};
      for (const k of Object.keys(allFolders)) {
        const folderState = allFolders[k as FolderKey];
        const files: Map<string, File> | undefined = folderState?.data?.files;
        let present = false;
        if (files) {
          present = files.has(filename);
          if (!present) {
            for (const name of files.keys()) {
              const nb = name.replace(/\.[^/.]+$/, '');
              if (nb === base) { present = true; break; }
            }
          }
        }
        has[k] = present;
      }
      setCurrent({ filename, has });
    } catch (e) {
      // Fallback: clear current if any issue occurs
      setCurrent(null);
    }

    const oldPinpointImage = pinpointImages[targetKey];
    const refPoint = (oldPinpointImage && oldPinpointImage.file?.name === file.name)
      ? oldPinpointImage.refPoint
      : { x: 0.5, y: 0.5 };
    
    setPinpointImages(prev => ({
      ...prev,
      [targetKey]: { file, refPoint, sourceKey }
    }));
  };

  const handleFileListItemClick = (file: File, sourceKey: FolderKey) => {
    if (!activeCanvasKey) {
      console.warn("No active viewer. Click a viewer to select it first.");
      return;
    }

    loadFileToViewer(file, sourceKey, activeCanvasKey);
  };

  // Auto-place selected files into available viewers
  const handleAutoPlaceFiles = () => {
    if (selectedFiles.size === 0) return;

    const availableViewers = activeKeys.slice(); // Copy the array
    let viewerIndex = 0;

    // Convert selected files to actual file objects
    const filesToPlace: { file: File; sourceKey: FolderKey }[] = [];
    
    selectedFiles.forEach(fileId => {
      const [folderKey, fileName] = fileId.split('-', 2);
      const folderState = allFolders[folderKey as FolderKey];
      if (folderState?.data.files) {
        const file = folderState.data.files.get(fileName);
        if (file) {
          filesToPlace.push({ file, sourceKey: folderKey as FolderKey });
        }
      }
    });

    // Place files in viewers sequentially
    filesToPlace.forEach(({ file, sourceKey }) => {
      if (viewerIndex < availableViewers.length) {
        const targetViewer = availableViewers[viewerIndex];
        loadFileToViewer(file, sourceKey, targetViewer);
        viewerIndex++;
      }
    });

    // Show success message
    if (addToast && filesToPlace.length > 0) {
      const placedCount = Math.min(filesToPlace.length, availableViewers.length);
      addToast({
        type: 'success',
        title: 'Files Auto-Placed',
        message: `Placed ${placedCount} file${placedCount > 1 ? 's' : ''} into viewers`,
        details: filesToPlace.slice(0, availableViewers.length).map(({ file }) => file.name),
        duration: 3000
      });
    }

    // Clear selection after placement
    clearFileSelection();
  };

  // Handle drag start from file list
  const handleFileDragStart = (e: React.DragEvent, file: File, sourceKey: FolderKey) => {
    setDraggedFile({ file, sourceKey });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `${sourceKey}-${file.name}`);
  };

  // Handle drag over viewer
  const handleViewerDragOver = (e: React.DragEvent, viewerKey: FolderKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverViewer(viewerKey);
  };

  // Handle drag leave viewer
  const handleViewerDragLeave = () => {
    setDragOverViewer(null);
  };

  // Handle drop on viewer
  const handleViewerDrop = (e: React.DragEvent, viewerKey: FolderKey) => {
    e.preventDefault();
    setDragOverViewer(null);
    
    if (draggedFile) {
      loadFileToViewer(draggedFile.file, draggedFile.sourceKey, viewerKey);
      setDraggedFile(null);
      
      if (addToast) {
        addToast({
          type: 'success',
          title: 'File Loaded',
          message: `Loaded ${draggedFile.file.name} into viewer ${viewerKey}`,
          duration: 2000
        });
      }
    }
  };

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': viewerCols,
    '--rows': viewerRows,
  } as React.CSSProperties;

  // Ensure active canvas key remains valid when layout changes
  useEffect(() => {
    if (activeCanvasKey && !activeKeys.includes(activeCanvasKey)) {
      setActiveCanvasKey(null);
    }
  }, [activeKeys, activeCanvasKey, setActiveCanvasKey]);

  // ✅ FIX: Initialize local scales for all active viewers to prevent fallback to changing viewport.scale
  useEffect(() => {
    const currentPinpointScales = useStore.getState().pinpointScales;
    const currentViewport = useStore.getState().viewport;
    
    activeKeys.forEach(key => {
      if (currentPinpointScales[key] == null) {
        // Use current viewport scale as initial value only once
        setPinpointScale(key, currentViewport.scale);
      }
    });
  }, [activeKeys, setPinpointScale]); // Only depend on activeKeys and setPinpointScale function

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
      <main className={`pinpoint-mode-main ${showFilelist ? '' : 'filelist-hidden'}`}>
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
              {selectedFiles.size > 0 ? (
                <span className="selected-count">{selectedFiles.size} selected</span>
              ) : (
                <div className="count">Files: {filteredFileList.length}</div>
              )}
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                {activeKeys.map(key => (
                  allFolders[key] && <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                ))}
              </select>
            </div>
            {filteredFileList.length > 0 && (
              <div className="file-controls">
                <button 
                  className="select-all-btn"
                  onClick={selectAllFiles}
                  disabled={selectedFiles.size === filteredFileList.length}
                >
                  Select All
                </button>
                <button 
                  className="clear-selection-btn"
                  onClick={clearFileSelection}
                  disabled={selectedFiles.size === 0}
                >
                  Clear
                </button>
                {selectedFiles.size > 0 && (
                  <button 
                    className="auto-place-btn"
                    onClick={handleAutoPlaceFiles}
                    title="Auto-place selected files into viewers"
                  >
                    📍 Auto Place
                  </button>
                )}
              </div>
            )}
          </div>
          <ul>
            {filteredFileList.length === 0 && !isDragOver ? (
              <li className="empty-state">
                <div className="empty-state-content">
                  <p>No files to align</p>
                  <small>Drop images here or select folders to align</small>
                </div>
              </li>
            ) : (
              filteredFileList.map(({ file, source, folderKey }) => {
                const fileId = `${folderKey}-${file.name}`;
                const isFileActive = Object.values(pinpointImages).some(img => 
                  img?.file === file && img.sourceKey === folderKey
                );
                const isSelected = selectedFiles.has(fileId);
                const displayedInViewers = getFileViewerKeys(file, folderKey);
                
                return (
                  <li key={`${folderKey}-${file.webkitRelativePath || file.name}-${file.lastModified}`}
                      className={`${isFileActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                      draggable
                      onDragStart={(e) => handleFileDragStart(e, file, folderKey)}
                      onDragEnd={() => setDraggedFile(null)}>
                    <div 
                      className="file-item-content"
                      onClick={() => toggleFileSelection(fileId)}
                    >
                      <div
                        className={`file-checkbox ${isSelected ? 'checked' : ''}`}
                      />
                      <div 
                        className="file-name"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileListItemClick(file, folderKey);
                        }}
                        title="Click to load into active viewer"
                      >
                        <div className="file-main-name">{file.name}</div>
                        <div className="file-source-container">
                          <div className="file-source">{source}</div>
                          {displayedInViewers.length > 0 && (
                            <div className="viewer-indicators">
                              {displayedInViewers.map((viewerKey, index) => (
                                <div 
                                  key={viewerKey}
                                  className="viewer-indicator"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    focusViewer(viewerKey);
                                  }}
                                  title={`Displayed in viewer ${viewerKey}. Click to focus viewer.`}
                                >
                                  {viewerKey}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          </aside>
        )}
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
            const filterName = getFilterName(viewerFilters[key], viewerFilterParams[key]);

            const lines: string[] = [];
            lines.push(sourceFolderAlias);
            
            if (pinpointImage?.file) {
              lines.push(pinpointImage.file.name);
            }

            if (filterName && showFilterLabels) {
              lines.push(`[${filterName}]`);
            }
            const label = lines.join('\n');

            return (
              <div 
                key={key} 
                className={`viewer-container ${selectedViewers.includes(key) ? 'selected' : ''} ${dragOverViewer === key ? 'drag-over' : ''}`}
                data-viewer-key={key}
                onDragOver={(e) => handleViewerDragOver(e, key)}
                onDragLeave={handleViewerDragLeave}
                onDrop={(e) => handleViewerDrop(e, key)}
              >
                <ImageCanvas 
                  ref={canvasRefs[key]}
                  label={label}
                  file={pinpointImage?.file || undefined}
                  isReference={key === 'A'} 
                  cache={bitmapCache.current}
                  appMode="pinpoint"
                  overrideScale={pinpointScales[key]}
                  refPoint={pinpointImage?.refPoint}
                  onSetRefPoint={handleSetRefPoint}
                  folderKey={key}
                  onClick={(key) => setActiveCanvasKey(key)}
                  isActive={activeCanvasKey === key}
                  overrideFilterType={viewerFilters[key]}
                  overrideFilterParams={viewerFilterParams[key]}
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
                    onClick={() => {
                      // Ensure active canvas key reflects the clicked viewer for preview resolution
                      setActiveCanvasKey(key);
                      openFilterEditor(key);
                      // Open preview immediately with the exact file for this viewer
                      const src = pinpointImages[key]?.file || null;
                      if (src) {
                        const type = viewerFilters[key] || 'none';
                        const params = viewerFilterParams[key] || {};
                        openPreviewModal({
                          mode: 'single',
                          filterType: type,
                          filterParams: params as any,
                          title: `Filter Preview`,
                          sourceFile: src,
                          position: 'sidebar',
                          realTimeUpdate: true,
                          editMode: true,
                          stickySource: true,
                        });
                      }
                    }}
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
                  <PinpointRotationControl folderKey={key} />
                  {pinpointImages[key] && (
                    <button 
                      className="viewer__unload-button" 
                      title={`Unload image from viewer ${key}`}
                      onClick={() => handleUnloadImage(key)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>
                <PinpointScaleControl folderKey={key} />
              </div>
            );
          })}
        </section>
      </main>
      <div style={{ display: 'none' }}>
        {FOLDER_KEYS.map(key => (
          <input key={key} ref={inputRefs[key]} type="file" {...{ webkitdirectory: "" } as any} multiple onChange={(e) => onInput(key, e)} />
        ))}
      </div>
      
      <ToggleModal bitmapCache={bitmapCache} pinpointImages={pinpointImages} />
    </>
  );
});
