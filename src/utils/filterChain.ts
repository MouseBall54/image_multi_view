import type { FilterChainItem, FilterType } from '../types';
import type { FilterParams } from '../store';
import * as Filters from './filters';
import { isValidFilterImageDimensions, normalizeFilterParams } from './filterRuntimeGuards';

// Cache for intermediate filter results to improve performance
// Use HTMLCanvasElement for stability (ImageBitmap can become detached/closed)
const filterResultCache = new Map<string, HTMLCanvasElement>();
const MAX_CACHE_SIZE = 20; // Limit cache size to prevent memory issues

// Generate cache key based on filter chain and image
function generateCacheKey(imageHash: string, chainItems: FilterChainItem[]): string {
  const chainHash = chainItems
    .filter(item => item.enabled)
    .map(item => `${item.filterType}-${JSON.stringify(item.params)}`)
    .join('|');
  return `${imageHash}-${chainHash}`;
}

// Simple image hash function for caching
function generateImageHash(canvas: HTMLCanvasElement): string {
  // Use canvas size and first few pixels as a simple hash
  const ctx = canvas.getContext('2d');
  if (!ctx) return `${canvas.width}x${canvas.height}`;
  
  const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
  const pixels = Array.from(imageData.data.slice(0, 40)); // First 10 pixels
  return `${canvas.width}x${canvas.height}-${pixels.join(',')}`;
}

// Clean old cache entries when cache gets too large
function cleanCache() {
  if (filterResultCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(filterResultCache.keys()).slice(0, filterResultCache.size - MAX_CACHE_SIZE);
    keysToDelete.forEach(key => {
      if (filterResultCache.has(key)) {
        filterResultCache.delete(key);
      }
    });
  }
}

/**
 * Apply a sequence of filters to an image
 * @param sourceCanvas - The source canvas containing the original image
 * @param chainItems - Array of filter items to apply in sequence
 * @param progressCallback - Optional callback to report progress (0-1)
 * @returns Promise that resolves to the processed canvas
 */
