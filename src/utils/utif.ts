// src/utils/utif.ts
import * as UTIF from 'utif';

interface UtifOptions {
  pageStrategy: 'first' | 'largest' | number;
  autoContrast: boolean;
  clipPercent: number;
  manualWindow: { min: number; max: number } | null;
}

/**
 * Decodes a TIFF file using UTIF.js and returns a loaded HTMLImageElement.
 * This is the most robust method to ensure browser compatibility.
 *
 * @param file The TIFF file to decode.
 * @param options Decoding options.
 * @returns A promise that resolves to an HTMLImageElement.
 */
export async function decodeTiffWithUTIF(file: File, options: UtifOptions): Promise<HTMLImageElement> {
//   console.log('[UTIF Debug] Starting TIFF decoding (HTMLImageElement method) for file:', file.name);

  const arrayBuffer = await file.arrayBuffer();
  const ifds = UTIF.decode(arrayBuffer);

  if (!ifds || ifds.length === 0) {
    throw new Error('Invalid TIFF file: No IFDs found.');
  }

  let page = ifds[0];
  if (options.pageStrategy === 'largest') {
    page = ifds.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));
  } else if (typeof options.pageStrategy === 'number') {
    page = ifds[options.pageStrategy] || ifds[0];
  }

  UTIF.decodeImage(arrayBuffer, page, ifds);
  const rgba = UTIF.toRGBA8(page);

  if (!page.width || !page.height || rgba.length !== page.width * page.height * 4) {
    throw new Error('RGBA buffer size mismatch or invalid dimensions.');
  }

  const imageData = new ImageData(new Uint8ClampedArray(rgba), page.width, page.height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = page.width;
  tempCanvas.height = page.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Could not create 2D context for TIFF processing.');
  }
  tempCtx.putImageData(imageData, 0, 0);

  const dataUrl = tempCanvas.toDataURL();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
    //   console.log('[UTIF Debug] Successfully loaded Data URL into HTMLImageElement.', img);
      resolve(img);
    };
    img.onerror = (err) => {
      console.error('[UTIF Debug] CRITICAL: HTMLImageElement failed to load Data URL.', err);
      reject(new Error('Failed to load image from Data URL.'));
    };
    img.src = dataUrl;
  });
}