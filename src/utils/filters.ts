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
