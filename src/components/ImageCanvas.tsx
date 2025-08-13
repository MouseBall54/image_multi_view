// src/components/ImageCanvas.tsx
import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef, useCallback } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, PAN_SPEED, RESPECT_EXIF, WHEEL_ZOOM_STEP, SHOW_FOLDER_LABEL, UTIF_OPTIONS } from "../config";
import { Minimap } from "./Minimap";
import { AppMode, FolderKey } from "../types";
import { decodeTiffWithUTIF } from '../utils/utif';

type DrawableImage = ImageBitmap | HTMLImageElement;

type Props = {
  file?: File;
  label: string;
  indicator?: { cx: number, cy: number, key: number } | null;
  isReference?: boolean;
  cache: Map<string, DrawableImage>;
  appMode: AppMode;
  overrideScale?: number; // Individual scale for pinpoint mode
  refPoint?: { x: number, y: number } | null;
  onSetRefPoint?: (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => void;
  folderKey: FolderKey;
  onClick?: (folderKey: FolderKey) => void;
  isActive?: boolean; // New prop
};

export interface ImageCanvasHandle {
  drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ file, label, isReference, cache, appMode, overrideScale, refPoint, onSetRefPoint, folderKey, onClick, isActive }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<DrawableImage | null>(null);
  const { viewport, setViewport, syncMode, setFitScaleFn, pinpointMouseMode, indicator, setPinpointScale, pinpointGlobalScale, setPinpointGlobalScale } = useStore();

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, currentImage: DrawableImage, withCrosshair: boolean) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);

    const individualScale = overrideScale ?? viewport.scale;
    const scale = appMode === 'pinpoint' ? individualScale * pinpointGlobalScale : individualScale;
    
    const drawW = currentImage.width * scale;
    const drawH = currentImage.height * scale;
    let x = 0, y = 0;

    if (appMode === 'pinpoint') {
      const currentRefPoint = refPoint || { x: currentImage.width / 2, y: currentImage.height / 2 }; // Use center as fallback
      const refScreenX = viewport.refScreenX || (width / 2);
      const refScreenY = viewport.refScreenY || (height / 2);
      x = Math.round(refScreenX - (currentRefPoint.x * scale));
      y = Math.round(refScreenY - (currentRefPoint.y * scale));
    } else {
      const cx = (viewport.cx || 0.5) * currentImage.width;
      const cy = (viewport.cy || 0.5) * currentImage.height;
      x = Math.round((width / 2) - (cx * scale));
      y = Math.round((height / 2) - (cy * scale));
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(currentImage, x, y, drawW, drawH);

    if (appMode === 'pinpoint' && refPoint && withCrosshair) {
      const refScreenX = viewport.refScreenX || (width / 2);
      const refScreenY = viewport.refScreenY || (height / 2);
      ctx.save();
      ctx.translate(refScreenX, refScreenY);
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(0, 15);
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }, [viewport, appMode, refPoint, overrideScale, pinpointGlobalScale]);

  useImperativeHandle(ref, () => ({
    drawToContext: (ctx: CanvasRenderingContext2D, withCrosshair: boolean) => {
      if (image) {
        drawImage(ctx, image, withCrosshair);
      }
    },
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    if (isReference) {
      const calculateFitScale = () => {
        if (!canvasRef.current || !image) return 1;
        const { width, height } = canvasRef.current.getBoundingClientRect();
        const scale = Math.min(width / image.width, height / image.height);
        return scale;
      };
      setFitScaleFn(calculateFitScale);
    }
  }, [image, isReference, setFitScaleFn]);

  useEffect(() => {
    let revoked = false;
    if (!file) { setImage(null); return; }

    const cacheKey = `${label}-${file.name}`;
    const cachedImage = cache.get(cacheKey);
    if (cachedImage) { setImage(cachedImage); return; }

    (async () => {
      try {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let newImage: DrawableImage;

        if (ext === 'tif' || ext === 'tiff') {
          const imgElement = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
          newImage = await createImageBitmap(imgElement); // Convert HTMLImageElement to ImageBitmap
        } else {
          const opts: ImageBitmapOptions = RESPECT_EXIF ? { imageOrientation: "from-image" as any } : {};
          newImage = await createImageBitmap(file, opts);
        }

        if (!revoked) {
          cache.set(cacheKey, newImage);
          setImage(newImage);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        if (!revoked) setImage(null);
      }
    })();

    return () => { revoked = true; };
  }, [file, label, cache]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    drawImage(ctx, image, true);
  }, [image, drawImage, viewport, pinpointGlobalScale]); // Add pinpointGlobalScale dependency

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || appMode !== 'pinpoint' || !onSetRefPoint || pinpointMouseMode !== 'pin') return;

    const handleClick = (e: MouseEvent) => {
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const canvasX = e.clientX - left;
      const canvasY = e.clientY - top;
      
      const individualScale = overrideScale ?? viewport.scale;
      const scale = individualScale * pinpointGlobalScale;
      let imgX = 0, imgY = 0;

      if (appMode === 'pinpoint' && refPoint) {
        const refScreenX = viewport.refScreenX || (width / 2);
        const refScreenY = viewport.refScreenY || (height / 2);
        const drawX = refScreenX - (refPoint.x * scale);
        const drawY = refScreenY - (refPoint.y * scale);
        imgX = (canvasX - drawX) / scale;
        imgY = (canvasY - drawY) / scale;
      } else {
        const cx = (viewport.cx || 0.5) * image.width;
        const cy = (viewport.cy || 0.5) * image.height;
        const drawX = (width / 2) - (cx * scale);
        const drawY = (height / 2) - (cy * scale);
        imgX = (canvasX - drawX) / scale;
        imgY = (canvasY - drawY) / scale;
      }

      if (imgX >= 0 && imgX <= image.width && imgY >= 0 && imgY <= image.height) {
        onSetRefPoint(folderKey, { x: imgX, y: imgY }, { x: canvasX, y: canvasY });
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [image, appMode, onSetRefPoint, viewport, folderKey, refPoint, pinpointMouseMode, overrideScale, pinpointGlobalScale]);

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
    if (!canvas || !image) return;

    let isDown = false;
    let lastX = 0, lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;

      const { viewport: currentViewport, pinpointGlobalScale: currentGlobalScale, setPinpointGlobalScale } = useStore.getState();
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : (1 / WHEEL_ZOOM_STEP);

      if (appMode === 'pinpoint') {
        const preScale = (overrideScale ?? currentViewport.scale) * currentGlobalScale;
        const nextGlobalScale = currentGlobalScale * delta;
        const nextScale = (overrideScale ?? currentViewport.scale) * nextGlobalScale;
        
        // Clamp the final scale, not the global multiplier
        if (nextScale > MAX_ZOOM || nextScale < MIN_ZOOM) return;

        setPinpointGlobalScale(nextGlobalScale);
        
        // Pan to keep zoom centered on cursor
        const refScreenX = currentViewport.refScreenX || (width / 2);
        const refScreenY = currentViewport.refScreenY || (height / 2);
        const nextRefScreenX = mx + (refScreenX - mx) * (nextScale / preScale);
        const nextRefScreenY = my + (refScreenY - my) * (nextScale / preScale);

        if (syncMode === "locked") {
          setViewport({ refScreenX: nextRefScreenX, refScreenY: nextRefScreenY });
        }
      } else {
        const preScale = currentViewport.scale;
        let nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preScale * delta));
        if (nextScale === preScale) return;

        let { cx, cy } = currentViewport;
        if (CURSOR_ZOOM_CENTERED) {
          const imgW = image.width, imgH = image.height;
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
        const imgW = image.width, imgH = image.height;
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
  }, [image, syncMode, setViewport, appMode, pinpointMouseMode, overrideScale, folderKey, setPinpointScale]);

  return (
    <div className={`viewer ${isActive ? 'active' : ''}`} onClick={() => onClick && onClick(folderKey)}>
      {SHOW_FOLDER_LABEL && <div className="viewer__label">{label}</div>}
      <canvas ref={canvasRef} className="viewer__canvas" style={{ cursor: appMode === 'pinpoint' ? (pinpointMouseMode === 'pin' ? 'crosshair' : 'grab') : 'grab' }} />
      {!file && <div className="viewer__placeholder">{appMode === 'pinpoint' ? 'Click Button Above to Select' : 'No Image'}</div>}
      {indicator && image && canvasRef.current && appMode !== 'pinpoint' && (
        <div
          key={indicator.key}
          className="indicator-dot"
          style={{
            left: `50%`,
            top: `50%`,
          }}
        />
      )}
      {image instanceof ImageBitmap && <Minimap bitmap={image} viewport={viewport} />}
    </div>
  );
});
