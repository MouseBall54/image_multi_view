import { getOpenCV, isOpenCVReady } from './opencv';
import type { FilterParams } from '../store';

export interface PerformanceMetrics {
  estimatedTimeMs: number;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  memoryUsageMB: number;
}

export function canvasToMat(ctx: CanvasRenderingContext2D): any {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Create Mat from ImageData
  const src = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC4);
  src.data.set(imageData.data);
  
  return src;
}

export function matToCanvas(ctx: CanvasRenderingContext2D, mat: any): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  
  // Convert Mat back to ImageData format
  let outputMat = mat;
  
  // If mat is not RGBA, convert it
  if (mat.channels() !== 4) {
    outputMat = new cv.Mat();
    if (mat.channels() === 3) {
      cv.cvtColor(mat, outputMat, cv.COLOR_RGB2RGBA);
    } else if (mat.channels() === 1) {
      cv.cvtColor(mat, outputMat, cv.COLOR_GRAY2RGBA);
    }
  }
  
  const imageData = new ImageData(
    new Uint8ClampedArray(outputMat.data),
    outputMat.cols,
    outputMat.rows
  );
  
  ctx.putImageData(imageData, 0, 0);
  
  // Clean up temporary mat if created
  if (outputMat !== mat) {
    outputMat.delete();
  }
}

