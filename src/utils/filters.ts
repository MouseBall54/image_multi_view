// src/utils/filters.ts

export function applySobelFilter(ctx: CanvasRenderingContext2D) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const { data, width, height } = imageData;
  const grayscaleData = new Uint8ClampedArray(width * height);
  const sobelData = new Uint8ClampedArray(data.length);

  // 1. Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscaleData[i / 4] = gray;
  }

  const Gx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const Gy = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  // 2. Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = (y + ky) * width + (x + kx);
          const pixelValue = grayscaleData[pixelIndex];
          gx += pixelValue * Gx[ky + 1][kx + 1];
          gy += pixelValue * Gy[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const outputIndex = (y * width + x) * 4;
      sobelData[outputIndex] = magnitude;
      sobelData[outputIndex + 1] = magnitude;
      sobelData[outputIndex + 2] = magnitude;
      sobelData[outputIndex + 3] = 255; // Alpha
    }
  }
  
  // Create a new ImageData object and put it back to the canvas
  const newImageData = new ImageData(sobelData, width, height);
  ctx.putImageData(newImageData, 0, 0);
}
