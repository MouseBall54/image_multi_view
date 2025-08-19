import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '../store';
import { ImageCanvas, ImageCanvasHandle } from './ImageCanvas';
import type { FolderKey } from '../types';

type DrawableImage = ImageBitmap | HTMLImageElement;

interface ToggleModalProps {
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  pinpointImages?: any; // For pinpoint mode
}

export function ToggleModal({ bitmapCache, pinpointImages }: ToggleModalProps) {
  const { 
    toggleModalOpen, closeToggleModal, selectedViewers, toggleCurrentIndex, setToggleCurrentIndex,
    current, folders, viewerFilters, appMode, viewerRows, viewerCols, numViewers,
    analysisFile, analysisFilters
  } = useStore();

  const canvasRef = useRef<ImageCanvasHandle>(null);
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
          <button className="close-btn" onClick={closeToggleModal}>×</button>
        </div>
        
        <div className="toggle-modal-content">
          <div className="toggle-image-container">
            <ImageCanvas
              ref={canvasRef}
              label={currentLabel}
              file={currentFile}
              isReference={currentViewerKey === 'A' || folderKey === 0}
              cache={bitmapCache.current}
              appMode={appMode}
              folderKey={folderKey}
              overrideFilterType={appMode === 'analysis' ? analysisFilters[parseInt(currentViewerKey)] : viewerFilters[currentViewerKey]}
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