export function calculatePerformanceMetrics(
  width: number, 
  height: number, 
  filterType: string, 
  params: FilterParams
): PerformanceMetrics {
  const pixels = width * height;
  const megapixels = pixels / 1000000;
  
  let baseTimeMs = 0;
  let complexity: PerformanceMetrics['complexity'] = 'low';
  let memoryMultiplier = 1;

  switch (filterType) {
    case 'none':
      baseTimeMs = 0;
      complexity = 'low';
      break;
    // Blurring filters
    case 'gaussianBlur':
      baseTimeMs = megapixels * 15; // OpenCV optimized
      complexity = params.kernelSize > 15 ? 'medium' : 'low';
      if (params.kernelSize > 25) complexity = 'high';
      break;
      
    case 'boxBlur':
      baseTimeMs = megapixels * 8; // OpenCV optimized
      complexity = params.kernelSize > 20 ? 'medium' : 'low';
      break;
      
    case 'medianBlur':
      baseTimeMs = megapixels * 25; // OpenCV optimized
      complexity = params.kernelSize > 9 ? 'high' : 'medium';
      if (params.kernelSize > 15) complexity = 'very_high';
      memoryMultiplier = 1.5;
      break;

    case 'weightedMedian':
      baseTimeMs = megapixels * 35; // Weighted sorting is more expensive
      complexity = params.kernelSize > 7 ? 'high' : 'medium';
      if (params.kernelSize > 11) complexity = 'very_high';
      memoryMultiplier = 1.8; // Additional memory for weights
      break;

    case 'alphaTrimmedMean':
      baseTimeMs = megapixels * 30; // Sorting + trimming
      complexity = params.kernelSize > 9 ? 'high' : 'medium';
      if (params.kernelSize > 15) complexity = 'very_high';
      // Alpha parameter affects complexity
      const alphaComplexity = (params.alpha || 0.1) * 2 + 1;
      baseTimeMs *= alphaComplexity;
      memoryMultiplier = 1.6;
      break;

    // Edge detection filters
    case 'sobel':
      baseTimeMs = megapixels * 8; // OpenCV optimized (was 12)
      complexity = 'low';
      break;

    case 'prewitt':
      baseTimeMs = megapixels * 14; // No OpenCV optimization
      complexity = 'low';
      break;

    case 'scharr':
      baseTimeMs = megapixels * 9; // OpenCV optimized (was 13)
      complexity = 'low';
      break;

    case 'robertsCross':
      baseTimeMs = megapixels * 10; // No OpenCV optimization
      complexity = 'low';
      break;

    case 'canny':
      // Canny = Gaussian blur + Sobel + Non-maximum suppression + Hysteresis
      const lowThresh = params.lowThreshold || 50;
      const highThresh = params.highThreshold || 100;
      const thresholdComplexity = (lowThresh < 30 || highThresh > 200) ? 1.2 : 1.0;
      baseTimeMs = megapixels * (12 * thresholdComplexity); // OpenCV optimized
      complexity = thresholdComplexity > 1.0 ? 'high' : 'medium';
      break;

    case 'laplacian':
      baseTimeMs = megapixels * 7; // OpenCV optimized (was 11)
      complexity = 'low';
      // Kernel size affects performance slightly
      const laplacianKernel = params.kernelSize || 3;
      if (laplacianKernel === 1) {
        baseTimeMs *= 0.8; // ksize=1 is optimized 3x3
      } else if (laplacianKernel >= 5) {
        baseTimeMs *= 1.3; // Larger kernels are slightly slower
      }
      break;

    case 'log':
      // LoG = Gaussian blur + Laplacian
      const kernelSizeLog = params.kernelSize || 5;
      const logComplexityFactor = Math.pow(kernelSizeLog, 1.3);
      baseTimeMs = megapixels * (12 + logComplexityFactor * 1.8); // Base + kernel complexity
      if (kernelSizeLog <= 7) {
        complexity = 'low';
      } else if (kernelSizeLog <= 15) {
        complexity = 'medium';
      } else {
        complexity = 'high';
      }
      break;

    case 'dog':
      // DoG = Two Gaussian blurs + subtraction
      const kernelSizeDog = params.kernelSize || 5;
      const dogComplexityFactor = Math.pow(kernelSizeDog, 1.5);
      baseTimeMs = megapixels * (20 + dogComplexityFactor * 2.5); // Base + kernel complexity
      if (kernelSizeDog <= 7) {
        complexity = 'low';
      } else if (kernelSizeDog <= 15) {
        complexity = 'medium';
      } else {
        complexity = 'high';
      }
      memoryMultiplier = 2; // Two blur operations
      break;

    case 'marrHildreth':
      // Marr-Hildreth = LoG + zero crossing detection + threshold processing
      const kernelSizeMarr = params.kernelSize || 5;
      const marrComplexityFactor = Math.pow(kernelSizeMarr, 1.4);
      baseTimeMs = megapixels * (25 + marrComplexityFactor * 3.2); // Base + kernel complexity + zero crossing
      if (kernelSizeMarr <= 5) {
        complexity = 'medium';
      } else if (kernelSizeMarr <= 13) {
        complexity = 'high';
      } else {
        complexity = 'very_high';
      }
      memoryMultiplier = 2.5; // LoG + edge detection buffers
      break;


    // Texture analysis
    case 'gabor':
      baseTimeMs = megapixels * 22;
      if (params.kernelSize <= 15) {
        complexity = 'low';
      } else if (params.kernelSize <= 31) {
        complexity = 'medium';
      } else {
        complexity = 'high';
      }
      break;

    case 'lawsTextureEnergy':
      baseTimeMs = megapixels * 28; // Convolution + energy calculation
      complexity = 'medium';
      const energyWindow = params.kernelSize || 15;
      baseTimeMs *= (energyWindow * energyWindow) / (15 * 15);
      break;

    case 'lbp':
      baseTimeMs = megapixels * 8; // Simple neighbor comparison
      complexity = 'low';
      break;

    // Morphology filters
    case 'morphology':
      baseTimeMs = megapixels * 10;
      complexity = params.kernelSize > 10 ? 'medium' : 'low';
      break;

    case 'distanceTransform':
      baseTimeMs = megapixels * 15;
      complexity = 'medium';
      break;

    // Contrast enhancement
    case 'histogramEqualization':
      baseTimeMs = megapixels * 5; // Single pass histogram
      complexity = 'low';
      break;

    case 'localHistogramEqualization':
      // JS windowed local HE is heavy: O(pixels * k^2)
      const localKernel = params.kernelSize || 15;
      baseTimeMs = megapixels * 45;
      baseTimeMs *= (localKernel * localKernel) / (15 * 15);
      // Complexity scales with effective work factor (MP * k^2)
      const workFactor = megapixels * (localKernel * localKernel) / (15 * 15);
      if (workFactor < 6) {
        complexity = 'medium';
      } else if (workFactor < 20) {
        complexity = 'high';
      } else {
        complexity = 'very_high';
      }
      memoryMultiplier = 2;
      break;

    case 'clahe':
      baseTimeMs = megapixels * 35; // Tile-based processing
      complexity = 'high';
      const gridSize = params.gridSize || 8;
      baseTimeMs *= (64) / (gridSize * gridSize); // Inverse relationship
      memoryMultiplier = 1.5;
      break;

    case 'adaptiveHistogramEqualization':
      baseTimeMs = megapixels * 30;
      complexity = 'medium';
      break;

    case 'linearStretch':
      baseTimeMs = megapixels * 3; // Two passes (min/max + stretch)
      complexity = 'low';
      break;

    case 'gammaCorrection':
      baseTimeMs = megapixels * 2; // LUT application
      complexity = 'low';
      break;

    // Edge-preserving filters
    case 'guidedFilter':
      baseTimeMs = megapixels * 50; // Complex box filtering
      complexity = 'high';
      memoryMultiplier = 3;
      break;

    case 'edgePreserving':
      baseTimeMs = megapixels * 40; // Bilateral filter approximation
      complexity = 'high';
      memoryMultiplier = 2;
      break;

    // Sharpening filters
    case 'sharpen':
      baseTimeMs = megapixels * 8;
      complexity = 'low';
      break;

    case 'unsharpMask':
      baseTimeMs = megapixels * 25; // Gaussian blur + subtraction + addition
      complexity = 'medium';
      memoryMultiplier = 2;
      break;

    case 'highpass':
      baseTimeMs = megapixels * 9;
      complexity = 'low';
      break;

    // Basic filters
    case 'grayscale':
      baseTimeMs = megapixels * 1;
      complexity = 'low';
      break;

    case 'invert':
      baseTimeMs = megapixels * 1;
      complexity = 'low';
      break;

    case 'sepia':
      baseTimeMs = megapixels * 2;
      complexity = 'low';
      break;

    // Frequency domain (placeholder implementations)
    case 'dft':
    case 'dct':
    case 'wavelet':
      baseTimeMs = megapixels * 20;
      complexity = 'medium';
      break;

    default:
      baseTimeMs = megapixels * 20;
      complexity = 'medium';
  }

  // Apply kernel size multiplier for convolution-based filters
  const convolutionFilters = [
    'gaussianBlur', 'boxBlur', 'medianBlur', 'weightedMedian', 'alphaTrimmedMean',
    'gabor', 'log', 'sharpen', 'unsharpMask', 'morphology'
  ];
  
  if (convolutionFilters.includes(filterType)) {
    const kernelSize = params.kernelSize || 3;
    const kernelComplexity = Math.pow(kernelSize, 1.5) / Math.pow(3, 1.5);
    baseTimeMs *= kernelComplexity;
  }

  // Memory usage estimation (in MB)
  const memoryUsageMB = (pixels * 4 * memoryMultiplier) / (1024 * 1024);

  return {
    estimatedTimeMs: Math.round(baseTimeMs),
    complexity,
    memoryUsageMB: Math.round(memoryUsageMB * 100) / 100
  };
}

