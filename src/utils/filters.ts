// @ts-nocheck
import type { FilterParams } from '../store';
import { 
  applyFilterWithFallback, 
  applyGaussianBlurOpenCV, 
  applyGaussianBlurAxisOpenCV,
  applyBoxBlurOpenCV, 
  applyBoxBlurAxisOpenCV,
  applyMedianBlurOpenCV,
  applySobelOpenCV,
  applyScharrOpenCV,
  applyCannyOpenCV,
  applyLaplacianOpenCV,
  applyMorphOpeningOpenCV,
  applyMorphClosingOpenCV,
  applyMorphTopHatOpenCV,
  applyMorphBlackHatOpenCV,
  applyMorphGradientOpenCV,
  applyDistanceTransformOpenCV,
  applyPrewittOpenCV,
  applyRobertsCrossOpenCV,
  applyLoGOpenCV,
  applyDoGOpenCV,
  applyMarrHildrethOpenCV,
  applyBinaryThresholdOpenCV,
  applyOtsuThresholdOpenCV,
  applyTriangleThresholdOpenCV,
  applyAdaptiveMeanThresholdOpenCV,
  applyAdaptiveGaussianThresholdOpenCV,
  applySauvolaThresholdOpenCV,
  applyBradleyThresholdOpenCV,
  applyBernsenThresholdOpenCV,
  applyPhansalkarThresholdOpenCV
} from './opencvFilters';
import {
  applyHistogramEqualizationOpenCV,
  applyClaheOpenCV,
  applyLocalHistogramEqualizationOpenCV
} from './opencvFilters';
import { isValidFilterImageDimensions, normalizeFilterParams, safeDivide } from './filterRuntimeGuards';

// Helper function to create a Gaussian kernel
function createGaussianKernel(sigma: number, size: number): number[][] {
  const safeSize = Math.max(1, Math.floor(size));
  const safeSigma = Math.max(0.0001, Number.isFinite(sigma) ? sigma : 1.0);
  const normalizedSize = safeSize % 2 === 0 ? safeSize + 1 : safeSize;
  const kernel: number[][] = Array(normalizedSize).fill(0).map(() => Array(normalizedSize).fill(0));
  const half = Math.floor(normalizedSize / 2);
  const sigma2 = 2 * safeSigma * safeSigma;
  let sum = 0;

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const value = (1 / (Math.PI * sigma2)) * Math.exp(-(x * x + y * y) / sigma2);
      kernel[y + half][x + half] = value;
      sum += value;
    }
  }

  // Normalize the kernel
  const safeSum = sum === 0 ? 1 : sum;
  for (let i = 0; i < normalizedSize; i++) {
    for (let j = 0; j < normalizedSize; j++) {
      kernel[i][j] /= safeSum;
    }
  }
  return kernel;
}

function createGaussianKernelAxis(sigmaX: number, sigmaY: number, sizeX: number, sizeY: number): number[][] {
  const safeSizeX = Math.max(1, Math.floor(sizeX));
  const safeSizeY = Math.max(1, Math.floor(sizeY));
  const kernel: number[][] = Array(safeSizeY).fill(0).map(() => Array(safeSizeX).fill(0));
  const halfX = Math.floor(safeSizeX / 2);
  const halfY = Math.floor(safeSizeY / 2);
  const safeSigmaX = Math.max(0.0001, Number.isFinite(sigmaX) ? sigmaX : 1.0);
  const safeSigmaY = Math.max(0.0001, Number.isFinite(sigmaY) ? sigmaY : 1.0);
  const sigmaX2 = 2 * safeSigmaX * safeSigmaX;
  const sigmaY2 = 2 * safeSigmaY * safeSigmaY;
  let sum = 0;

  for (let y = -halfY; y <= halfY; y++) {
    for (let x = -halfX; x <= halfX; x++) {
      const value = Math.exp(-(x * x) / sigmaX2 - (y * y) / sigmaY2);
      kernel[y + halfY][x + halfX] = value;
      sum += value;
    }
  }

  const safeSum = sum === 0 ? 1 : sum;
  for (let i = 0; i < safeSizeY; i++) {
    for (let j = 0; j < safeSizeX; j++) {
      kernel[i][j] /= safeSum;
    }
  }
  return kernel;
}

// Helper function to create a Box Blur kernel
function createBoxBlurKernel(size: number): number[][] {
  const safeSize = Math.max(1, Math.floor(size));
  const value = 1 / (safeSize * safeSize);
  return Array(safeSize).fill(0).map(() => Array(safeSize).fill(value));
}

function createBoxBlurKernelAxis(sizeX: number, sizeY: number): number[][] {
  const safeSizeX = Math.max(1, Math.floor(sizeX));
  const safeSizeY = Math.max(1, Math.floor(sizeY));
  const value = 1 / (safeSizeX * safeSizeY);
  return Array(safeSizeY).fill(0).map(() => Array(safeSizeX).fill(value));
}

function createLoGKernel(sigma: number, size: number): number[][] {
  const kernel: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
  const half = Math.floor(size / 2);
  const sigma2 = sigma * sigma;
  const sigma4 = sigma2 * sigma2;
  let sum = 0;

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const x2y2 = x * x + y * y;
      const value = -1 / (Math.PI * sigma4) * (1 - x2y2 / (2 * sigma2)) * Math.exp(-x2y2 / (2 * sigma2));
      kernel[y + half][x + half] = value;
      sum += value;
    }
  }
  
  // This kernel should not be normalized in the traditional sense, but we can adjust it to be zero-sum
  const mean = sum / (size * size);
   for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      kernel[i][j] -= mean;
    }
  }

  return kernel;
}

// Helper function to create a Sharpen kernel
function createSharpenKernel(amount: number): number[][] {
  return [
    [0, -1, 0],
    [-1, 4 + amount, -1],
    [0, -1, 0],
  ];
}

function createGaborKernel(params: FilterParams): Kernel {
  const { kernelSize, sigma, theta, lambda, gamma, psi } = params;
  const kernel: Kernel = Array(kernelSize).fill(0).map(() => Array(kernelSize).fill(0));
  const half = Math.floor(kernelSize / 2);
  
  const sigmaX = sigma;
  const sigmaY = sigma / gamma;

  for (let y = 0; y < kernelSize; y++) {
    for (let x = 0; x < kernelSize; x++) {
      const x_ = (x - half) * Math.cos(theta) + (y - half) * Math.sin(theta);
      const y_ = -(x - half) * Math.sin(theta) + (y - half) * Math.cos(theta);

      const gaussian = Math.exp(-0.5 * ( (x_ * x_) / (sigmaX * sigmaX) + (y_ * y_) / (sigmaY * sigmaY) ));
      const sinusoidal = Math.cos(2 * Math.PI * (x_ / lambda) + psi);
      
      kernel[y][x] = gaussian * sinusoidal;
    }
  }
  return kernel;
}

type Kernel = number[][];

function ensureOdd(value: number | undefined, fallback: number = 3): number {
  let result = Math.max(1, Math.floor(value ?? fallback));
  if (result % 2 === 0) result += 1;
  return result;
}

function getGrayscaleImage(ctx: CanvasRenderingContext2D) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return { width, height, imageData, gray };
}

