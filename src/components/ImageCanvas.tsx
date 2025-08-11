// src/components/ImageCanvas.tsx
import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, PAN_SPEED, RESPECT_EXIF, WHEEL_ZOOM_STEP, SHOW_FOLDER_LABEL } from "../config";
import { Minimap } from "./Minimap";

type Props = {
  file?: File;
  label: string;
  indicator?: { cx: number, cy: number, key: number } | null;
  isReference?: boolean;
  cache: Map<string, ImageBitmap>;
};

export interface ImageCanvasHandle {
  drawToContext: (ctx: CanvasRenderingContext2D) => void;
}

export const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ file, label, indicator, isReference, cache }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const { viewport, setViewport, syncMode, setFitScaleFn } = useStore();
  const animationFrameId = useRef<number | null>(null);

  const drawImage = (ctx: CanvasRenderingContext2D, currentBitmap: ImageBitmap) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    const scale = viewport.scale;
    const cx = viewport.cx * currentBitmap.width;
    const cy = viewport.cy * currentBitmap.height;

    const drawW = currentBitmap.width * scale;
    const drawH = currentBitmap.height * scale;

    const x = Math.round((width / 2) - (cx * scale));
    const y = Math.round((height / 2) - (cy * scale));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(currentBitmap, x, y, drawW, drawH);
  };

  useImperativeHandle(ref, () => ({
    drawToContext: (ctx: CanvasRenderingContext2D) => {
      if (bitmap) {
        drawImage(ctx, bitmap);
      }
    }
  }));

  useEffect(() => {
    if (isReference) {
      const calculateFitScale = () => {
        if (!canvasRef.current || !bitmap) {
          return 1;
        }
        const canvas = canvasRef.current;
        const { width, height } = canvas.getBoundingClientRect();

        const canvasAspect = width / height;
        const imageAspect = bitmap.width / bitmap.height;

        let scale;
        if (canvasAspect > imageAspect) {
          scale = height / bitmap.height;
        } else {
          scale = width / bitmap.width;
        }
        return scale;
      };
      setFitScaleFn(calculateFitScale);
    }
  }, [bitmap, isReference, setFitScaleFn]);

  useEffect(() => {
    let revoked = false;
    if (!file) {
      setBitmap(null);
      return;
    }

    const cacheKey = `${label}-${file.name}`;
    const cachedBitmap = cache.get(cacheKey);
    if (cachedBitmap) {
      setBitmap(cachedBitmap);
      return;
    }

    const isTiff = file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff');

    (async () => {
      let newBitmap: ImageBitmap | null = null;
      if (isTiff) {
        const Tiff = await import('tiff');
        const buffer = await file.arrayBuffer();
        const ifds = Tiff.decode(buffer);

        if (ifds && ifds.length > 0) {
          const tiffImage = ifds[0];
          const width = tiffImage.width;
          const height = tiffImage.height;
          const samplesPerPixel = tiffImage.samplesPerPixel;
          const tiffData = tiffImage.data;
          
          let rgba;

          if (samplesPerPixel === 1) {
            rgba = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < tiffData.length; i++) {
              rgba[i * 4] = tiffData[i];
              rgba[i * 4 + 1] = tiffData[i];
              rgba[i * 4 + 2] = tiffData[i];
              rgba[i * 4 + 3] = 255;
            }
          } else if (samplesPerPixel === 3) {
            rgba = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < width * height; i++) {
              rgba[i * 4] = tiffData[i * 3];
              rgba[i * 4 + 1] = tiffData[i * 3 + 1];
              rgba[i * 4 + 2] = tiffData[i * 3 + 2];
              rgba[i * 4 + 3] = 255;
            }
          } else if (samplesPerPixel === 4) {
            rgba = new Uint8ClampedArray(tiffData);
          } else {
            console.error(`Unsupported samplesPerPixel: ${samplesPerPixel}`);
            setBitmap(null);
            return;
          }

          const imageData = new ImageData(rgba, width, height);
          newBitmap = await createImageBitmap(imageData);
        } else {
          console.error("Could not decode TIFF file");
        }
      } else {
        const opts: ImageBitmapOptions = RESPECT_EXIF ? { imageOrientation: "from-image" as any } : {};
        try {
          newBitmap = await createImageBitmap(file, opts);
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }

      if (!revoked && newBitmap) {
        cache.set(cacheKey, newBitmap);
        setBitmap(newBitmap);
      } else if (!revoked) {
        setBitmap(null);
      }
    })();

    return () => {
      revoked = true;
    };
  }, [file, label, cache]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    drawImage(ctx, bitmap);
  }, [bitmap, viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    let isDown = false;
    let lastX = 0, lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;

      const { viewport: currentViewport } = useStore.getState();
      const preScale = currentViewport.scale;
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : (1 / WHEEL_ZOOM_STEP);
      let next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preScale * delta));
      if (next === preScale) return;

      let { cx, cy } = currentViewport;

      if (CURSOR_ZOOM_CENTERED) {
        const imgW = bitmap.width, imgH = bitmap.height;
        const drawW = imgW * preScale;
        const x = (canvas.width / 2) - (cx * imgW * preScale);
        const y = (canvas.height / 2) - (cy * imgH * preScale);
        const imgX = (mx - x) / drawW;
        const imgY = (my - y) / drawW;

        const drawW2 = imgW * next;
        const x2 = mx - imgX * drawW2;
        const y2 = my - imgY * drawW2;
        const newCxPx = ((canvas.width / 2) - x2) / next;
        const newCyPx = ((canvas.height / 2) - y2) / next;
        cx = newCxPx / imgW;
        cy = newCyPx / imgH;
      }
      if (syncMode === "locked") {
        setViewport({ scale: next, cx, cy });
      }
    };

    const onDown = (e: MouseEvent) => {
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };
    const onUp = () => {
      isDown = false;
      canvas.style.cursor = 'grab';
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();

      if (animationFrameId.current) {
        return;
      }

      animationFrameId.current = requestAnimationFrame(() => {
        const dx = (e.clientX - lastX) * PAN_SPEED;
        const dy = (e.clientY - lastY) * PAN_SPEED;
        lastX = e.clientX;
        lastY = e.clientY;

        const { viewport: currentViewport } = useStore.getState();
        const imgW = bitmap.width, imgH = bitmap.height;
        const dpX = -dx / (currentViewport.scale * imgW);
        const dpY = -dy / (currentViewport.scale * imgH);
        let cx = currentViewport.cx + dpX;
        let cy = currentViewport.cy + dpY;

        cx = Math.min(1.2, Math.max(-0.2, cx));
        cy = Math.min(1.2, Math.max(-0.2, cy));

        if (syncMode === "locked") {
          setViewport({ cx, cy });
        }
        animationFrameId.current = null;
      });
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [bitmap, syncMode, setViewport]);

  return (
    <div className="viewer">
      {SHOW_FOLDER_LABEL && <div className="viewer__label">{label}</div>}
      <canvas ref={canvasRef} className="viewer__canvas" />
      {!file && <div className="viewer__placeholder">No Image</div>}
      {indicator && bitmap && canvasRef.current && (
        (() => {
          const canvas = canvasRef.current;
          const scale = viewport.scale;
          const cx = viewport.cx * bitmap.width;
          const cy = viewport.cy * bitmap.height;
          const drawW = bitmap.width * scale;
          const drawH = bitmap.height * scale;
          
          const x = (canvas.width / 2) - (cx * scale);
          const y = (canvas.height / 2) - (cy * scale);

          const indicatorX = x + indicator.cx * drawW;
          const indicatorY = y + indicator.cy * drawH;

          return (
            <div
              key={indicator.key}
              className="indicator-dot"
              style={{
                left: `${indicatorX}px`,
                top: `${indicatorY}px`,
              }}
            />
          );
        })()
      )}
      <Minimap bitmap={bitmap} viewport={viewport} />
    </div>
  );
});
