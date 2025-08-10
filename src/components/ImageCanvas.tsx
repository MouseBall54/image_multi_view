// src/components/ImageCanvas.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { CURSOR_ZOOM_CENTERED, MAX_ZOOM, MIN_ZOOM, PAN_SPEED, RESPECT_EXIF, WHEEL_ZOOM_STEP, USE_OFFSCREEN } from "../config";

type Props = {
  file?: File;     // 없는 폴더면 undefined 가능
  label: string;   // "A" | "B" | "C"
};

export const ImageCanvas: React.FC<Props> = ({ file, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const { viewport, setViewport, syncMode } = useStore();

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
    // 실제 pixel size 반영
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    // viewport -> 화면 변환
    const scale = viewport.scale;
    const cx = viewport.cx * bitmap.width;
    const cy = viewport.cy * bitmap.height;

    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;

    const x = Math.round((canvas.width / 2) - (cx * scale));
    const y = Math.round((canvas.height / 2) - (cy * scale));

    // 성능: OffscreenCanvas 사용 (선택)
    if (USE_OFFSCREEN && (canvas as any).transferControlToOffscreen) {
      // 단순도 위해 여기서는 2D 동기 렌더
    }

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
      const { left, top, width, height } = canvas.getBoundingClientRect();
      const mx = e.clientX - left;
      const my = e.clientY - top;

      const preScale = viewport.scale;
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : (1 / WHEEL_ZOOM_STEP);
      let next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preScale * delta));
      if (next === preScale) return;

      let { cx, cy } = viewport;

      if (CURSOR_ZOOM_CENTERED) {
        // 화면좌표(mx,my)를 이미지 정규좌표로 역변환 → center 보정
        const imgW = bitmap.width, imgH = bitmap.height;
        const drawW = imgW * preScale, drawH = imgH * preScale;
        const x = (canvas.width / 2) - (cx * imgW * preScale);
        const y = (canvas.height / 2) - (cy * imgH * preScale);
        const imgX = (mx - x) / drawW; // [0..1]
        const imgY = (my - y) / drawH;

        // 새 scale에 맞춰 center 유지
        const drawW2 = imgW * next, drawH2 = imgH * next;
        const x2 = mx - imgX * drawW2;
        const y2 = my - imgY * drawH2;
        const newCxPx = ( (canvas.width/2) - x2 ) / next; // px
        const newCyPx = ( (canvas.height/2) - y2 ) / next;
        cx = newCxPx / imgW;
        cy = newCyPx / imgH;
      }
      // 동기화 모드일 때 전역 변경
      if (syncMode === "locked") {
        setViewport({ scale: next, cx, cy });
      }
    };

    const onDown = (e: MouseEvent) => { isDown = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { isDown = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = (e.clientX - lastX) * PAN_SPEED;
      const dy = (e.clientY - lastY) * PAN_SPEED;
      lastX = e.clientX; lastY = e.clientY;

      // 화면 이동 → center 보정
      const imgW = bitmap.width, imgH = bitmap.height;
      const dpX = -dx / (viewport.scale * imgW);
      const dpY = -dy / (viewport.scale * imgH);
      let cx = viewport.cx + dpX;
      let cy = viewport.cy + dpY;

      // 경계 제한(여유 허용 가능)
      cx = Math.min(1.2, Math.max(-0.2, cx));
      cy = Math.min(1.2, Math.max(-0.2, cy));

      if (syncMode === "locked") setViewport({ cx, cy });
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
  }, [bitmap, viewport, syncMode, setViewport]);

  return (
    <div className="viewer">
      <div className="viewer__label">{label}</div>
      <canvas ref={canvasRef} className="viewer__canvas" />
      {!file && <div className="viewer__placeholder">No Image</div>}
    </div>
  );
};