function applyBinaryWithThresholdValue(
  ctx: CanvasRenderingContext2D,
  params: FilterParams,
  thresholdValue: number,
  base?: ReturnType<typeof getGrayscaleImage>
) {
  const baseData = base ?? getGrayscaleImage(ctx);
  const { imageData, gray } = baseData;
  const data = imageData.data;
  const maxValue = typeof params.maxValue === 'number' ? params.maxValue : 255;
  const invert = Boolean(params.binaryInvert);

  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    const binary = gray[i] > thresholdValue ? maxValue : 0;
    const output = invert ? (binary === 0 ? maxValue : 0) : binary;
    data[idx] = output;
    data[idx + 1] = output;
    data[idx + 2] = output;
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

function computeHistogram(gray: Uint8ClampedArray): number[] {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) {
    hist[gray[i]]++;
  }
  return hist;
}

function computeOtsuThreshold(gray: Uint8ClampedArray): number {
  const hist = computeHistogram(gray);
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * hist[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = i;
    }
  }

  return threshold;
}

function applyOtsuFallback(ctx: CanvasRenderingContext2D, params: FilterParams) {
  const base = getGrayscaleImage(ctx);
  const threshold = computeOtsuThreshold(base.gray);
  applyBinaryWithThresholdValue(ctx, params, threshold, base);
}

function applyBinaryThresholdFallback(ctx: CanvasRenderingContext2D, params: FilterParams) {
  const threshold = typeof params.threshold === 'number' ? params.threshold : 128;
  applyBinaryWithThresholdValue(ctx, params, threshold);
}

function computeKittlerThreshold(gray: Uint8ClampedArray): number {
  const hist = computeHistogram(gray);
  const total = gray.length;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * hist[i];
    sumSq += i * i * hist[i];
  }

  let cumulativeCount = 0;
  let cumulativeSum = 0;
  let cumulativeSq = 0;
  let minError = Number.POSITIVE_INFINITY;
  let threshold = 0;

  for (let t = 0; t < 255; t++) {
    const count = hist[t];
    if (count === 0) continue;

    cumulativeCount += count;
    cumulativeSum += t * count;
    cumulativeSq += t * t * count;

    const w0 = cumulativeCount / total;
    const w1 = 1 - w0;
    if (w0 < 1e-6 || w1 < 1e-6) continue;

    const mean0 = cumulativeSum / cumulativeCount;
    const mean1 = (sum - cumulativeSum) / (total - cumulativeCount);

    const sigma0Sq = Math.max(cumulativeSq / cumulativeCount - mean0 * mean0, 1e-6);
    const sigma1Sq = Math.max((sumSq - cumulativeSq) / (total - cumulativeCount) - mean1 * mean1, 1e-6);

    const sigma0 = Math.sqrt(sigma0Sq);
    const sigma1 = Math.sqrt(sigma1Sq);

    const error =
      1 +
      2 * (w0 * Math.log(sigma0) + w1 * Math.log(sigma1)) -
      2 * (w0 * Math.log(w0) + w1 * Math.log(w1));

    if (error < minError) {
      minError = error;
      threshold = t;
    }
  }

  return threshold;
}

function applyKittlerFallback(ctx: CanvasRenderingContext2D, params: FilterParams) {
  const base = getGrayscaleImage(ctx);
  const threshold = computeKittlerThreshold(base.gray);
  applyBinaryWithThresholdValue(ctx, params, threshold, base);
}

function convolve(ctx: CanvasRenderingContext2D, kernel: Kernel) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const halfKernel = Math.floor(kernel.length / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = 0; ky < kernel.length; ky++) {
        for (let kx = 0; kx < kernel[ky].length; kx++) {
          const sy = y + ky - halfKernel;
          const sx = x + kx - halfKernel;

          if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
            const i = (sy * width + sx) * 4;
            const weight = kernel[ky][kx];
            r += src[i] * weight;
            g += src[i + 1] * weight;
            b += src[i + 2] * weight;
          }
        }
      }
      
      const outIndex = (y * width + x) * 4;
      data[outIndex] = Math.max(0, Math.min(255, r));
      data[outIndex + 1] = Math.max(0, Math.min(255, g));
      data[outIndex + 2] = Math.max(0, Math.min(255, b));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

const laplacianKernel: Kernel = [
  [0, 1, 0],
  [1, -4, 1],
  [0, 1, 0],
];

const prewittKernelX: Kernel = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
const prewittKernelY: Kernel = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];
const scharrKernelX: Kernel = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]];
const scharrKernelY: Kernel = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]];
const sobelKernelX: Kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
const sobelKernelY: Kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
const robertsKernelX: Kernel = [[1, 0], [0, -1]];
const robertsKernelY: Kernel = [[0, 1], [-1, 0]];
const highpassKernel: Kernel = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];

function applyEdgeFilter(ctx: CanvasRenderingContext2D, kernelX: Kernel, kernelY: Kernel) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const grayscaleData = new Uint8ClampedArray(width * height);
    const edgeData = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        grayscaleData[i / 4] = gray;
    }

    const halfKernel = Math.floor(kernelX.length / 2);
    for (let y = halfKernel; y < height - halfKernel; y++) {
        for (let x = halfKernel; x < width - halfKernel; x++) {
            let gx = 0, gy = 0;
            for (let ky = 0; ky < kernelX.length; ky++) {
                for (let kx = 0; kx < kernelX.length; kx++) {
                    const sy = y + ky - halfKernel;
                    const sx = x + kx - halfKernel;
                    const pixelValue = grayscaleData[sy * width + sx];
                    gx += pixelValue * kernelX[ky][kx];
                    gy += pixelValue * kernelY[ky][kx];
                }
            }
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            const outIndex = (y * width + x) * 4;
            edgeData[outIndex] = magnitude;
            edgeData[outIndex + 1] = magnitude;
            edgeData[outIndex + 2] = magnitude;
            edgeData[outIndex + 3] = 255;
        }
    }
    ctx.putImageData(new ImageData(edgeData, width, height), 0, 0);
}

// --- Exported Filter Functions ---
export const applyBoxBlur = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const kernel = createBoxBlurKernel(params.kernelSize);
    convolve(ctx, kernel);
  };
  
  await applyFilterWithFallback(ctx, 'boxBlur', params, originalFn, applyBoxBlurOpenCV);
};

export const applyBoxBlurAxis = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    const sizeX = ensureOdd(p.kernelSizeX ?? p.kernelSize);
    const sizeY = ensureOdd(p.kernelSizeY ?? p.kernelSize);
    const kernel = createBoxBlurKernelAxis(sizeX, sizeY);
    convolve(context, kernel);
  };
  
  await applyFilterWithFallback(ctx, 'boxBlurAxis', params, originalFn, applyBoxBlurAxisOpenCV as any);
};

export const applyGaussianBlur = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const kernel = createGaussianKernel(params.sigma, params.kernelSize);
    convolve(ctx, kernel);
  };
  
  await applyFilterWithFallback(ctx, 'gaussianBlur', params, originalFn, applyGaussianBlurOpenCV);
};

export const applyGaussianBlurAxis = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    const sizeX = ensureOdd(p.kernelSizeX ?? p.kernelSize);
    const sizeY = ensureOdd(p.kernelSizeY ?? p.kernelSize);
    const sigmaX = p.sigmaX ?? p.sigma ?? 1.0;
    const sigmaY = p.sigmaY ?? p.sigma ?? sigmaX;
    const kernel = createGaussianKernelAxis(sigmaX, sigmaY, sizeX, sizeY);
    convolve(context, kernel);
  };
  
  await applyFilterWithFallback(ctx, 'gaussianBlurAxis', params, originalFn, applyGaussianBlurAxisOpenCV as any);
};

export const applyBrightness = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data } = imageData;
  const b = Math.max(-255, Math.min(255, (params.brightness ?? 0)));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + b));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + b));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + b));
  }
  ctx.putImageData(imageData, 0, 0);
};

