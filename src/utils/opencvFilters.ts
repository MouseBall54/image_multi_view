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
      baseTimeMs = megapixels * 12; // OpenCV optimized (was 20)
      complexity = 'medium';
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
      baseTimeMs = megapixels * 18;
      complexity = params.kernelSize > 15 ? 'medium' : 'low';
      break;

    case 'dog':
      baseTimeMs = megapixels * 32; // Two gaussian blurs + subtraction
      complexity = 'medium';
      memoryMultiplier = 2;
      break;

    case 'marrHildreth':
      baseTimeMs = megapixels * 45; // LoG + zero crossing detection
      complexity = 'high';
      memoryMultiplier = 2.5;
      break;


    // Texture analysis
    case 'gabor':
      baseTimeMs = megapixels * 22;
      complexity = params.kernelSize > 15 ? 'medium' : 'low';
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
      baseTimeMs = megapixels * 45; // Local window processing
      complexity = 'high';
      const localKernel = params.kernelSize || 15;
      baseTimeMs *= (localKernel * localKernel) / (15 * 15);
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