export function formatPerformanceEstimate(metrics: PerformanceMetrics): string {
  const { estimatedTimeMs, complexity } = metrics;
  
  if (estimatedTimeMs < 100) {
    return `~${estimatedTimeMs}ms`;
  } else if (estimatedTimeMs < 1000) {
    return `~${Math.round(estimatedTimeMs / 10) * 10}ms`;
  } else {
    const seconds = Math.round(estimatedTimeMs / 100) / 10;
    return `~${seconds}s`;
  }
}

export function getComplexityColor(complexity: PerformanceMetrics['complexity']): string {
  switch (complexity) {
    case 'low': return '#10b981'; // green
    case 'medium': return '#f59e0b'; // yellow
    case 'high': return '#ef4444'; // red
    case 'very_high': return '#dc2626'; // dark red
    default: return '#6b7280'; // gray
  }
}

// OpenCV Filter Implementations

export function applyGaussianBlurOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const dst = new cv.Mat();
  
  try {
    // OpenCV GaussianBlur requires odd kernel size
    const kernelSize = params.kernelSize % 2 === 0 ? params.kernelSize + 1 : params.kernelSize;
    const ksize = new cv.Size(kernelSize, kernelSize);
    const sigmaX = params.sigma;
    const sigmaY = params.sigma;
    
    cv.GaussianBlur(src, dst, ksize, sigmaX, sigmaY, cv.BORDER_DEFAULT);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    dst.delete();
  }
}

export function applyBoxBlurOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const dst = new cv.Mat();
  
  try {
    const ksize = new cv.Size(params.kernelSize, params.kernelSize);
    const anchor = new cv.Point(-1, -1);
    
    cv.boxFilter(src, dst, -1, ksize, anchor, true, cv.BORDER_DEFAULT);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    dst.delete();
  }
}

export function applyMedianBlurOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const dst = new cv.Mat();
  
  try {
    // OpenCV medianBlur requires odd kernel size
    const kernelSize = params.kernelSize % 2 === 0 ? params.kernelSize + 1 : params.kernelSize;
    
    cv.medianBlur(src, dst, kernelSize);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    dst.delete();
  }
}

// Edge Detection Filters

export function applySobelOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const gradX = new cv.Mat();
  const gradY = new cv.Mat();
  const absGradX = new cv.Mat();
  const absGradY = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply Sobel in X and Y directions
    const ksize = 3; // Sobel kernel size (3, 5, 7, etc.)
    const scale = 1;
    const delta = 0;
    
    cv.Sobel(gray, gradX, cv.CV_16S, 1, 0, ksize, scale, delta, cv.BORDER_DEFAULT);
    cv.Sobel(gray, gradY, cv.CV_16S, 0, 1, ksize, scale, delta, cv.BORDER_DEFAULT);
    
    // Convert to absolute values
    cv.convertScaleAbs(gradX, absGradX);
    cv.convertScaleAbs(gradY, absGradY);
    
    // Combine X and Y gradients
    cv.addWeighted(absGradX, 0.5, absGradY, 0.5, 0, dst);
    
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    gradX.delete();
    gradY.delete();
    absGradX.delete();
    absGradY.delete();
    dst.delete();
  }
}