export const applyContrast = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data } = imageData;
  // Contrast as percentage: 100 => 1.0 (no change)
  const percent = (params.contrast ?? 100);
  const factor = Math.max(0, percent) / 100; // 0..inf
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, 128 + (data[i] - 128) * factor));
    data[i + 1] = Math.max(0, Math.min(255, 128 + (data[i + 1] - 128) * factor));
    data[i + 2] = Math.max(0, Math.min(255, 128 + (data[i + 2] - 128) * factor));
  }
  ctx.putImageData(imageData, 0, 0);
};

export const applyThresholdBinary = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyBinaryThresholdFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_binary', params, originalFn, applyBinaryThresholdOpenCV);
};

export const applyThresholdOtsu = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_otsu', params, originalFn, applyOtsuThresholdOpenCV);
};

export const applyThresholdTriangle = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_triangle', params, originalFn, applyTriangleThresholdOpenCV);
};

export const applyThresholdAdaptiveMean = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_adaptive_mean', params, originalFn, applyAdaptiveMeanThresholdOpenCV);
};

export const applyThresholdAdaptiveGaussian = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_adaptive_gaussian', params, originalFn, applyAdaptiveGaussianThresholdOpenCV);
};

export const applyThresholdSauvola = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_sauvola', params, originalFn, applySauvolaThresholdOpenCV);
};

export const applyThresholdBradley = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_bradley', params, originalFn, applyBradleyThresholdOpenCV);
};

export const applyThresholdBernsen = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_bernsen', params, originalFn, applyBernsenThresholdOpenCV);
};

export const applyThresholdPhansalkar = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyOtsuFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_phansalkar', params, originalFn, applyPhansalkarThresholdOpenCV);
};

export const applyThresholdKittler = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (context: CanvasRenderingContext2D, p: FilterParams) => {
    applyKittlerFallback(context, p);
  };
  await applyFilterWithFallback(ctx, 'threshold_kittler', params, originalFn);
};

export const applySharpen = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const kernel = createSharpenKernel(params.sharpenAmount);
  convolve(ctx, kernel);
};

import { applyGaborOpenCV, applyLawsTextureEnergyOpenCV, applyLbpOpenCV } from './opencvFilters';

export const applyGabor = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const kernel = createGaborKernel(params);
    convolve(ctx, kernel);
  };
  await applyFilterWithFallback(ctx, 'gabor', params, originalFn, applyGaborOpenCV as any);
};

export const applyLaplacian = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, _params: FilterParams) => {
    convolve(ctx, laplacianKernel);
  };
  
  await applyFilterWithFallback(ctx, 'laplacian', params, originalFn, applyLaplacianOpenCV);
};

export const applyHighpass = (ctx: CanvasRenderingContext2D) => convolve(ctx, highpassKernel);

export const applyPrewitt = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, _params: FilterParams) => {
    applyEdgeFilter(ctx, prewittKernelX, prewittKernelY);
  };
  
  await applyFilterWithFallback(ctx, 'prewitt', params, originalFn, applyPrewittOpenCV);
};

export const applyScharr = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, _params: FilterParams) => {
    applyEdgeFilter(ctx, scharrKernelX, scharrKernelY);
  };
  
  await applyFilterWithFallback(ctx, 'scharr', params, originalFn, applyScharrOpenCV);
};

export const applySobel = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, _params: FilterParams) => {
    applyEdgeFilter(ctx, sobelKernelX, sobelKernelY);
  };
  
  await applyFilterWithFallback(ctx, 'sobel', params, originalFn, applySobelOpenCV);
};

export const applyRobertsCross = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, _params: FilterParams) => {
    applyEdgeFilter(ctx, robertsKernelX, robertsKernelY);
  };
  
  await applyFilterWithFallback(ctx, 'robertscross', params, originalFn, applyRobertsCrossOpenCV);
};
export const applyLoG = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const kernel = createLoGKernel(params.sigma, params.kernelSize);
    convolve(ctx, kernel);
  };
  
  await applyFilterWithFallback(ctx, 'log', params, originalFn, applyLoGOpenCV);
};

// Basic Canny implementation - for simplicity, this is a placeholder.
// A full Canny implementation is much more complex involving non-maximum suppression and hysteresis thresholding.

export const applyDoG = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const { kernelSize, sigma, sigma2 = 2.0 } = params;
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;

    // 1. Create a grayscale version of the source image
    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    // Create a temporary canvas to apply convolutions without affecting the original
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Create an ImageData object from the grayscale data to use with convolve
    const grayImageData = tempCtx.createImageData(width, height);
    for (let i = 0; i < grayscale.length; i++) {
      grayImageData.data[i * 4] = grayscale[i];
      grayImageData.data[i * 4 + 1] = grayscale[i];
      grayImageData.data[i * 4 + 2] = grayscale[i];
      grayImageData.data[i * 4 + 3] = 255;
    }

    // 2. Apply first Gaussian blur
    tempCtx.putImageData(grayImageData, 0, 0);
    const kernel1 = createGaussianKernel(sigma, kernelSize);
    convolve(tempCtx, kernel1);
    const data1 = tempCtx.getImageData(0, 0, width, height).data;

    // 3. Apply second Gaussian blur
    tempCtx.putImageData(grayImageData, 0, 0);
    const kernel2 = createGaussianKernel(sigma2, kernelSize);
    convolve(tempCtx, kernel2);
    const data2 = tempCtx.getImageData(0, 0, width, height).data;

    // 4. Subtract the two blurred images and apply to the original canvas context
    for (let i = 0; i < data.length; i += 4) {
      // We only need to calculate for one channel since both are grayscale
      const diff = Math.abs(data1[i] - data2[i]);
      data[i] = diff;
      data[i + 1] = diff;
      data[i + 2] = diff;
      data[i + 3] = 255; // Keep alpha solid
    }

    ctx.putImageData(imageData, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'dog', params, originalFn, applyDoGOpenCV);
};

export const applyMarrHildreth = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const { kernelSize, sigma, threshold = 10 } = params;
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;

  // 1. Apply LoG filter
  const logCanvas = document.createElement('canvas');
  logCanvas.width = width;
  logCanvas.height = height;
  const logCtx = logCanvas.getContext('2d')!;
  logCtx.putImageData(imageData, 0, 0);
  const logKernel = createLoGKernel(sigma, kernelSize);
  
  // Need a convolution function that returns data instead of drawing it
  const convolveAndGetData = (context: CanvasRenderingContext2D, kernel: Kernel): Float32Array => {
    const imgData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    const { data: srcData, width: w, height: h } = imgData;
    const halfKernel = Math.floor(kernel.length / 2);
    const output = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let ky = 0; ky < kernel.length; ky++) {
          for (let kx = 0; kx < kernel[ky].length; kx++) {
            const sy = y + ky - halfKernel;
            const sx = x + kx - halfKernel;
            if (sy >= 0 && sy < h && sx >= 0 && sx < w) {
              const i = (sy * w + sx) * 4;
              // Using luminance for LoG
              const gray = srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114;
              sum += gray * kernel[ky][kx];
            }
          }
        }
        output[y * w + x] = sum;
      }
    }
    return output;
  };

  const logData = convolveAndGetData(logCtx, logKernel);

  // 2. Find zero-crossings
  const edgeData = new Uint8ClampedArray(data.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const centerVal = logData[idx];
      
      const neighbors = [
        logData[idx - 1], // left
        logData[idx + 1], // right
        logData[idx - width], // top
        logData[idx + width], // bottom
      ];

      let isEdge = false;
      for (const neighborVal of neighbors) {
        if (Math.sign(centerVal) !== Math.sign(neighborVal)) {
          if (Math.abs(centerVal - neighborVal) > threshold) {
            isEdge = true;
            break;
          }
        }
      }
      
      const outIndex = (y * width + x) * 4;
      if (isEdge) {
        edgeData[outIndex] = 255;
        edgeData[outIndex + 1] = 255;
        edgeData[outIndex + 2] = 255;
        edgeData[outIndex + 3] = 255;
      } else {
        edgeData[outIndex + 3] = 255; // Keep alpha
      }
    }
  }
  
    ctx.putImageData(new ImageData(edgeData, width, height), 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'marrhildreth', params, originalFn, applyMarrHildrethOpenCV);
};

