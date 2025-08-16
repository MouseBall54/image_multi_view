import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef, useCallback } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, RESPECT_EXIF, WHEEL_ZOOM_STEP, SHOW_FOLDER_LABEL, UTIF_OPTIONS } from "../config";
import { Minimap } from "./Minimap";
import { AppMode, FolderKey, FilterType, DrawableImage } from "../types";
import { decodeTiffWithUTIF } from '../utils/utif';
import * as Filters from "../utils/filters";
import { FilterParams } from "../store";

type Props = {
  file?: File;
  label: string;
  isReference?: boolean;
  cache: Map<string, DrawableImage>;
  appMode: AppMode;
  overrideScale?: number;
  refPoint?: { x: number, y: number } | null;
  onSetRefPoint?: (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => void;
  folderKey: FolderKey | number; // Allow number for analysis mode
  onClick?: (key: FolderKey | number) => void;
  isActive?: boolean;
  overrideFilterType?: FilterType;
  overrideFilterParams?: FilterParams;
};

export interface ImageCanvasHandle {
  drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ file, label, isReference, cache, appMode, overrideScale, refPoint, onSetRefPoint, folderKey, onClick, isActive, overrideFilterType, overrideFilterParams }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImage, setSourceImage] = useState<DrawableImage | null>(null);
  const [processedImage, setProcessedImage] = useState<DrawableImage | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const { 
    viewport, setViewport, setFitScaleFn, 
    pinpointMouseMode, setPinpointScale, 
    pinpointGlobalScale, setPinpointGlobalScale, showMinimap, showGrid, gridColor,
    pinpointRotations, viewerFilters, viewerFilterParams, indicator, isCvReady
  } = useStore();

  // Effect to load the source image from file
  useEffect(() => {
    let revoked = false;
    if (!file) { 
      setSourceImage(null);
      return; 
    }
    const cacheKey = `${label}-${file.name}`;
    const cachedImage = cache.get(cacheKey);
    if (cachedImage) { 
      setSourceImage(cachedImage); 
      return; 
    }
    (async () => {
      try {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let newImage: DrawableImage;
        if (ext === 'tif' || ext === 'tiff') {
          const imgElement = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
          newImage = await createImageBitmap(imgElement);
        } else {
          const opts: ImageBitmapOptions = RESPECT_EXIF ? { imageOrientation: "from-image" as any } : {};
          newImage = await createImageBitmap(file, opts);
        }
        if (!revoked) {
          cache.set(cacheKey, newImage);
          setSourceImage(newImage);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        if (!revoked) setSourceImage(null);
      }
    })();
    return () => { revoked = true; };
  }, [file, label, cache]);

  // Effect to process the image whenever the source or filters change
  useEffect(() => {
    // Determine the filter and params to use (override takes precedence)
    const filter = overrideFilterType ?? (typeof folderKey === 'string' ? viewerFilters[folderKey] : 'none') ?? 'none';
    const params = overrideFilterParams ?? (typeof folderKey === 'string' ? viewerFilterParams[folderKey] : undefined);

    if (!sourceImage) {
      setProcessedImage(null);
      return;
    }

    // If no filter, just use the source image.
    if (filter === 'none') {
      setProcessedImage(sourceImage);
      return;
    }

    // Defer OpenCV filters until the library is ready.
    const isCvFilter = ['dft', 'dct', 'wavelet'].includes(filter);
    if (isCvFilter && !isCvReady) {
      // Optionally, you could set a "processing" or "waiting" state here.
      return;
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = sourceImage.width;
    offscreenCanvas.height = sourceImage.height;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return;

    // Handle CSS filters
    const cssFilters: Partial<Record<FilterType, string>> = {
      'grayscale': 'grayscale(100%)',
      'invert': 'invert(100%)',
      'sepia': 'sepia(100%)',
    };

    if (filter in cssFilters) {
      ctx.filter = cssFilters[filter as keyof typeof cssFilters]!;
      ctx.drawImage(sourceImage, 0, 0);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(sourceImage, 0, 0);
    }

    // Apply canvas-based filters
    switch (filter) {
      case 'linearstretch': Filters.applyLinearStretch(ctx); break;
      case 'histogramequalization': Filters.applyHistogramEqualization(ctx); break;
      case 'laplacian': Filters.applyLaplacian(ctx); break;
      case 'highpass': Filters.applyHighpass(ctx); break;
      case 'prewitt': Filters.applyPrewitt(ctx); break;
      case 'scharr': Filters.applyScharr(ctx); break;
      case 'sobel': Filters.applySobel(ctx); break;
      case 'robertscross': Filters.applyRobertsCross(ctx); break;
      case 'log': if (params) Filters.applyLoG(ctx, params); break;
      case 'dog': if (params) Filters.applyDoG(ctx, params); break;
      case 'marrhildreth': if (params) Filters.applyMarrHildreth(ctx, params); break;
      case 'gaussianblur': if (params) Filters.applyGaussianBlur(ctx, params); break;
      case 'boxblur': if (params) Filters.applyBoxBlur(ctx, params); break;
      case 'median': if (params) Filters.applyMedian(ctx, params); break;
      case 'weightedmedian': if (params) Filters.applyWeightedMedian(ctx, params); break;
      case 'alphatrimmedmean': if (params) Filters.applyAlphaTrimmedMean(ctx, params); break;
      case 'localhistogramequalization': if (params) Filters.applyLocalHistogramEqualization(ctx, params); break;
      case 'adaptivehistogramequalization': if (params) Filters.applyAdaptiveHistogramEqualization(ctx, params); break;
      case 'sharpen': if (params) Filters.applySharpen(ctx, params); break;
      case 'canny': if (params) Filters.applyCanny(ctx, params); break;
      case 'clahe': if (params) Filters.applyClahe(ctx, params); break;
      case 'gammacorrection': if (params) Filters.applyGammaCorrection(ctx, params); break;
      case 'bilateral': if (params) Filters.applyBilateralFilter(ctx, params); break;
      case 'nonlocalmeans': if (params) Filters.applyNonLocalMeans(ctx, params); break;
      case 'anisotropicdiffusion': if (params) Filters.applyAnisotropicDiffusion(ctx, params); break;
      case 'unsharpmask': if (params) Filters.applyUnsharpMask(ctx, params); break;
      case 'gabor': if (params) Filters.applyGabor(ctx, params); break;
      case 'lawstextureenergy': if (params) Filters.applyLawsTextureEnergy(ctx, params); break;
      case 'lbp': Filters.applyLbp(ctx); break;
      case 'guided': if (params) Filters.applyGuidedFilter(ctx, params); break;
      // OpenCV filters
      case 'dft': if (isCvReady) Filters.applyDft(ctx); break;
      case 'dct': if (isCvReady) Filters.applyDct(ctx); break;
      case 'wavelet': if (isCvReady) Filters.applyWavelet(ctx); break;
    }

    createImageBitmap(offscreenCanvas).then(setProcessedImage);

  }, [sourceImage, viewerFilters, viewerFilterParams, folderKey, isCvReady, overrideFilterType, overrideFilterParams]);

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, currentImage: DrawableImage, withCrosshair: boolean) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    const individualScale = overrideScale ?? viewport.scale;
    const scale = appMode === 'pinpoint' ? individualScale * pinpointGlobalScale : individualScale;
    
    const drawW = currentImage.width * scale;
    const drawH = currentImage.height * scale;
    let x = 0, y = 0;
    let centerX = 0, centerY = 0;

    if (appMode === 'pinpoint' && typeof folderKey === 'string') {
      const currentRefPoint = refPoint || { x: 0.5, y: 0.5 };
      const refScreenX = viewport.refScreenX ?? (width / 2);
      const refScreenY = viewport.refScreenY ?? (height / 2);
      const refImgX = currentRefPoint.x * currentImage.width;
      const refImgY = currentRefPoint.y * currentImage.height;
      x = Math.round(refScreenX - (refImgX * scale));
      y = Math.round(refScreenY - (refImgY * scale));
      const angle = pinpointRotations[folderKey] || 0;
      centerX = x + drawW / 2;
      centerY = y + drawH / 2;
      if (angle !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
      }
    } else {
      const cx = (viewport.cx || 0.5) * currentImage.width;
      const cy = (viewport.cy || 0.5) * currentImage.height;
      x = Math.round((width / 2) - (cx * scale));
      y = Math.round((height / 2) - (cy * scale));
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(currentImage, x, y, drawW, drawH);
    
    ctx.restore();

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical lines (rule of thirds)
      const v1 = width / 3;
      const v2 = 2 * width / 3;
      ctx.beginPath();
      ctx.moveTo(v1, 0);
      ctx.lineTo(v1, height);
      ctx.moveTo(v2, 0);
      ctx.lineTo(v2, height);
      ctx.stroke();

      // Horizontal lines (rule of thirds)
      const h1 = height / 3;
      const h2 = 2 * height / 3;
      ctx.beginPath();
      ctx.moveTo(0, h1);
      ctx.lineTo(width, h1);
      ctx.moveTo(0, h2);
      ctx.lineTo(width, h2);
      ctx.stroke();

      ctx.restore();
    }

    if (isRotating) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(centerX - 15, centerY);
      ctx.lineTo(centerX + 15, centerY);
      ctx.moveTo(centerX, centerY - 15);
      ctx.lineTo(centerX, centerY + 15);
      ctx.stroke();
      ctx.restore();
    }

    if (appMode === 'pinpoint' && refPoint && withCrosshair) {
      const refScreenX = viewport.refScreenX ?? (width / 2);
      const refScreenY = viewport.refScreenY ?? (height / 2);
      ctx.save();
      ctx.translate(refScreenX, refScreenY);
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(0, 15);
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }, [viewport, appMode, refPoint, overrideScale, pinpointGlobalScale, pinpointRotations, folderKey, isRotating, showGrid, gridColor]);

  useImperativeHandle(ref, () => ({
    drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean) => {
      if (processedImage) {
        drawImage(ctx, processedImage, withCrosshair);
      }
    },
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    if (isReference) {
      const calculateFitScale = () => {
        if (!canvasRef.current || !sourceImage) return 1;
        const { width, height } = canvasRef.current.getBoundingClientRect();
        const scale = Math.min(width / sourceImage.width, height / sourceImage.height);
        return scale;
      };
      setFitScaleFn(calculateFitScale);
    }
  }, [sourceImage, isReference, setFitScaleFn]);

  // Effect to draw the processed image to the visible canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !processedImage) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    drawImage(ctx, processedImage, true);
  }, [processedImage, drawImage, viewport, pinpointGlobalScale, pinpointRotations, isRotating, showGrid, gridColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage || appMode !== 'pinpoint' || !onSetRefPoint || pinpointMouseMode !== 'pin' || typeof folderKey !== 'string') return;
    const handleClick = (e: MouseEvent) => {
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const canvasX = e.clientX - left;
      const canvasY = e.clientY - top;
      const individualScale = overrideScale ?? viewport.scale;
      const scale = individualScale * pinpointGlobalScale;
      const currentRefPoint = refPoint || { x: 0.5, y: 0.5 };
      const refScreenX = viewport.refScreenX || (width / 2);
      const refScreenY = viewport.refScreenY || (height / 2);
      const refImgX = currentRefPoint.x * sourceImage.width;
      const refImgY = currentRefPoint.y * sourceImage.height;
      const drawX = refScreenX - (refImgX * scale);
      const drawY = refScreenY - (refImgY * scale);
      const imgX = (canvasX - drawX) / scale;
      const imgY = (canvasY - drawY) / scale;
      if (imgX >= 0 && imgX <= sourceImage.width && imgY >= 0 && imgY <= sourceImage.height) {
        onSetRefPoint(folderKey, { x: imgX / sourceImage.width, y: imgY / sourceImage.height }, { x: canvasX, y: canvasY });
      }
    };
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [sourceImage, appMode, onSetRefPoint, viewport, folderKey, refPoint, pinpointMouseMode, overrideScale, pinpointGlobalScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCtxMenu = (e: MouseEvent) => {
      if (appMode === 'pinpoint') {
        e.preventDefault();
        const { pinpointMouseMode, setPinpointMouseMode } = useStore.getState();
        setPinpointMouseMode(pinpointMouseMode === 'pin' ? 'pan' : 'pin');
      }
    };

    canvas.addEventListener('contextmenu', handleCtxMenu);
    return () => canvas.removeEventListener('contextmenu', handleCtxMenu);
  }, [appMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;
    let isDown = false;
    let lastX = 0, lastY = 0;
    let dragMode: 'pan' | 'rotate' | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;
      const { viewport: currentViewport, pinpointGlobalScale: currentGlobalScale, setPinpointGlobalScale } = useStore.getState();
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : (1 / WHEEL_ZOOM_STEP);
      if (appMode === 'pinpoint') {
        const preScale = (overrideScale ?? currentViewport.scale) * currentGlobalScale;
        const nextGlobalScale = currentGlobalScale * delta;
        const nextScale = (overrideScale ?? currentViewport.scale) * nextGlobalScale;
        if (nextScale > MAX_ZOOM || nextScale < MIN_ZOOM) return;
        setPinpointGlobalScale(nextGlobalScale);
        const refScreenX = currentViewport.refScreenX || (width / 2);
        const refScreenY = currentViewport.refScreenY || (height / 2);
        const nextRefScreenX = mx + (refScreenX - mx) * (nextScale / preScale);
        const nextRefScreenY = my + (refScreenY - my) * (nextScale / preScale);
        setViewport({ refScreenX: nextRefScreenX, refScreenY: nextRefScreenY });
      } else {
        const preScale = currentViewport.scale;
        let nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preScale * delta));
        if (nextScale === preScale) return;
        let { cx, cy } = currentViewport;
        if (CURSOR_ZOOM_CENTERED) {
          const imgW = sourceImage.width, imgH = sourceImage.height;
          const drawW = imgW * preScale;
          const x = (width / 2) - ((cx || 0.5) * imgW * preScale);
          const y = (height / 2) - ((cy || 0.5) * imgH * preScale);
          const imgX = (mx - x) / drawW;
          const imgY = (my - y) / drawW;
          const drawW2 = imgW * nextScale;
          const x2 = mx - imgX * drawW2;
          const y2 = my - imgY * drawW2;
          const newCxPx = ((width / 2) - x2) / nextScale;
          const newCyPx = ((height / 2) - y2) / nextScale;
          cx = newCxPx / imgW;
          cy = newCyPx / imgH;
        }
        setViewport({ scale: nextScale, cx, cy });
      }
    };
    const onDown = (e: MouseEvent) => {
      if (appMode === 'pinpoint' && typeof folderKey === 'string') {
        if (e.altKey) {
          dragMode = 'rotate';
          setIsRotating(true);
          canvas.style.cursor = 'ew-resize';
        } else if (pinpointMouseMode === 'pan') {
          dragMode = 'pan';
          canvas.style.cursor = 'grabbing';
        }
      } else if (appMode !== 'pinpoint') {
        dragMode = 'pan';
        canvas.style.cursor = 'grabbing';
      }
      if (dragMode) {
        isDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onUp = () => { 
      isDown = false; 
      dragMode = null;
      setIsRotating(false);
      canvas.style.cursor = appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab'; 
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown || !dragMode) return;
      e.preventDefault();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (dragMode === 'rotate' && typeof folderKey === 'string') {
        const { pinpointRotations, setPinpointRotation } = useStore.getState();
        const currentAngle = pinpointRotations[folderKey] || 0;
        const newAngle = currentAngle + dx / 2; 
        const roundedAngle = Math.round(newAngle * 10) / 10;
        const normalizedAngle = (roundedAngle % 360 + 360) % 360;
        setPinpointRotation(folderKey, normalizedAngle);
        return;
      }
      const { viewport: currentViewport } = useStore.getState();
      if (appMode === 'pinpoint') {
        const refScreenX = (currentViewport.refScreenX || (canvas.width / 2)) + dx;
        const refScreenY = (currentViewport.refScreenY || (canvas.height / 2)) + dy;
        setViewport({ refScreenX, refScreenY });
      } else {
        const imgW = sourceImage.width, imgH = sourceImage.height;
        const dpX = -dx / (currentViewport.scale * imgW);
        const dpY = -dy / (currentViewport.scale * imgH);
        let cx = (currentViewport.cx || 0.5) + dpX;
        let cy = (currentViewport.cy || 0.5) + dpY;
        cx = Math.min(1.2, Math.max(-0.2, cx));
        cy = Math.min(1.2, Math.max(-0.2, cy));
        setViewport({ cx, cy });
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
    };
  }, [sourceImage, setViewport, appMode, pinpointMouseMode, overrideScale, folderKey, setPinpointScale]);

  const rotationAngle = (appMode === 'pinpoint' && typeof folderKey === 'string') ? (pinpointRotations[folderKey] || 0) : 0;

  const handleContainerClick = () => {
    // In analysis mode, clicks are handled by the dedicated button.
    // For other modes, the passed onClick (if any) is triggered.
    if (appMode !== 'analysis' && onClick) {
      onClick(folderKey);
    }
  };

  return (
    <div className={`viewer ${isActive ? 'active' : ''}`} onClick={handleContainerClick}>
      <div className="viewer-header">
        {SHOW_FOLDER_LABEL && <div className="viewer__label">{label}</div>}
        {appMode === 'analysis' && (
          <button 
            className="viewer__filter-button" 
            title={`Filter Settings for ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick(folderKey);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
        )}
      </div>
      
      {appMode === 'pinpoint' && rotationAngle !== 0 && (
        <div className="viewer__rotation-angle">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L22 2"/></svg>
          <span>{rotationAngle.toFixed(1)}°</span>
        </div>
      )}

      <canvas ref={canvasRef} className="viewer__canvas" style={{ cursor: appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab' }} />
      {!processedImage && <div className="viewer__placeholder">{file ? 'Processing...' : (appMode === 'pinpoint' ? 'Click Button Above to Select' : 'No Image')}</div>}
      
      {indicator && processedImage && canvasRef.current && appMode !== 'pinpoint' && (
        <div
          key={indicator.key}
          className="indicator-dot"
          style={{
            left: `${(viewport.cx || 0.5) * 100}%`,
            top: `${(viewport.cy || 0.5) * 100}%`,
          }}
        />
      )}
      {showMinimap && sourceImage instanceof ImageBitmap && <Minimap bitmap={sourceImage} viewport={viewport} />}
    </div>
  );
});