export function applyScharrOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const gradX = new cv.Mat();
  const gradY = new cv.Mat();
  const absGradX = new cv.Mat();
  const absGradY = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply Scharr in X and Y directions
    const scale = 1;
    const delta = 0;
    
    cv.Scharr(gray, gradX, cv.CV_16S, 1, 0, scale, delta, cv.BORDER_DEFAULT);
    cv.Scharr(gray, gradY, cv.CV_16S, 0, 1, scale, delta, cv.BORDER_DEFAULT);
    
    // Convert to absolute values
    cv.convertScaleAbs(gradX, absGradX);
    cv.convertScaleAbs(gradY, absGradY);
    
    // Combine X and Y gradients
    cv.addWeighted(absGradX, 0.5, absGradY, 0.5, 0, dst);
    
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    gradX.delete();
    gradY.delete();
    absGradX.delete();
    absGradY.delete();
    dst.delete();
  }
}

export function applyCannyOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply Canny edge detection
    const lowThreshold = params.lowThreshold || 50;
    const highThreshold = params.highThreshold || 100;
    const apertureSize = 3; // Sobel kernel size
    const L2gradient = false; // Use L1 norm
    
    cv.Canny(gray, dst, lowThreshold, highThreshold, apertureSize, L2gradient);
    
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyLaplacianOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const laplacian = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply Laplacian
    // OpenCV supports kernel sizes: 1 (optimized 3x3), 3, 5, 7, etc.
    let ksize = params.kernelSize || 3;
    
    // Ensure valid kernel size for OpenCV Laplacian
    if (![1, 3, 5, 7].includes(ksize)) {
      ksize = 3; // Default to 3 if invalid
    }
    
    const scale = 1;
    const delta = 0;
    
    cv.Laplacian(gray, laplacian, cv.CV_16S, ksize, scale, delta, cv.BORDER_DEFAULT);
    
    // Convert to 8-bit with proper scaling
    cv.convertScaleAbs(laplacian, dst);
    
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    laplacian.delete();
    dst.delete();
  }
}

// Fallback wrapper that tries OpenCV first, then falls back to original implementation
export async function applyFilterWithFallback(
  ctx: CanvasRenderingContext2D,
  filterType: string,
  params: FilterParams,
  originalFilterFn: (ctx: CanvasRenderingContext2D, params: FilterParams) => void,
  opencvFilterFn?: (ctx: CanvasRenderingContext2D, params: FilterParams) => void
): Promise<void> {
  if (opencvFilterFn && isOpenCVReady()) {
    try {
      await opencvFilterFn(ctx, params);
      return;
    } catch (error) {
      console.warn(`OpenCV filter ${filterType} failed, falling back to original:`, error);
    }
  }
  
  // Fallback to original implementation
  originalFilterFn(ctx, params);
}

// ========== Morphology Operations ==========

export function applyMorphOpeningOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create morphological kernel
    const kernelSize = params.kernelSize || 5;
    const morphShape = params.morphShape || 'ellipse';
    
    let shape;
    switch (morphShape) {
      case 'rect': shape = cv.MORPH_RECT; break;
      case 'cross': shape = cv.MORPH_CROSS; break;
      case 'ellipse':
      default: shape = cv.MORPH_ELLIPSE; break;
    }
    
    const kernel = cv.getStructuringElement(shape, new cv.Size(kernelSize, kernelSize));
    const anchor = new cv.Point(-1, -1);
    const iterations = params.morphIterations || 1;
    
    // Apply morphological opening
    cv.morphologyEx(gray, dst, cv.MORPH_OPEN, kernel, anchor, iterations);
    
    matToCanvas(ctx, dst);
    
    kernel.delete();
  } finally {
    src.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyMorphClosingOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create morphological kernel
    const kernelSize = params.kernelSize || 5;
    const morphShape = params.morphShape || 'ellipse';
    
    let shape;
    switch (morphShape) {
      case 'rect': shape = cv.MORPH_RECT; break;
      case 'cross': shape = cv.MORPH_CROSS; break;
      case 'ellipse':
      default: shape = cv.MORPH_ELLIPSE; break;
    }
    
    const kernel = cv.getStructuringElement(shape, new cv.Size(kernelSize, kernelSize));
    const anchor = new cv.Point(-1, -1);
    const iterations = params.morphIterations || 1;
    
    // Apply morphological closing
    cv.morphologyEx(gray, dst, cv.MORPH_CLOSE, kernel, anchor, iterations);
    
    matToCanvas(ctx, dst);
    
    kernel.delete();
  } finally {
    src.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyMorphTopHatOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create morphological kernel
    const kernelSize = params.kernelSize || 5;
    const morphShape = params.morphShape || 'ellipse';
    
    let shape;
    switch (morphShape) {
      case 'rect': shape = cv.MORPH_RECT; break;
      case 'cross': shape = cv.MORPH_CROSS; break;
      case 'ellipse':
      default: shape = cv.MORPH_ELLIPSE; break;
    }
    
    const kernel = cv.getStructuringElement(shape, new cv.Size(kernelSize, kernelSize));
    const anchor = new cv.Point(-1, -1);
    const iterations = params.morphIterations || 1;
    
    // Apply morphological top-hat
    cv.morphologyEx(gray, dst, cv.MORPH_TOPHAT, kernel, anchor, iterations);
    
    matToCanvas(ctx, dst);
    
    kernel.delete();
  } finally {
    src.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyMorphBlackHatOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create morphological kernel
    const kernelSize = params.kernelSize || 5;
    const morphShape = params.morphShape || 'ellipse';
    
    let shape;
    switch (morphShape) {
      case 'rect': shape = cv.MORPH_RECT; break;
      case 'cross': shape = cv.MORPH_CROSS; break;
      case 'ellipse':
      default: shape = cv.MORPH_ELLIPSE; break;
    }
    
    const kernel = cv.getStructuringElement(shape, new cv.Size(kernelSize, kernelSize));
    const anchor = new cv.Point(-1, -1);
    const iterations = params.morphIterations || 1;
    
    // Apply morphological black-hat
    cv.morphologyEx(gray, dst, cv.MORPH_BLACKHAT, kernel, anchor, iterations);
    
    matToCanvas(ctx, dst);
    
    kernel.delete();
  } finally {
    src.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyMorphGradientOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create morphological kernel
    const kernelSize = params.kernelSize || 5;
    const morphShape = params.morphShape || 'ellipse';
    
    let shape;
    switch (morphShape) {
      case 'rect': shape = cv.MORPH_RECT; break;
      case 'cross': shape = cv.MORPH_CROSS; break;
      case 'ellipse':
      default: shape = cv.MORPH_ELLIPSE; break;
    }
    
    const kernel = cv.getStructuringElement(shape, new cv.Size(kernelSize, kernelSize));
    const anchor = new cv.Point(-1, -1);
    const iterations = params.morphIterations || 1;
    
    // Apply morphological gradient
    cv.morphologyEx(gray, dst, cv.MORPH_GRADIENT, kernel, anchor, iterations);
    
    matToCanvas(ctx, dst);
    
    kernel.delete();
  } finally {
    src.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyDistanceTransformOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const binary = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply threshold to create binary image
    const threshold = params.lowThreshold || 128;
    cv.threshold(gray, binary, threshold, 255, cv.THRESH_BINARY);
    
    // Apply distance transform
    cv.distanceTransform(binary, dst, cv.DIST_L2, cv.DIST_MASK_PRECISE);
    
    // Normalize to 0-255 range
    const minMax = cv.minMaxLoc(dst);
    const maxVal = minMax.maxVal;
    
    if (maxVal > 0) {
      cv.convertScaleAbs(dst, dst, 255.0 / maxVal, 0);
    }
    
    matToCanvas(ctx, dst);
    
  } finally {
    src.delete();
    gray.delete();
    binary.delete();
    dst.delete();
  }
}