export const applyCanny = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    // Simplified Canny implementation as fallback
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    
    // Apply Sobel edge detection as base
    applyEdgeFilter(ctx, sobelKernelX, sobelKernelY);
    
    const edgeData = ctx.getImageData(0, 0, width, height);
    const { data: edgePixelData } = edgeData;

    for (let i = 0; i < edgePixelData.length; i += 4) {
        const magnitude = edgePixelData[i];
        if (magnitude < params.lowThreshold) {
            edgePixelData[i] = edgePixelData[i+1] = edgePixelData[i+2] = 0;
        } else if (magnitude > params.highThreshold) {
            edgePixelData[i] = edgePixelData[i+1] = edgePixelData[i+2] = 255;
        } else {
            // In a real Canny, this is where you'd check neighbors (hysteresis)
            edgePixelData[i] = edgePixelData[i+1] = edgePixelData[i+2] = 0; 
        }
    }
    ctx.putImageData(edgeData, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'canny', params, originalFn, applyCannyOpenCV);
};

// Edge-preserving (placeholder - bilateral filter removed)
export const applyEdgePreserving = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  // Placeholder: apply a mild Gaussian blur as fallback
  await applyGaussianBlur(ctx, { ...params, sigma: 0.8 });
};

// --- Frequency domain placeholders ---
export const applyDft = (ctx: CanvasRenderingContext2D) => {
  applyHighpass(ctx);
};
export const applyDct = (ctx: CanvasRenderingContext2D) => {
  applySharpen(ctx, { kernelSize: 3, sigma: 1, sharpenAmount: 1, lowThreshold: 0, highThreshold: 0, clipLimit: 2, gridSize: 8, gamma: 1, cutoff: 30, theta: 0, gaborSigma: 1.5, lambda: 10, psi: 0 } as any);
};
export const applyWavelet = (ctx: CanvasRenderingContext2D) => {
  // Provide safe defaults when invoking Laplacian via OpenCV path
  applyLaplacian(ctx, { kernelSize: 3, sigma: 1, sharpenAmount: 1, lowThreshold: 0, highThreshold: 0, clipLimit: 2, gridSize: 8, gamma: 1, cutoff: 30, theta: 0, gaborSigma: 1.5, lambda: 10, psi: 0 } as any);
};

// --- Morphology helpers ---
function toGrayscale(ctx: CanvasRenderingContext2D) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i+1] = data[i+2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
}

function erode(ctx: CanvasRenderingContext2D, ksize: number) {
  const src = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const dst = ctx.createImageData(src.width, src.height);
  const half = Math.floor(ksize / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      let minVal = 255;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const sy = Math.min(src.height - 1, Math.max(0, y + ky));
          const sx = Math.min(src.width - 1, Math.max(0, x + kx));
          const idx = (sy * src.width + sx) * 4;
          minVal = Math.min(minVal, src.data[idx]);
        }
      }
      const di = (y * src.width + x) * 4;
      dst.data[di] = dst.data[di+1] = dst.data[di+2] = minVal;
      dst.data[di+3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
}

function dilate(ctx: CanvasRenderingContext2D, ksize: number) {
  const src = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const dst = ctx.createImageData(src.width, src.height);
  const half = Math.floor(ksize / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      let maxVal = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const sy = Math.min(src.height - 1, Math.max(0, y + ky));
          const sx = Math.min(src.width - 1, Math.max(0, x + kx));
          const idx = (sy * src.width + sx) * 4;
          maxVal = Math.max(maxVal, src.data[idx]);
        }
      }
      const di = (y * src.width + x) * 4;
      dst.data[di] = dst.data[di+1] = dst.data[di+2] = maxVal;
      dst.data[di+3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
}

export const applyMorphOpen = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    toGrayscale(ctx);
    erode(ctx, params.kernelSize || 3);
    dilate(ctx, params.kernelSize || 3);
  };
  
  await applyFilterWithFallback(ctx, 'morph_open', params, originalFn, applyMorphOpeningOpenCV);
};

export const applyMorphClose = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    toGrayscale(ctx);
    dilate(ctx, params.kernelSize || 3);
    erode(ctx, params.kernelSize || 3);
  };
  
  await applyFilterWithFallback(ctx, 'morph_close', params, originalFn, applyMorphClosingOpenCV);
};

export const applyMorphTopHat = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const src = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const work = document.createElement('canvas').getContext('2d')!;
    work.canvas.width = src.width; work.canvas.height = src.height;
    work.putImageData(src, 0, 0);
    await applyMorphOpen(work as any, params);
    const opened = work.getImageData(0, 0, src.width, src.height);
    for (let i = 0; i < src.data.length; i += 4) {
      const val = Math.max(0, src.data[i] - opened.data[i]);
      src.data[i] = src.data[i+1] = src.data[i+2] = val;
    }
    ctx.putImageData(src, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'morph_tophat', params, originalFn, applyMorphTopHatOpenCV);
};

export const applyMorphBlackHat = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const src = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const work = document.createElement('canvas').getContext('2d')!;
    work.canvas.width = src.width; work.canvas.height = src.height;
    work.putImageData(src, 0, 0);
    await applyMorphClose(work as any, params);
    const closed = work.getImageData(0, 0, src.width, src.height);
    for (let i = 0; i < src.data.length; i += 4) {
      const val = Math.max(0, closed.data[i] - src.data[i]);
      src.data[i] = src.data[i+1] = src.data[i+2] = val;
    }
    ctx.putImageData(src, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'morph_blackhat', params, originalFn, applyMorphBlackHatOpenCV);
};

export const applyMorphGradient = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const src = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const dctx = document.createElement('canvas').getContext('2d')!;
    const ectx = document.createElement('canvas').getContext('2d')!;
    dctx.canvas.width = ectx.canvas.width = src.width;
    dctx.canvas.height = ectx.canvas.height = src.height;
    dctx.putImageData(src, 0, 0);
    ectx.putImageData(src, 0, 0);
    dilate(dctx as any, params.kernelSize || 3);
    erode(ectx as any, params.kernelSize || 3);
    const dil = dctx.getImageData(0, 0, src.width, src.height);
    const ero = ectx.getImageData(0, 0, src.width, src.height);
    for (let i = 0; i < src.data.length; i += 4) {
      const val = Math.max(0, dil.data[i] - ero.data[i]);
      src.data[i] = src.data[i+1] = src.data[i+2] = val;
    }
    ctx.putImageData(src, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'morph_gradient', params, originalFn, applyMorphGradientOpenCV);
};

