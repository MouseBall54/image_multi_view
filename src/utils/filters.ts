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
const robertsKernelX: Kernel = [[1, 0], [0, -1]];
const robertsKernelY: Kernel = [[0, 1], [-1, 0]];

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
export const applyRobertsCross = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, robertsKernelX, robertsKernelY);
export const applyLoG = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const kernel = createLoGKernel(params.sigma, params.kernelSize);
  convolve(ctx, kernel);
};

// Basic Canny implementation - for simplicity, this is a placeholder.
// A full Canny implementation is much more complex involving non-maximum suppression and hysteresis thresholding.

export const applyDoG = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const { kernelSize, sigma, sigma2 } = params;
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

export const applyMarrHildreth = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const { kernelSize, sigma, threshold } = params;
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

export const applyMedian = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
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


export const applyLocalHistogramEqualization = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const { kernelSize } = params;
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
      const equalizedValue = Math.round(255 * (cdf[currentPixelValue] - cdfMin) / (pixelCount - cdfMin));

      const outIndex = (y * width + x) * 4;
      equalizedData[outIndex] = equalizedValue;
      equalizedData[outIndex + 1] = equalizedValue;
      equalizedData[outIndex + 2] = equalizedValue;
      equalizedData[outIndex + 3] = 255;
    }
  }

  ctx.putImageData(new ImageData(equalizedData, width, height), 0, 0);
};

export const applyAdaptiveHistogramEqualization = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const { gridSize } = params;

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

      // b. Create LUT from histogram (no clipping)
      const cdf = new Array(256).fill(0);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + hist[i];
      }

      const cdfMin = cdf.find(val => val > 0) || 0;

      const lut = luts[ty * gridSize + tx];
      for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(255 * (cdf[i] - cdfMin) / (tilePixels - cdfMin));
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

export const applyBilateralFilter = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const { kernelSize, sigmaColor, sigmaSpace } = params;
  const half = Math.floor(kernelSize / 2);

  const gaussian = (x: number, sigma: number) => {
    return (1.0 / (2 * Math.PI * sigma * sigma)) * Math.exp(-(x * x) / (2 * sigma * sigma));
  };

  // Convert to grayscale first
  const grayscale = new Uint8ClampedArray(width * height);
  const srcGray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < src.length; i += 4) {
    const gray = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
    srcGray[i / 4] = gray;
  }

  const spaceKernel = createGaussianKernel(sigmaSpace, kernelSize);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerPixelValue = srcGray[y * width + x];
      let filteredPixel = 0;
      let weightSum = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const sy = y + ky;
          const sx = x + kx;

          if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
            const neighborPixelValue = srcGray[sy * width + sx];
            
            const colorDistance = neighborPixelValue - centerPixelValue;
            const colorWeight = gaussian(colorDistance, sigmaColor);
            
            const spaceWeight = spaceKernel[ky + half][kx + half];

            const totalWeight = colorWeight * spaceWeight;

            filteredPixel += neighborPixelValue * totalWeight;
            weightSum += totalWeight;
          }
        }
      }

      const outIndex = (y * width + x) * 4;
      const finalValue = weightSum === 0 ? centerPixelValue : filteredPixel / weightSum;
      data[outIndex] = finalValue;
      data[outIndex + 1] = finalValue;
      data[outIndex + 2] = finalValue;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

// Non-local Means Denoising
// NOTE: This is a very computationally expensive filter.
// For performance reasons, the search window is kept small.
export const applyNonLocalMeans = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const { patchSize, searchWindowSize, h } = params;

  const patchRadius = Math.floor(patchSize / 2);
  const searchRadius = Math.floor(searchWindowSize / 2);
  const h2 = h * h;

  // Convert to grayscale first
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < src.length; i += 4) {
    grayscale[i / 4] = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
  }
  
  const output = new Uint8ClampedArray(grayscale.length);

  // Helper function to get patch distance
  const getPatchDistance = (x1: number, y1: number, x2: number, y2: number) => {
    let ssd = 0;
    for (let i = -patchRadius; i <= patchRadius; i++) {
      for (let j = -patchRadius; j <= patchRadius; j++) {
        const p1x = x1 + j;
        const p1y = y1 + i;
        const p2x = x2 + j;
        const p2y = y2 + i;
        if (p1x >= 0 && p1x < width && p1y >= 0 && p1y < height && p2x >= 0 && p2x < width && p2y >= 0 && p2y < height) {
          const diff = grayscale[p1y * width + p1x] - grayscale[p2y * width + p2x];
          ssd += diff * diff;
        }
      }
    }
    return ssd / (patchSize * patchSize);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalWeight = 0;
      let filteredPixel = 0;

      const yMin = Math.max(y - searchRadius, 0);
      const yMax = Math.min(y + searchRadius, height - 1);
      const xMin = Math.max(x - searchRadius, 0);
      const xMax = Math.min(x + searchRadius, width - 1);

      for (let sy = yMin; sy <= yMax; sy++) {
        for (let sx = xMin; sx <= xMax; sx++) {
          const distance = getPatchDistance(x, y, sx, sy);
          const weight = Math.exp(-distance / h2);
          
          totalWeight += weight;
          filteredPixel += weight * grayscale[sy * width + sx];
        }
      }
      
      output[y * width + x] = filteredPixel / totalWeight;
    }
  }

  // Apply to original data
  for (let i = 0; i < data.length; i += 4) {
    const val = output[i / 4];
    data[i] = val;
    data[i+1] = val;
    data[i+2] = val;
  }

  ctx.putImageData(imageData, 0, 0);
};

export const applyAnisotropicDiffusion = (ctx: CanvasRenderingContext2D, params: FilterParams) => {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const { iterations, kappa } = params;
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