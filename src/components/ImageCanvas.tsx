import { useEffect, useImperativeHandle, useRef, useState, forwardRef, useCallback } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, RESPECT_EXIF, WHEEL_ZOOM_STEP, SHOW_FOLDER_LABEL, UTIF_OPTIONS } from "../config";
import { Minimap } from "./Minimap";
import { ImageLoadingOverlay } from "./LoadingSpinner";
import { AppMode, FolderKey, FilterType, DrawableImage } from "../types";
import { decodeTiffWithUTIF } from '../utils/utif';
import * as Filters from "../utils/filters";
import { applyFilterChain } from "../utils/filterChain";
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
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [sourceImage, setSourceImage] = useState<DrawableImage | null>(null);
  const [processedImage, setProcessedImage] = useState<DrawableImage | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isProcessingFilter, setIsProcessingFilter] = useState(false);
  const [currentFilterName, setCurrentFilterName] = useState<string>('');
  const [filterProgress, setFilterProgress] = useState({ current: 0, total: 0 });
  const { 
    viewport, setViewport, setFitScaleFn, 
    pinpointMouseMode, 
    pinpointGlobalScale, showMinimap, showGrid, gridColor,
    pinpointRotations, pinpointGlobalRotation, viewerFilters, viewerFilterParams, indicator,
    levelingCapture, addLevelingPoint,
    compareRotation, minimapWidth, minimapPosition,
    setViewerImageSize, setAnalysisImageSize
  } = useStore();

  // Ensure cursor stays crosshair during leveling even if parent wants grab
  useEffect(() => {
    const active = levelingCapture.active && levelingCapture.mode === appMode;
    if (active) {
      document.body.classList.add('leveling-active');
    } else {
      document.body.classList.remove('leveling-active');
    }
    return () => {
      document.body.classList.remove('leveling-active');
    };
  }, [levelingCapture.active, levelingCapture.mode, appMode]);

  // Effect to load the source image from file
  useEffect(() => {
    let revoked = false;
    if (!file) { 
      setSourceImage(null);
      setIsLoadingImage(false);
      return; 
    }
    // Use a stable, viewer-specific cache key to avoid collisions across folders
    const cacheKey = `${String(folderKey)}|${file.name}|${(file as any).size ?? 'na'}|${(file as any).lastModified ?? 'na'}`;
    const cachedImage = cache.get(cacheKey);
    if (cachedImage) { 
      setSourceImage(cachedImage);
      setIsLoadingImage(false);
      // Also record its size for performance estimates
      const size = { width: cachedImage.width as number, height: cachedImage.height as number };
      if (typeof folderKey === 'string') {
        useStore.getState().setViewerImageSize(folderKey as FolderKey, size);
      } else {
        useStore.getState().setAnalysisImageSize(folderKey as number, size);
      }
      return; 
    }
        
    // Start loading animation
    setIsLoadingImage(true);
    
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
          setIsLoadingImage(false);
          // Record size immediately
          const size = { width: (newImage as any).width as number, height: (newImage as any).height as number };
          if (typeof folderKey === 'string') {
            useStore.getState().setViewerImageSize(folderKey as FolderKey, size);
          } else {
            useStore.getState().setAnalysisImageSize(folderKey as number, size);
          }
        }
      } catch (err) {
        console.error('Error loading image:', err);
        if (!revoked) {
          setSourceImage(null);
          setIsLoadingImage(false);
        }
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
        setIsProcessingFilter(false);
        return;
      }

      // Start filter processing animation immediately when filter changes
      if (filter !== 'none') {
        setIsProcessingFilter(true);
        
        // Import ALL_FILTERS dynamically to get filter name
        import('../components/FilterControls').then(({ ALL_FILTERS }) => {
          let filterName = 'Unknown Filter';
          if (filter === 'filterchain' && params?.filterChain) {
            filterName = `Filter Chain (${params.filterChain.length} filters)`;
            setFilterProgress({ current: 0, total: params.filterChain.length });
          } else {
            const filterInfo = ALL_FILTERS.find(f => f.type === filter);
            filterName = filterInfo?.name || filter;
            setFilterProgress({ current: 0, total: 1 });
          }
          setCurrentFilterName(filterName);
        });
      }
      if (filter === 'none') {
        // Ensure size is recorded even when no filtering
        const size = { width: sourceImage.width as number, height: sourceImage.height as number };
        if (typeof folderKey === 'string') {
          setViewerImageSize(folderKey as FolderKey, size);
        } else {
          setAnalysisImageSize(folderKey as number, size);
        }
        setProcessedImage(sourceImage);
        setIsProcessingFilter(false);
        setCurrentFilterName('');
        setFilterProgress({ current: 0, total: 0 });
        return;
      }

      // --- Caching Logic ---
      const filterCacheKey = filteredCache ? `${String(folderKey)}|${file.name}|${filter}|${JSON.stringify(params)}` : '';
      if (filteredCache && filterCacheKey) {
        const cachedImage = filteredCache.get(filterCacheKey);
        if (cachedImage) {
          setProcessedImage(cachedImage);
          setIsProcessingFilter(false);
          setCurrentFilterName('');
          setFilterProgress({ current: 0, total: 0 });
          return;
        }
      }

      // All filters proceed; frequency-domain ones are implemented without external readiness
      
      // Add a small delay to ensure the loading animation is visible
      await new Promise(resolve => setTimeout(resolve, 50));

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = sourceImage.width;
      offscreenCanvas.height = sourceImage.height;
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return;

      // Store actual image size for performance estimation
      const size = { width: offscreenCanvas.width, height: offscreenCanvas.height };
      if (typeof folderKey === 'string') {
        setViewerImageSize(folderKey as FolderKey, size);
      } else {
        setAnalysisImageSize(folderKey as number, size);
      }

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
        case 'brightness':
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyBrightness(ctx, params);
          break;
        case 'contrast':
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyContrast(ctx, params);
          break;
        case 'linearstretch': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyLinearStretch(ctx); 
          break;
        case 'histogramequalization': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyHistogramEqualization(ctx); 
          break;
        case 'laplacian': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyLaplacian(ctx, params); 
          break;
        case 'highpass': 
          setFilterProgress({ current: 1, total: 1 });
          Filters.applyHighpass(ctx); 
          break;
        case 'prewitt': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyPrewitt(ctx, params); 
          break;
        case 'scharr': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyScharr(ctx, params); 
          break;
        case 'sobel': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applySobel(ctx, params); 
          break;
        case 'robertscross': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyRobertsCross(ctx, params); 
          break;
        case 'log': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyLoG(ctx, params); 
          break;
        case 'dog': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyDoG(ctx, params); 
          break;
        case 'marrhildreth': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyMarrHildreth(ctx, params); 
          break;
        case 'gaussianblur': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyGaussianBlur(ctx, params); 
          break;
        case 'boxblur': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyBoxBlur(ctx, params); 
          break;
        case 'median': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyMedian(ctx, params); 
          break;
        case 'weightedmedian': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyWeightedMedian(ctx, params); 
          break;
        case 'alphatrimmedmean': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyAlphaTrimmedMean(ctx, params); 
          break;
        case 'localhistogramequalization': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyLocalHistogramEqualization(ctx, params); 
          break;
        case 'adaptivehistogramequalization': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyAdaptiveHistogramEqualization(ctx, params); 
          break;
        case 'sharpen': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applySharpen(ctx, params); 
          break;
        case 'canny': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyCanny(ctx, params); 
          break;
        case 'clahe': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyClahe(ctx, params); 
          break;
        case 'gammacorrection': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyGammaCorrection(ctx, params); 
          break;
        case 'anisotropicdiffusion': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyAnisotropicDiffusion(ctx, params); 
          break;
        case 'unsharpmask': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyUnsharpMask(ctx, params); 
          break;
        case 'gabor': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyGabor(ctx, params); 
          break;
        case 'lawstextureenergy': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyLawsTextureEnergy(ctx, params); 
          break;
        case 'lbp': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyLbp(ctx); 
          break;
        case 'guided': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyGuidedFilter(ctx, params); 
          break;
        case 'edgepreserving': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) Filters.applyEdgePreserving(ctx, params); 
          break;
        case 'dft': 
          setFilterProgress({ current: 1, total: 1 });
          Filters.applyDft(ctx); 
          break;
        case 'dct': 
          setFilterProgress({ current: 1, total: 1 });
          Filters.applyDct(ctx); 
          break;
        case 'wavelet': 
          setFilterProgress({ current: 1, total: 1 });
          Filters.applyWavelet(ctx); 
          break;
        case 'morph_open': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyMorphOpen(ctx, params); 
          break;
        case 'morph_close': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyMorphClose(ctx, params); 
          break;
        case 'morph_tophat': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyMorphTopHat(ctx, params); 
          break;
        case 'morph_blackhat': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyMorphBlackHat(ctx, params); 
          break;
        case 'morph_gradient': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyMorphGradient(ctx, params); 
          break;
        case 'distancetransform': 
          setFilterProgress({ current: 1, total: 1 });
          if (params) await Filters.applyDistanceTransform(ctx, params); 
          break;
        
        // Colormap - Perceptually Uniform (Recommended)
        case 'colormap_viridis': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyViridisColormap(ctx, params); 
          break;
        case 'colormap_inferno': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyInfernoColormap(ctx, params); 
          break;
        case 'colormap_plasma': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyPlasmaColormap(ctx, params); 
          break;
        case 'colormap_magma': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyMagmaColormap(ctx, params); 
          break;
        case 'colormap_parula': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyParulaColormap(ctx, params); 
          break;
        
        // Colormap - Rainbow/Legacy
        case 'colormap_jet': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyJetColormap(ctx, params); 
          break;
        case 'colormap_hsv': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyHsvColormap(ctx, params); 
          break;
        case 'colormap_hot': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyHotColormap(ctx, params); 
          break;
        
        // Colormap - Aesthetic Gradients
        case 'colormap_cool': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyCoolColormap(ctx, params); 
          break;
        case 'colormap_warm': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyWarmColormap(ctx, params); 
          break;
        case 'colormap_spring': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applySpringColormap(ctx, params); 
          break;
        case 'colormap_summer': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applySummerColormap(ctx, params); 
          break;
        case 'colormap_autumn': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyAutumnColormap(ctx, params); 
          break;
        case 'colormap_winter': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyWinterColormap(ctx, params); 
          break;
        
        // Colormap - Specialized
        case 'colormap_bone': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyBoneColormap(ctx, params); 
          break;
        case 'colormap_copper': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyCopperColormap(ctx, params); 
          break;
        case 'colormap_pink': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyPinkColormap(ctx, params); 
          break;
        
        // Colormap - Diverging (Change-based)
        case 'colormap_rdbu': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyRdbuColormap(ctx, params); 
          break;
        case 'colormap_rdylbu': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyRdylbuColormap(ctx, params); 
          break;
        case 'colormap_bwr': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyBwrColormap(ctx, params); 
          break;
        case 'colormap_seismic': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applySeismicColormap(ctx, params); 
          break;
        case 'colormap_coolwarm': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyCoolwarmColormap(ctx, params); 
          break;
        case 'colormap_spectral': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applySpectralColormap(ctx, params); 
          break;
        
        // Colormap - Gradient-based
        case 'colormap_gradient_magnitude': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyGradientMagnitudeColormap(ctx, params); 
          break;
        case 'colormap_edge_intensity': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyEdgeIntensityColormap(ctx, params); 
          break;
        case 'colormap_difference': 
          setFilterProgress({ current: 1, total: 1 });
          await Filters.applyDifferenceColormap(ctx, params); 
          break;
        
        case 'filterchain': {
          if (params && params.filterChain) {
            try {
                            // Apply the filter chain using the specialized utility with progress callback
              const chainResult = await applyFilterChain(
                offscreenCanvas, 
                params.filterChain,
                (progress: number) => {
                  // Update progress: progress is 0-1, convert to current/total
                  const totalFilters = params.filterChain?.filter((item: any) => item.enabled).length || 1;
                  // Use Math.round for more accurate step calculation
                  const currentStep = Math.max(0, Math.min(totalFilters, Math.round(progress * totalFilters)));
                  setFilterProgress({ current: currentStep, total: totalFilters });
                }
              );
              
              // Copy the result back to the offscreen canvas
              offscreenCanvas.width = chainResult.width;
              offscreenCanvas.height = chainResult.height;
              ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
              ctx.drawImage(chainResult, 0, 0);
              
              // Clean up the intermediate canvas
              const chainCtx = chainResult.getContext('2d');
              if (chainCtx) {
                chainCtx.clearRect(0, 0, chainResult.width, chainResult.height);
              }
            } catch (error) {
              console.error('Error applying filter chain:', error);
              // Fallback: just draw the original image
              ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
              ctx.drawImage(sourceImage, 0, 0);
            }
          }
          break;
        }
      }

      const finalImage = await createImageBitmap(offscreenCanvas);
      if (filteredCache && filterCacheKey) {
        filteredCache.set(filterCacheKey, finalImage);
      }
      setProcessedImage(finalImage);
      setIsProcessingFilter(false);
      setCurrentFilterName('');
      setFilterProgress({ current: 0, total: 0 });
    };

    // Execute filter processing with proper error handling
    processImage().catch(error => {
      console.error('Filter processing error:', error);
      setIsProcessingFilter(false);
      setCurrentFilterName('');
      setFilterProgress({ current: 0, total: 0 });
      // Fallback to original image on error
      if (sourceImage) {
        setProcessedImage(sourceImage);
      }
    });

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
      const localAngle = pinpointRotations[folderKey] || 0;
      const globalAngle = pinpointGlobalRotation || 0;
      const totalAngle = localAngle + globalAngle;
      const theta = (totalAngle * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Solve translation so that rotated ref pixel stays under refScreen
      // S = center offset of the scaled image
      const Sx = drawW / 2;
      const Sy = drawH / 2;
      const ux = refImgX * scale;
      const uy = refImgY * scale;
      // x = rx - Sx - [cos*(ux - Sx) - sin*(uy - Sy)]
      // y = ry - Sy - [sin*(ux - Sx) + cos*(uy - Sy)]
      x = refScreenX - Sx - (cos * (ux - Sx) - sin * (uy - Sy));
      y = refScreenY - Sy - (sin * (ux - Sx) + cos * (uy - Sy));

      centerX = x + Sx;
      centerY = y + Sy;
      if (totalAngle !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate(theta);
        ctx.translate(-centerX, -centerY);
      }
    } else {
      const cx = (viewport.cx || 0.5) * currentImage.width;
      const cy = (viewport.cy || 0.5) * currentImage.height;
      // Avoid rounding to keep pivot identical to inverse mapping
      x = (width / 2) - (cx * scale);
      y = (height / 2) - (cy * scale);
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    
    // 캔버스 크기 상태 업데이트 (미니맵용)
    setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    
    // If no processedImage, draw black background
    if (!processedImage) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    
    drawImage(ctx, processedImage, true);
  }, [processedImage, drawImage, viewport, pinpointGlobalScale, pinpointRotations, pinpointGlobalRotation, isRotating, showGrid, gridColor, compareRotation]);

  // Effect to handle canvas resize (레이아웃 변경이나 창 크기 변경 시 자동 리프레시)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const ctx = canvas.getContext("2d")!;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      
      // 캔버스 크기 상태 업데이트 (미니맵용)
      setCanvasSize({ width: Math.round(width), height: Math.round(height) });
      
      if (processedImage) {
        drawImage(ctx, processedImage, true);
      } else {
        // Draw black background when no image
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      // Disable pinpoint setting when Shift is held (for viewer reordering)
      if (e.shiftKey) return;
      
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

      // Recompute actual draw translation used for current frame so inverse mapping matches
      const localAngle = useStore.getState().pinpointRotations[folderKey] || 0;
      const globalAngle = useStore.getState().pinpointGlobalRotation || 0;
      const totalAngleDeg = (localAngle + globalAngle);
      const theta = (totalAngleDeg * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const drawW = sourceImage.width * scale;
      const drawH = sourceImage.height * scale;
      const Sx = drawW / 2;
      const Sy = drawH / 2;
      const ux = refImgX * scale;
      const uy = refImgY * scale;
      const drawX = refScreenX - Sx - (cos * (ux - Sx) - sin * (uy - Sy));
      const drawY = refScreenY - Sy - (sin * (ux - Sx) + cos * (uy - Sy));

      // Inverse rotation about center to map screen -> unrotated local image coords
      const centerX = drawX + Sx;
      const centerY = drawY + Sy;
      const dx = canvasX - centerX;
      const dy = canvasY - centerY;
      const unrotX = centerX + dx * Math.cos(-theta) - dy * Math.sin(-theta);
      const unrotY = centerY + dx * Math.sin(-theta) + dy * Math.cos(-theta);
      const imgX = (unrotX - drawX) / scale;
      const imgY = (unrotY - drawY) / scale;
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

  // ✅ FIX: Create stable references for event handlers to prevent duplicate listeners
  const eventHandlersRef = useRef<{
    onWheel?: (e: WheelEvent) => void;
    onDown?: (e: MouseEvent) => void;
    onUp?: () => void;
    onMove?: (e: MouseEvent) => void;
  }>({});

  // Update event handlers when dependencies change (but don't re-register listeners)
  useEffect(() => {
    if (!sourceImage) return;
    
    let isDown = false;
    let lastX = 0, lastY = 0;
    let dragMode: 'pan' | 'rotate' | null = null;
    
    eventHandlersRef.current.onWheel = (e: WheelEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      e.preventDefault();
      e.stopPropagation();
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;
      const { viewport: currentViewport, pinpointGlobalScale: currentGlobalScale, setPinpointGlobalScale } = useStore.getState();
      // Zoom step: start with multiplicative step (e.g., 1.1x),
      // but cap the visible percent change to at most +/- 50 points per event.
      const MAX_PERCENT_STEP = 10; // percentage points
      const step = WHEEL_ZOOM_STEP;
      if (appMode === 'pinpoint') {
        // Zoom the canvas under the cursor; also mark it active for consistency
        if (typeof folderKey === 'string') {
          const { setActiveCanvasKey } = useStore.getState();
          setActiveCanvasKey(folderKey);
        }
        // ✅ FIX: Use existing individual scale or fallback to viewport scale (read-only)
        const individualScale = overrideScale ?? currentViewport.scale;
        const preScale = individualScale * currentGlobalScale;
        const prePct = preScale * 100;
        const desiredScale = preScale * (e.deltaY < 0 ? step : (1 / step));
        let desiredPct = desiredScale * 100;
        // Cap absolute percent change to +/- MAX_PERCENT_STEP
        const maxPct = prePct + MAX_PERCENT_STEP;
        const minPct = prePct - MAX_PERCENT_STEP;
        desiredPct = Math.max(minPct, Math.min(maxPct, desiredPct));
        // Clamp to global min/max zoom
        const clampedPct = Math.max(MIN_ZOOM * 100, Math.min(MAX_ZOOM * 100, desiredPct));
        const nextScale = clampedPct / 100;
        // ✅ FIX: Calculate global scale change proportionally to preserve individual scale
        const scaleRatio = nextScale / preScale;
        const nextGlobalScale = currentGlobalScale * scaleRatio;
        if (nextScale > MAX_ZOOM || nextScale < MIN_ZOOM) return;
        setPinpointGlobalScale(nextGlobalScale);
        const refScreenX = currentViewport.refScreenX || (width / 2);
        const refScreenY = currentViewport.refScreenY || (height / 2);
        const nextRefScreenX = mx + (refScreenX - mx) * (nextScale / preScale);
        const nextRefScreenY = my + (refScreenY - my) * (nextScale / preScale);
        setViewport({ refScreenX: nextRefScreenX, refScreenY: nextRefScreenY });
      } else {
        const preScale = currentViewport.scale;
        const prePct = preScale * 100;
        const desiredScale = preScale * (e.deltaY < 0 ? step : (1 / step));
        let desiredPct = desiredScale * 100;
        const maxPct = prePct + MAX_PERCENT_STEP;
        const minPct = prePct - MAX_PERCENT_STEP;
        desiredPct = Math.max(minPct, Math.min(maxPct, desiredPct));
        let nextScale = Math.max(MIN_ZOOM * 100, Math.min(MAX_ZOOM * 100, desiredPct)) / 100;
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
    
    eventHandlersRef.current.onDown = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Disable panning when Shift is held (for viewer reordering)
      if (e.shiftKey) return;
      
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
    
    eventHandlersRef.current.onUp = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      isDown = false; 
      dragMode = null;
      setIsRotating(false);
      canvas.style.cursor = appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab'; 
    };
    
    eventHandlersRef.current.onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !isDown || !dragMode) return;
      
      // Disable panning when Shift is held (for viewer reordering)
      if (e.shiftKey) return;
      
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
  }, [sourceImage, setViewport, appMode, pinpointMouseMode, overrideScale, folderKey]);

  // ✅ FIX: Register event listeners only once with stable handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (eventHandlersRef.current.onWheel) {
        eventHandlersRef.current.onWheel(e);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (eventHandlersRef.current.onDown) {
        eventHandlersRef.current.onDown(e);
      }
    };

    const handleMouseUp = () => {
      if (eventHandlersRef.current.onUp) {
        eventHandlersRef.current.onUp();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (eventHandlersRef.current.onMove) {
        eventHandlersRef.current.onMove(e);
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []); // ✅ Empty dependency array - listeners registered only once

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
    if (appMode !== 'analysis' && appMode !== 'pinpoint' && onClick) {
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

      { /* Wrapper to track mouse for leveling crosshair */ }
      <div
        className="viewer-canvas-wrap"
        style={{ position: 'relative', cursor: ((levelingCapture.active && levelingCapture.mode === appMode && (levelingCapture.targetKey == null || levelingCapture.targetKey === (folderKey as any))) ? 'crosshair' : undefined) }}
        onMouseMove={(e) => {
          const { levelingCapture } = useStore.getState();
          const active = levelingCapture.active && levelingCapture.mode === appMode;
          if (!active) return;
          const tk = levelingCapture.targetKey;
          if (tk != null) {
            if (typeof folderKey === 'string' && tk !== folderKey) return;
            if (typeof folderKey === 'number' && tk !== folderKey) return;
          }
          const c = canvasRef.current;
          if (!c) return;
          const rect = c.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setMousePos(null)}
      >
        <canvas
          ref={canvasRef}
          className="viewer__canvas"
          style={{ cursor: ((levelingCapture.active && levelingCapture.mode === appMode && (levelingCapture.targetKey == null || levelingCapture.targetKey === (folderKey as any))) ? 'crosshair' : (appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab')) }}
          onClick={(e) => {
            if (!(levelingCapture.active && levelingCapture.mode === appMode)) return;
            // If targetKey is set and doesn't match this canvas, ignore
            const tk = levelingCapture.targetKey;
            if (tk != null) {
              if (typeof folderKey === 'string' && tk !== folderKey) return;
              if (typeof folderKey === 'number' && tk !== folderKey) return;
            }
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            addLevelingPoint(folderKey as any, { x, y });
            e.stopPropagation();
          }}
        />
        {(() => {
          const active = levelingCapture.active && levelingCapture.mode === appMode;
          if (!active) return null;
          const tk = levelingCapture.targetKey;
          const isTargetCanvas = tk == null || (typeof folderKey === 'string' ? tk === folderKey : tk === folderKey);
          if (!isTargetCanvas) return null;
          const p1 = levelingCapture.points[0] || null;
          const showMoving = mousePos != null;
          const isFirstClick = p1 !== null;
          
          // Calculate angle difference for preview
          const calculateAngleDiff = (p1: {x: number, y: number}, mousePos: {x: number, y: number}) => {
            const dx = mousePos.x - p1.x;
            const dy = mousePos.y - p1.y;
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = angleRad * 180 / Math.PI;
            
            // Get current rotation based on mode
            let currentAngle = 0;
            if (appMode === 'pinpoint' && typeof folderKey === 'string') {
              const localAngle = pinpointRotations[folderKey] || 0;
              const globalAngle = pinpointGlobalRotation || 0;
              currentAngle = localAngle + globalAngle;
            } else if (appMode === 'compare') {
              currentAngle = compareRotation;
            } else if (appMode === 'analysis') {
              currentAngle = rotation || 0;
            }
            
            // Calculate target angle and display angle based on axis
            let targetAngle = 0;
            let displayAngle = angleDeg; // Angle for the visual line - always show mouse direction
            
            if (levelingCapture.axis === 'horizontal') {
              targetAngle = angleDeg;
            } else { // vertical
              // For vertical alignment, target angle is perpendicular to mouse direction
              targetAngle = angleDeg + 90;
            }
            
            // Calculate difference for display
            let diff = targetAngle - currentAngle;
            
            // For vertical mode, adjust the displayed difference to be more intuitive
            if (levelingCapture.axis === 'vertical') {
              // Convert to vertical reference: 
              // - Downward (90°) should show as 0°
              // - Upward (-90° or 270°) should show as 180°
              let verticalAngle = angleDeg;
              
              // Normalize mouse angle to vertical reference
              if (verticalAngle >= 0 && verticalAngle <= 180) {
                // Top half: 0° to 180° becomes 90° to -90°
                verticalAngle = 90 - verticalAngle;
              } else {
                // Bottom half: 180° to 360° becomes -90° to 90°
                verticalAngle = 90 - (verticalAngle - 360);
              }
              
              // Calculate difference from current rotation to this vertical reference
              diff = verticalAngle - currentAngle;
            }
            
            // Normalize to -180 to 180
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            
            return { angleDeg: displayAngle, targetAngle, diff, distance: Math.sqrt(dx * dx + dy * dy) };
          };
          
          const previewData = p1 && mousePos ? calculateAngleDiff(p1, mousePos) : null;
          
          return (
            <div className="leveling-overlay">
              {/* Show full crosshairs only when no point is clicked yet */}
              {!isFirstClick && showMoving && (
                <>
                  <div className="crosshair moving horiz" style={{ left: 0, right: 0, top: (mousePos!.y) + 'px' }} />
                  <div className="crosshair moving vert" style={{ top: 0, bottom: 0, left: (mousePos!.x) + 'px' }} />
                </>
              )}
              
              {/* Show small crosshair for fixed first point */}
              {p1 && (
                <>
                  <div className="crosshair fixed small horiz" style={{ left: (p1.x) + 'px', top: (p1.y) + 'px' }} />
                  <div className="crosshair fixed small vert" style={{ left: (p1.x) + 'px', top: (p1.y) + 'px' }} />
                </>
              )}
              
              {/* Show transparent full crosshair for second point preview */}
              {p1 && mousePos && (
                <>
                  <div className="crosshair preview horiz" style={{ left: 0, right: 0, top: (mousePos.y) + 'px' }} />
                  <div className="crosshair preview vert" style={{ top: 0, bottom: 0, left: (mousePos.x) + 'px' }} />
                </>
              )}
              
              {/* Show preview line and angle when first point is set and mouse is moving */}
              {p1 && mousePos && previewData && previewData.distance > 5 && (
                <>
                  <div 
                    className="preview-line" 
                    style={{ 
                      left: (p1.x) + 'px', 
                      top: (p1.y) + 'px',
                      width: previewData.distance + 'px',
                      transform: `rotate(${previewData.angleDeg}deg)`
                    }} 
                  />
                  <div 
                    className="angle-display" 
                    style={{ 
                      left: (mousePos.x + 10) + 'px', 
                      top: (mousePos.y - 10) + 'px',
                    }}
                  >
                    {previewData.diff >= 0 ? '+' : ''}{previewData.diff.toFixed(1)}°
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>
      {!processedImage && <div className="viewer__placeholder">{file ? 'Processing...' : (appMode === 'pinpoint' ? 'Click Button Above to Select' : 'No Image')}</div>}
      
      {indicator && processedImage && canvasRef.current && appMode !== 'pinpoint' && (() => {
        const canvas = canvasRef.current;
        const { width: canvasWidth, height: canvasHeight } = canvas.getBoundingClientRect();
        
        // 이미지 좌표를 화면 좌표로 변환
        const imageWidth = processedImage.width;
        const imageHeight = processedImage.height;
        const scale = viewport.scale;
        
        // 이미지가 화면에 그려지는 위치 계산
        // const _scaledImageWidth = imageWidth * scale;
        // const _scaledImageHeight = imageHeight * scale;
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
            <ImageLoadingOverlay 
        isLoading={isLoadingImage} 
        isProcessing={isProcessingFilter}
        loadingText="Loading image..."
        processingText="Processing filter..."
        currentFilterName={currentFilterName}
        filterProgress={filterProgress}
      />
    </div>
  );
});
