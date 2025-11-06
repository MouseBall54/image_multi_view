import React, { useState, useEffect, useRef, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useStore } from "./store";
import type { AppMode } from "./types";
import { CompareMode, CompareModeHandle } from './modes/CompareMode';
import { PinpointMode, PinpointModeHandle } from './modes/PinpointMode';
import { AnalysisMode, AnalysisModeHandle } from "./modes/AnalysisMode";
import { ImageInfoPanel } from "./components/ImageInfoPanel";
import { FilterCart } from "./components/FilterCart";
import { FilterPreviewModal } from "./components/FilterPreviewModal";
import ToastContainer from "./components/ToastContainer";
import { AnalysisRotationControl } from "./components/AnalysisRotationControl";
import { CompareRotationControl } from "./components/CompareRotationControl";
import ElectronUpdateManager from "./components/ElectronUpdateManager";
import { PinpointGlobalRotationControl } from "./components/PinpointGlobalRotationControl";
import { PinpointGlobalScaleControl } from "./components/PinpointGlobalScaleControl";
import { ViewToggleControls } from "./components/ViewToggleControls";
import { LayoutGridSelector } from "./components/LayoutGridSelector";
import { MAX_ZOOM, MIN_ZOOM, UTIF_OPTIONS } from "./config";
import { tutorialItems } from "./config/tutorials";
import { decodeTiffWithUTIF } from "./utils/utif";
// Custom menu bar removed; actions moved to title bar
import { initializeOpenCV } from "./utils/opencv";
import { handleFolderDrop } from "./utils/dragDrop";
import type { FolderKey } from "./types";

type DrawableImage = ImageBitmap | HTMLImageElement;

