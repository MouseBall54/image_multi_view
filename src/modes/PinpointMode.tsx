import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { ToggleModal } from '../components/ToggleModal';
import { DraggableViewer } from '../components/DraggableViewer';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import type { FolderKey, FilterType } from '../types';
import type { FilterParams } from '../store';
// removed unused MAX_ZOOM/MIN_ZOOM
import { FolderControl } from '../components/FolderControl';
import { ALL_FILTERS } from '../components/FilterControls';
import { createFileComparator } from '../utils/naturalSort';
import { PinpointViewerControls } from '../components/PinpointViewerControls';
import { handleFolderDrop, isValidImageFile } from '../utils/dragDrop';
import { ALL_FOLDER_KEYS, applyFolderIntake, findFirstEmptyFolderKey } from '../utils/folderIntake';

type DrawableImage = ImageBitmap | HTMLImageElement;

// A new component for individual scale control
import { PinpointScaleControl } from '../components/PinpointScaleControl';
import { generateFilterChainLabel } from '../utils/filterChainLabel';

export interface PinpointModeHandle {
  capture: (options: { showLabels: boolean, showCrosshair: boolean, showMinimap: boolean, showFilterLabels?: boolean, showGrid?: boolean }) => Promise<string | null>;
}

interface PinpointModeProps {
  numViewers: number;
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
  setIsInternalDragActive: (active: boolean) => void;
}

