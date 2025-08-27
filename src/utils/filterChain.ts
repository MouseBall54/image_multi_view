import type { FilterChainItem, FilterType } from '../types';
import type { FilterParams } from '../store';
import * as Filters from './filters';

// Cache for intermediate filter results to improve performance
const filterResultCache = new Map<string, ImageBitmap>();
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
      const bitmap = filterResultCache.get(key);
      if (bitmap) {
        bitmap.close(); // Free memory
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

    // Cache the final result
    try {
      const resultBitmap = await createImageBitmap(currentCanvas);
      filterResultCache.set(cacheKey, resultBitmap);
      cleanCache();
    } catch (error) {
      console.warn('Failed to cache filter result:', error);
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
  filterResultCache.forEach(bitmap => bitmap.close());
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
    'gaussianblur': 2.0,
    'boxblur': 1.0,
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
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size to match source
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;

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
      if (params) await Filters.applyLaplacian(ctx, params); 
      break;
    case 'highpass': 
      Filters.applyHighpass(ctx); 
      break;
    case 'prewitt': 
      if (params) await Filters.applyPrewitt(ctx, params); 
      break;
    case 'scharr': 
      if (params) await Filters.applyScharr(ctx, params); 
      break;
    case 'sobel': 
      if (params) await Filters.applySobel(ctx, params); 
      break;
    case 'robertscross': 
      if (params) await Filters.applyRobertsCross(ctx, params); 
      break;
    case 'log': 
      if (params) await Filters.applyLoG(ctx, params); 
      break;
    case 'dog': 
      if (params) await Filters.applyDoG(ctx, params); 
      break;
    case 'marrhildreth': 
      if (params) await Filters.applyMarrHildreth(ctx, params); 
      break;
    case 'gaussianblur': 
      if (params) await Filters.applyGaussianBlur(ctx, params); 
      break;
    case 'boxblur': 
      if (params) await Filters.applyBoxBlur(ctx, params); 
      break;
    case 'median': 
      if (params) Filters.applyMedian(ctx, params); 
      break;
    case 'weightedmedian': 
      if (params) Filters.applyWeightedMedian(ctx, params); 
      break;
    case 'alphatrimmedmean': 
      if (params) Filters.applyAlphaTrimmedMean(ctx, params); 
      break;
    case 'localhistogramequalization': 
      if (params) await Filters.applyLocalHistogramEqualization(ctx, params); 
      break;
    case 'adaptivehistogramequalization': 
      if (params) Filters.applyAdaptiveHistogramEqualization(ctx, params); 
      break;
    case 'sharpen': 
      if (params) Filters.applySharpen(ctx, params); 
      break;
    case 'canny': 
      if (params) await Filters.applyCanny(ctx, params); 
      break;
    case 'clahe': 
      if (params) await Filters.applyClahe(ctx, params); 
      break;
    case 'gammacorrection': 
      if (params) Filters.applyGammaCorrection(ctx, params); 
      break;
    case 'unsharpmask': 
      if (params) Filters.applyUnsharpMask(ctx, params); 
      break;
    case 'gabor': 
      if (params) await Filters.applyGabor(ctx, params); 
      break;
    case 'lawstextureenergy': 
      if (params) await Filters.applyLawsTextureEnergy(ctx, params); 
      break;
    case 'lbp': 
      await Filters.applyLbp(ctx); 
      break;
    case 'guided': 
      if (params) Filters.applyGuidedFilter(ctx, params); 
      break;
    case 'edgepreserving': 
      if (params) Filters.applyEdgePreserving(ctx, params); 
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
      if (params) await Filters.applyMorphOpen(ctx, params); 
      break;
    case 'morph_close': 
      if (params) await Filters.applyMorphClose(ctx, params); 
      break;
    case 'morph_tophat': 
      if (params) await Filters.applyMorphTopHat(ctx, params); 
      break;
    case 'morph_blackhat': 
      if (params) await Filters.applyMorphBlackHat(ctx, params); 
      break;
    case 'morph_gradient': 
      if (params) await Filters.applyMorphGradient(ctx, params); 
      break;
    case 'distancetransform': 
      if (params) await Filters.applyDistanceTransform(ctx, params); 
      break;
    
    // Colormap - Perceptually Uniform (Recommended)
    case 'colormap_viridis': 
      await Filters.applyViridisColormap(ctx, params); 
      break;
    case 'colormap_inferno': 
      await Filters.applyInfernoColormap(ctx, params); 
      break;
    case 'colormap_plasma': 
      await Filters.applyPlasmaColormap(ctx, params); 
      break;
    case 'colormap_magma': 
      await Filters.applyMagmaColormap(ctx, params); 
      break;
    case 'colormap_parula': 
      await Filters.applyParulaColormap(ctx, params); 
      break;
    
    // Colormap - Rainbow/Legacy
    case 'colormap_jet': 
      await Filters.applyJetColormap(ctx, params); 
      break;
    case 'colormap_hsv': 
      await Filters.applyHsvColormap(ctx, params); 
      break;
    case 'colormap_hot': 
      await Filters.applyHotColormap(ctx, params); 
      break;
    
    // Colormap - Aesthetic Gradients
    case 'colormap_cool': 
      await Filters.applyCoolColormap(ctx, params); 
      break;
    case 'colormap_warm': 
      await Filters.applyWarmColormap(ctx, params); 
      break;
    case 'colormap_spring': 
      await Filters.applySpringColormap(ctx, params); 
      break;
    case 'colormap_summer': 
      await Filters.applySummerColormap(ctx, params); 
      break;
    case 'colormap_autumn': 
      await Filters.applyAutumnColormap(ctx, params); 
      break;
    case 'colormap_winter': 
      await Filters.applyWinterColormap(ctx, params); 
      break;
    
    // Colormap - Specialized
    case 'colormap_bone': 
      await Filters.applyBoneColormap(ctx, params); 
      break;
    case 'colormap_copper': 
      await Filters.applyCopperColormap(ctx, params); 
      break;
    case 'colormap_pink': 
      await Filters.applyPinkColormap(ctx, params); 
      break;
    
    // Colormap - Diverging (Change-based)
    case 'colormap_rdbu': 
      await Filters.applyRdbuColormap(ctx, params); 
      break;
    case 'colormap_rdylbu': 
      await Filters.applyRdylbuColormap(ctx, params); 
      break;
    case 'colormap_bwr': 
      await Filters.applyBwrColormap(ctx, params); 
      break;
    case 'colormap_seismic': 
      await Filters.applySeismicColormap(ctx, params); 
      break;
    case 'colormap_coolwarm': 
      await Filters.applyCoolwarmColormap(ctx, params); 
      break;
    case 'colormap_spectral': 
      await Filters.applySpectralColormap(ctx, params); 
      break;
    
    // Colormap - Gradient-based
    case 'colormap_gradient_magnitude': 
      await Filters.applyGradientMagnitudeColormap(ctx, params); 
      break;
    case 'colormap_edge_intensity': 
      await Filters.applyEdgeIntensityColormap(ctx, params); 
      break;
    case 'colormap_difference': 
      await Filters.applyDifferenceColormap(ctx, params); 
      break;
    
    default:
      console.warn(`Unknown filter type: ${filterType}`);
  }
}