function ViewportControls({ imageDimensions }: {
  imageDimensions: { width: number, height: number } | null,
}) {
  const { viewport, setViewport, triggerIndicator, appMode, rectZoomGlobalActive, setRectZoomGlobalActive } = useStore();
  const [scaleInput, setScaleInput] = useState((viewport.scale * 100).toFixed(0));
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");

  useEffect(() => {
    setScaleInput((viewport.scale * 100).toFixed(0));
    if (imageDimensions && viewport.cx != null && viewport.cy != null) {
      setXInput(Math.round((viewport.cx || 0) * imageDimensions.width).toString());
      setYInput(Math.round((viewport.cy || 0) * imageDimensions.height).toString());
    } else {
      setXInput("");
      setYInput("");
    }
  }, [viewport, imageDimensions]);

  const applyChanges = () => {
    const newScale = parseFloat(scaleInput) / 100;
    const newCx = imageDimensions ? parseFloat(xInput) / imageDimensions.width : NaN;
    const newCy = imageDimensions ? parseFloat(yInput) / imageDimensions.height : NaN;

    const newViewport: { scale?: number, cx?: number, cy?: number } = {};
    if (!isNaN(newScale)) newViewport.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    if (!isNaN(newCx)) newViewport.cx = newCx;
    if (!isNaN(newCy)) newViewport.cy = newCy;
    
    setViewport(newViewport);

    // Trigger indicator animation if coordinates changed
    if (!isNaN(newCx) && !isNaN(newCy)) {
      triggerIndicator(newCx, newCy);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyChanges();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="viewport-controls">
      {(appMode === 'compare' || appMode === 'analysis') && (
        <button
          className={`rect-zoom-btn${rectZoomGlobalActive ? ' active' : ''}`}
          title="Rect Zoom (click two points)"
          onClick={() => setRectZoomGlobalActive(!rectZoomGlobalActive)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="1" ry="1"/>
          </svg>
        </button>
      )}
      <label><span>Scale:</span><input type="text" value={scaleInput} onChange={(e) => setScaleInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/><span>%</span></label>
      <label><span>X:</span><input type="text" value={xInput} disabled={!imageDimensions} onChange={(e) => setXInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/></label>
      <label><span>Y:</span><input type="text" value={yInput} disabled={!imageDimensions} onChange={(e) => setYInput(e.target.value)} onBlur={applyChanges} onKeyDown={handleKeyDown}/></label>
    </div>
  );
}

export default function App() {
  const { appMode, setAppMode, pinpointMouseMode, setPinpointMouseMode, setViewport, fitScaleFn, current, clearPinpointScales, setPinpointGlobalScale, numViewers, viewerRows, viewerCols, setViewerLayout, showMinimap, setShowMinimap, showGrid, setShowGrid, gridColor, setGridColor, showFilterLabels, setShowFilterLabels, selectedViewers, openToggleModal, analysisFile, minimapPosition, setMinimapPosition, minimapWidth, setMinimapWidth, previewModal, closePreviewModal, showFilterCart, pinpointReorderMode, setPinpointReorderMode, syncCapture, startSync, cancelSync, setFolder, folders } = useStore();
  const { setShowFilelist, closeToggleModal, addToast } = useStore.getState();
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showMinimapOptionsModal, setShowMinimapOptionsModal] = useState(false);
  const bitmapCache = useRef(new Map<string, DrawableImage>());

  // Global drag and drop state
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  const globalDragCounterRef = useRef(0);
  const [isInternalDragActive, setIsInternalDragActive] = useState(false);
  
  const primaryFileRef = useRef<File | null>(null);
  const compareModeRef = useRef<CompareModeHandle>(null);
  const pinpointModeRef = useRef<PinpointModeHandle>(null);
  const analysisModeRef = useRef<AnalysisModeHandle>(null);

  const [isCaptureModalOpen, setCaptureModalOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureOptions, setCaptureOptions] = useState({ showLabels: true, showCrosshair: true, showMinimap: false, showFilterLabels: true, showGrid: true });
  const [clipboardStatus, setClipboardStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showTutorialPanel, setShowTutorialPanel] = useState(false);
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(tutorialItems[0]?.id ?? null);
  const activeTutorial = activeTutorialId
    ? tutorialItems.find(item => item.id === activeTutorialId) ?? (tutorialItems.length ? tutorialItems[0] : null)
    : (tutorialItems.length ? tutorialItems[0] : null);
  const hasTutorials = tutorialItems.length > 0;
  const [tutorialPanelPosition, setTutorialPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const tutorialPanelRef = useRef<HTMLDivElement | null>(null);
  const tutorialDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const tutorialPanelSizeRef = useRef<{ width: number; height: number } | null>(null);
  const tutorialDraggingRef = useRef(false);

  const handleTutorialDrag = useCallback((event: MouseEvent) => {
    if (!tutorialDraggingRef.current || !tutorialDragOffsetRef.current || !tutorialPanelSizeRef.current) {
      return;
    }
    const { x: offsetX, y: offsetY } = tutorialDragOffsetRef.current;
    const { width, height } = tutorialPanelSizeRef.current;
    const rawX = event.clientX - offsetX;
    const rawY = event.clientY - offsetY;
    const maxX = Math.max(window.innerWidth - width, 0);
    const maxY = Math.max(window.innerHeight - height, 0);
    const nextX = Math.min(Math.max(rawX, 0), maxX);
    const nextY = Math.min(Math.max(rawY, 0), maxY);
    setTutorialPanelPosition({ x: nextX, y: nextY });
  }, []);

  const stopTutorialDrag = useCallback(() => {
    if (!tutorialDraggingRef.current) {
      return;
    }
    tutorialDraggingRef.current = false;
    tutorialDragOffsetRef.current = null;
    tutorialPanelSizeRef.current = null;
    window.removeEventListener('mousemove', handleTutorialDrag);
    window.removeEventListener('mouseup', stopTutorialDrag);
  }, [handleTutorialDrag]);

  const handleTutorialHeaderMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.tutorial-close-btn')) {
      return;
    }
    if (!tutorialPanelRef.current) {
      return;
    }
    event.preventDefault();
    const rect = tutorialPanelRef.current.getBoundingClientRect();
    tutorialDragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    tutorialPanelSizeRef.current = { width: rect.width, height: rect.height };
    tutorialDraggingRef.current = true;
    setTutorialPanelPosition(position => position ?? { x: rect.left, y: rect.top });
    window.addEventListener('mousemove', handleTutorialDrag);
    window.addEventListener('mouseup', stopTutorialDrag);
  }, [handleTutorialDrag, stopTutorialDrag]);

  useEffect(() => {
    return () => {
      stopTutorialDrag();
    };
  }, [stopTutorialDrag]);

  const runCapture = useCallback(async () => {
    if (!isCaptureModalOpen) return;
    let dataUrl: string | null = null;
    const opts = { ...captureOptions };

    if (appMode === 'compare' && compareModeRef.current) {
      dataUrl = await compareModeRef.current.capture(opts);
    } else if (appMode === 'pinpoint' && pinpointModeRef.current) {
      dataUrl = await pinpointModeRef.current.capture(opts);
    } else if (appMode === 'analysis' && analysisModeRef.current) {
      dataUrl = await analysisModeRef.current.capture(opts);
    }
    if (dataUrl) {
      setCapturedImage(dataUrl);
    }
  }, [appMode, isCaptureModalOpen, captureOptions]);

  useEffect(() => {
    runCapture();
  }, [runCapture]);
  
  const handleOpenCaptureModal = () => {
    setClipboardStatus('idle');
    setCaptureModalOpen(true);
  };

  const handleOpenTutorials = () => {
    if (!hasTutorials) {
      addToast?.({
        type: 'info',
        title: 'Tutorials',
        message: 'No tutorial videos are configured yet.',
        duration: 3000
      });
      return;
    }
    if (!activeTutorialId && tutorialItems.length) {
      setActiveTutorialId(tutorialItems[0].id);
    }
    setTutorialPanelPosition(null);
    setShowTutorialPanel(true);
  };

  const handleCloseTutorials = () => {
    stopTutorialDrag();
    setTutorialPanelPosition(null);
    setShowTutorialPanel(false);
  };
  
  const handleCopyToClipboard = async () => {
    if (!capturedImage) return;
    try {
      const blob = await (await fetch(capturedImage)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setClipboardStatus('success');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setClipboardStatus('error');
    }
  };

  const handleSaveFile = async () => {
    if (!capturedImage) return;
    
    const fileName = `capture-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    
    // Check if running in Electron
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.saveImage(capturedImage, fileName);
        if (result.success) {
          addToast({ title: 'Save Image', message: result.message, type: 'success' });
        } else {
          addToast({ title: 'Save Image', message: result.message, type: 'error' });
        }
      } catch (error) {
        console.error('Failed to save file:', error);
        addToast({ title: 'Save Image', message: 'Failed to save file', type: 'error' });
      }
    } else {
      // Fallback for web environment
      try {
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast({ title: 'Download', message: 'Download started', type: 'success' });
      } catch (error) {
        console.error('Failed to download file:', error);
        addToast({ title: 'Download', message: 'Failed to download file', type: 'error' });
      }
    }
  };
  
  const resetView = () => {
    const newScale = fitScaleFn ? fitScaleFn() : 1;
    if (appMode === 'pinpoint') {
      clearPinpointScales();
      setPinpointGlobalScale(1);
      setViewport({ scale: newScale, refScreenX: undefined, refScreenY: undefined });
    } else {
      setViewport({ scale: newScale, cx: 0.5, cy: 0.5 });
    }
  };

  // Helper functions for global folder drag-drop
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

  const findEmptyFolder = (): FolderKey | null => {
    for (const key of FOLDER_KEYS) {
      if (!folders[key]) return key;
    }
    return null;
  };

  const placeFolderAsNewFolder = async (folderName: string, imageFiles: File[]): Promise<void> => {
    try {
      if (imageFiles.length === 0) {
        addToast({
          type: 'warning',
          title: 'Empty Folder',
          message: `Folder "${folderName}" contains no valid images`,
          duration: 5000
        });
        return;
      }

      const emptyKey = findEmptyFolder();
      if (!emptyKey) {
        addToast({
          type: 'error',
          title: 'No Empty Slots',
          message: 'All folder slots are in use. Please clear a folder first.',
          duration: 5000
        });
        return;
      }

      const filesMap = new Map<string, File>();
      for (const file of imageFiles) {
        filesMap.set(file.name, file);
      }

      setFolder(emptyKey, {
        data: { name: folderName, files: filesMap },
        alias: folderName
      });

      addToast({
        type: 'success',
        title: 'Folder Added',
        message: `Folder "${folderName}" added with ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}`,
        details: [`Assigned to slot ${emptyKey}`, `Images: ${imageFiles.map(f => f.name).slice(0, 5).join(', ')}${imageFiles.length > 5 ? ` and ${imageFiles.length - 5} more...` : ''}`],
        duration: 5000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Add Folder',
        message: `Could not add folder "${folderName}"`,
        details: [error instanceof Error ? error.message : 'Unknown error'],
        duration: 5000
      });
    }
  };

  const placeImagesIntoTempFolders = async (imageFiles: File[]): Promise<void> => {
    // Use a simplified TEMP folder logic for global drop
    try {
      if (imageFiles.length === 0) return;

      const emptyKey = findEmptyFolder();
      if (!emptyKey) {
        addToast({
          type: 'error',
          title: 'No Empty Slots',
          message: 'All folder slots are in use. Please clear a folder first.',
          duration: 5000
        });
        return;
      }

      const filesMap = new Map<string, File>();
      for (const file of imageFiles) {
        filesMap.set(file.name, file);
      }

      setFolder(emptyKey, {
        data: { name: 'TEMP', files: filesMap },
        alias: 'TEMP'
      });

      addToast({
        type: 'success',
        title: 'Images Added',
        message: `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} added to TEMP folder`,
        details: [`Assigned to slot ${emptyKey}`],
        duration: 5000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Load Images',
        message: 'Could not process dropped images',
        details: [error instanceof Error ? error.message : 'Unknown error'],
        duration: 5000
      });
    }
  };

  // Global drag and drop handlers
  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If internal drag is active, ignore global drag handling
    if (isInternalDragActive) {
      console.log('🚫 Global drag blocked - internal drag active');
      return;
    }

    // Check if this is an internal drag from file list (fallback check)
    const isInternalDrag = e.dataTransfer.types.includes('application/x-compareX-internal');

    if (isInternalDrag) {
      return; // Ignore internal drags
    }

    globalDragCounterRef.current += 1;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsGlobalDragOver(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If internal drag is active, ignore global drag handling
    if (isInternalDragActive) {
      return;
    }

    // Check if this is an internal drag from file list (fallback check)
    const isInternalDrag = e.dataTransfer.types.includes('application/x-compareX-internal');

    if (isInternalDrag) {
      return; // Ignore internal drags
    }

    const newCount = globalDragCounterRef.current - 1;
    globalDragCounterRef.current = newCount;
    if (newCount <= 0) {
      globalDragCounterRef.current = 0;
      setIsGlobalDragOver(false);
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If internal drag is active, ignore global drag handling
    if (isInternalDragActive) {
      return;
    }

    // Check if this is an internal drag from file list (fallback check)
    const isInternalDrag = e.dataTransfer.types.includes('application/x-compareX-internal');

    if (isInternalDrag) {
      return; // Ignore internal drags
    }

    e.dataTransfer.dropEffect = 'copy';
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if this is an internal drag from file list
    const isInternalDrag = e.dataTransfer.types.includes('application/x-compareX-internal');

    setIsGlobalDragOver(false);
    globalDragCounterRef.current = 0;

    // If internal drag is active, ignore global drag handling
    if (isInternalDragActive || isInternalDrag) {
      return; // Ignore internal drags
    }

    await handleFolderDrop(
      e,
      placeFolderAsNewFolder,
      placeImagesIntoTempFolders,
      addToast
    );
  };

  useEffect(() => {
    // Prefer explicit analysis file in analysis mode, otherwise use primaryFileRef
    const file = (appMode === 'analysis' ? analysisFile : primaryFileRef.current) as File | null;
    if (file) {
      let isCancelled = false;
      const getDimensions = async () => {
        try {
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          let dims: { width: number, height: number };
          if (ext === 'tif' || ext === 'tiff') {
            const imgElement = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
            dims = { width: imgElement.width, height: imgElement.height };
          } else {
            const bmp = await createImageBitmap(file);
            dims = { width: bmp.width, height: bmp.height };
          }
          if (!isCancelled) setImageDimensions(dims);
        } catch (err) {
          console.error("Failed to get image dimensions:", err);
          if (!isCancelled) setImageDimensions(null);
        }
      };
      getDimensions();
      return () => { isCancelled = true; };
    } else {
      setImageDimensions(null);
    }
  }, [current, analysisFile, appMode]);

  useEffect(() => {
    initializeOpenCV().catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      
      const state = useStore.getState();
      const { viewport, appMode, activeCanvasKey, pinpointScales, pinpointGlobalScale, setAppMode, setViewport } = state;
      const KEY_PAN_AMOUNT = 50;

      const key = e.key.toLowerCase();

      // Ctrl+C: 텍스트 복사 (기본 브라우저 동작 허용)
      if (e.ctrlKey && key === 'c') {
        // 텍스트가 선택된 경우 기본 복사 동작을 허용
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          // 선택된 텍스트가 있으면 기본 복사 동작 허용
          return;
        }
        // 선택된 텍스트가 없으면 캡처 기능 대신 아무 동작 안 함
        return;
      }

      // UI Controls - 조합키로 변경하여 텍스트 입력과 충돌 방지
      if (e.ctrlKey && key === 'f') {
        e.preventDefault();
        setShowControls((prev: boolean) => !prev);
        return;
      }
      if (e.ctrlKey && key === 'l') {
        e.preventDefault();
        setShowFilterLabels(!showFilterLabels);
        return;
      }
      if (e.altKey && key === 'l') {
        e.preventDefault();
        setShowFilelist(!state.showFilelist);
        return;
      }
      if (e.altKey && key === 'm') {
        e.preventDefault();
        setShowMinimap(!showMinimap);
        return;
      }
      if (e.altKey && key === 'g') {
        e.preventDefault();
        setShowGrid(!showGrid);
        return;
      }

      // Open capture modal - 단축키 제거됨 (텍스트 복사 기능과 충돌 방지)
      // if (key === 'c') {
      //   e.preventDefault();
      //   handleOpenCaptureModal();
      //   return;
      // }

      // Filter preview modal 단축키 제거됨
      // 사용자가 필요시 FilterCart에서 버튼으로 접근 가능

      // Global Escape: close modals/overlays
      if (key === 'escape') {
        let handled = false;
        if (useStore.getState().syncCapture.active) { useStore.getState().cancelSync(); handled = true; }
        if (previewModal.isOpen) { closePreviewModal(); handled = true; }
        if (isCaptureModalOpen) { setCaptureModalOpen(false); handled = true; }
        if (showColorPalette) { setShowColorPalette(false); handled = true; }
        if (showMinimapOptionsModal) { setShowMinimapOptionsModal(false); handled = true; }
        if (state.toggleModalOpen) { closeToggleModal(); handled = true; }
        if (handled) { e.preventDefault(); return; }
      }

      // Disable mode switching (1/2/3) when any modal/overlay is active
      // Use both state flags and DOM presence as a safety net to avoid stale state issues
      const overlayPresent = !!(
        document.querySelector('.filter-controls-overlay') ||
        document.querySelector('.preview-modal-overlay') ||
        document.querySelector('.toggle-modal-overlay') ||
        document.querySelector('.dialog-overlay') ||
        document.querySelector('.capture-modal')
      );
      const previewBlocks = !!(state.previewModal?.isOpen && state.previewModal?.position !== 'sidebar');
      const modalActive = state.toggleModalOpen || previewBlocks || state.activeFilterEditor !== null || isCaptureModalOpen || overlayPresent;
      if (modalActive && e.ctrlKey && (key === '1' || key === '2' || key === '3' || key === '4')) {
        e.preventDefault();
        return;
      }

      if (appMode === 'pinpoint' && activeCanvasKey && (key === '=' || key === '+' || key === '-')) {
        e.preventDefault();
        const individualScale = pinpointScales[activeCanvasKey] ?? viewport.scale;
        const increment = 0.01; // 1% increment
        const direction = (key === '=' || key === '+') ? 1 : -1;
        const newIndividualScale = individualScale + (increment * direction);
        
        const totalScale = newIndividualScale * pinpointGlobalScale;
        if (totalScale > MAX_ZOOM || totalScale < MIN_ZOOM) return;

        state.setPinpointScale(activeCanvasKey, newIndividualScale);
        return;
      }

      // Mode switching - Ctrl + 숫자로 변경
      if (e.ctrlKey && (key === '1' || key === '2' || key === '3')) {
        e.preventDefault();
        switch (key) {
          case '1': setAppMode('pinpoint'); break;
          case '2': setAppMode('analysis'); break;
          case '3': setAppMode('compare'); break;
        }
        return;
      }
      
      // View controls - Alt + 키로 변경
      if (e.altKey) {
        e.preventDefault();
        switch (key) {
          case 'r': resetView(); break;
          case 'i': setShowInfoPanel((prev: boolean) => !prev); break;
        }
        return;
      }
      
      // Zoom controls - 단일 키로 복원 (더 빠른 접근성)
      if (key === '=' || key === '+' || key === '-') {
        e.preventDefault();
        switch (key) {
          case '=': case '+': setViewport({ scale: Math.min(MAX_ZOOM, (viewport.scale || 1) + 0.01) }); break;
          case '-': setViewport({ scale: Math.max(MIN_ZOOM, (viewport.scale || 1) - 0.01) }); break;
        }
        return;
      }
      
      switch (key) {
        case 'arrowup': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cy != null) setViewport({ cy: (viewport.cy || 0) - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); } break;
        case 'arrowdown': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cy != null) setViewport({ cy: (viewport.cy || 0) + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.height)) }); } break;
        case 'arrowleft': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cx != null) setViewport({ cx: (viewport.cx || 0) - (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); } break;
        case 'arrowright': if (e.shiftKey) { e.preventDefault(); if (imageDimensions && viewport.cx != null) setViewport({ cx: (viewport.cx || 0) + (KEY_PAN_AMOUNT / ((viewport.scale || 1) * imageDimensions.width)) }); } break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setViewport, resetView, imageDimensions, setAppMode, isCaptureModalOpen]);

  const renderCurrentMode = () => {
    const setPrimaryFile = (file: File | null) => {
      primaryFileRef.current = file;
    };

    switch (appMode) {
      case 'compare':
        return <CompareMode ref={compareModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} showControls={showControls} />;
      case 'pinpoint':
        return <PinpointMode ref={pinpointModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} showControls={showControls} setIsInternalDragActive={setIsInternalDragActive} />;
      case 'analysis':
        return <AnalysisMode ref={analysisModeRef} numViewers={numViewers} bitmapCache={bitmapCache} setPrimaryFile={setPrimaryFile} showControls={showControls} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`app ${showFilterCart ? 'filter-cart-open' : ''} ${previewModal.isOpen && previewModal.position === 'sidebar' ? 'preview-active' : ''} ${isGlobalDragOver ? 'global-drag-over' : ''}`}
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      <header>
        <div className="title-container">
          <h1
            className="app-title"
            onClick={() => window.location.reload()}
            title="Reset (refresh)"
          >
            compareX
          </h1>
          <ViewToggleControls 
            showControls={showControls} 
            onToggleControls={() => setShowControls(!showControls)} 
          />
          {/* Moved Toggle and Capture buttons next to view-toggle-controls */}
          <button
            className={"controls-main-button toggle-main-btn"}
            onClick={() => openToggleModal()}
            title={"Toggle Mode (Space)"}
            disabled={
              selectedViewers.length === 0 ||
              (appMode === 'compare' && !current) ||
              (appMode === 'analysis' && !analysisFile)
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
            Toggle ({selectedViewers.length})
          </button>
          <button 
            className="controls-main-button capture-button" 
            onClick={handleOpenCaptureModal}
            title="Capture screenshot"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path><path d="M21 4H14.82A2 2 0 0 0 13 2H8a2 2 0 0 0-1.82 2H3v16h18v-8Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            Capture
          </button>
          <div className="minimap-button-unified">
            <button 
              onClick={() => setShowMinimap(!showMinimap)} 
              className={`minimap-toggle-button ${showMinimap ? 'active' : ''}`}
              title="Toggle Minimap (Alt+M)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="4" height="4" rx="1" ry="1"></rect></svg>
              Minimap
            </button>
            <button
              className={`minimap-options-indicator ${showMinimap ? '' : 'disabled'}`}
              onClick={() => showMinimap && setShowMinimapOptionsModal(true)}
              title="Minimap options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 12H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51-1Z"/></svg>
            </button>
          </div>
          <div className="grid-button-unified">
            <button
              className={`grid-button-toggle ${showGrid ? 'active' : ''}`}
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? 'Hide Grid (Alt+G)' : 'Show Grid (Alt+G)'}
            >
              <svg xmlns="http://www.w.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            </button>
            <div
              className="grid-button-color-indicator"
              style={{ backgroundColor: showGrid ? gridColor : 'transparent' }}
              onClick={() => showGrid && setShowColorPalette(true)}
              title="Change Grid Color"
            />
          </div>
          <div className="title-right-actions">
            <button
              className={`controls-main-button tutorial-button${showTutorialPanel ? ' active' : ''}`}
              title="Open Tutorials"
              onClick={handleOpenTutorials}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            <button
              className="controls-main-button"
              title="Check for Updates"
              onClick={async () => {
                try {
                  const api: any = (window as any).electronAPI;
                  if (api?.updater) await api.updater.checkForUpdates();
                } catch (e) {
                  console.error(e);
                }
              }}
              disabled={!(window as any).electronAPI?.updater}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L22 2M22 12.5a10 10 0 0 1-18.8 4.3L2 22"/>
              </svg>
            </button>
            <button
              className="controls-main-button"
              title="Toggle DevTools"
              onClick={() => {
                const api: any = (window as any).electronAPI;
                api?.windowActions?.toggleDevTools?.();
              }}
              disabled={!(window as any).electronAPI?.windowActions}
            >
              DevTools
            </button>
            <button
              className="controls-main-button"
              title="Toggle Fullscreen (F11)"
              onClick={() => {
                const api: any = (window as any).electronAPI;
                if (api?.windowActions?.toggleFullscreen) {
                  api.windowActions.toggleFullscreen();
                } else {
                  const doc: any = document;
                  if (!document.fullscreenElement) {
                    doc.documentElement.requestFullscreen?.();
                  } else {
                    document.exitFullscreen?.();
                  }
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              <span style={{ fontSize: '0.7rem', marginLeft: '4px', opacity: '0.8' }}>(F11)</span>
            </button>
          </div>
        </div>
        <div className="top-controls-wrapper">
          <div className="controls-main">
            <label><span>Mode:</span>
              <select 
                className="mode-selector" 
                value={appMode} 
                onChange={e => setAppMode(e.target.value as AppMode)}
                title="Select app mode (Ctrl+1/2/3)"
              >
                <option value="pinpoint" className="mode-option">🎯 Pinpoint</option>
                <option value="analysis" className="mode-option">🔬 Analysis</option>
                <option value="compare" className="mode-option">📚 Compare</option>
              </select>
            </label>
            {(appMode === 'compare' || appMode === 'pinpoint' || appMode === 'analysis') && (
              <LayoutGridSelector
                currentRows={viewerRows}
                currentCols={viewerCols}
                onLayoutChange={(rows, cols) => setViewerLayout(rows, cols)}
              />
            )}
            {appMode === 'pinpoint' && (
              <label><span>Mouse:</span>
                <select value={pinpointMouseMode} onChange={e => setPinpointMouseMode(e.target.value as any)}>
                  <option value="pin">Pin</option>
                  <option value="pan">Pan</option>
                </select>
              </label>
            )}
            <div className="pinpoint-reorder-controls" title="Reorder behavior for viewer drag">
              <button
                className={`controls-main-button ${pinpointReorderMode === 'shift' ? 'active' : ''}`}
                onClick={() => setPinpointReorderMode('shift')}
              >
                Shift
              </button>
              <button
                className={`controls-main-button ${pinpointReorderMode === 'swap' ? 'active' : ''}`}
                onClick={() => setPinpointReorderMode('swap')}
              >
                Swap
              </button>
            </div>
            
          </div>
          <div className="controls-right">
            {appMode === 'compare' && <CompareRotationControl />}
            {appMode === 'analysis' && <AnalysisRotationControl />}
            {appMode === 'pinpoint' && <PinpointGlobalRotationControl />}
            {appMode === 'pinpoint' && (
              <div className="global-controls-wrapper">
                <PinpointGlobalScaleControl />
              </div>
            )}
          {appMode !== 'pinpoint' && <ViewportControls imageDimensions={imageDimensions} />}
            <button
              onClick={() => {
                if (syncCapture.active) {
                  cancelSync();
                } else {
                  startSync(appMode);
                  addToast({ type: 'info', title: 'Sync Filters', message: 'Choose a source viewer to sync from', duration: 3000 });
                }
              }}
              title={syncCapture.active ? 'Cancel Sync' : 'Sync filters from a viewer to all'}
              className={`controls-main-button sync-button ${syncCapture.active ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Sync
            </button>
            <button 
              onClick={resetView} 
              title="Reset View (Alt+R)" 
              className="controls-main-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M12 12l-8 8M12 12l8 8M12 12l-8-8M12 12l8-8"/></svg>
            </button>
          </div>
        </div>
      </header>
      
      {renderCurrentMode()}

      {showInfoPanel && 
        <ImageInfoPanel 
          file={primaryFileRef.current || undefined} 
          dimensions={imageDimensions} 
          onClose={() => setShowInfoPanel(false)} 
        />
      }

      {isCaptureModalOpen && (
        <div className="capture-modal" onClick={() => setCaptureModalOpen(false)}>
          <div className="capture-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Capture Options</h3>
            <div className="capture-modal-preview">
              {capturedImage ? <img src={capturedImage} alt="Captured content" /> : <div className="loading-spinner"></div>}
            </div>
            <div className="capture-modal-options">
              <label>
                <input type="checkbox" checked={captureOptions.showLabels} onChange={(e) => setCaptureOptions(o => ({...o, showLabels: e.target.checked}))} />
                Show Labels
              </label>
              <label>
                <input type="checkbox" checked={captureOptions.showFilterLabels} onChange={(e) => setCaptureOptions(o => ({...o, showFilterLabels: e.target.checked}))} />
                Show Filter Labels
              </label>
              {appMode === 'pinpoint' && (
                <label>
                  <input type="checkbox" checked={captureOptions.showCrosshair} onChange={(e) => setCaptureOptions(o => ({...o, showCrosshair: e.target.checked}))} />
                  Show Crosshair
                </label>
              )}
              {showMinimap && (
                <label>
                  <input type="checkbox" checked={captureOptions.showMinimap} onChange={(e) => setCaptureOptions(o => ({...o, showMinimap: e.target.checked}))} />
                  Show Minimap
                </label>
              )}
              {showGrid && (
                <label>
                  <input type="checkbox" checked={captureOptions.showGrid} onChange={(e) => setCaptureOptions(o => ({...o, showGrid: e.target.checked}))} />
                  Show Grid
                </label>
              )}
            </div>
            <div className="capture-modal-actions">
              <button className="capture-copy-button" onClick={handleCopyToClipboard}>
                {clipboardStatus === 'idle' && 'Copy to Clipboard'}
                {clipboardStatus === 'success' && 'Copied!'}
                {clipboardStatus === 'error' && 'Error!'}
              </button>
              <button className="capture-save-button" onClick={handleSaveFile} disabled={!capturedImage}>Save as File...</button>
              <button onClick={() => setCaptureModalOpen(false)} className="close-button">Close</button>
            </div>
          </div>
        </div>
      )}

      {showColorPalette && showGrid && (
        <div className="grid-color-modal-overlay" onClick={() => setShowColorPalette(false)}>
          <div className="grid-color-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Select Grid Color</h3>
            <div className="grid-color-palette-modal">
              {['white', 'red', 'yellow', 'blue'].map(color => (
                <button
                  key={color}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  style={{ backgroundColor: color }}
                  className={`grid-color-swatch ${gridColor === color ? 'active' : ''}`}
                  onClick={() => {
                    setGridColor(color as any);
                    setShowColorPalette(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showMinimapOptionsModal && (
        <div className="minimap-options-modal-overlay" onClick={() => setShowMinimapOptionsModal(false)}>
          <div className="minimap-options-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="minimap-options-header">
              <h3>Minimap Options</h3>
              <button className="close-btn" onClick={() => setShowMinimapOptionsModal(false)}>×</button>
            </div>
            <div className="minimap-options-grid">
              <div className="minimap-position-preview">
                <div className={`preview-corner tl ${minimapPosition==='top-left' ? 'active':''}`} onClick={() => setMinimapPosition('top-left')} />
                <div className={`preview-corner tr ${minimapPosition==='top-right' ? 'active':''}`} onClick={() => setMinimapPosition('top-right')} />
                <div className={`preview-corner bl ${minimapPosition==='bottom-left' ? 'active':''}`} onClick={() => setMinimapPosition('bottom-left')} />
                <div className={`preview-corner br ${minimapPosition==='bottom-right' ? 'active':''}`} onClick={() => setMinimapPosition('bottom-right')} />
              </div>
              <div className="minimap-size-buttons">
                <button className={`minimap-size-button ${minimapWidth===120? 'active':''}`} onClick={() => setMinimapWidth(120)}>Small</button>
                <button className={`minimap-size-button ${minimapWidth===150? 'active':''}`} onClick={() => setMinimapWidth(150)}>Medium</button>
                <button className={`minimap-size-button ${minimapWidth===200? 'active':''}`} onClick={() => setMinimapWidth(200)}>Large</button>
                <button className={`minimap-size-button ${minimapWidth===240? 'active':''}`} onClick={() => setMinimapWidth(240)}>XL</button>
              </div>
            </div>
            <div className="minimap-options-actions">
              <button onClick={() => setShowMinimapOptionsModal(false)} className="apply-btn">OK</button>
            </div>
          </div>
        </div>
      )}

      {showTutorialPanel && (
        <div className="tutorial-overlay" onClick={handleCloseTutorials}>
          <div
            className="tutorial-panel"
            ref={tutorialPanelRef}
            style={tutorialPanelPosition ? { position: 'absolute', top: tutorialPanelPosition.y, left: tutorialPanelPosition.x } : undefined}
            onClick={e => e.stopPropagation()}
          >
            <div className="tutorial-panel-header" onMouseDown={handleTutorialHeaderMouseDown}>
              <h3>Tutorials</h3>
              <button type="button" className="tutorial-close-btn" onClick={handleCloseTutorials}>
                ×
              </button>
            </div>
            {hasTutorials ? (
              <div className="tutorial-panel-body">
                <div className="tutorial-list">
                  {tutorialItems.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      className={`tutorial-list-item${activeTutorial?.id === item.id ? ' active' : ''}`}
                      onClick={() => setActiveTutorialId(item.id)}
                    >
                      <span className="tutorial-list-item-title">{item.title}</span>
                      <span className="tutorial-list-item-desc">{item.description}</span>
                    </button>
                  ))}
                </div>
                <div className="tutorial-preview">
                  {activeTutorial ? (
                    <>
                      <h4>{activeTutorial.title}</h4>
                      <p>{activeTutorial.description}</p>
                      <div className="tutorial-preview-media">
                        <img src={activeTutorial.src} alt={activeTutorial.title} />
                      </div>
                      <a
                        className="tutorial-open-link"
                        href={activeTutorial.src}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in new tab
                      </a>
                    </>
                  ) : (
                    <div className="tutorial-empty">Select a tutorial from the list.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="tutorial-empty">No tutorials configured.</div>
            )}
          </div>
        </div>
      )}

      <FilterCart />
      
      {/* Only render FilterPreviewModal for modal mode, sidebar mode is rendered within FilterCart */}
      {previewModal.position !== 'sidebar' && (
        <FilterPreviewModal
          isOpen={previewModal.isOpen}
          onClose={closePreviewModal}
          sourceFile={previewModal.sourceFile}
          previewMode={previewModal.mode}
          filterType={previewModal.filterType}
          filterParams={previewModal.filterParams}
          chainItems={previewModal.chainItems}
          title={previewModal.title}
          realTimeUpdate={previewModal.realTimeUpdate}
          position={previewModal.position}
          stepIndex={previewModal.stepIndex}
        />
      )}
      
      {/* Global Drag and Drop Overlay */}
      {isGlobalDragOver && (
        <div className="global-drag-overlay">
          <div className="global-drag-overlay-content">
            <div className="global-drag-icon">📁</div>
            <h2>Drop Folders or Images Anywhere</h2>
            <p>Folders will be added as new slots</p>
            <p>Images will be added to TEMP folder</p>
          </div>
        </div>
      )}

      <ToastContainer />
      <ElectronUpdateManager autoCheck={true} checkIntervalMs={4 * 60 * 60 * 1000} />
    </div>
  );
}
