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
  filteredCache?: Map<string, DrawableImage>;
  appMode: AppMode;
  overrideScale?: number;
  refPoint?: { x: number, y: number } | null;
  onSetRefPoint?: (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => void;
  folderKey: FolderKey | number; // Allow number for analysis mode
  onClick?: (key: FolderKey | number) => void;
  isActive?: boolean;
  overrideFilterType?: FilterType;
  overrideFilterParams?: FilterParams;
  rotation?: number;
};

export interface ImageCanvasHandle {
  drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean, withMinimap?: boolean) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ file, label, isReference, cache, filteredCache, appMode, overrideScale, refPoint, onSetRefPoint, folderKey, onClick, isActive, overrideFilterType, overrideFilterParams, rotation }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImage, setSourceImage] = useState<DrawableImage | null>(null);
  const [processedImage, setProcessedImage] = useState<DrawableImage | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const { 
    viewport, setViewport, setFitScaleFn, 
    pinpointMouseMode, setPinpointScale, 
    pinpointGlobalScale, showMinimap, showGrid, gridColor,
    pinpointRotations, pinpointGlobalRotation, viewerFilters, viewerFilterParams, indicator,
    activeCanvasKey, compareRotation, minimapWidth, minimapPosition
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
    const processImage = async () => {
      const filter = overrideFilterType ?? (typeof folderKey === 'string' ? viewerFilters[folderKey] : 'none') ?? 'none';
      const params = overrideFilterParams ?? (typeof folderKey === 'string' ? viewerFilterParams[folderKey] : undefined);

      if (!sourceImage || !file) {
        setProcessedImage(null);
        return;
      }

      if (filter === 'none') {
        setProcessedImage(sourceImage);
        return;
      }

      // --- Caching Logic ---
      const filterCacheKey = filteredCache ? `${String(folderKey)}|${file.name}|${filter}|${JSON.stringify(params)}` : '';
      if (filteredCache && filterCacheKey) {
        const cachedImage = filteredCache.get(filterCacheKey);
        if (cachedImage) {
          setProcessedImage(cachedImage);
          return;
        }
      }

      // All filters proceed; frequency-domain ones are implemented without external readiness

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = sourceImage.width;
      offscreenCanvas.height = sourceImage.height;
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return;

      const cssFilters: Partial<Record<FilterType, string>> = {
        'grayscale': 'grayscale(100%)', 'invert': 'invert(100%)', 'sepia': 'sepia(100%)',
      };

      if (filter in cssFilters) {
        ctx.filter = cssFilters[filter as keyof typeof cssFilters]!;
        ctx.drawImage(sourceImage, 0, 0);
        ctx.filter = 'none';
      } else {
        ctx.drawImage(sourceImage, 0, 0);
      }

      switch (filter) {
        case 'linearstretch': Filters.applyLinearStretch(ctx); break;
        case 'histogramequalization': Filters.applyHistogramEqualization(ctx); break;
        case 'laplacian': Filters.applyLaplacian(ctx); break;
        case 'highpass': Filters.applyHighpass(ctx); break;
        case 'prewitt': if (params) await Filters.applyPrewitt(ctx, params); break;
        case 'scharr': Filters.applyScharr(ctx); break;
        case 'sobel': Filters.applySobel(ctx); break;
        case 'robertscross': if (params) await Filters.applyRobertsCross(ctx, params); break;
        case 'log': if (params) await Filters.applyLoG(ctx, params); break;
        case 'dog': if (params) await Filters.applyDoG(ctx, params); break;
        case 'marrhildreth': if (params) await Filters.applyMarrHildreth(ctx, params); break;
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
        case 'edgepreserving': if (params) Filters.applyEdgePreserving(ctx, params); break;
        case 'dft': Filters.applyDft(ctx); break;
        case 'dct': Filters.applyDct(ctx); break;
        case 'wavelet': Filters.applyWavelet(ctx); break;
        case 'morph_open': if (params) await Filters.applyMorphOpen(ctx, params); break;
        case 'morph_close': if (params) await Filters.applyMorphClose(ctx, params); break;
        case 'morph_tophat': if (params) await Filters.applyMorphTopHat(ctx, params); break;
        case 'morph_blackhat': if (params) await Filters.applyMorphBlackHat(ctx, params); break;
        case 'morph_gradient': if (params) await Filters.applyMorphGradient(ctx, params); break;
        case 'distancetransform': if (params) await Filters.applyDistanceTransform(ctx, params); break;
      }

      const finalImage = await createImageBitmap(offscreenCanvas);
      if (filteredCache && filterCacheKey) {
        filteredCache.set(filterCacheKey, finalImage);
      }
      setProcessedImage(finalImage);
    };

    processImage();

  }, [sourceImage, file, viewerFilters, viewerFilterParams, folderKey, overrideFilterType, overrideFilterParams, filteredCache]);

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
      const localAngle = pinpointRotations[folderKey] || 0;
      const globalAngle = pinpointGlobalRotation || 0;
      const totalAngle = localAngle + globalAngle;
      centerX = x + drawW / 2;
      centerY = y + drawH / 2;
      if (totalAngle !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate(totalAngle * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
      }
    } else {
      const cx = (viewport.cx || 0.5) * currentImage.width;
      const cy = (viewport.cy || 0.5) * currentImage.height;
      x = Math.round((width / 2) - (cx * scale));
      y = Math.round((height / 2) - (cy * scale));
      const angle = appMode === 'analysis' ? (rotation || 0) : (appMode === 'compare' ? (compareRotation || 0) : 0);
      if (angle !== 0) {
        centerX = x + drawW / 2;
        centerY = y + drawH / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
      }
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
  }, [viewport, appMode, refPoint, overrideScale, pinpointGlobalScale, pinpointRotations, pinpointGlobalRotation, folderKey, isRotating, showGrid, gridColor, rotation, compareRotation]);

  useImperativeHandle(ref, () => ({
    drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean, withMinimap: boolean = false) => {
      if (processedImage) {
        drawImage(ctx, processedImage, withCrosshair);
        
        // 미니맵도 캡처에 포함
        if (withMinimap && showMinimap && sourceImage instanceof ImageBitmap && canvasSize) {
          const minimapCanvas = document.createElement('canvas');
          const MINIMAP_WIDTH = 150;
          const aspectRatio = sourceImage.height / sourceImage.width;
          const minimapHeight = MINIMAP_WIDTH * aspectRatio;
          
          minimapCanvas.width = MINIMAP_WIDTH;
          minimapCanvas.height = minimapHeight;
          const minimapCtx = minimapCanvas.getContext('2d');
          
      if (minimapCtx) {
            // 미니맵 이미지 그리기 (회전 반영)
            const { pinpointRotations, pinpointGlobalRotation, compareRotation: compareRot } = useStore.getState();
            let angleDeg = 0;
            if (appMode === 'pinpoint') {
              const localAngle = (typeof folderKey === 'string') ? (pinpointRotations[folderKey] || 0) : 0;
              const globalAngle = (pinpointGlobalRotation || 0);
              angleDeg = localAngle + globalAngle;
            } else if (appMode === 'analysis') {
              angleDeg = rotation || 0;
            } else if (appMode === 'compare') {
              angleDeg = compareRot || 0;
            }
            const angleRad = angleDeg * Math.PI / 180;
            minimapCtx.save();
            if ((appMode === 'pinpoint' || appMode === 'analysis') && angleRad !== 0) {
              minimapCtx.translate(MINIMAP_WIDTH / 2, minimapHeight / 2);
              minimapCtx.rotate(angleRad);
              minimapCtx.translate(-MINIMAP_WIDTH / 2, -minimapHeight / 2);
            }

            minimapCtx.drawImage(sourceImage, 0, 0, MINIMAP_WIDTH, minimapHeight);
            
            // 뷰포트 사각형 그리기 (Pinpoint 모드와 일반 모드 구분)
            if (appMode === 'pinpoint' && typeof folderKey === 'string') {
              // Pinpoint 모드: 회전까지 고려한 뷰포트 폴리곤
              const individualScale = overrideScale ?? viewport.scale;
              const totalScale = individualScale * pinpointGlobalScale;
              const currentRefPoint = refPoint || { x: 0.5, y: 0.5 };
              const refScreenX = viewport.refScreenX || (canvasSize.width / 2);
              const refScreenY = viewport.refScreenY || (canvasSize.height / 2);
              const imageWidth = sourceImage.width;
              const imageHeight = sourceImage.height;
              const scaledImageWidth = imageWidth * totalScale;
              const scaledImageHeight = imageHeight * totalScale;
              const refImgX = currentRefPoint.x * imageWidth;
              const refImgY = currentRefPoint.y * imageHeight;
              const drawX = refScreenX - (refImgX * totalScale);
              const drawY = refScreenY - (refImgY * totalScale);

              const { pinpointRotations, pinpointGlobalRotation } = useStore.getState();
              const localAngle = pinpointRotations[folderKey] || 0;
              const globalAngle = pinpointGlobalRotation || 0;
              const angle = (localAngle + globalAngle) * Math.PI / 180;
              const centerX = drawX + (scaledImageWidth / 2);
              const centerY = drawY + (scaledImageHeight / 2);
              const cos = Math.cos(-angle);
              const sin = Math.sin(-angle);

              const cornersCanvas = [
                { x: 0, y: 0 },
                { x: canvasSize.width, y: 0 },
                { x: canvasSize.width, y: canvasSize.height },
                { x: 0, y: canvasSize.height },
              ];
              const cornersMini = cornersCanvas.map(({ x: cx, y: cy }) => {
                const dx = cx - centerX;
                const dy = cy - centerY;
                const rx = centerX + dx * cos - dy * sin;
                const ry = centerY + dx * sin + dy * cos;
                const imgX = (rx - drawX) / totalScale;
                const imgY = (ry - drawY) / totalScale;
                return {
                  x: (imgX / imageWidth) * MINIMAP_WIDTH,
                  y: (imgY / imageHeight) * minimapHeight,
                };
              });

              minimapCtx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
              minimapCtx.lineWidth = 2;
              minimapCtx.fillStyle = 'rgba(255, 0, 0, 0.2)';
              minimapCtx.beginPath();
              minimapCtx.moveTo(cornersMini[0].x, cornersMini[0].y);
              for (let i = 1; i < cornersMini.length; i++) minimapCtx.lineTo(cornersMini[i].x, cornersMini[i].y);
              minimapCtx.closePath();
              minimapCtx.stroke();
              minimapCtx.fill();
            } else {
              // 일반 모드: 기존 로직
              const { scale, cx = 0.5, cy = 0.5 } = viewport;
              if (scale) {
                const imageWidth = sourceImage.width;
                const imageHeight = sourceImage.height;
                const scaledImageWidth = imageWidth * scale;
                const scaledImageHeight = imageHeight * scale;
                const visibleWidthRatio = Math.min(1, canvasSize.width / scaledImageWidth);
                const visibleHeightRatio = Math.min(1, canvasSize.height / scaledImageHeight);
                const rectWidth = MINIMAP_WIDTH * visibleWidthRatio;
                const rectHeight = minimapHeight * visibleHeightRatio;
                const rectX = (cx * MINIMAP_WIDTH) - (rectWidth / 2);
                const rectY = (cy * minimapHeight) - (rectHeight / 2);

                minimapCtx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
                minimapCtx.lineWidth = 2;
                minimapCtx.strokeRect(
                  Math.max(0, Math.min(MINIMAP_WIDTH - rectWidth, rectX)),
                  Math.max(0, Math.min(minimapHeight - rectHeight, rectY)),
                  Math.min(rectWidth, MINIMAP_WIDTH),
                  Math.min(rectHeight, minimapHeight)
                );
                
                minimapCtx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                minimapCtx.fillRect(
                  Math.max(0, Math.min(MINIMAP_WIDTH - rectWidth, rectX)),
                  Math.max(0, Math.min(minimapHeight - rectHeight, rectY)),
                  Math.min(rectWidth, MINIMAP_WIDTH),
                  Math.min(rectHeight, minimapHeight)
                );
              }
            }
            
            // 미니맵 회전 복원
            minimapCtx.restore();

            // 미니맵을 메인 캔버스에 그리기 (사용자 위치 설정)
            const padding = 10;
            const { minimapPosition, minimapWidth } = useStore.getState();
            const MM_W = Math.max(60, Math.min(400, minimapWidth || MINIMAP_WIDTH));
            const MM_H = MM_W * (sourceImage.height / sourceImage.width);
            let minimapX = padding;
            let minimapY = padding;
            switch (minimapPosition) {
              case 'top-left':
                minimapX = padding; minimapY = padding; break;
              case 'top-right':
                minimapX = ctx.canvas.width - MM_W - padding; minimapY = padding; break;
              case 'bottom-left':
                minimapX = padding; minimapY = ctx.canvas.height - MM_H - padding; break;
              case 'bottom-right':
              default:
                minimapX = ctx.canvas.width - MM_W - padding; minimapY = ctx.canvas.height - MM_H - padding; break;
            }

            // 미니맵 배경 (반투명 검은색)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(minimapX - 5, minimapY - 5, MM_W + 10, MM_H + 10);

            // 미니맵 그리기
            // If widths differ from generated canvas, scale drawImage to MM_W/MM_H
            if (MINIMAP_WIDTH !== MM_W) {
              const scaledCanvas = document.createElement('canvas');
              scaledCanvas.width = MM_W;
              scaledCanvas.height = MM_H;
              const sc = scaledCanvas.getContext('2d');
              if (sc) sc.drawImage(minimapCanvas, 0, 0, MM_W, MM_H);
              ctx.drawImage(scaledCanvas, minimapX, minimapY);
            } else {
              ctx.drawImage(minimapCanvas, minimapX, minimapY);
            }
          }
        }
      }
    },
    getCanvas: () => canvasRef.current,
  }));

  // Calculate fit scale function for reference canvas
  const calculateFitScale = useCallback(() => {
    if (!canvasRef.current || !sourceImage) return 1;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const scale = Math.min(width / sourceImage.width, height / sourceImage.height);
    return scale;
  }, [sourceImage]);

  useEffect(() => {
    if (isReference) {
      setFitScaleFn(calculateFitScale);
    }
  }, [calculateFitScale, isReference, setFitScaleFn]);

  // Effect to draw the processed image to the visible canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !processedImage) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    
    // 캔버스 크기 상태 업데이트 (미니맵용)
    setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    
    drawImage(ctx, processedImage, true);
  }, [processedImage, drawImage, viewport, pinpointGlobalScale, pinpointRotations, pinpointGlobalRotation, isRotating, showGrid, gridColor, compareRotation]);

  // Effect to handle canvas resize (레이아웃 변경이나 창 크기 변경 시 자동 리프레시)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      if (processedImage) {
        const ctx = canvas.getContext("2d")!;
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        // 캔버스 크기 상태 업데이트 (미니맵용)
        setCanvasSize({ width: Math.round(width), height: Math.round(height) });
        
        drawImage(ctx, processedImage, true);
      }
      
      // Update fit scale function if this is a reference canvas
      if (isReference && sourceImage) {
        setFitScaleFn(calculateFitScale);
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [processedImage, drawImage, isReference, sourceImage, calculateFitScale, setFitScaleFn]);

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
      // Account for rotation: map the click back by inverse rotation around the image center
      const localAngle = useStore.getState().pinpointRotations[folderKey] || 0;
      const globalAngle = useStore.getState().pinpointGlobalRotation || 0;
      const totalAngle = (localAngle + globalAngle) * Math.PI / 180;
      let mappedX = canvasX;
      let mappedY = canvasY;
      if (totalAngle !== 0) {
        const centerX = drawX + (sourceImage.width * scale) / 2;
        const centerY = drawY + (sourceImage.height * scale) / 2;
        const dx = canvasX - centerX;
        const dy = canvasY - centerY;
        const cos = Math.cos(totalAngle);
        const sin = Math.sin(totalAngle);
        // inverse rotation by -totalAngle
        mappedX = centerX + dx * cos + dy * sin;
        mappedY = centerY - dx * sin + dy * cos;
      }
      const imgX = (mappedX - drawX) / scale;
      const imgY = (mappedY - drawY) / scale;
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
      e.stopPropagation();
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;
      const { viewport: currentViewport, pinpointGlobalScale: currentGlobalScale, setPinpointGlobalScale } = useStore.getState();
      // Calculate dynamic zoom step - cap at 50% increase per wheel step
      const currentScale = appMode === 'pinpoint' ? 
        ((overrideScale ?? currentViewport.scale) * currentGlobalScale) : 
        currentViewport.scale;
      
      // Cap per-event zoom change to at most 20%
      const MAX_WHEEL_FACTOR = 1.2;
      const step = Math.min(WHEEL_ZOOM_STEP, MAX_WHEEL_FACTOR);
      const delta = e.deltaY < 0 ? step : (1 / step);
      if (appMode === 'pinpoint') {
        // Zoom the canvas under the cursor; also mark it active for consistency
        if (typeof folderKey === 'string') {
          const { setActiveCanvasKey } = useStore.getState();
          setActiveCanvasKey(folderKey);
        }
        const preScale = (overrideScale ?? currentViewport.scale) * currentGlobalScale;
        const desiredNextScale = preScale * delta;
        const maxIn = preScale * MAX_WHEEL_FACTOR;
        const minOut = preScale / MAX_WHEEL_FACTOR;
        const nextScale = e.deltaY < 0 ? Math.min(desiredNextScale, maxIn) : Math.max(desiredNextScale, minOut);
        const nextGlobalScale = nextScale / (overrideScale ?? currentViewport.scale);
        if (nextScale > MAX_ZOOM || nextScale < MIN_ZOOM) return;
        setPinpointGlobalScale(nextGlobalScale);
        const refScreenX = currentViewport.refScreenX || (width / 2);
        const refScreenY = currentViewport.refScreenY || (height / 2);
        const nextRefScreenX = mx + (refScreenX - mx) * (nextScale / preScale);
        const nextRefScreenY = my + (refScreenY - my) * (nextScale / preScale);
        setViewport({ refScreenX: nextRefScreenX, refScreenY: nextRefScreenY });
      } else {
        const preScale = currentViewport.scale;
        // Desired next scale from step
        const desiredNextScale = preScale * delta;
        // Clamp to at most 20% per event
        const maxIn = preScale * MAX_WHEEL_FACTOR;
        const minOut = preScale / MAX_WHEEL_FACTOR;
        let nextScale = e.deltaY < 0 ? Math.min(desiredNextScale, maxIn) : Math.max(desiredNextScale, minOut);
        nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
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
        if (e.altKey) {
          // Global rotation for compare/analysis
          dragMode = 'rotate';
          setIsRotating(true);
          canvas.style.cursor = 'ew-resize';
        } else {
          dragMode = 'pan';
          canvas.style.cursor = 'grabbing';
        }
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
      if (dragMode === 'rotate') {
        if (appMode === 'pinpoint' && typeof folderKey === 'string') {
          const { pinpointRotations, setPinpointRotation } = useStore.getState();
          const currentAngle = pinpointRotations[folderKey] || 0;
          const newAngle = currentAngle + dx / 2;
          const roundedAngle = Math.round(newAngle * 10) / 10;
          const normalizedAngle = (roundedAngle % 360 + 360) % 360;
          setPinpointRotation(folderKey, normalizedAngle);
          return;
        }
        if (appMode === 'compare') {
          const { compareRotation, setCompareRotation } = useStore.getState();
          const newAngle = (compareRotation || 0) + dx / 2;
          const roundedAngle = Math.round(newAngle * 10) / 10;
          const normalizedAngle = (roundedAngle % 360 + 360) % 360;
          setCompareRotation(normalizedAngle);
          return;
        }
        if (appMode === 'analysis') {
          const { analysisRotation, setAnalysisRotation } = useStore.getState();
          const newAngle = (analysisRotation || 0) + dx / 2;
          const roundedAngle = Math.round(newAngle * 10) / 10;
          const normalizedAngle = (roundedAngle % 360 + 360) % 360;
          setAnalysisRotation(normalizedAngle);
          return;
        }
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
    canvas.addEventListener("wheel", onWheel, { passive: false, capture: true });
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

  const rotationAngle = (
    appMode === 'pinpoint' && typeof folderKey === 'string'
      ? (pinpointRotations[folderKey] || 0) + (pinpointGlobalRotation || 0)
      : appMode === 'analysis'
        ? (rotation || 0)
        : appMode === 'compare'
          ? (compareRotation || 0)
        : 0
  );

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
        
      </div>
      
      {appMode === 'pinpoint' && rotationAngle !== 0 && (
        <div className="viewer__rotation-angle">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L22 2"/></svg>
          <span>{rotationAngle.toFixed(1)}°</span>
        </div>
      )}

      <canvas ref={canvasRef} className="viewer__canvas" style={{ cursor: appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab' }} />
      {!processedImage && <div className="viewer__placeholder">{file ? 'Processing...' : (appMode === 'pinpoint' ? 'Click Button Above to Select' : 'No Image')}</div>}
      
      {indicator && processedImage && canvasRef.current && appMode !== 'pinpoint' && (() => {
        const canvas = canvasRef.current;
        const { width: canvasWidth, height: canvasHeight } = canvas.getBoundingClientRect();
        
        // 이미지 좌표를 화면 좌표로 변환
        const imageWidth = processedImage.width;
        const imageHeight = processedImage.height;
        const scale = viewport.scale;
        
        // 이미지가 화면에 그려지는 위치 계산
        const scaledImageWidth = imageWidth * scale;
        const scaledImageHeight = imageHeight * scale;
        const imageX = (canvasWidth / 2) - ((viewport.cx || 0.5) * imageWidth * scale);
        const imageY = (canvasHeight / 2) - ((viewport.cy || 0.5) * imageHeight * scale);
        
        // 사용자가 지정한 이미지 좌표 (indicator.cx, indicator.cy는 상대 좌표)
        const targetImageX = indicator.cx * imageWidth;
        const targetImageY = indicator.cy * imageHeight;
        
        // 화면 좌표로 변환
        const screenX = imageX + (targetImageX * scale);
        const screenY = imageY + (targetImageY * scale);
        
        return (
          <div
            key={indicator.key}
            className="indicator-dot"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              position: 'absolute',
            }}
          />
        );
      })()}
      {showMinimap && sourceImage instanceof ImageBitmap && canvasSize && (
        <Minimap 
          bitmap={sourceImage} 
          viewport={viewport} 
          canvasSize={canvasSize}
          appMode={appMode}
          folderKey={folderKey}
          overrideScale={overrideScale}
          pinpointGlobalScale={pinpointGlobalScale}
          refPoint={refPoint}
          rotationDeg={rotationAngle}
          width={minimapWidth}
          position={minimapPosition}
        />
      )}
    </div>
  );
});