export async function applyFilterChain(
  sourceCanvas: HTMLCanvasElement,
  chainItems: FilterChainItem[],
  progressCallback?: (progress: number) => void
): Promise<HTMLCanvasElement> {
  if (!isValidFilterImageDimensions(sourceCanvas.width, sourceCanvas.height)) {
    const safeCanvas = document.createElement('canvas');
    safeCanvas.width = Math.max(1, Math.floor(sourceCanvas.width) || 1);
    safeCanvas.height = Math.max(1, Math.floor(sourceCanvas.height) || 1);
    return safeCanvas;
  }

  // Filter out disabled items
  const enabledItems = chainItems.filter(item => item.enabled);
  
  if (enabledItems.length === 0) {
    // No filters to apply, return a copy of the source
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    if (outputCtx) {
      outputCtx.drawImage(sourceCanvas, 0, 0);
    }
    return outputCanvas;
  }

  // Check cache first
  const imageHash = generateImageHash(sourceCanvas);
  const cacheKey = generateCacheKey(imageHash, enabledItems);
  const cachedResult = filterResultCache.get(cacheKey);
  
  if (cachedResult) {
        // Even for cached results, simulate progress for UI consistency
    if (progressCallback) {
      for (let i = 0; i <= enabledItems.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for visual feedback
        progressCallback(i / enabledItems.length);
      }
    }
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = cachedResult.width;
    outputCanvas.height = cachedResult.height;
    const outputCtx = outputCanvas.getContext('2d');
    if (outputCtx) {
      outputCtx.drawImage(cachedResult, 0, 0);
    }
    return outputCanvas;
  }

      // Report progress at start of filter
  let currentCanvas = sourceCanvas;
  let needsCleanup: HTMLCanvasElement[] = [];

  try {
    for (let i = 0; i < enabledItems.length; i++) {
      const item = enabledItems[i];
      
      // Report progress
      if (progressCallback) {
        progressCallback(i / enabledItems.length);
      }

      // Create a temporary canvas for this filter's output
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = currentCanvas.width;
      tempCanvas.height = currentCanvas.height;
      
      // Apply the filter
      await applySingleFilter(currentCanvas, tempCanvas, item.filterType as FilterType, item.params as FilterParams);
            
      // Report progress after completing this filter with a small delay for UI update
      if (progressCallback) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update
        progressCallback((i + 1) / enabledItems.length);
      }
      // Clean up previous intermediate canvas (but not the source)
      if (currentCanvas !== sourceCanvas) {
        needsCleanup.push(currentCanvas);
      }
      
      currentCanvas = tempCanvas;
    }

    // Final progress report is already done in the loop
    // No need for additional completion callback

    // Cache the final result (copy into a stable canvas)
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = currentCanvas.width;
    cacheCanvas.height = currentCanvas.height;
    const cacheCtx = cacheCanvas.getContext('2d');
    if (cacheCtx) {
      cacheCtx.drawImage(currentCanvas, 0, 0);
      filterResultCache.set(cacheKey, cacheCanvas);
      cleanCache();
    }

    return currentCanvas;

  } catch (error) {
    console.error('Error applying filter chain:', error);
    
    // Clean up any intermediate canvases
    needsCleanup.forEach(canvas => {
      // Canvas cleanup is automatic in most browsers, but we can clear the context
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    
    // Return the source canvas as fallback
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = sourceCanvas.width;
    fallbackCanvas.height = sourceCanvas.height;
    const fallbackCtx = fallbackCanvas.getContext('2d');
    if (fallbackCtx) {
      fallbackCtx.drawImage(sourceCanvas, 0, 0);
    }
    return fallbackCanvas;
  }
}

/**
 * Clear the filter result cache
 */
export function clearFilterCache() {
  filterResultCache.clear();
}

/**
 * Get cache statistics
 */
export function getFilterCacheStats() {
  return {
    size: filterResultCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Estimate the computational cost of a filter chain
 * @param chainItems - Array of filter items
 * @param imageWidth - Width of the image
 * @param imageHeight - Height of the image
 * @returns Estimated processing time in milliseconds
 */
export function estimateFilterChainCost(
  chainItems: FilterChainItem[],
  imageWidth: number,
  imageHeight: number
): number {
  const enabledItems = chainItems.filter(item => item.enabled);
  const pixelCount = imageWidth * imageHeight;
  
  // Basic cost estimates per filter type (microseconds per pixel)
  const filterCosts: Record<string, number> = {
    'none': 0,
    'grayscale': 0.1,
    'invert': 0.1,
    'sepia': 0.2,
    'brightness': 0.1,
    'contrast': 0.1,
    'threshold_binary': 1.0,
    'threshold_otsu': 1.2,
    'threshold_triangle': 1.2,
    'threshold_adaptive_mean': 2.5,
    'threshold_adaptive_gaussian': 2.8,
    'threshold_sauvola': 3.5,
    'threshold_bradley': 2.8,
    'threshold_bernsen': 2.8,
    'threshold_phansalkar': 3.8,
    'threshold_kittler': 1.5,
    'gaussianblur': 2.0,
    'gaussianblur_xy': 2.5,
    'boxblur': 1.0,
    'boxblur_xy': 1.3,
    'median': 5.0,
    'sharpen': 1.5,
    'sobel': 2.0,
    'canny': 8.0,
    'laplacian': 1.5,
    'histogramequalization': 3.0,
    'clahe': 6.0,
    'gabor': 10.0,
    
    // Colormap filters - fast lookup table operations
    'colormap_viridis': 0.3,
    'colormap_inferno': 0.3,
    'colormap_plasma': 0.3,
    'colormap_magma': 0.3,
    'colormap_parula': 0.3,
    'colormap_jet': 0.3,
    'colormap_hsv': 0.3,
    'colormap_hot': 0.3,
    'colormap_cool': 0.3,
    'colormap_warm': 0.3,
    'colormap_spring': 0.3,
    'colormap_summer': 0.3,
    'colormap_autumn': 0.3,
    'colormap_winter': 0.3,
    'colormap_bone': 0.3,
    'colormap_copper': 0.3,
    'colormap_pink': 0.3,
    
    // Diverging (Change-based) colormaps
    'colormap_rdbu': 0.3,
    'colormap_rdylbu': 0.3,
    'colormap_bwr': 0.3,
    'colormap_seismic': 0.3,
    'colormap_coolwarm': 0.3,
    'colormap_spectral': 0.3,
    
    // Gradient-based colormaps (more expensive due to computation)
    'colormap_gradient_magnitude': 2.5,
    'colormap_edge_intensity': 2.5,
    'colormap_difference': 1.5,
  };

  let totalCost = 0;
  enabledItems.forEach(item => {
    const baseCost = filterCosts[item.filterType] || 2.0; // Default cost
    
    // Adjust cost based on parameters
    let paramMultiplier = 1.0;
    if (item.params.kernelSize && item.params.kernelSize > 5) {
      paramMultiplier *= (item.params.kernelSize / 5) ** 2;
    }
    
    totalCost += baseCost * paramMultiplier;
  });

  // Convert to milliseconds and add overhead for chain processing
  return (totalCost * pixelCount / 1000) + (enabledItems.length * 50);
}

/**
 * Apply a single filter to a canvas
 * This replicates the logic from ImageCanvas for consistency
 */
async function applySingleFilter(
  sourceCanvas: HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement, 
  filterType: FilterType,
  params: FilterParams
): Promise<void> {
  if (!isValidFilterImageDimensions(sourceCanvas.width, sourceCanvas.height)) {
    outputCanvas.width = Math.max(1, Math.floor(sourceCanvas.width) || 1);
    outputCanvas.height = Math.max(1, Math.floor(sourceCanvas.height) || 1);
    return;
  }

  const ctx = outputCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size to match source
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;
  const normalizedParams = normalizeFilterParams(filterType, params ?? ({} as FilterParams), {
    width: sourceCanvas.width,
    height: sourceCanvas.height
  });

  // Handle CSS filters first
  const cssFilters: Partial<Record<FilterType, string>> = {
    'grayscale': 'grayscale(100%)', 
    'invert': 'invert(100%)', 
    'sepia': 'sepia(100%)',
  };

  if (filterType in cssFilters) {
    ctx.filter = cssFilters[filterType as keyof typeof cssFilters]!;
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.filter = 'none';
    return;
  } else {
    ctx.drawImage(sourceCanvas, 0, 0);
  }

  // Apply canvas-based filters
  switch (filterType) {
    case 'filterchain': {
      // Nested filter chain: apply subchain to the source and draw result to output
      const sub = (params as any)?.filterChain as FilterChainItem[] | undefined;
      if (sub && Array.isArray(sub)) {
        const nestedCanvas = await applyFilterChain(sourceCanvas, sub, undefined);
        ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
        ctx.drawImage(nestedCanvas, 0, 0);
      } else {
        // No subchain provided; just copy source
        ctx.drawImage(sourceCanvas, 0, 0);
      }
      break;
    }
    case 'brightness':
      if (normalizedParams) await Filters.applyBrightness(ctx, normalizedParams);
      break;
    case 'contrast':
      if (normalizedParams) await Filters.applyContrast(ctx, normalizedParams);
      break;
    case 'threshold_binary':
      await Filters.applyThresholdBinary(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_otsu':
      await Filters.applyThresholdOtsu(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_triangle':
      await Filters.applyThresholdTriangle(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_adaptive_mean':
      await Filters.applyThresholdAdaptiveMean(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_adaptive_gaussian':
      await Filters.applyThresholdAdaptiveGaussian(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_sauvola':
      await Filters.applyThresholdSauvola(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_bradley':
      await Filters.applyThresholdBradley(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_bernsen':
      await Filters.applyThresholdBernsen(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_phansalkar':
      await Filters.applyThresholdPhansalkar(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'threshold_kittler':
      await Filters.applyThresholdKittler(ctx, (normalizedParams ?? {}) as any);
      break;
    case 'none':
      // Already drawn above
      break;
    case 'linearstretch': 
      await Filters.applyLinearStretch(ctx); 
      break;
    case 'histogramequalization': 
      await Filters.applyHistogramEqualization(ctx); 
      break;
    case 'laplacian': 
      if (normalizedParams) await Filters.applyLaplacian(ctx, normalizedParams); 
      break;
    case 'highpass': 
      Filters.applyHighpass(ctx); 
      break;
    case 'prewitt': 
      if (normalizedParams) await Filters.applyPrewitt(ctx, normalizedParams); 
      break;
    case 'scharr': 
      if (normalizedParams) await Filters.applyScharr(ctx, normalizedParams); 
      break;
    case 'sobel': 
      if (normalizedParams) await Filters.applySobel(ctx, normalizedParams); 
      break;
    case 'robertscross': 
      if (normalizedParams) await Filters.applyRobertsCross(ctx, normalizedParams); 
      break;
    case 'log': 
      if (normalizedParams) await Filters.applyLoG(ctx, normalizedParams); 
      break;
    case 'dog': 
      if (normalizedParams) await Filters.applyDoG(ctx, normalizedParams); 
      break;
    case 'marrhildreth': 
      if (normalizedParams) await Filters.applyMarrHildreth(ctx, normalizedParams); 
      break;
    case 'gaussianblur': 
      if (normalizedParams) await Filters.applyGaussianBlur(ctx, normalizedParams); 
      break;
    case 'gaussianblur_xy':
      if (normalizedParams) await Filters.applyGaussianBlurAxis(ctx, normalizedParams);
      break;
    case 'boxblur': 
      if (normalizedParams) await Filters.applyBoxBlur(ctx, normalizedParams); 
      break;
    case 'boxblur_xy':
      if (normalizedParams) await Filters.applyBoxBlurAxis(ctx, normalizedParams);
      break;
    case 'median': 
      if (normalizedParams) Filters.applyMedian(ctx, normalizedParams); 
      break;
    case 'weightedmedian': 
      if (normalizedParams) Filters.applyWeightedMedian(ctx, normalizedParams); 
      break;
    case 'alphatrimmedmean': 
      if (normalizedParams) Filters.applyAlphaTrimmedMean(ctx, normalizedParams); 
      break;
    case 'localhistogramequalization': 
      if (normalizedParams) await Filters.applyLocalHistogramEqualization(ctx, normalizedParams); 
      break;
    case 'adaptivehistogramequalization': 
      if (normalizedParams) Filters.applyAdaptiveHistogramEqualization(ctx, normalizedParams); 
      break;
    case 'sharpen': 
      if (normalizedParams) Filters.applySharpen(ctx, normalizedParams); 
      break;
    case 'canny': 
      if (normalizedParams) await Filters.applyCanny(ctx, normalizedParams); 
      break;
    case 'clahe': 
      if (normalizedParams) await Filters.applyClahe(ctx, normalizedParams); 
      break;
    case 'gammacorrection': 
      if (normalizedParams) Filters.applyGammaCorrection(ctx, normalizedParams); 
      break;
    case 'unsharpmask': 
      if (normalizedParams) Filters.applyUnsharpMask(ctx, normalizedParams); 
      break;
    case 'gabor': 
      if (normalizedParams) await Filters.applyGabor(ctx, normalizedParams); 
      break;
    case 'lawstextureenergy': 
      if (normalizedParams) await Filters.applyLawsTextureEnergy(ctx, normalizedParams); 
      break;
    case 'lbp': 
      await Filters.applyLbp(ctx); 
      break;
    case 'guided': 
      if (normalizedParams) Filters.applyGuidedFilter(ctx, normalizedParams); 
      break;
    case 'edgepreserving': 
      if (normalizedParams) await Filters.applyEdgePreserving(ctx, normalizedParams); 
      break;
    case 'bilateral': 
      if (params) await Filters.applyEdgePreserving(ctx, params); // Using edgepreserving as fallback for bilateral
      break;
    case 'nonlocalmeans': 
      if (params) await Filters.applyEdgePreserving(ctx, params); // Using edgepreserving as fallback for nonlocalmeans
      break;
    case 'anisotropicdiffusion': 
      if (params) await Filters.applyEdgePreserving(ctx, params); // Using edgepreserving as fallback for anisotropicdiffusion
      break;
    case 'dft': 
      Filters.applyDft(ctx); 
      break;
    case 'dct': 
      Filters.applyDct(ctx); 
      break;
    case 'wavelet': 
      Filters.applyWavelet(ctx); 
      break;
    case 'morph_open': 
      if (normalizedParams) await Filters.applyMorphOpen(ctx, normalizedParams); 
      break;
    case 'morph_close': 
      if (normalizedParams) await Filters.applyMorphClose(ctx, normalizedParams); 
      break;
    case 'morph_tophat': 
      if (normalizedParams) await Filters.applyMorphTopHat(ctx, normalizedParams); 
      break;
    case 'morph_blackhat': 
      if (normalizedParams) await Filters.applyMorphBlackHat(ctx, normalizedParams); 
      break;
    case 'morph_gradient': 
      if (normalizedParams) await Filters.applyMorphGradient(ctx, normalizedParams); 
      break;
    case 'distancetransform': 
      if (normalizedParams) await Filters.applyDistanceTransform(ctx, normalizedParams); 
      break;
    
    // Colormap - Perceptually Uniform (Recommended)
    case 'colormap_viridis': 
      await Filters.applyViridisColormap(ctx, normalizedParams); 
      break;
    case 'colormap_inferno': 
      await Filters.applyInfernoColormap(ctx, normalizedParams); 
      break;
    case 'colormap_plasma': 
      await Filters.applyPlasmaColormap(ctx, normalizedParams); 
      break;
    case 'colormap_magma': 
      await Filters.applyMagmaColormap(ctx, normalizedParams); 
      break;
    case 'colormap_parula': 
      await Filters.applyParulaColormap(ctx, normalizedParams); 
      break;
    
    // Colormap - Rainbow/Legacy
    case 'colormap_jet': 
      await Filters.applyJetColormap(ctx, normalizedParams); 
      break;
    case 'colormap_hsv': 
      await Filters.applyHsvColormap(ctx, normalizedParams); 
      break;
    case 'colormap_hot': 
      await Filters.applyHotColormap(ctx, normalizedParams); 
      break;
    
    // Colormap - Aesthetic Gradients
    case 'colormap_cool': 
      await Filters.applyCoolColormap(ctx, normalizedParams); 
      break;
    case 'colormap_warm': 
      await Filters.applyWarmColormap(ctx, normalizedParams); 
      break;
    case 'colormap_spring': 
      await Filters.applySpringColormap(ctx, normalizedParams); 
      break;
    case 'colormap_summer': 
      await Filters.applySummerColormap(ctx, normalizedParams); 
      break;
    case 'colormap_autumn': 
      await Filters.applyAutumnColormap(ctx, normalizedParams); 
      break;
    case 'colormap_winter': 
      await Filters.applyWinterColormap(ctx, normalizedParams); 
      break;
    
    // Colormap - Specialized
    case 'colormap_bone': 
      await Filters.applyBoneColormap(ctx, normalizedParams); 
      break;
    case 'colormap_copper': 
      await Filters.applyCopperColormap(ctx, normalizedParams); 
      break;
    case 'colormap_pink': 
      await Filters.applyPinkColormap(ctx, normalizedParams); 
      break;
    
    // Colormap - Diverging (Change-based)
    case 'colormap_rdbu': 
      await Filters.applyRdbuColormap(ctx, normalizedParams); 
      break;
    case 'colormap_rdylbu': 
      await Filters.applyRdylbuColormap(ctx, normalizedParams); 
      break;
    case 'colormap_bwr': 
      await Filters.applyBwrColormap(ctx, normalizedParams); 
      break;
    case 'colormap_seismic': 
      await Filters.applySeismicColormap(ctx, normalizedParams); 
      break;
    case 'colormap_coolwarm': 
      await Filters.applyCoolwarmColormap(ctx, normalizedParams); 
      break;
    case 'colormap_spectral': 
      await Filters.applySpectralColormap(ctx, normalizedParams); 
      break;
    
    // Colormap - Gradient-based
    case 'colormap_gradient_magnitude': 
      await Filters.applyGradientMagnitudeColormap(ctx, normalizedParams); 
      break;
    case 'colormap_edge_intensity': 
      await Filters.applyEdgeIntensityColormap(ctx, normalizedParams); 
      break;
    case 'colormap_difference': 
      await Filters.applyDifferenceColormap(ctx, normalizedParams); 
      break;
    
    default:
      console.warn(`Unknown filter type: ${filterType}`);
  }
}
