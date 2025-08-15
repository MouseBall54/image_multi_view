import type { FilterParams } from '../store';

// Helper function to create a Gaussian kernel
function createGaussianKernel(sigma: number, size: number): number[][] {
  const kernel: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
  const half = Math.floor(size / 2);
  const sigma2 = 2 * sigma * sigma;
  let sum = 0;

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const value = (1 / (Math.PI * sigma2)) * Math.exp(-(x * x + y * y) / sigma2);
      kernel[y + half][x + half] = value;
      sum += value;
    }
  }

  // Normalize the kernel
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      kernel[i][j] /= sum;
    }
  }
  return kernel;
}

// Helper function to create a Box Blur kernel
function createBoxBlurKernel(size: number): number[][] {
  const value = 1 / (size * size);
  return Array(size).fill(0).map(() => Array(size).fill(value));
}

// Helper function to create a Sharpen kernel
function createSharpenKernel(amount: number): number[][] {
  return [
    [0, -1, 0],
    [-1, 4 + amount, -1],
    [0, -1, 0],
  ];
}

type Kernel = number[][];

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
export const applyBoxBlur = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const kernel = createBoxBlurKernel(params.kernelSize);
  convolve(ctx, kernel);
};

export const applyGaussianBlur = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const kernel = createGaussianKernel(params.sigma, params.kernelSize);
  convolve(ctx, kernel);
};

export const applySharpen = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const kernel = createSharpenKernel(params.sharpenAmount);
  convolve(ctx, kernel);
};

export const applyLaplacian = (ctx: CanvasRenderingContext2D) => convolve(ctx, laplacianKernel);
export const applyPrewitt = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, prewittKernelX, prewittKernelY);
export const applyScharr = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, scharrKernelX, scharrKernelY);
export const applySobel = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, sobelKernelX, sobelKernelY);

// Basic Canny implementation - for simplicity, this is a placeholder.
// A full Canny implementation is much more complex involving non-maximum suppression and hysteresis thresholding.
export const applyCanny = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { data, width, height } = imageData;
    
    // This is a simplified version. A true Canny filter is more involved.
    // We will just apply a threshold to a Sobel result for demonstration.
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

export const applyLinearStretch = (ctx: CanvasRenderingContext2D) => {
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

export const applyHistogramEqualization = (ctx: CanvasRenderingContext2D) => {
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
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * (cdf[i] - cdfMin) / (totalPixels - cdfMin));
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

export const applyClahe = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const { clipLimit, gridSize } = params;

  const tileWidth = Math.floor(width / gridSize);
  const tileHeight = Math.floor(height / gridSize);

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
      const endX = startX + tileWidth;
      const endY = startY + tileHeight;
      const tilePixels = tileWidth * tileHeight;

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
        lut[i] = Math.round(255 * cdf[i] / tilePixels);
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

export const applyGammaCorrection = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data } = imageData;
  const { gamma } = params;
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
