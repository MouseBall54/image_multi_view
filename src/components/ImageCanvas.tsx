// src/components/ImageCanvas.tsx
import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef, useCallback } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, PAN_SPEED, RESPECT_EXIF, WHEEL_ZOOM_STEP, SHOW_FOLDER_LABEL } from "../config";
import { Minimap } from "./Minimap";
import { AppMode, FolderKey } from "../types";

type Props = {
  file?: File;
  label: string;
  indicator?: { cx: number, cy: number, key: number } | null;
  isReference?: boolean;
  cache: Map<string, ImageBitmap>;
  appMode: AppMode;
  refPoint?: { x: number, y: number } | null;
  onSetRefPoint?: (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => void;
  folderKey: FolderKey;
};

export interface ImageCanvasHandle {
  drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean) => void;
}

export const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ file, label, indicator, isReference, cache, appMode, refPoint, onSetRefPoint, folderKey }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const { viewport, setViewport, syncMode, setFitScaleFn, pinpointMouseMode } = useStore();
  const animationFrameId = useRef<number | null>(null);

  const drawMarker = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  };

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, currentBitmap: ImageBitmap, withCrosshair: boolean) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    const scale = viewport.scale;
    const drawW = currentBitmap.width * scale;
    const drawH = currentBitmap.height * scale;
    let x = 0, y = 0;

    if (appMode === 'pinpoint' && refPoint) {
      const refScreenX = viewport.refScreenX || (width / 2);
      const refScreenY = viewport.refScreenY || (height / 2);
      // Calculate the image's top-left corner based on the pinpoint and its screen position
      x = Math.round(refScreenX - (refPoint.x * scale));
      y = Math.round(refScreenY - (refPoint.y * scale));
    } else {
      const cx = (viewport.cx || 0.5) * currentBitmap.width;
      const cy = (viewport.cy || 0.5) * currentBitmap.height;
      x = Math.round((width / 2) - (cx * scale));
      y = Math.round((height / 2) - (cy * scale));
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(currentBitmap, x, y, drawW, drawH);

    if (appMode === 'pinpoint' && refPoint && withCrosshair) {
      const refScreenX = viewport.refScreenX || (width / 2);
      const refScreenY = viewport.refScreenY || (height / 2);
      drawMarker(ctx, refScreenX, refScreenY, 'red');
    }
  }, [viewport, appMode, refPoint]);

  useImperativeHandle(ref, () => ({
    drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean) => {
      if (bitmap) {
        drawImage(ctx, bitmap, withCrosshair);
      }
    }
  }));

  useEffect(() => {
    if (isReference) {
      const calculateFitScale = () => {
        if (!canvasRef.current || !bitmap) return 1;
        const { width, height } = canvasRef.current.getBoundingClientRect();
        const scale = Math.min(width / bitmap.width, height / bitmap.height);
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
    (async () => {
      const opts: ImageBitmapOptions = RESPECT_EXIF ? { imageOrientation: "from-image" as any } : {};
      try {
        const newBitmap = await createImageBitmap(file, opts);
        if (!revoked) {
          cache.set(cacheKey, newBitmap);
          setBitmap(newBitmap);
        }
      } catch (error) {
        console.error("Error loading image:", error);
        if (!revoked) setBitmap(null);
      }
    })();
    return () => { revoked = true; };
  }, [file, label, cache]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    drawImage(ctx, bitmap, true);
  }, [bitmap, drawImage, viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap || appMode !== 'pinpoint' || !onSetRefPoint || pinpointMouseMode !== 'pin') return;

    const handleClick = (e: MouseEvent) => {
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const canvasX = e.clientX - left;
      const canvasY = e.clientY - top;
      const scale = viewport.scale;
      let imgX = 0, imgY = 0;

      if (appMode === 'pinpoint' && refPoint) {
        const refScreenX = viewport.refScreenX || (width / 2);
        const refScreenY = viewport.refScreenY || (height / 2);
        const drawX = refScreenX - (refPoint.x * scale);
        const drawY = refScreenY - (refPoint.y * scale);
        imgX = (canvasX - drawX) / scale;
        imgY = (canvasY - drawY) / scale;
      } else {
        const cx = (viewport.cx || 0.5) * bitmap.width;
        const cy = (viewport.cy || 0.5) * bitmap.height;
        const drawX = (width / 2) - (cx * scale);
        const drawY = (height / 2) - (cy * scale);
        imgX = (canvasX - drawX) / scale;
        imgY = (canvasY - drawY) / scale;
      }

      if (imgX >= 0 && imgX <= bitmap.width && imgY >= 0 && imgY <= bitmap.height) {
        onSetRefPoint(folderKey, { x: imgX, y: imgY }, { x: canvasX, y: canvasY });
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [bitmap, appMode, onSetRefPoint, viewport, folderKey, refPoint, pinpointMouseMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || appMode !== 'pinpoint') return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const { pinpointMouseMode, setPinpointMouseMode } = useStore.getState();
      setPinpointMouseMode(pinpointMouseMode === 'pin' ? 'pan' : 'pin');
    };

    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [appMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    let isDown = false;
    let lastX = 0, lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;

      const { viewport: currentViewport } = useStore.getState();
      const preScale = currentViewport.scale;
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : (1 / WHEEL_ZOOM_STEP);
      let nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preScale * delta));
      if (nextScale === preScale) return;

      if (appMode === 'pinpoint') {
        const refScreenX = currentViewport.refScreenX || (width / 2);
        const refScreenY = currentViewport.refScreenY || (height / 2);
        const nextRefScreenX = mx + (refScreenX - mx) * (nextScale / preScale);
        const nextRefScreenY = my + (refScreenY - my) * (nextScale / preScale);
        if (syncMode === "locked") {
          setViewport({ scale: nextScale, refScreenX: nextRefScreenX, refScreenY: nextRefScreenY });
        }
      } else {
        let { cx, cy } = currentViewport;
        if (CURSOR_ZOOM_CENTERED) {
          const imgW = bitmap.width, imgH = bitmap.height;
          const drawW = imgW * preScale;
          const x = (width / 2) - ((cx || 0.5) * imgW * preScale);
          const y = (height / 2) - ((cy || 0.5) * imgH * preScale);
          const imgX = (mx - x) / drawW;
          const imgY = (my - y) / drawW;

          const drawW2 = imgW * nextScale;
          const x2 = mx - imgX * drawW2;
          const y2 = my - imgY * drawW2;
          const newCxPx = ((width / 2) - x2) / nextScale;
          const newCyPx = ((height / 2) - y2) / nextScale;
          cx = newCxPx / imgW;
          cy = newCyPx / imgH;
        }
        if (syncMode === "locked") {
          setViewport({ scale: nextScale, cx, cy });
        }
      }
    };

    const onDown = (e: MouseEvent) => {
      if (appMode === 'pinpoint' && pinpointMouseMode !== 'pan') return;
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };
    const onUp = () => { 
      isDown = false; 
      canvas.style.cursor = appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab'; 
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      if (appMode === 'pinpoint' && pinpointMouseMode !== 'pan') return;
      e.preventDefault();
      const dx = (e.clientX - lastX);
      const dy = (e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;

      if (syncMode !== 'locked') return;

      const { viewport: currentViewport } = useStore.getState();
      if (appMode === 'pinpoint') {
        const refScreenX = (currentViewport.refScreenX || (canvas.width / 2)) + dx;
        const refScreenY = (currentViewport.refScreenY || (canvas.height / 2)) + dy;
        setViewport({ refScreenX, refScreenY });
      } else {
        const imgW = bitmap.width, imgH = bitmap.height;
        const dpX = -dx / (currentViewport.scale * imgW);
        const dpY = -dy / (currentViewport.scale * imgH);
        let cx = (currentViewport.cx || 0.5) + dpX;
        let cy = (currentViewport.cy || 0.5) + dpY;
        cx = Math.min(1.2, Math.max(-0.2, cx));
        cy = Math.min(1.2, Math.max(-0.2, cy));
        setViewport({ cx, cy });
      }
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
    };
  }, [bitmap, syncMode, setViewport, appMode, pinpointMouseMode]);

  return (
    <div className="viewer">
      {SHOW_FOLDER_LABEL && <div className="viewer__label">{label}</div>}
      <canvas ref={canvasRef} className="viewer__canvas" style={{ cursor: appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab' }} />
      {!file && <div className="viewer__placeholder">{appMode === 'pinpoint' ? 'Click Button Above to Select' : 'No Image'}</div>}
      {indicator && bitmap && canvasRef.current && (
        (() => {
          const canvas = canvasRef.current;
          const scale = viewport.scale;
          const cx = (viewport.cx || 0.5) * bitmap.width;
          const cy = (viewport.cy || 0.5) * bitmap.height;
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
      {/* <Minimap bitmap={bitmap} viewport={viewport} /> */}
    </div>
  );
});