// ========== Histogram / Contrast ==========

export function applyHistogramEqualizationOpenCV(ctx: CanvasRenderingContext2D): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const rgb = new cv.Mat();
  const ycrcb = new cv.Mat();
  const y = new cv.Mat();
  const yEq = new cv.Mat();
  const rgbOut = new cv.Mat();
  const dst = new cv.Mat();

  try {
    // Convert RGBA -> RGB -> YCrCb
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, ycrcb, cv.COLOR_RGB2YCrCb);

    // Equalize only the luminance (channel 0) using split/merge (extractChannel may be unavailable)
    const mvEq = new cv.MatVector();
    cv.split(ycrcb, mvEq);
    const yMatEq = mvEq.get(0);
    cv.equalizeHist(yMatEq, yEq);
    mvEq.set(0, yEq);
    cv.merge(mvEq, ycrcb);
    yMatEq.delete();
    mvEq.delete();

    // Convert YCrCb -> RGB -> RGBA
    cv.cvtColor(ycrcb, rgbOut, cv.COLOR_YCrCb2RGB);
    cv.cvtColor(rgbOut, dst, cv.COLOR_RGB2RGBA);

    matToCanvas(ctx, dst);

    y.delete();
    yEq.delete();
  } finally {
    src.delete();
    rgb.delete();
    ycrcb.delete();
    rgbOut.delete();
    dst.delete();
  }
}

export function applyClaheOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const rgb = new cv.Mat();
  const ycrcb = new cv.Mat();
  const y = new cv.Mat();
  const yClahe = new cv.Mat();
  const rgbOut = new cv.Mat();
  const dst = new cv.Mat();

  try {
    const clipLimit = Math.max(0.1, params.clipLimit || 2.0);
    const grid = Math.max(1, params.gridSize || 8);

    // Convert to YCrCb luminance
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, ycrcb, cv.COLOR_RGB2YCrCb);
    // Split to get luminance channel (avoid extractChannel)
    const mvClahe = new cv.MatVector();
    cv.split(ycrcb, mvClahe);
    const yMatC = mvClahe.get(0);

    // OpenCV.js exposes CLAHE via createCLAHE
    const tileSize = new cv.Size(grid, grid);
    const clahe = (cv as any).createCLAHE ? (cv as any).createCLAHE(clipLimit, tileSize) : new (cv as any).CLAHE(clipLimit, tileSize);
    clahe.apply(yMatC, yClahe);

    mvClahe.set(0, yClahe);
    cv.merge(mvClahe, ycrcb);
    cv.cvtColor(ycrcb, rgbOut, cv.COLOR_YCrCb2RGB);
    cv.cvtColor(rgbOut, dst, cv.COLOR_RGB2RGBA);

    matToCanvas(ctx, dst);

    yMatC.delete();
    yClahe.delete();
    clahe.delete();
    mvClahe.delete();
  } finally {
    src.delete();
    rgb.delete();
    ycrcb.delete();
    rgbOut.delete();
    dst.delete();
  }
}

export function applyLocalHistogramEqualizationOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  // Fast-path approximation using CLAHE with tile size derived from kernel
  const grid = Math.max(1, Math.round((params.kernelSize || 15) / 8));
  applyClaheOpenCV(ctx, { ...params, gridSize: grid, clipLimit: params.clipLimit || 2.0 } as FilterParams);
}

export function applyGammaCorrectionOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const rgb = new cv.Mat();
  const dst = new cv.Mat();

  try {
    const gamma = params.gamma || 1.0;
    if (gamma === 1.0) {
      // No change
      return;
    }
    // Prepare RGB
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    // Build LUT
    const lut = new cv.Mat(1, 256, cv.CV_8UC1);
    const lutData = lut.data as Uint8Array;
    const gr = 1.0 / gamma;
    for (let i = 0; i < 256; i++) {
      lutData[i] = Math.max(0, Math.min(255, Math.round(Math.pow(i / 255, gr) * 255)));
    }

    // Apply LUT per channel
    (cv as any).LUT(rgb, lut, rgb);

    // Convert back to RGBA
    cv.cvtColor(rgb, dst, cv.COLOR_RGB2RGBA);
    matToCanvas(ctx, dst);

    lut.delete();
  } finally {
    src.delete();
    rgb.delete();
    dst.delete();
  }
}

export function applyLinearStretchOpenCV(ctx: CanvasRenderingContext2D): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const rgb = new cv.Mat();
  const gray = new cv.Mat();
  const dst = new cv.Mat();

  try {
    // Prepare mats
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);

    const minMax = cv.minMaxLoc(gray);
    const minVal = minMax.minVal;
    const maxVal = minMax.maxVal;
    const range = maxVal - minVal;
    if (range <= 0) {
      return; // avoid division by zero; image is flat
    }

    const alpha = 255.0 / range; // scale
    const beta = -minVal * alpha; // shift

    // Apply linear scaling to all channels at once (avoid extract/insert)
    (cv as any).convertScaleAbs(rgb, rgb, alpha, beta);

    cv.cvtColor(rgb, dst, cv.COLOR_RGB2RGBA);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    rgb.delete();
    gray.delete();
    dst.delete();
  }
}

export function applyUnsharpMaskOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const rgb = new cv.Mat();
  const blurred = new cv.Mat();
  const sharp = new cv.Mat();
  const dst = new cv.Mat();

  try {
    const kRaw = params.kernelSize || 5;
    const ksize = (kRaw % 2 === 0) ? kRaw + 1 : kRaw;
    const sigma = params.sigma || 1.0;
    const amount = params.sharpenAmount ?? 1.0;

    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.GaussianBlur(rgb, blurred, new cv.Size(ksize, ksize), sigma, sigma, cv.BORDER_DEFAULT);
    // sharp = (1+amount)*rgb + (-amount)*blurred
    (cv as any).addWeighted(rgb, 1 + amount, blurred, -amount, 0, sharp);
    cv.cvtColor(sharp, dst, cv.COLOR_RGB2RGBA);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    rgb.delete();
    blurred.delete();
    sharp.delete();
    dst.delete();
  }
}

// ========== Texture Analysis ==========

export function applyGaborOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const kernel = new cv.Mat();
  const resp = new cv.Mat();
  const dst = new cv.Mat();

  try {
    const ksize = params.kernelSize || 31;
    const sigma = params.gaborSigma || params.sigma || 4.0;
    const theta = params.theta || 0; // radians expected
    const lambda = params.lambda || 10.0;
    const gamma = params.gamma || 0.5;
    const psi = params.psi || 0;

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const getter = (cv as any).getGaborKernel;

    if (typeof getter === 'function') {
      // Native OpenCV kernel generation when available
      const ksizeObj = new cv.Size(ksize, ksize);
      const k = getter(ksizeObj, sigma, theta, lambda, gamma, psi, cv.CV_32F);
      k.copyTo(kernel);
      k.delete();
    } else {
      // Hybrid path: generate kernel in JS, apply via OpenCV filter2D
      const half = Math.floor(ksize / 2);
      const sigmaX = sigma;
      const sigmaY = sigma / gamma;
      const data = new Float32Array(ksize * ksize);
      let idx = 0;
      for (let y = 0; y < ksize; y++) {
        for (let x = 0; x < ksize; x++) {
          const xr = (x - half) * Math.cos(theta) + (y - half) * Math.sin(theta);
          const yr = -(x - half) * Math.sin(theta) + (y - half) * Math.cos(theta);
          const gaussian = Math.exp(-0.5 * ((xr * xr) / (sigmaX * sigmaX) + (yr * yr) / (sigmaY * sigmaY)));
          const sinusoidal = Math.cos((2 * Math.PI * xr) / lambda + psi);
          data[idx++] = gaussian * sinusoidal;
        }
      }
      const mat = (cv as any).matFromArray(ksize, ksize, cv.CV_32F, data);
      mat.copyTo(kernel);
      mat.delete();
    }

    cv.filter2D(gray, resp, cv.CV_32F, kernel);
    cv.convertScaleAbs(resp, dst);

    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    kernel.delete();
    resp.delete();
    dst.delete();
  }
}