export const applyDistanceTransform = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const th = (params.lowThreshold ?? 128);
    const bin = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) bin[p] = (0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]) > th ? 0 : 1;
    const dist = new Uint16Array(width * height).fill(10000);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y*width + x;
        if (bin[i] === 0) { dist[i] = 0; continue; }
        const top = y>0 ? dist[i - width] + 1 : 10000;
        const left = x>0 ? dist[i - 1] + 1 : 10000;
        dist[i] = Math.min(dist[i], top, left);
      }
    }
    for (let y = height-1; y >=0; y--) {
      for (let x = width-1; x >=0; x--) {
        const i = y*width + x;
        const bottom = y<height-1 ? dist[i + width] + 1 : 10000;
        const right = x<width-1 ? dist[i + 1] + 1 : 10000;
        dist[i] = Math.min(dist[i], bottom, right);
      }
    }
    let maxd = 0; for (let i=0;i<dist.length;i++) if (dist[i] < 10000) maxd = Math.max(maxd, dist[i]);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const v = dist[p] >= 10000 ? 0 : Math.round(255 * dist[p] / (maxd || 1));
      data[i]=data[i+1]=data[i+2]=v; data[i+3]=255;
    }
    ctx.putImageData(imageData, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'distancetransform', params, originalFn, applyDistanceTransformOpenCV);
};

import { applyGammaCorrectionOpenCV, applyLinearStretchOpenCV, applyUnsharpMaskOpenCV } from './opencvFilters';

export const applyLinearStretch = async (ctx: CanvasRenderingContext2D) => {
  const originalFn = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data } = imageData;
    let min = 255, max = 0;

    // First pass: find min and max grayscale values
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }

    const range = max - min;
    if (range === 0) return; // Avoid division by zero for flat images

    // Second pass: apply the linear stretch formula
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];

      data[i] = 255 * (r - min) / range;
      data[i+1] = 255 * (g - min) / range;
      data[i+2] = 255 * (b - min) / range;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  await applyFilterWithFallback(ctx, 'linearStretch', {} as any, originalFn, applyLinearStretchOpenCV as any);
};

export const applyHistogramEqualization = async (ctx: CanvasRenderingContext2D) => {
  const originalFn = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const grayscale = new Uint8ClampedArray(width * height);
    const hist = new Array(256).fill(0);

    // Convert to grayscale and calculate histogram
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      grayscale[i / 4] = gray;
      hist[gray]++;
    }

    // Calculate CDF
    const cdf = new Array(256).fill(0);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + hist[i];
    }

    // Find the first non-zero CDF value
    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    // Create lookup table (LUT)
    const lut = new Uint8ClampedArray(256);
    const totalPixels = width * height;
    const denominator = totalPixels - cdfMin;
    if (denominator <= 0) {
      return;
    }
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.round(255 * safeDivide(cdf[i] - cdfMin, denominator, 0));
    }

    // Apply LUT to the original image data
    for (let i = 0; i < data.length; i += 4) {
      const gray = grayscale[i / 4];
      const equalized = lut[gray];
      data[i] = equalized;
      data[i+1] = equalized;
      data[i+2] = equalized;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  await applyFilterWithFallback(ctx, 'histogramEqualization', {} as any, originalFn, applyHistogramEqualizationOpenCV as any);
};

export const applyClahe = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    if (!isValidFilterImageDimensions(ctx.canvas.width, ctx.canvas.height)) {
      return;
    }
    const normalized = normalizeFilterParams('clahe', params, { width: ctx.canvas.width, height: ctx.canvas.height });
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const { clipLimit, gridSize } = normalized;

    const tileWidth = Math.max(1, Math.floor(width / gridSize));
    const tileHeight = Math.max(1, Math.floor(height / gridSize));

    // 1. Convert to grayscale
    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    // 2. Create tile LUTs
    const luts = new Array(gridSize * gridSize).fill(0).map(() => new Uint8ClampedArray(256));

    for (let ty = 0; ty < gridSize; ty++) {
      for (let tx = 0; tx < gridSize; tx++) {
        const startX = tx * tileWidth;
        const startY = ty * tileHeight;
        const endX = Math.min(width, startX + tileWidth);
        const endY = Math.min(height, startY + tileHeight);
        const tilePixels = Math.max(1, (endX - startX) * (endY - startY));

        // a. Calculate tile histogram
        const hist = new Array(256).fill(0);
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            hist[grayscale[y * width + x]]++;
          }
        }

        // b. Clip histogram
        const actualClipLimit = Math.max(1, clipLimit * tilePixels / 256);
        let clipped = 0;
        for (let i = 0; i < 256; i++) {
          if (hist[i] > actualClipLimit) {
            clipped += hist[i] - actualClipLimit;
            hist[i] = actualClipLimit;
          }
        }

        // c. Redistribute clipped pixels
        const redistAdd = clipped / 256;
        for (let i = 0; i < 256; i++) {
          hist[i] += redistAdd;
        }

        // d. Create LUT from clipped histogram
        const cdf = new Array(256).fill(0);
        cdf[0] = hist[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + hist[i];
        }

        const lut = luts[ty * gridSize + tx];
        for (let i = 0; i < 256; i++) {
          lut[i] = Math.round(255 * safeDivide(cdf[i], tilePixels, 0));
        }
      }
    }

    // 3. Apply bilinear interpolation
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tx = x / tileWidth - 0.5;
        const ty = y / tileHeight - 0.5;

        let x1 = Math.floor(tx);
        let y1 = Math.floor(ty);
        let x2 = x1 + 1;
        let y2 = y1 + 1;

        x1 = Math.max(0, Math.min(gridSize - 1, x1));
        y1 = Math.max(0, Math.min(gridSize - 1, y1));
        x2 = Math.max(0, Math.min(gridSize - 1, x2));
        y2 = Math.max(0, Math.min(gridSize - 1, y2));

        const gray = grayscale[y * width + x];

        const q11 = luts[y1 * gridSize + x1][gray];
        const q12 = luts[y2 * gridSize + x1][gray];
        const q21 = luts[y1 * gridSize + x2][gray];
        const q22 = luts[y2 * gridSize + x2][gray];

        const xFrac = tx - x1;
        const yFrac = ty - y1;

        const top = q11 * (1 - xFrac) + q21 * xFrac;
        const bottom = q12 * (1 - xFrac) + q22 * xFrac;
        const val = top * (1 - yFrac) + bottom * yFrac;
        
        const i = (y * width + x) * 4;
        data[i] = val;
        data[i+1] = val;
        data[i+2] = val;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  await applyFilterWithFallback(ctx, 'clahe', params, originalFn, applyClaheOpenCV);
};

export const applyGammaCorrection = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const normalized = normalizeFilterParams('gammacorrection', params, { width: ctx.canvas.width, height: ctx.canvas.height });
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data } = imageData;
    const { gamma } = normalized;
    if (gamma === 1) return; // No change

    const gammaReciprocal = 1 / gamma;
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.pow(i / 255, gammaReciprocal) * 255;
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }

    ctx.putImageData(imageData, 0, 0);
  };

  await applyFilterWithFallback(ctx, 'gammaCorrection', params, originalFn, applyGammaCorrectionOpenCV as any);
};

export const applyMedian = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const src = new Uint8ClampedArray(data);
    const { kernelSize } = params;
    const half = Math.floor(kernelSize / 2);

    // Convert to grayscale first
    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < src.length; i += 4) {
      const gray = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
      grayscale[i / 4] = gray;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const window: number[] = [];
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const sy = y + ky;
            const sx = x + kx;
            if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
              window.push(grayscale[sy * width + sx]);
            }
          }
        }
        window.sort((a, b) => a - b);
        const median = window[Math.floor(window.length / 2)];
        const outIndex = (y * width + x) * 4;
        data[outIndex] = median;
        data[outIndex + 1] = median;
        data[outIndex + 2] = median;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };
  
  await applyFilterWithFallback(ctx, 'medianBlur', params, originalFn, applyMedianBlurOpenCV);
};


