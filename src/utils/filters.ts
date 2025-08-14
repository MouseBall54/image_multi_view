// src/utils/filters.ts

type Kernel = number[][];

function convolve(ctx: CanvasRenderingContext2D, kernel: Kernel) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const halfKernel = Math.floor(kernel.length / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      let weightSum = 0;

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
            weightSum += weight;
          }
        }
      }
      
      const outIndex = (y * width + x) * 4;
      // Normalize if kernel sum is not 0
      const normR = weightSum !== 0 ? r / weightSum : r;
      const normG = weightSum !== 0 ? g / weightSum : g;
      const normB = weightSum !== 0 ? b / weightSum : b;

      data[outIndex] = Math.max(0, Math.min(255, normR));
      data[outIndex + 1] = Math.max(0, Math.min(255, normG));
      data[outIndex + 2] = Math.max(0, Math.min(255, normB));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// --- Filter Kernels ---
const boxBlurKernel: Kernel = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
];

const gaussianBlurKernel: Kernel = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
];

const sharpenKernel: Kernel = [
  [0, -1, 0],
  [-1, 5, -1],
  [0, -1, 0],
];

const laplacianKernel: Kernel = [
  [0, 1, 0],
  [1, -4, 1],
  [0, 1, 0],
];

// --- Edge Detection Kernels (require grayscale + two-pass convolution) ---
const prewittKernelX: Kernel = [
  [-1, 0, 1],
  [-1, 0, 1],
  [-1, 0, 1],
];
const prewittKernelY: Kernel = [
  [-1, -1, -1],
  [0, 0, 0],
  [1, 1, 1],
];

const scharrKernelX: Kernel = [
  [-3, 0, 3],
  [-10, 0, 10],
  [-3, 0, 3],
];
const scharrKernelY: Kernel = [
  [-3, -10, -3],
  [0, 0, 0],
  [3, 10, 3],
];

function applyEdgeFilter(ctx: CanvasRenderingContext2D, kernelX: Kernel, kernelY: Kernel) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const grayscaleData = new Uint8ClampedArray(width * height);
  const edgeData = new Uint8ClampedArray(data.length);

  // 1. Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grayscaleData[i / 4] = gray;
  }

  // 2. Apply kernels
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
export const applyBoxBlur = (ctx: CanvasRenderingContext2D) => convolve(ctx, boxBlurKernel);
export const applyGaussianBlur = (ctx: CanvasRenderingContext2D) => convolve(ctx, gaussianBlurKernel);
export const applySharpen = (ctx: CanvasRenderingContext2D) => convolve(ctx, sharpenKernel);
export const applyLaplacian = (ctx: CanvasRenderingContext2D) => convolve(ctx, laplacianKernel);
export const applyPrewitt = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, prewittKernelX, prewittKernelY);
export const applyScharr = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, scharrKernelX, scharrKernelY);
export const applySobelFilter = (ctx: CanvasRenderingContext2D) => applyEdgeFilter(ctx, [ [-1, 0, 1], [-2, 0, 2], [-1, 0, 1] ], [ [-1, -2, -1], [0, 0, 0], [1, 2, 1] ]);
