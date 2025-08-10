// src/components/ImageCanvas.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, PAN_SPEED, RESPECT_EXIF, WHEEL_ZOOM_STEP, USE_OFFSCREEN } from "../config";
import { Minimap } from "./Minimap";

type Props = {
  file?: File;
  label: string;
  indicator?: { cx: number, cy: number, key: number } | null;
};

export const ImageCanvas: React.FC<Props> = ({ file, label, indicator }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const { viewport, setViewport, syncMode, setFitScaleFn } = useStore();
  const animationFrameId = useRef<number | null>(null);

  const getFitScale = () => {
    if (!canvasRef.current || !bitmap) {
      return 1;
    }
    const canvas = canvasRef.current;
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = bitmap.width / bitmap.height;

    if (canvasAspect > imageAspect) {
      // Canvas is wider than image, fit to height
      return canvas.height / bitmap.height;
    } else {
      // Canvas is taller than image, fit to width
      return canvas.width / bitmap.width;
    }
  };

  useEffect(() => {
    if (label === 'A') {
      setFitScaleFn(getFitScale);
    }
  }, [bitmap, label, setFitScaleFn]);

  // 이미지 로드
  useEffect(() => {
    let revoked = false;
    if (!file) { setBitmap(null); return; }
    (async () => {
      const opts: ImageBitmapOptions = RESPECT_EXIF ? { imageOrientation: "from-image" as any } : {};
      const bmp = await createImageBitmap(file, opts);
      if (!revoked) setBitmap(bmp);
    })();
    return () => { revoked = true; };
  }, [file]);

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    const scale = viewport.scale;
    const cx = viewport.cx * bitmap.width;
    const cy = viewport.cy * bitmap.height;

    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;

    const x = Math.round((canvas.width / 2) - (cx * scale));
    const y = Math.round((canvas.height / 2) - (cy * scale));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, x, y, drawW, drawH);
    
  }, [bitmap, viewport]);

  // 상호작용: wheel zoom / drag pan
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
      <div className="viewer__label">{label}</div>
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
};