export const applyLocalHistogramEqualization = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    if (!isValidFilterImageDimensions(ctx.canvas.width, ctx.canvas.height)) {
      return;
    }
    const normalized = normalizeFilterParams('localhistogramequalization', params, { width: ctx.canvas.width, height: ctx.canvas.height });
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const { kernelSize } = normalized;
    const half = Math.floor(kernelSize / 2);

    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    const equalizedData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const currentPixelValue = grayscale[y * width + x];
        const hist = new Array(256).fill(0);
        let pixelCount = 0;

        // Calculate histogram for the local window
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              hist[grayscale[ny * width + nx]]++;
              pixelCount++;
            }
          }
        }

        // Calculate CDF for the local window
        const cdf = new Array(256).fill(0);
        cdf[0] = hist[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + hist[i];
        }
        
        // Find the first non-zero CDF value
        let cdfMin = 0;
        for (let i = 0; i < 256; i++) {
            if (cdf[i] > 0) {
                cdfMin = cdf[i];
                break;
            }
        }

        // Apply equalization formula to the center pixel
        const denominator = pixelCount - cdfMin;
        const equalizedValue = denominator <= 0
          ? currentPixelValue
          : Math.round(255 * safeDivide(cdf[currentPixelValue] - cdfMin, denominator, currentPixelValue / 255));

        const outIndex = (y * width + x) * 4;
        equalizedData[outIndex] = equalizedValue;
        equalizedData[outIndex + 1] = equalizedValue;
        equalizedData[outIndex + 2] = equalizedValue;
        equalizedData[outIndex + 3] = 255;
      }
    }

    ctx.putImageData(new ImageData(equalizedData, width, height), 0, 0);
  };

  await applyFilterWithFallback(
    ctx,
    'localHistogramEqualization',
    params,
    originalFn,
    applyLocalHistogramEqualizationOpenCV as any
  );
};

export const applyAdaptiveHistogramEqualization = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  if (!isValidFilterImageDimensions(ctx.canvas.width, ctx.canvas.height)) {
    return;
  }
  const normalized = normalizeFilterParams('adaptivehistogramequalization', params, { width: ctx.canvas.width, height: ctx.canvas.height });
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const { gridSize } = normalized;

  const tileWidth = Math.max(1, Math.floor(width / gridSize));
  const tileHeight = Math.max(1, Math.floor(height / gridSize));

  // 1. Convert to grayscale
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    grayscale[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  // 2. Create tile LUTs
  const luts = new Array(gridSize * gridSize).fill(0).map(() => new Uint8ClampedArray(256));

  for (let ty = 0; ty < gridSize; ty++) {
    for (let tx = 0; tx < gridSize; tx++) {
      const startX = tx * tileWidth;
      const startY = ty * tileHeight;
      const endX = Math.min(width, startX + tileWidth);
      const endY = Math.min(height, startY + tileHeight);
      const tilePixels = Math.max(1, (endX - startX) * (endY - startY));

      // a. Calculate tile histogram
      const hist = new Array(256).fill(0);
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          hist[grayscale[y * width + x]]++;
        }
      }

      // b. Create LUT from histogram (no clipping)
      const cdf = new Array(256).fill(0);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + hist[i];
      }

      const cdfMin = cdf.find(val => val > 0) || 0;

      const lut = luts[ty * gridSize + tx];
      for (let i = 0; i < 256; i++) {
        const denominator = tilePixels - cdfMin;
        lut[i] = denominator <= 0
          ? i
          : Math.round(255 * safeDivide(cdf[i] - cdfMin, denominator, i / 255));
      }
    }
  }

  // 3. Apply bilinear interpolation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tx = x / tileWidth - 0.5;
      const ty = y / tileHeight - 0.5;

      let x1 = Math.floor(tx);
      let y1 = Math.floor(ty);
      let x2 = x1 + 1;
      let y2 = y1 + 1;

      x1 = Math.max(0, Math.min(gridSize - 1, x1));
      y1 = Math.max(0, Math.min(gridSize - 1, y1));
      x2 = Math.max(0, Math.min(gridSize - 1, x2));
      y2 = Math.max(0, Math.min(gridSize - 1, y2));

      const gray = grayscale[y * width + x];

      const q11 = luts[y1 * gridSize + x1][gray];
      const q12 = luts[y2 * gridSize + x1][gray];
      const q21 = luts[y1 * gridSize + x2][gray];
      const q22 = luts[y2 * gridSize + x2][gray];

      const xFrac = tx - x1;
      const yFrac = ty - y1;

      const top = q11 * (1 - xFrac) + q21 * xFrac;
      const bottom = q12 * (1 - xFrac) + q22 * xFrac;
      const val = top * (1 - yFrac) + bottom * yFrac;
      
      const i = (y * width + x) * 4;
      data[i] = val;
      data[i+1] = val;
      data[i+2] = val;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export const applyWeightedMedian = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const { kernelSize } = params;
  const half = Math.floor(kernelSize / 2);

  // Convert to grayscale first
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < src.length; i += 4) {
    const gray = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
    grayscale[i / 4] = gray;
  }

  // Special 3x3 weight kernel
  const weightKernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const window: number[] = [];
      
      // Use weights only for 3x3 kernel
      if (kernelSize === 3) {
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const sy = y + ky;
            const sx = x + kx;
            if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
              const pixelValue = grayscale[sy * width + sx];
              const weight = weightKernel[ky + half][kx + half];
              for (let i = 0; i < weight; i++) {
                window.push(pixelValue);
              }
            }
          }
        }
      } else { // Fallback to standard median for other kernel sizes
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const sy = y + ky;
            const sx = x + kx;
            if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
              window.push(grayscale[sy * width + sx]);
            }
          }
        }
      }

      window.sort((a, b) => a - b);
      const median = window[Math.floor(window.length / 2)];
      const outIndex = (y * width + x) * 4;
      data[outIndex] = median;
      data[outIndex + 1] = median;
      data[outIndex + 2] = median;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

export const applyAlphaTrimmedMean = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const { kernelSize, alpha } = params;
  const half = Math.floor(kernelSize / 2);

  // Convert to grayscale first
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < src.length; i += 4) {
    const gray = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
    grayscale[i / 4] = gray;
  }

  const trimCount = Math.floor((kernelSize * kernelSize * alpha) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const window: number[] = [];
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const sy = y + ky;
          const sx = x + kx;
          if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
            window.push(grayscale[sy * width + sx]);
          }
        }
      }

      window.sort((a, b) => a - b);

      const trimmedWindow = window.slice(trimCount, window.length - trimCount);
      
      if (trimmedWindow.length === 0) {
        // This can happen if trimCount is too high. Fallback to median of original window.
        const median = window[Math.floor(window.length / 2)];
        const outIndex = (y * width + x) * 4;
        data[outIndex] = median;
        data[outIndex + 1] = median;
        data[outIndex + 2] = median;
        continue;
      }

      const sum = trimmedWindow.reduce((acc, val) => acc + val, 0);
      const mean = sum / trimmedWindow.length;

      const outIndex = (y * width + x) * 4;
      data[outIndex] = mean;
      data[outIndex + 1] = mean;
      data[outIndex + 2] = mean;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};