// Laws' vectors
const LAWS_L5 = [1, 4, 6, 4, 1];
const LAWS_E5 = [-1, -2, 0, 2, 1];
const LAWS_S5 = [-1, 0, 2, 0, -1];
const LAWS_W5 = [-1, 2, 0, -2, 1];
const LAWS_R5 = [1, -4, 6, -4, 1];

function createLawsKernelMat(cvRef: any, typeCode: string): any {
  const map: Record<string, number[]> = { L5: LAWS_L5, E5: LAWS_E5, S5: LAWS_S5, W5: LAWS_W5, R5: LAWS_R5 };
  const parts = typeCode.match(/.{1,2}/g) || ['L5', 'E5'];
  const v1 = map[parts[0]] || map['L5'];
  const v2 = map[parts[1]] || map['E5'];
  const mat = new cvRef.Mat(5, 5, cvRef.CV_32F);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      (mat.data32F as Float32Array)[i * 5 + j] = v1[i] * v2[j];
    }
  }
  return mat;
}

export function applyLawsTextureEnergyOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const kernel = createLawsKernelMat(cv, params.lawsKernelType || 'L5E5');
  const resp = new cv.Mat();
  const respSq = new cv.Mat();
  const energy = new cv.Mat();
  const out8 = new cv.Mat();
  const dst = new cv.Mat();

  try {
    const win = Math.max(3, params.kernelSize || 15);
    const ksize = new cv.Size(win, win);

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.filter2D(gray, resp, cv.CV_32F, kernel);
    cv.multiply(resp, resp, respSq); // square
    // Box filter to compute local average energy
    cv.boxFilter(respSq, energy, -1, ksize, new cv.Point(-1, -1), true, cv.BORDER_DEFAULT);
    cv.convertScaleAbs(energy, out8);

    // Convert to RGBA and draw
    cv.cvtColor(out8, dst, cv.COLOR_GRAY2RGBA);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    kernel.delete();
    resp.delete();
    respSq.delete();
    energy.delete();
    out8.delete();
    dst.delete();
  }
}

export function applyLbpOpenCV(ctx: CanvasRenderingContext2D): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');

  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const padded = new cv.Mat();
  const center = new cv.Mat();
  const acc = new cv.Mat();
  const tmp = new cv.Mat();
  const mask = new cv.Mat();
  const maskF = new cv.Mat();
  const acc8 = new cv.Mat();
  const dst = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    // pad 1 pixel on all sides to simplify neighbors
    cv.copyMakeBorder(gray, padded, 1, 1, 1, 1, cv.BORDER_REPLICATE);
    const w = gray.cols, h = gray.rows;
    center.create(h, w, cv.CV_8UC1);
    // ROI for center is (1,1)-(w,h) in padded
    const centerRoi = padded.roi(new cv.Rect(1, 1, w, h));
    centerRoi.copyTo(center);
    centerRoi.delete();

    acc.create(h, w, cv.CV_32FC1);
    acc.setTo(new cv.Scalar(0, 0, 0, 0));

    const shifts: Array<{dx: number, dy: number, weight: number}> = [
      { dx: -1, dy: -1, weight: 1 },   // top-left
      { dx: 0, dy: -1, weight: 2 },    // top
      { dx: 1, dy: -1, weight: 4 },    // top-right
      { dx: 1, dy: 0, weight: 8 },     // right
      { dx: 1, dy: 1, weight: 16 },    // bottom-right
      { dx: 0, dy: 1, weight: 32 },    // bottom
      { dx: -1, dy: 1, weight: 64 },   // bottom-left
      { dx: -1, dy: 0, weight: 128 },  // left
    ];

    for (const s of shifts) {
      const roi = padded.roi(new cv.Rect(1 + s.dx, 1 + s.dy, w, h));
      // mask = roi >= center ? 255 : 0
      cv.compare(roi, center, mask, cv.CMP_GE);
      // maskF = (mask / 255.0) as float
      mask.convertTo(maskF, cv.CV_32F, 1.0 / 255.0);
      // acc += maskF * weight
      cv.addWeighted(acc, 1.0, maskF, s.weight, 0.0, acc);
      roi.delete();
    }

    acc.convertTo(acc8, cv.CV_8U);
    cv.cvtColor(acc8, dst, cv.COLOR_GRAY2RGBA);
    matToCanvas(ctx, dst);
  } finally {
    src.delete();
    gray.delete();
    padded.delete();
    center.delete();
    acc.delete();
    tmp.delete();
    mask.delete();
    maskF.delete();
    acc8.delete();
    dst.delete();
  }
}

