import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store';
import { applyFilterChain } from '../utils/filterChain';
import type { FilterChainItem, FilterType } from '../types';
import type { FilterParams } from '../store';
import { decodeTiffWithUTIF } from '../utils/utif';
import { UTIF_OPTIONS } from '../config';

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
  stepIndex?: number; // For chain editing, which step to edit
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });
  const [sizeTransitioning, setSizeTransitioning] = useState(false);
  
  const { current } = useStore();

  // Maximum preview size based on size setting
  const getSizeConfig = (size: 'S' | 'M' | 'L') => {
    switch (size) {
      case 'S': return { maxSize: 450, width: 480 }; // 1.5x
      case 'M': return { maxSize: 675, width: 705 }; // 1.5x
      case 'L': return { maxSize: 900, width: 930 }; // 1.5x
      default: return { maxSize: 675, width: 705 };
    }
  };
  
  const currentSizeConfig = getSizeConfig(previewSize);
  // Predetermined maximum size (per S/M/L in sidebar; fixed cap in modal)
  const maxPreviewSize = position === 'sidebar' ? currentSizeConfig.maxSize : 800;

  // Keep track of current object URL to avoid StrictMode early revocation
  const objectUrlRef = useRef<string | null>(null);

  // Load source image (only when opening or source file changes)
  useEffect(() => {
    if (!isOpen || !sourceFile) return;

    // Determine file extension to handle TIFF via UTIF
    const name = (sourceFile as any).name as string | undefined;
    const ext = name ? name.split('.').pop()?.toLowerCase() : undefined;

    // Cancel flag to ignore late events
    let cancelled = false;

    const handleLoaded = (img: HTMLImageElement) => {
      if (cancelled) return;
      const aspectRatio = img.width / img.height;
      let previewWidth = img.width;
      let previewHeight = img.height;
      const cap = maxPreviewSize;
      if (img.width > cap || img.height > cap) {
        if (img.width > img.height) {
          previewWidth = cap;
          previewHeight = cap / aspectRatio;
        } else {
          previewHeight = cap;
          previewWidth = cap * aspectRatio;
        }
      }
      setPreviewDimensions({ width: previewWidth, height: previewHeight });
      setSourceImage(img);
    };

    if (ext === 'tif' || ext === 'tiff') {
      // Decode TIFF using UTIF utilities
      decodeTiffWithUTIF(sourceFile, UTIF_OPTIONS)
        .then(handleLoaded)
        .catch((err) => {
          if (!cancelled) console.error('Failed to decode TIFF for preview:', err);
        });
      return () => { cancelled = true; };
    }

    // Default path: use FileReader to avoid blob URL revoke races in StrictMode
    const img = new Image();
    img.onload = () => handleLoaded(img);
    img.onerror = (e) => {
      if (!cancelled) console.error('Failed to load image for preview', e);
    };

    let reader: FileReader | null = new FileReader();
    reader.onload = () => {
      if (cancelled) return;
      try {
        img.src = (reader!.result as string);
      } catch (e) {
        console.error('Failed to set preview image src', e);
      }
    };
    reader.onerror = (e) => {
      if (!cancelled) console.error('Failed to read file for preview', e);
    };
    reader.readAsDataURL(sourceFile);

    return () => {
      // Abort any in-flight read and mark cancelled
      cancelled = true;
      try { reader?.abort(); } catch {}
      reader = null;
    };
  }, [isOpen, sourceFile]); // Load once per file/modal open; sizing handled separately

  // No-op unmount cleanup (object URLs not used for standard images now)

  // Recompute preview dimensions if container limits change after image loaded
  useEffect(() => {
    if (!sourceImage) return;
    const img = sourceImage;
    const aspectRatio = img.width / img.height;
    let previewWidth = img.width;
    let previewHeight = img.height;
    const cap = maxPreviewSize;
    if (img.width > cap || img.height > cap) {
      if (img.width > img.height) {
        previewWidth = cap;
        previewHeight = cap / aspectRatio;
      } else {
        previewHeight = cap;
        previewWidth = cap * aspectRatio;
      }
    }
    // Only update state if changed to avoid loops
    if (Math.round(previewWidth) !== Math.round(previewDimensions.width) || Math.round(previewHeight) !== Math.round(previewDimensions.height)) {
      setPreviewDimensions({ width: previewWidth, height: previewHeight });
    }
  }, [maxPreviewSize, sourceImage]);

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
                      // Apply size immediately for snappier response
                      setSizeTransitioning(true);
                      setPreviewSize(size);
                      // End transition state after short duration for CSS animations
                      setTimeout(() => setSizeTransitioning(false), 200);
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
        </div>

        <div className="preview-modal-body" ref={bodyRef}>
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
            {/* Close button removed - can close via overlay click or other interactions */}
          </div>
        </div>
      </div>
    </div>
  );
};