export const applyUnsharpMask = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const { kernelSize, sigma, sharpenAmount: unsharpAmount } = params;
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    const originalData = new Uint8ClampedArray(data);

    // 1. Create a blurred version of the image on a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    // Create and apply Gaussian kernel
    const kernel = createGaussianKernel(sigma, kernelSize);
    convolve(tempCtx, kernel);
    const blurredData = tempCtx.getImageData(0, 0, width, height).data;

    // 2. Calculate sharpened image: Sharpened = Original + Amount * (Original - Blurred)
    for (let i = 0; i < data.length; i += 4) {
      // Red channel
      const originalR = originalData[i];
      const blurredR = blurredData[i];
      const sharpenedR = originalR + unsharpAmount * (originalR - blurredR);
      data[i] = Math.max(0, Math.min(255, sharpenedR));

      // Green channel
      const originalG = originalData[i + 1];
      const blurredG = blurredData[i + 1];
      const sharpenedG = originalG + unsharpAmount * (originalG - blurredG);
      data[i + 1] = Math.max(0, Math.min(255, sharpenedG));

      // Blue channel
      const originalB = originalData[i + 2];
      const blurredB = blurredData[i + 2];
      const sharpenedB = originalB + unsharpAmount * (originalB - blurredB);
      data[i + 2] = Math.max(0, Math.min(255, sharpenedB));
      
      // Alpha channel remains the same
      data[i + 3] = originalData[i + 3];
    }

    ctx.putImageData(imageData, 0, 0);
  };

  await applyFilterWithFallback(ctx, 'unsharpMask', params, originalFn, applyUnsharpMaskOpenCV as any);
};

export const applyAnisotropicDiffusion = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const normalized = normalizeFilterParams('anisotropicdiffusion', params, { width: ctx.canvas.width, height: ctx.canvas.height });
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const { iterations, kappa } = normalized;
  const lambda = 0.14; // Fixed step size

  // Convert to grayscale
  let gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  let nextGray = new Float32Array(gray.length);

  for (let t = 0; t < iterations; t++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        
        const gradN = gray[i - width] - gray[i];
        const gradS = gray[i + width] - gray[i];
        const gradW = gray[i - 1] - gray[i];
        const gradE = gray[i + 1] - gray[i];

        // Perona-Malik diffusion coefficient function (g2)
        const cN = 1 / (1 + (gradN / kappa) * (gradN / kappa));
        const cS = 1 / (1 + (gradS / kappa) * (gradS / kappa));
        const cW = 1 / (1 + (gradW / kappa) * (gradW / kappa));
        const cE = 1 / (1 + (gradE / kappa) * (gradE / kappa));

        nextGray[i] = gray[i] + lambda * (cN * gradN + cS * gradS + cW * gradW + cE * gradE);
      }
    }
    // Swap buffers
    [gray, nextGray] = [nextGray, gray];
  }

  // Apply to original data
  for (let i = 0; i < data.length; i += 4) {
    const val = gray[i / 4];
    data[i] = val;
    data[i+1] = val;
    data[i+2] = val;
  }

  ctx.putImageData(imageData, 0, 0);
};

export const applyLbp = async (ctx: CanvasRenderingContext2D) => {
  const originalFn = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    if (width < 3 || height < 3) {
      return;
    }

    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    const lbpData = new Uint8ClampedArray(data.length);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIndex = y * width + x;
        const centerPixel = grayscale[centerIndex];
        let binaryCode = 0;
        if (grayscale[centerIndex - width - 1] >= centerPixel) binaryCode |= 1;
        if (grayscale[centerIndex - width] >= centerPixel) binaryCode |= 2;
        if (grayscale[centerIndex - width + 1] >= centerPixel) binaryCode |= 4;
        if (grayscale[centerIndex + 1] >= centerPixel) binaryCode |= 8;
        if (grayscale[centerIndex + width + 1] >= centerPixel) binaryCode |= 16;
        if (grayscale[centerIndex + width] >= centerPixel) binaryCode |= 32;
        if (grayscale[centerIndex + width - 1] >= centerPixel) binaryCode |= 64;
        if (grayscale[centerIndex - 1] >= centerPixel) binaryCode |= 128;
        const outIndex = (y * width + x) * 4;
        lbpData[outIndex] = binaryCode;
        lbpData[outIndex + 1] = binaryCode;
        lbpData[outIndex + 2] = binaryCode;
        lbpData[outIndex + 3] = 255;
      }
    }
    ctx.putImageData(new ImageData(lbpData, width, height), 0, 0);
  };

  await applyFilterWithFallback(ctx, 'lbp', {} as any, originalFn, applyLbpOpenCV as any);
};

export const applyLbpOpenCVFallback = async (ctx: CanvasRenderingContext2D) => {
  const originalFn = (ctx: CanvasRenderingContext2D) => { applyLbp(ctx as any); };
  await applyFilterWithFallback(ctx, 'lbp', {} as any, originalFn, applyLbpOpenCV as any);
};

// --- Guided Filter ---

// Helper: Creates an integral image (summed-area table) for fast box blurring
function createIntegralImage(grayscale: Float32Array, width: number, height: number): Float32Array {
  const integral = new Float32Array(width * height);
  // First row
  let rowSum = 0;
  for (let x = 0; x < width; x++) {
    rowSum += grayscale[x];
    integral[x] = rowSum;
  }
  // Other rows
  for (let y = 1; y < height; y++) {
    rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += grayscale[y * width + x];
      integral[y * width + x] = rowSum + integral[(y - 1) * width + x];
    }
  }
  return integral;
}

// Helper: Fast box blur using an integral image
function fastBoxBlur(integralImage: Float32Array, width: number, height: number, radius: number): Float32Array {
  const blurred = new Float32Array(width * height);
  const r = Math.round(radius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const y1 = Math.max(0, y - r - 1);
      const y2 = Math.min(height - 1, y + r);
      const x1 = Math.max(0, x - r - 1);
      const x2 = Math.min(width - 1, x + r);

      const count = Math.max(1, (y2 - y1 + 1) * (x2 - x1 + 1));
      
      const sum = integralImage[y2 * width + x2] 
                - integralImage[y1 * width + x2] 
                - integralImage[y2 * width + x1] 
                + integralImage[y1 * width + x1];

      blurred[y * width + x] = sum / count;
    }
  }
  return blurred;
}


export const applyGuidedFilter = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const normalized = normalizeFilterParams('guided', params, { width: ctx.canvas.width, height: ctx.canvas.height });
  const { kernelSize: radius, epsilon } = normalized;
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;

  // For this implementation, the guidance image (I) is the grayscale version of the input image (p).
  const I = new Float32Array(width * height); // Guidance image
  const p = new Float32Array(width * height); // Input image
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255.0; // Normalize to [0, 1]
    I[i / 4] = gray;
    p[i / 4] = gray;
  }

  // 1. Create integral images for fast blurring
  const integral_I = createIntegralImage(I, width, height);
  const integral_p = createIntegralImage(p, width, height);
  
  const I_sq = I.map(val => val * val);
  const integral_I_sq = createIntegralImage(I_sq, width, height);

  const I_p = new Float32Array(width * height);
  for(let i=0; i<I_p.length; i++) {
    I_p[i] = I[i] * p[i];
  }
  const integral_I_p = createIntegralImage(I_p, width, height);

  // 2. Calculate means and variances
  const mean_I = fastBoxBlur(integral_I, width, height, radius);
  const mean_p = fastBoxBlur(integral_p, width, height, radius);
  const mean_I_sq = fastBoxBlur(integral_I_sq, width, height, radius);
  const mean_I_p = fastBoxBlur(integral_I_p, width, height, radius);

  const var_I = new Float32Array(width * height);
  const cov_I_p = new Float32Array(width * height);
  for(let i=0; i<var_I.length; i++) {
    var_I[i] = mean_I_sq[i] - mean_I[i] * mean_I[i];
    cov_I_p[i] = mean_I_p[i] - mean_I[i] * mean_p[i];
  }

  // 3. Calculate 'a' and 'b' coefficients
  const a = new Float32Array(width * height);
  const b = new Float32Array(width * height);
  for(let i=0; i<a.length; i++) {
    a[i] = cov_I_p[i] / (var_I[i] + epsilon);
    b[i] = mean_p[i] - a[i] * mean_I[i];
  }

  // 4. Blur 'a' and 'b'
  const integral_a = createIntegralImage(a, width, height);
  const integral_b = createIntegralImage(b, width, height);
  const mean_a = fastBoxBlur(integral_a, width, height, radius);
  const mean_b = fastBoxBlur(integral_b, width, height, radius);

  // 5. Calculate the final output image q
  const q = new Float32Array(width * height);
  for(let i=0; i<q.length; i++) {
    q[i] = mean_a[i] * I[i] + mean_b[i];
  }

  // 6. Denormalize and draw to canvas
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.max(0, Math.min(255, q[i / 4] * 255));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
};