export const PinpointMode = forwardRef<PinpointModeHandle, PinpointModeProps>(({ numViewers, bitmapCache, setPrimaryFile, showControls, setIsInternalDragActive }, ref) => {
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { 
    setCurrent, setViewport, viewport,
    pinpointScales, setPinpointScale,
    pinpointImages, setPinpointImage, setPinpointImageRefPoint, clearPinpointImage,
    clearFolder,
    openFilterEditor, viewerFilters, viewerFilterParams, viewerRows, viewerCols,
    openPreviewModal,
    selectedViewers, setSelectedViewers, toggleModalOpen, openToggleModal, setFolder, addToast, showFilelist, showFilterLabels,
    selectedFiles, toggleFileSelection, clearFileSelection, selectAllFiles, setActiveCanvasKey, setPinpoint,
    getViewerContentAtPosition, reorderViewers, viewerOrder,
    syncCapture, confirmSyncFromTarget, refreshFolder, folderActivities
  } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  const getViewerKeyAtPosition = (position: number): FolderKey => {
    return getViewerContentAtPosition(position, "pinpoint") as FolderKey;
  };
  
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
    return findFirstEmptyFolderKey(allFolders);
  };

  const handleRescan = async (key: FolderKey) => {
    const result = await refreshFolder(key, { showActivity: true });
    if (!addToast) return;
    if (result?.issue) {
      addToast({
        type: 'warning',
        title: 'Folder Sync Warning',
        message: result.issue.message,
        details: result.issue.details,
        duration: 3000
      });
      return;
    }
    if (!result) {
      addToast({ type: 'info', title: 'Folder Sync', message: '변경 없음', duration: 2000 });
      return;
    }
    const summary: string[] = [];
    if (result.added) summary.push(`+${result.added}`);
    if (result.updated) summary.push(`~${result.updated}`);
    if (result.removed) summary.push(`-${result.removed}`);
    addToast({
      type: 'success',
      title: 'Folder Sync',
      message: summary.length ? summary.join(' ') : '변경 없음',
      duration: 2000
    });
  };

  // Place folder as a new folder in the controls
  const placeFolderAsNewFolder = async (candidate: Parameters<typeof applyFolderIntake>[0]["candidate"]): Promise<void> => {
    applyFolderIntake({
      candidate,
      getFolders: () => useStore.getState().folders,
      setFolder,
      addToast,
      showSuccessToast: true
    });
  };

  // Place images into TEMP; on filename conflict spill to TEMP_2, TEMP_3, ...
  const placeImagesIntoTempFolders = async (imageFiles: File[]): Promise<void> => {
    try {
      if (imageFiles.length === 0) return;

      // Local alias->key map and reservation to avoid relying on async state updates
      const aliasToKey = new Map<string, FolderKey>();
      const reservedKeys = new Set<FolderKey>();
      for (const k of ALL_FOLDER_KEYS) {
        const f = allFolders[k];
        if (f?.alias) { aliasToKey.set(f.alias, k); reservedKeys.add(k); }
      }
      const getAliasForIndex = (i: number) => (i <= 1 ? 'TEMP' : `TEMP_${i}`);
      const getOrReserve = (alias: string): FolderKey | null => {
        const exist = aliasToKey.get(alias);
        if (exist) return exist;
        let candidate: FolderKey | null = null;
        for (const key of ALL_FOLDER_KEYS) {
          if (!allFolders[key] && !reservedKeys.has(key)) { candidate = key; break; }
        }
        if (!candidate) return null;
        aliasToKey.set(alias, candidate);
        reservedKeys.add(candidate);
        return candidate;
      };

      // Ensure TEMP exists/reserved
      if (!getOrReserve('TEMP')) {
        addToast?.({ type: 'error', title: 'No Empty Folders', message: 'All folders are in use', duration: 5000 });
        return;
      }

      // Prepare buckets
      const buckets = new Map<FolderKey, File[]>();
      const getFilesMap = (key: FolderKey) => allFolders[key]?.data.files ?? new Map<string, File>();

      for (const file of imageFiles) {
        let idx = 1;
        while (true) {
          const key = getOrReserve(getAliasForIndex(idx));
          if (!key) break;
          const existing = getFilesMap(key);
          const pending = buckets.get(key) ?? [];
          const conflict = existing.has(file.name) || pending.some(f => f.name === file.name);
          if (!conflict) {
            pending.push(file);
            buckets.set(key, pending);
            break;
          }
          idx++;
        }
      }

      // Persist buckets
      for (const [key, files] of buckets.entries()) {
        const current = allFolders[key];
        const alias = current?.alias || [...aliasToKey.entries()].find(([,v]) => v === key)?.[0] || (key as string);
        const name = current?.data.name || alias;
        const merged = new Map<string, File>(current?.data.files ?? []);
        for (const f of files) merged.set(f.name, f);
        setFolder(key, { data: { name, files: merged, meta: new Map(), source: current?.data.source ?? { kind: 'files' } }, alias });
      }

      // Toast summary
      const total = imageFiles.length;
      addToast?.({
        type: 'success',
        title: 'Images Added',
        message: `${total} image${total>1?'s':''} placed into TEMP folders`,
        details: Array.from(buckets.entries()).map(([key, files]) => `${allFolders[key]?.alias || key}: ${files.length}`),
        duration: 5000
      });
    } catch (error) {
      addToast?.({ type: 'error', title: 'Failed to Load Images', message: 'Could not process dropped images', details: [error instanceof Error ? error.message : 'Unknown error'], duration: 5000 });
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

    // Use common folder drop handler
    await handleFolderDrop(
      e,
      placeFolderAsNewFolder,
      placeImagesIntoTempFolders,
      addToast
    );
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
      ? selectedViewers.filter((k: FolderKey) => k !== key)
      : [...selectedViewers, key];
    setSelectedViewers(newSelected);
  };

  const handleToggleMode = () => {
    if (selectedViewers.length === 0) return;
    // Check if any selected viewer has an image
    const hasImages = selectedViewers.some((key: FolderKey) => pinpointImages[key as FolderKey]?.file);
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

  const canvasRefs = ALL_FOLDER_KEYS.reduce((acc, key) => {
    acc[key] = useRef<ImageCanvasHandle>(null);
    return acc;
  }, {} as Record<FolderKey, React.RefObject<ImageCanvasHandle>>);

  useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showCrosshair, showMinimap, showFilterLabels = true, showGrid = true }) => {
      const firstKey = getViewerKeyAtPosition(0);
      const firstCanvas = canvasRefs[firstKey as FolderKey]?.current?.getCanvas();
      if (!firstCanvas) return null;
      const { width, height } = firstCanvas;

    const tempCanvases = Array.from({ length: numViewers }).map((_, position) => {
        const key = getViewerKeyAtPosition(position);
        const handle = canvasRefs[key as FolderKey].current;
        if (!handle) return null;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;
        handle.drawToContext(tempCtx, showCrosshair, showMinimap, showGrid);
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
          const key = getViewerKeyAtPosition(index);
          const pinpointImage = pinpointImages[key as FolderKey];
          const sourceFolderAlias = pinpointImage?.sourceKey ? (allFolders[pinpointImage.sourceKey]?.alias || pinpointImage.sourceKey) : (allFolders[key]?.alias || key);
          const filterName = getFilterName(viewerFilters[key as FolderKey], viewerFilterParams[key as FolderKey]);

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
      Array.from({ length: numViewers }).forEach((_, position) => {
        const key = getViewerKeyAtPosition(position);
        addFilesFromKey(key);
      });
    } else {
      addFilesFromKey(folderFilter);
    }

    return filesWithSource.sort(createFileComparator((item: { file: File, source: string, folderKey: FolderKey }) => item.file.name));
  }, [folderFilter, allFolders, numViewers, viewerOrder]);

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
    const primaryFile = pinpointImages['A' as FolderKey]?.file;
    setPrimaryFile(primaryFile || null);
  }, [pinpointImages, setPrimaryFile]);

  const handleSetRefPoint = (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => {
    setPinpointImageRefPoint(key, imgPoint);
    setViewport({ refScreenX: screenPoint.x, refScreenY: screenPoint.y });
  };

  // ✅ NEW: Function to unload image from viewer
  const handleUnloadImage = (key: FolderKey) => {
    clearPinpointImage(key);
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

    const oldPinpointImage = pinpointImages[targetKey as FolderKey];
    const refPoint = (oldPinpointImage && oldPinpointImage.file?.name === file.name)
      ? oldPinpointImage.refPoint
      : { x: 0.5, y: 0.5 };
    
    setPinpointImage(targetKey, { file, refPoint, sourceKey });
  };


  // Auto-place selected files into available viewers
  const handleAutoPlaceFiles = () => {
    if (selectedFiles.size === 0) return;

    const availableViewers = Array.from({ length: numViewers }).map((_, position) => getViewerKeyAtPosition(position));
    let viewerIndex = 0;

    // Convert selected files to actual file objects, respecting the current file list order
    const filesToPlace: { file: File; sourceKey: FolderKey }[] = [];
    const seenIds = new Set<string>();

    filteredFileList.forEach(({ file, folderKey }) => {
      const fileId = `${folderKey}-${file.name}`;
      if (selectedFiles.has(fileId) && !seenIds.has(fileId)) {
        filesToPlace.push({ file, sourceKey: folderKey as FolderKey });
        seenIds.add(fileId);
      }
    });

    // Fallback: include any remaining selections that might be outside the filtered list (e.g., filtered out)
    if (filesToPlace.length < selectedFiles.size) {
      selectedFiles.forEach((fileId: string) => {
        if (seenIds.has(fileId)) return;
        const [folderKey, fileName] = fileId.split('-', 2);
        const folderState = allFolders[folderKey as FolderKey];
        if (folderState?.data.files) {
          const file = folderState.data.files.get(fileName);
          if (file) {
            filesToPlace.push({ file, sourceKey: folderKey as FolderKey });
            seenIds.add(fileId);
          }
        }
      });
    }

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
    console.log('🎯 Internal drag started:', file.name);
    setDraggedFile({ file, sourceKey });
    setIsInternalDragActive(true); // Set flag to prevent global overlay
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `${sourceKey}-${file.name}`);
    e.dataTransfer.setData('application/x-compareX-internal', 'true'); // Mark as internal drag
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
    e.stopPropagation(); // 중요: 이벤트 전파 차단으로 글로벌 드롭 방지
    setDragOverViewer(null);

    // Case 1: Drag from in-app file list (최우선 처리)
    if (draggedFile) {
      loadFileToViewer(draggedFile.file, draggedFile.sourceKey, viewerKey);
      setDraggedFile(null);
      setIsInternalDragActive(false); // Reset flag when drop succeeds

      if (addToast) {
        addToast({
          type: 'success',
          title: 'File Loaded',
          message: `Loaded ${draggedFile.file.name} into viewer ${viewerKey}`,
          duration: 2000
        });
      }
      return; // 처리 완료, 글로벌 핸들러 실행 방지
    }

    // Case 2: External drag (from OS) directly onto a viewer
    const dtFiles = Array.from(e.dataTransfer?.files || []);

    // 폴더나 다중 파일 드롭은 글로벌 핸들러로 위임하지 않고 여기서 처리
    const imageFiles = dtFiles.filter(f => isValidImageFile(f));
    if (imageFiles.length > 0) {
      // 단일 이미지 파일: 뷰어에 직접 로드
      if (imageFiles.length === 1) {
        const file = imageFiles[0];
        const existing = allFolders[viewerKey];
        const merged = new Map<string, File>(existing?.data.files ?? []);
        merged.set(file.name, file);

        const alias = existing?.alias || `Temp ${viewerKey}`;
        const name = existing?.data.name || alias;
        setFolder(viewerKey, { data: { name, files: merged, meta: new Map(), source: existing?.data.source ?? { kind: 'files' } }, alias });

        // Show the dropped image on this viewer
        loadFileToViewer(file, viewerKey, viewerKey);

        addToast?.({
          type: 'success',
          title: 'Image Loaded',
          message: `Loaded ${file.name} into viewer ${viewerKey}`,
          duration: 2000,
        });
      } else {
        // 다중 이미지 파일: 폴더에 추가하고 첫 번째 이미지만 뷰어에 표시
        const existing = allFolders[viewerKey];
        const merged = new Map<string, File>(existing?.data.files ?? []);
        imageFiles.forEach(f => merged.set(f.name, f));

        const alias = existing?.alias || `Temp ${viewerKey}`;
        const name = existing?.data.name || alias;
        setFolder(viewerKey, { data: { name, files: merged, meta: new Map(), source: existing?.data.source ?? { kind: 'files' } }, alias });

        // Show the first dropped image on this viewer
        const first = imageFiles[0];
        loadFileToViewer(first, viewerKey, viewerKey);

        addToast?.({
          type: 'success',
          title: 'Images Added',
          message: `Added ${imageFiles.length} images to ${alias}, showing ${first.name} in viewer ${viewerKey}`,
          details: imageFiles.map(f => f.name),
          duration: 3000,
        });
      }
      return; // 처리 완료
    }

    // Case 3: 잘못된 파일 형식이나 빈 드롭
    if (dtFiles.length > 0) {
      addToast?.({
        type: 'warning',
        title: 'Invalid Files',
        message: 'Please drop image files only',
        details: ['Supported formats: JPG, PNG, GIF, WebP, BMP, SVG, TIFF'],
        duration: 3000
      });
    }
  };

  const gridStyle = {
    '--viewers': numViewers,
    '--cols': viewerCols,
    '--rows': viewerRows,
  } as React.CSSProperties;


  // ✅ FIX: Initialize local scales for all active viewers to prevent fallback to changing viewport.scale
  useEffect(() => {
    const currentPinpointScales = useStore.getState().pinpointScales;
    const currentViewport = useStore.getState().viewport;
    
    Array.from({ length: numViewers }).forEach((_, position) => {
      const key = getViewerKeyAtPosition(position);
      if (currentPinpointScales[key] == null) {
        // Use current viewport scale as initial value only once
        setPinpointScale(key, currentViewport.scale);
      }
    });
  }, [numViewers, viewerOrder, setPinpointScale]);

  return (
    <>
      {showControls && <div className="controls">
        {Array.from({ length: numViewers }).map((_, position) => {
          const key = getViewerKeyAtPosition(position);
          return (
            <FolderControl
              key={position}
              folderKey={key}
              folderState={allFolders[key]}
              activity={folderActivities[key]}
              showActivity={folderActivities[key] === 'rescan'}
              onSelect={pick}
              onClear={clearFolder}
              onUpdateAlias={updateAlias}
              onRescan={handleRescan}
            />
          );
        })}
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
                  {Array.from({ length: numViewers }).map((_, position) => {
                    const key = getViewerKeyAtPosition(position);
                  return allFolders[key] && <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                })}
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
                      onDragEnd={() => {
                        console.log('🏁 Internal drag ended');
                        setDraggedFile(null);
                        setIsInternalDragActive(false); // Reset flag when drag ends
                      }}>
                    <div 
                      className="file-item-content"
                      onClick={() => toggleFileSelection(fileId)}
                    >
                      <div
                        className={`file-checkbox ${isSelected ? 'checked' : ''}`}
                      />
                      <div className="file-name">
                        <div className="file-main-name">{file.name}</div>
                        <div className="file-source-container">
                          <div className="file-source">{source}</div>
                          {displayedInViewers.length > 0 && (
                            <div className="viewer-indicators">
                              {displayedInViewers.map((viewerKey) => (
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
          {Array.from({ length: numViewers }).map((_, position) => {
            // Get the FolderKey for this position using the arrangement
            const key = getViewerKeyAtPosition(position);
            const pinpointImage = pinpointImages[key as FolderKey];
            const sourceFolderAlias = pinpointImage?.sourceKey ? (allFolders[pinpointImage.sourceKey]?.alias || pinpointImage.sourceKey) : (allFolders[key]?.alias || key);
            const filterName = getFilterName(viewerFilters[key as FolderKey], viewerFilterParams[key as FolderKey]);

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
              <DraggableViewer 
                key={position} 
                position={position}
                onReorder={reorderViewers}
              className={`viewer-container ${selectedViewers.includes(key) ? 'selected' : ''} ${dragOverViewer === key ? 'drag-over' : ''}`}
              >
                <div 
                  data-viewer-key={key}
                  onDragOver={(e) => handleViewerDragOver(e, key)}
                  onDragLeave={handleViewerDragLeave}
                  onDrop={(e) => handleViewerDrop(e, key)}
                >
                {syncCapture.active && syncCapture.mode === 'pinpoint' && (
                  <div
                    className="sync-select-overlay"
                    title="Click to sync filters from this viewer"
                    onClick={() => { 
                      confirmSyncFromTarget(key);
                      addToast?.({ type: 'success', title: 'Synced', message: `Filters copied from ${allFolders[key]?.alias || key} to all viewers`, duration: 2500 });
                    }}
                  >
                    <div className="sync-select-hint">Click to sync from {allFolders[key]?.alias || key}</div>
                  </div>
                )}
                <ImageCanvas 
                  ref={canvasRefs[key as FolderKey]}
                  label={label}
                  file={pinpointImage?.file || undefined}
                  isReference={key === 'A'} 
                  cache={bitmapCache.current}
                  appMode="pinpoint"
                  overrideScale={pinpointScales[key as FolderKey]}
                  refPoint={pinpointImage?.refPoint}
                  onSetRefPoint={handleSetRefPoint}
                  folderKey={key}
                  overrideFilterType={viewerFilters[key as FolderKey]}
                  overrideFilterParams={viewerFilterParams[key as FolderKey]}
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
                      // Note: activeCanvasKey removed - no longer needed for pinpoint mode
                      openFilterEditor(key);
                      // Open preview immediately with the exact file for this viewer
                      const src = pinpointImages[key as FolderKey]?.file || null;
                      if (src) {
                        const type = viewerFilters[key as FolderKey] || 'none';
                        const params = viewerFilterParams[key as FolderKey] || {};
                        openPreviewModal({
                          mode: 'single',
                          filterType: type,
                          filterParams: params as any,
                          title: `Filter Preview`,
                          sourceFile: src,
                          position: 'sidebar',
                          realTimeUpdate: true,
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
                  {pinpointImages[key as FolderKey]?.file && (
                    <button
                      className="viewer__download-button"
                      title={`Download image from viewer ${key}`}
                      onClick={async () => {
                        const handle = canvasRefs[key as FolderKey].current;
                        const canvas = handle?.getCanvas();
                        const srcFile = pinpointImages[key as FolderKey]?.file || null;
                        if (!canvas || !srcFile) return;
                        const name = srcFile.name;
                        canvas.toBlob((blob) => {
                          if (!blob) return;
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = name;
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
                  {pinpointImages[key as FolderKey] && (
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
                <PinpointScaleControl 
                  folderKey={key}
                    onResetRefPoint={(k) => {
                      setPinpointImageRefPoint(k, { x: 0.5, y: 0.5 });
                    }}
                />
                <PinpointViewerControls folderKey={key} />
                </div>
              </DraggableViewer>
            );
          })}
        </section>
      </main>
      <div style={{ display: 'none' }}>
        {ALL_FOLDER_KEYS.map(key => (
          <input key={key} ref={inputRefs[key]} type="file" {...{ webkitdirectory: "" } as any} multiple onChange={(e) => onInput(key, e)} />
        ))}
      </div>
      
      <ToggleModal bitmapCache={bitmapCache} pinpointImages={pinpointImages} />
    </>
  );
});