// ========== Advanced Edge Detection ==========

export function applyPrewittOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const gradX = new cv.Mat();
  const gradY = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create Prewitt kernels
    const kernelX = cv.matFromArray(3, 3, cv.CV_32FC1, [-1, 0, 1, -1, 0, 1, -1, 0, 1]);
    const kernelY = cv.matFromArray(3, 3, cv.CV_32FC1, [-1, -1, -1, 0, 0, 0, 1, 1, 1]);
    
    // Apply filters
    cv.filter2D(gray, gradX, cv.CV_32F, kernelX);
    cv.filter2D(gray, gradY, cv.CV_32F, kernelY);
    
    // Combine gradients
    cv.magnitude(gradX, gradY, dst);
    
    // Convert back to 8-bit
    cv.convertScaleAbs(dst, dst);
    
    matToCanvas(ctx, dst);
    
    kernelX.delete();
    kernelY.delete();
  } finally {
    src.delete();
    gray.delete();
    gradX.delete();
    gradY.delete();
    dst.delete();
  }
}

export function applyRobertsCrossOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const gradX = new cv.Mat();
  const gradY = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Create Roberts Cross kernels
    const kernelX = cv.matFromArray(2, 2, cv.CV_32FC1, [1, 0, 0, -1]);
    const kernelY = cv.matFromArray(2, 2, cv.CV_32FC1, [0, 1, -1, 0]);
    
    // Apply filters
    cv.filter2D(gray, gradX, cv.CV_32F, kernelX);
    cv.filter2D(gray, gradY, cv.CV_32F, kernelY);
    
    // Combine gradients
    cv.magnitude(gradX, gradY, dst);
    
    // Convert back to 8-bit
    cv.convertScaleAbs(dst, dst);
    
    matToCanvas(ctx, dst);
    
    kernelX.delete();
    kernelY.delete();
  } finally {
    src.delete();
    gray.delete();
    gradX.delete();
    gradY.delete();
    dst.delete();
  }
}

export function applyLoGOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply Gaussian blur first
    const sigma = params.sigma || 1.5;
    const kernelSize = params.kernelSize || 5;
    const ksize = new cv.Size(kernelSize, kernelSize);
    cv.GaussianBlur(gray, blurred, ksize, sigma, sigma);
    
    // Apply Laplacian
    cv.Laplacian(blurred, dst, cv.CV_32F, 1);
    
    // Convert back to 8-bit
    cv.convertScaleAbs(dst, dst);
    
    matToCanvas(ctx, dst);
    
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    dst.delete();
  }
}

export function applyDoGOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const blur1 = new cv.Mat();
  const blur2 = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Parameters for two Gaussians
    const sigma1 = params.sigma || 1.5;
    const sigma2 = params.sigma2 || 2.0;
    const kernelSize = params.kernelSize || 5;
    const ksize = new cv.Size(kernelSize, kernelSize);
    
    // Apply two Gaussian blurs with different sigmas
    cv.GaussianBlur(gray, blur1, ksize, sigma1, sigma1);
    cv.GaussianBlur(gray, blur2, ksize, sigma2, sigma2);
    
    // Subtract the two blurred images
    cv.subtract(blur1, blur2, dst);
    
    // Convert back to 8-bit
    cv.convertScaleAbs(dst, dst);
    
    matToCanvas(ctx, dst);
    
  } finally {
    src.delete();
    gray.delete();
    blur1.delete();
    blur2.delete();
    dst.delete();
  }
}

export function applyMarrHildrethOpenCV(ctx: CanvasRenderingContext2D, params: FilterParams): void {
  if (!isOpenCVReady()) throw new Error('OpenCV not ready');
  
  const cv = getOpenCV();
  const src = canvasToMat(ctx);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const laplacian = new cv.Mat();
  const dst = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply Gaussian blur first
    const sigma = params.sigma || 1.5;
    const kernelSize = params.kernelSize || 5;
    const ksize = new cv.Size(kernelSize, kernelSize);
    cv.GaussianBlur(gray, blurred, ksize, sigma, sigma);
    
    // Apply Laplacian
    cv.Laplacian(blurred, laplacian, cv.CV_32F, 1);
    
    // Zero-crossing detection (simplified)
    // In a full implementation, this would involve checking neighboring pixels
    // For now, we'll threshold the Laplacian result
    const threshold = params.threshold || 10;
    cv.threshold(laplacian, dst, threshold, 255, cv.THRESH_BINARY);
    
    // Convert back to 8-bit
    cv.convertScaleAbs(dst, dst);
    
    matToCanvas(ctx, dst);
    
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    laplacian.delete();
    dst.delete();
  }
}
