import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '../store';
import { ImageCanvas, ImageCanvasHandle } from './ImageCanvas';
import type { FolderKey } from '../types';
import { decodeTiffWithUTIF } from '../utils/utif';
import { UTIF_OPTIONS, MIN_ZOOM, MAX_ZOOM } from '../config';

type DrawableImage = ImageBitmap | HTMLImageElement;

interface ToggleModalProps {
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  pinpointImages?: any; // For pinpoint mode
}

export function ToggleModal({ bitmapCache, pinpointImages }: ToggleModalProps) {
  const { 
    toggleModalOpen, closeToggleModal, selectedViewers, toggleCurrentIndex, setToggleCurrentIndex,
    current, folders, viewerFilters, viewerFilterParams, appMode,
    analysisFile, analysisFilters, analysisFilterParams, analysisRotation,
    pinpointScales, viewport, pinpointGlobalScale, setPinpointScale
  } = useStore();

  const canvasRef = useRef<ImageCanvasHandle>(null);
  const filteredCacheRef = useRef<Map<string, DrawableImage>>(new Map());
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [xInput, setXInput] = useState<string>("");
  const [yInput, setYInput] = useState<string>("");
  const [zoomInput, setZoomInput] = useState<string>("");
  const [modalSize, setModalSize] = useState({ width: 800, height: 600 });

  // Calculate modal size based on viewers layout
  const calculateModalSize = useCallback(() => {
    // Wait a bit for DOM to be ready
    setTimeout(() => {
      const viewersElement = document.querySelector('.viewers');
      if (viewersElement) {
        const rect = viewersElement.getBoundingClientRect();
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.9;
        setModalSize({
          width: Math.min(rect.width, maxW),
          height: Math.min(rect.height, maxH)
        });
        return;
      }
      
      // Fallback: calculate based on viewport and estimated layout
      const headerHeight = 120; // Estimated header height
      const availableHeight = window.innerHeight - headerHeight;
      const availableWidth = window.innerWidth;
      
      // Account for sidebar in compare/pinpoint modes
      const sidebarWidth = (appMode === 'compare' || appMode === 'pinpoint') ? 300 : 0;
      const viewersWidth = availableWidth - sidebarWidth;
      
      setModalSize({
        width: Math.min(viewersWidth, availableWidth * 0.9),
        height: Math.min(availableHeight, window.innerHeight * 0.9)
      });
    }, 100);
  }, [appMode]);

  // Recalculate size when modal opens
  useEffect(() => {
    if (toggleModalOpen) {
      calculateModalSize();
    }
  }, [toggleModalOpen, calculateModalSize]);

  // Add a body class to blur underlying viewers when modal is open
  useEffect(() => {
    if (toggleModalOpen) {
      document.body.classList.add('toggle-modal-open');
    } else {
      document.body.classList.remove('toggle-modal-open');
    }
    return () => {
      document.body.classList.remove('toggle-modal-open');
    };
  }, [toggleModalOpen]);

  const currentViewerKey = selectedViewers[toggleCurrentIndex];
  
  // Get current file and label based on app mode
  const getCurrentFileAndLabel = () => {
    if (appMode === 'compare') {
      const currentFolder = currentViewerKey ? folders[currentViewerKey] : null;
      const currentFile = current && currentFolder ? 
        (Array.from(currentFolder.data.files.entries()).find(([name]) => 
          name === current.filename || name.replace(/\.[^/.]+$/, "") === current.filename
        )?.[1]) : undefined;
      
      const currentViewerAlias = currentFolder?.alias || currentViewerKey;
      const label = current ? `${currentViewerAlias}\n${current.filename}` : '';
      
      return { file: currentFile, label, folderKey: currentViewerKey };
    }
    
    if (appMode === 'analysis') {
      // For analysis mode, use the analysisFile with different filters
      const viewerIndex = parseInt(currentViewerKey);
      const filterType = analysisFilters[viewerIndex];
      const filterName = filterType && filterType !== 'none' ? `[${filterType}]` : '';
      const label = analysisFile ? `Analysis\n${analysisFile.name}${filterName ? '\n' + filterName : ''}` : '';
      
      return { file: analysisFile, label, folderKey: viewerIndex };
    }
    
    if (appMode === 'pinpoint' && pinpointImages) {
      const pinpointImage = pinpointImages[currentViewerKey];
      const currentFolder = pinpointImage?.sourceKey ? folders[pinpointImage.sourceKey] : folders[currentViewerKey];
      const sourceFolderAlias = pinpointImage?.sourceKey ? (currentFolder?.alias || pinpointImage.sourceKey) : (currentFolder?.alias || currentViewerKey);
      
      let label = sourceFolderAlias;
      if (pinpointImage?.file) {
        label += `\n${pinpointImage.file.name}`;
      }
      
      return { file: pinpointImage?.file, label, folderKey: currentViewerKey };
    }
    
    return { file: undefined, label: '', folderKey: currentViewerKey };
  };

  const { file: currentFile, label: currentLabel, folderKey } = getCurrentFileAndLabel();

  // Compute effective scale used by ImageCanvas in this modal
  const computeScalePercent = () => {
    let totalScale = viewport.scale || 1;
    if (appMode === 'pinpoint') {
      const key = currentViewerKey as FolderKey;
      const individualScale = (pinpointScales && key && pinpointScales[key] != null)
        ? (pinpointScales[key] as number)
        : (viewport.scale || 1);
      totalScale = individualScale * (pinpointGlobalScale || 1);
    }
    const pct = Math.round((totalScale || 1) * 100);
    return `${pct}%`;
  };
  const scaleText = computeScalePercent();

  // Keep zoom input in sync with computed scale
  useEffect(() => {
    const numeric = parseInt(scaleText.replace('%', ''));
    if (!isNaN(numeric)) setZoomInput(String(numeric));
  }, [scaleText]);

  const applyZoomChange = useCallback(() => {
    const pct = parseFloat(zoomInput);
    if (isNaN(pct)) return;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pct / 100));
    if (appMode === 'pinpoint') {
      const key = currentViewerKey as FolderKey;
      const global = pinpointGlobalScale || 1;
      const newIndividual = clamped / global;
      setPinpointScale(key, newIndividual);
    } else {
      useStore.getState().setViewport({ scale: clamped });
    }
  }, [zoomInput, appMode, currentViewerKey, pinpointGlobalScale, setPinpointScale]);

  const handleZoomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyZoomChange();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Load current image dimensions (for X/Y input in compare/analysis)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!currentFile) { setImageDims(null); return; }
        const ext = (currentFile.name.split('.').pop() || '').toLowerCase();
        if (ext === 'tif' || ext === 'tiff') {
          const img = await decodeTiffWithUTIF(currentFile, UTIF_OPTIONS);
          if (!cancelled) setImageDims({ width: img.width, height: img.height });
        } else {
          const bmp = await createImageBitmap(currentFile);
          if (!cancelled) setImageDims({ width: bmp.width, height: bmp.height });
        }
      } catch (e) {
        console.error('Failed to read image size in ToggleModal:', e);
        if (!cancelled) setImageDims(null);
      }
    })();
    return () => { cancelled = true; };
  }, [currentFile]);

  // Sync inputs with viewport and image dimensions
  useEffect(() => {
    if (!imageDims) { setXInput(""); setYInput(""); return; }
    const { cx, cy } = viewport;
    if (typeof cx === 'number' && typeof cy === 'number') {
      setXInput(Math.round(cx * imageDims.width).toString());
      setYInput(Math.round(cy * imageDims.height).toString());
    }
  }, [viewport.cx, viewport.cy, imageDims]);

  const applyXYChanges = useCallback(() => {
    if (!imageDims) return;
    const x = parseFloat(xInput);
    const y = parseFloat(yInput);
    if (isNaN(x) || isNaN(y)) return;
    const cx = x / imageDims.width;
    const cy = y / imageDims.height;
    const { setViewport, triggerIndicator } = useStore.getState();
    setViewport({ cx, cy });
    // Also flash an indicator at the target location so it's visible in the modal
    triggerIndicator(cx, cy);
  }, [xInput, yInput, imageDims]);

  const handleXYKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyXYChanges();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleNext = useCallback(() => {
    if (selectedViewers.length === 0) return;
    const nextIndex = (toggleCurrentIndex + 1) % selectedViewers.length;
    setToggleCurrentIndex(nextIndex);
  }, [selectedViewers.length, toggleCurrentIndex, setToggleCurrentIndex]);

  const handlePrev = useCallback(() => {
    if (selectedViewers.length === 0) return;
    const prevIndex = (toggleCurrentIndex - 1 + selectedViewers.length) % selectedViewers.length;
    setToggleCurrentIndex(prevIndex);
  }, [selectedViewers.length, toggleCurrentIndex, setToggleCurrentIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!toggleModalOpen) return;
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
        break;
      case 'Escape':
        closeToggleModal();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handlePrev();
        break;
    }
  }, [toggleModalOpen, handleNext, handlePrev, closeToggleModal]);

  useEffect(() => {
    if (toggleModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [toggleModalOpen, handleKeyDown]);

  if (!toggleModalOpen || selectedViewers.length === 0) return null;
  
  // Check if we have content to show based on mode
  if (appMode === 'compare' && !current) return null;
  if (appMode === 'analysis' && !analysisFile) return null;
  if (appMode === 'pinpoint' && (!pinpointImages || !currentFile)) return null;

  const getHeaderText = () => {
    if (appMode === 'compare' && current) return `Toggle Mode - ${current.filename}`;
    if (appMode === 'analysis' && analysisFile) return `Toggle Mode - ${analysisFile.name}`;
    if (appMode === 'pinpoint') return `Toggle Mode - Pinpoint`;
    return 'Toggle Mode';
  };

  return (
    <div className="toggle-modal-overlay" onClick={closeToggleModal}>
      <div 
        className="toggle-modal" 
        onClick={e => e.stopPropagation()}
        style={{
          width: modalSize.width + 'px',
          height: modalSize.height + 'px',
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        <div className="toggle-modal-header">
          <h3>{getHeaderText()}</h3>
          <div className="toggle-modal-actions">
            <div className="toggle-zoom" title="Zoom">
              <input
                type="text"
                value={zoomInput}
                onChange={e => setZoomInput(e.target.value)}
                onBlur={applyZoomChange}
                onKeyDown={handleZoomKeyDown}
              />
              <span>%</span>
            </div>
            {appMode !== 'pinpoint' && (
              <div className="toggle-xy">
                <label>
                  <span>X:</span>
                  <input
                    type="text"
                    value={xInput}
                    onChange={e => setXInput(e.target.value)}
                    onBlur={applyXYChanges}
                    onKeyDown={handleXYKeyDown}
                    disabled={!imageDims}
                  />
                </label>
                <label>
                  <span>Y:</span>
                  <input
                    type="text"
                    value={yInput}
                    onChange={e => setYInput(e.target.value)}
                    onBlur={applyXYChanges}
                    onKeyDown={handleXYKeyDown}
                    disabled={!imageDims}
                  />
                </label>
              </div>
            )}
            <button className="close-btn" onClick={closeToggleModal}>×</button>
          </div>
        </div>
        
        <div className="toggle-modal-content">
          <div className="toggle-image-container">
            <ImageCanvas
              ref={canvasRef}
              label={currentLabel}
              file={currentFile}
              isReference={currentViewerKey === 'A' || folderKey === 0}
              cache={bitmapCache.current}
              filteredCache={filteredCacheRef.current}
              appMode={appMode}
              folderKey={folderKey}
              overrideFilterType={appMode === 'analysis' ? analysisFilters[parseInt(currentViewerKey)] : viewerFilters[currentViewerKey]}
              overrideFilterParams={appMode === 'analysis' 
                ? analysisFilterParams[parseInt(currentViewerKey)] 
                : viewerFilterParams[currentViewerKey as FolderKey]}
              rotation={appMode === 'analysis' ? analysisRotation : undefined}
              overrideScale={appMode === 'pinpoint' ? pinpointScales[currentViewerKey as FolderKey] : undefined}
              refPoint={appMode === 'pinpoint' && pinpointImages ? (pinpointImages[currentViewerKey]?.refPoint || null) : null}
            />
          </div>
          
          <div className="toggle-modal-info">
            <div className="current-viewer-info">
              <div className="viewer-name">
                {appMode === 'analysis' ? `Viewer ${parseInt(currentViewerKey) + 1}` : 
                 appMode === 'compare' ? (folders[currentViewerKey]?.alias || currentViewerKey) :
                 appMode === 'pinpoint' ? `Viewer ${currentViewerKey}` : currentViewerKey}
              </div>
              <div className="viewer-position">
                {toggleCurrentIndex + 1} / {selectedViewers.length}
              </div>
            </div>
            
            <div className="toggle-controls">
              <button 
                className="toggle-btn"
                onClick={handlePrev}
                disabled={selectedViewers.length <= 1}
              >
                ← Previous
              </button>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${((toggleCurrentIndex + 1) / selectedViewers.length) * 100}%` }}
                />
              </div>
              
              <button 
                className="toggle-btn"
                onClick={handleNext}
                disabled={selectedViewers.length <= 1}
              >
                Next →
              </button>
            </div>
            
            <div className="keyboard-hints">
              <div>Space: Next</div>
              <div>Shift+Space: Previous</div>
              <div>←/→: Navigate</div>
              <div>Esc: Close</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
