import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store';
import { applyFilterChain } from '../utils/filterChain';
import type { FilterChainItem, FilterType } from '../types';
import type { FilterParams } from '../store';

interface FilterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceFile?: File;
  previewMode: 'single' | 'chain';
  filterType?: FilterType;
  filterParams?: FilterParams;
  chainItems?: FilterChainItem[];
  title?: string;
  realTimeUpdate?: boolean; // For filter editor real-time updates
  position?: 'modal' | 'sidebar'; // New prop to control positioning
}

export const FilterPreviewModal: React.FC<FilterPreviewModalProps> = ({
  isOpen,
  onClose,
  sourceFile,
  previewMode,
  filterType,
  filterParams,
  chainItems,
  title = 'Filter Preview',
  realTimeUpdate = false,
  position = 'modal'
}) => {
  const { previewSize, setPreviewSize } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
  const [sizeTransitioning, setSizeTransitioning] = useState(false);
  
  const { current } = useStore();

  // Maximum preview size based on size setting
  const getSizeConfig = (size: 'S' | 'M' | 'L') => {
    switch (size) {
      case 'S': return { maxSize: 300, width: 320 };
      case 'M': return { maxSize: 450, width: 470 };
      case 'L': return { maxSize: 600, width: 620 };
      default: return { maxSize: 450, width: 470 };
    }
  };
  
  const currentSizeConfig = getSizeConfig(previewSize);
  const MAX_PREVIEW_SIZE = position === 'sidebar' ? currentSizeConfig.maxSize : 800;

  // Load source image
  useEffect(() => {
    if (!isOpen || !sourceFile) return;

    const img = new Image();
    img.onload = () => {
      // Calculate preview dimensions while maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let previewWidth = img.width;
      let previewHeight = img.height;

      if (img.width > MAX_PREVIEW_SIZE || img.height > MAX_PREVIEW_SIZE) {
        if (img.width > img.height) {
          previewWidth = MAX_PREVIEW_SIZE;
          previewHeight = MAX_PREVIEW_SIZE / aspectRatio;
        } else {
          previewHeight = MAX_PREVIEW_SIZE;
          previewWidth = MAX_PREVIEW_SIZE * aspectRatio;
        }
      }

      setPreviewDimensions({ width: previewWidth, height: previewHeight });
      setSourceImage(img);
    };

    img.onerror = () => {
      console.error('Failed to load image for preview');
    };

    img.src = URL.createObjectURL(sourceFile);

    return () => {
      if (img.src) URL.revokeObjectURL(img.src);
    };
  }, [isOpen, sourceFile, MAX_PREVIEW_SIZE]); // Only reload when sourceFile changes or size config changes

  // Apply filters to preview
  const applyPreview = useCallback(async () => {
    if (!sourceImage || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = previewDimensions.width;
      canvas.height = previewDimensions.height;

      // Create source canvas with scaled image
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = previewDimensions.width;
      sourceCanvas.height = previewDimensions.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) return;

      // Draw scaled source image
      sourceCtx.drawImage(
        sourceImage,
        0, 0, sourceImage.width, sourceImage.height,
        0, 0, previewDimensions.width, previewDimensions.height
      );

      if (previewMode === 'single' && filterType && filterParams) {
        // Single filter preview
        const singleFilterItems: FilterChainItem[] = [{
          id: 'preview-single',
          filterType,
          params: filterParams,
          enabled: true
        }];

        const resultCanvas = await applyFilterChain(sourceCanvas, singleFilterItems);
        ctx.drawImage(resultCanvas, 0, 0);

      } else if (previewMode === 'chain' && chainItems) {
        // Filter chain preview
        const resultCanvas = await applyFilterChain(sourceCanvas, chainItems);
        ctx.drawImage(resultCanvas, 0, 0);

      } else {
        // No filter, just show the source
        ctx.drawImage(sourceCanvas, 0, 0);
      }

    } catch (error) {
      console.error('Preview processing error:', error);
      // Show source image on error
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && sourceImage) {
        ctx.drawImage(
          sourceImage,
          0, 0, sourceImage.width, sourceImage.height,
          0, 0, previewDimensions.width, previewDimensions.height
        );
      }
    } finally {
      setIsProcessing(false);
    }
  }, [sourceImage, previewDimensions, previewMode, filterType, filterParams, chainItems]);

  // Apply preview when parameters change
  useEffect(() => {
    if (sourceImage && previewDimensions.width > 0) {
      applyPreview();
    }
  }, [sourceImage, previewDimensions, filterType, filterParams, chainItems, applyPreview]);

  // Real-time updates for filter editor
  useEffect(() => {
    if (realTimeUpdate && isOpen) {
      const debounceTimer = setTimeout(() => {
        applyPreview();
      }, 300); // Debounce for performance

      return () => clearTimeout(debounceTimer);
    }
  }, [realTimeUpdate, isOpen, filterParams, applyPreview]);

  if (!isOpen) return null;

  const containerClass = position === 'sidebar' ? 'preview-sidebar' : 'preview-modal-overlay';
  const modalClass = position === 'sidebar' ? 'preview-sidebar-panel' : 'preview-modal';

  return (
    <div 
      className={containerClass} 
      onClick={position === 'modal' ? onClose : undefined}
    >
      <div 
        className={modalClass} 
        data-size={position === 'sidebar' ? previewSize : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preview-modal-header">
          <h3>{title}</h3>
          <div className="preview-modal-info">
            <span className="preview-dimensions">
              {previewDimensions.width} × {previewDimensions.height}
            </span>
            {current && (
              <span className="preview-filename">
                {current.filename}
              </span>
            )}
          </div>
          {position === 'sidebar' && (
            <div className="preview-size-controls">
              {(['S', 'M', 'L'] as const).map(size => (
                <button
                  key={size}
                  className={`size-btn ${previewSize === size ? 'active' : ''} ${sizeTransitioning ? 'transitioning' : ''}`}
                  onClick={() => {
                    if (size !== previewSize) {
                      setSizeTransitioning(true);
                      setTimeout(() => {
                        setPreviewSize(size);
                        setTimeout(() => setSizeTransitioning(false), 400);
                      }, 50);
                    }
                  }}
                  title={`Size ${size}: ${getSizeConfig(size).maxSize}px`}
                  disabled={sizeTransitioning}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
          <button className="preview-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="preview-modal-body">
          <div className="preview-container">
            {isProcessing && (
              <div className="preview-loading">
                <div className="preview-spinner"></div>
                <span>Processing...</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`preview-canvas ${isProcessing ? 'processing' : ''}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        <div className="preview-modal-footer">
          <div className="preview-controls">
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};