// --- Laws' Texture Energy ---

// 1D Laws' vectors
const L5 = [1, 4, 6, 4, 1];
const E5 = [-1, -2, 0, 2, 1];
const S5 = [-1, 0, 2, 0, -1];
const W5 = [-1, 2, 0, -2, 1];
const R5 = [1, -4, 6, -4, 1];

const lawsVectors: { [key: string]: number[] } = { L5, E5, S5, W5, R5 };

// Create 2D kernel from two 1D vectors (outer product)
function createLawsKernel(vec1_name: string, vec2_name: string): Kernel {
  const vec1 = lawsVectors[vec1_name];
  const vec2 = lawsVectors[vec2_name];
  const kernel: Kernel = Array(5).fill(0).map(() => Array(5).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      kernel[i][j] = vec1[i] * vec2[j];
    }
  }
  return kernel;
}

export const LAWS_KERNEL_TYPES = [
  'L5E5', 'E5L5', 'L5R5', 'R5L5', 'E5S5', 'S5E5', 'S5S5', 'R5R5', 'L5S5', 'S5L5', 'E5E5', 'E5W5', 'W5E5', 'S5W5', 'W5S5'
];

export const applyLawsTextureEnergy = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const { lawsKernelType, kernelSize: energyWindowSize } = params;
    const [vec1_name, vec2_name] = lawsKernelType.match(/.{1,2}/g)!;

    const lawsKernel = createLawsKernel(vec1_name, vec2_name);

    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;

    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    const convolved = new Float32Array(width * height);
    const halfKernel = 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let ky = 0; ky < 5; ky++) {
          for (let kx = 0; kx < 5; kx++) {
            const sy = y + ky - halfKernel;
            const sx = x + kx - halfKernel;
            if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
              sum += grayscale[sy * width + sx] * lawsKernel[ky][kx];
            }
          }
        }
        convolved[y * width + x] = sum;
      }
    }

    const energy = new Float32Array(width * height);
    const halfWindow = Math.floor(energyWindowSize / 2);
    let maxEnergy = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let wy = -halfWindow; wy <= halfWindow; wy++) {
          for (let wx = -halfWindow; wx <= halfWindow; wx++) {
            const sy = y + wy;
            const sx = x + wx;
            if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
              sum += Math.abs(convolved[sy * width + sx]);
            }
          }
        }
        const energyValue = sum / (energyWindowSize * energyWindowSize);
        energy[y * width + x] = energyValue;
        if (energyValue > maxEnergy) {
          maxEnergy = energyValue;
        }
      }
    }

    if (maxEnergy === 0) maxEnergy = 1;
    for (let i = 0; i < data.length; i += 4) {
      const normalizedValue = (energy[i / 4] / maxEnergy) * 255;
      data[i] = normalizedValue;
      data[i + 1] = normalizedValue;
      data[i + 2] = normalizedValue;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  await applyFilterWithFallback(ctx, 'lawsTextureEnergy', params, originalFn, applyLawsTextureEnergyOpenCV as any);
};

export const applyLawsTextureEnergyOpenCVFallback = async (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const originalFn = (ctx: CanvasRenderingContext2D, params: FilterParams) => { applyLawsTextureEnergy(ctx as any, params); };
  await applyFilterWithFallback(ctx, 'lawsTextureEnergy', params, originalFn, applyLawsTextureEnergyOpenCV as any);
};

// ============================================================================
// COLORMAP FILTERS
// Scientific visualization colormaps based on CLAUDE.md guide
// ============================================================================

import { 
  applyColormap,
  applyGradientMagnitudeColormap as applyGradientMagnitudeColormapCore,
  applyEdgeIntensityColormap as applyEdgeIntensityColormapCore,
  applyDifferenceColormap as applyDifferenceColormapCore
} from './colormaps';
import type { FilterType } from '../types';

/**
 * Apply colormap filter to canvas context
 */
export const applyColormapFilter = async (
  ctx: CanvasRenderingContext2D, 
  colormapName: string,
  params?: FilterParams
) => {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Use intensity parameter if provided, default to 1.0
  const intensity = params?.gamma ?? 1.0;
  
  const result = applyColormap(imageData, colormapName, intensity);
  ctx.putImageData(result, 0, 0);
};

// Perceptually Uniform Colormaps (Recommended)
export const applyViridisColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_viridis', params);
};

export const applyInfernoColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_inferno', params);
};

export const applyPlasmaColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_plasma', params);
};

export const applyMagmaColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_magma', params);
};

export const applyParulaColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_parula', params);
};

// Rainbow/Legacy Colormaps
export const applyJetColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_jet', params);
};

export const applyHsvColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_hsv', params);
};

export const applyHotColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_hot', params);
};

// Aesthetic Gradient Colormaps
export const applyCoolColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_cool', params);
};

export const applyWarmColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_warm', params);
};

export const applySpringColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_spring', params);
};

export const applySummerColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_summer', params);
};

export const applyAutumnColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_autumn', params);
};

export const applyWinterColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_winter', params);
};

// Specialized Colormaps
export const applyBoneColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_bone', params);
};

export const applyCopperColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_copper', params);
};

export const applyPinkColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_pink', params);
};

// Diverging Colormaps (Change-based)
export const applyRdbuColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_rdbu', params);
};

export const applyRdylbuColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_rdylbu', params);
};

export const applyBwrColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_bwr', params);
};

export const applySeismicColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_seismic', params);
};

export const applyCoolwarmColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_coolwarm', params);
};

export const applySpectralColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  await applyColormapFilter(ctx, 'colormap_spectral', params);
};

// Gradient-based Colormaps (Advanced)
export const applyGradientMagnitudeColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const intensity = params?.gamma ?? 1.0;
  const sensitivity = params?.sensitivity ?? 1.0;
  
  const result = applyGradientMagnitudeColormapCore(imageData, intensity, sensitivity);
  ctx.putImageData(result, 0, 0);
};

export const applyEdgeIntensityColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const intensity = params?.gamma ?? 1.0;
  const threshold = params?.threshold ?? 0.1;
  
  const result = applyEdgeIntensityColormapCore(imageData, intensity, threshold);
  ctx.putImageData(result, 0, 0);
};

export const applyDifferenceColormap = async (ctx: CanvasRenderingContext2D, params?: FilterParams) => {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const intensity = params?.gamma ?? 1.0;
  const centerValue = params?.centerValue ?? 128;
  
  const result = applyDifferenceColormapCore(imageData, intensity, centerValue);
  ctx.putImageData(result, 0, 0);
};
// @ts-nocheck
