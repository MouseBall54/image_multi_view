import React, { useEffect, useRef } from 'react';
import type { Viewport, AppMode, FolderKey } from '../types';

type Props = {
  bitmap: ImageBitmap | null;
  viewport: Viewport;
  canvasSize?: { width: number; height: number }; // 실제 뷰어 캔버스 크기
  appMode?: AppMode;
  folderKey?: FolderKey | number;
  overrideScale?: number;
  pinpointGlobalScale?: number;
  refPoint?: { x: number, y: number } | null;
  rotationDeg?: number;
};

const MINIMAP_WIDTH = 150;

export const Minimap: React.FC<Props> = ({ bitmap, viewport, canvasSize, appMode, folderKey, overrideScale, pinpointGlobalScale, refPoint, rotationDeg = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const aspectRatio = bitmap.height / bitmap.width;
    const minimapHeight = MINIMAP_WIDTH * aspectRatio;
    canvas.width = MINIMAP_WIDTH;
    canvas.height = minimapHeight;

    // Draw the full image scaled down
    ctx.drawImage(bitmap, 0, 0, MINIMAP_WIDTH, minimapHeight);

    // Draw the viewport rectangle with mode-specific calculations
    if (canvasSize) {
      if (appMode === 'pinpoint' && typeof folderKey === 'string' && pinpointGlobalScale !== undefined) {
        // Pinpoint mode: complex calculations
        const individualScale = overrideScale ?? viewport.scale;
        const totalScale = individualScale * pinpointGlobalScale;
        const currentRefPoint = refPoint || { x: 0.5, y: 0.5 };
        const refScreenX = viewport.refScreenX || (canvasSize.width / 2);
        const refScreenY = viewport.refScreenY || (canvasSize.height / 2);
        
        // Calculate visible area in pinpoint mode
        const imageWidth = bitmap.width;
        const imageHeight = bitmap.height;
        const scaledImageWidth = imageWidth * totalScale;
        const scaledImageHeight = imageHeight * totalScale;
        
        // Reference point image coordinates
        const refImgX = currentRefPoint.x * imageWidth;
        const refImgY = currentRefPoint.y * imageHeight;
        
        // Where image is drawn in canvas
        const drawX = refScreenX - (refImgX * totalScale);
        const drawY = refScreenY - (refImgY * totalScale);
        
        // Calculate visible portion ratios
        const visibleLeft = Math.max(0, -drawX) / scaledImageWidth;
        const visibleTop = Math.max(0, -drawY) / scaledImageHeight;
        const visibleRight = Math.min(1, (canvasSize.width - drawX) / scaledImageWidth);
        const visibleBottom = Math.min(1, (canvasSize.height - drawY) / scaledImageHeight);
        
        // Compute rotated viewport polygon corners in minimap coordinates
        const angle = (rotationDeg || 0) * Math.PI / 180;
        const canvasW = canvasSize.width;
        const canvasH = canvasSize.height;
        const centerX = drawX + (scaledImageWidth / 2);
        const centerY = drawY + (scaledImageHeight / 2);
        const cos = Math.cos(-angle); // inverse rotation for mapping canvas->image
        const sin = Math.sin(-angle);

        const cornersCanvas = [
          { x: 0, y: 0 },
          { x: canvasW, y: 0 },
          { x: canvasW, y: canvasH },
          { x: 0, y: canvasH },
        ];

        const cornersMini = cornersCanvas.map(({ x: cx, y: cy }) => {
          const dx = cx - centerX;
          const dy = cy - centerY;
          const rx = centerX + dx * cos - dy * sin;
          const ry = centerY + dx * sin + dy * cos;
          const imgX = (rx - drawX) / totalScale; // in image px
          const imgY = (ry - drawY) / totalScale;
          return {
            x: (imgX / imageWidth) * MINIMAP_WIDTH,
            y: (imgY / imageHeight) * minimapHeight,
          };
        });

        // Draw rotated polygon
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(cornersMini[0].x, cornersMini[0].y);
        for (let i = 1; i < cornersMini.length; i++) ctx.lineTo(cornersMini[i].x, cornersMini[i].y);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
      } else {
        // Standard mode: existing logic
        const { scale, cx = 0.5, cy = 0.5 } = viewport;
        
        if (scale) {
          const imageWidth = bitmap.width;
          const imageHeight = bitmap.height;
          const scaledImageWidth = imageWidth * scale;
          const scaledImageHeight = imageHeight * scale;
          const visibleWidthRatio = Math.min(1, canvasSize.width / scaledImageWidth);
          const visibleHeightRatio = Math.min(1, canvasSize.height / scaledImageHeight);
          const rectWidth = MINIMAP_WIDTH * visibleWidthRatio;
          const rectHeight = minimapHeight * visibleHeightRatio;
          const rectX = (cx * MINIMAP_WIDTH) - (rectWidth / 2);
          const rectY = (cy * minimapHeight) - (rectHeight / 2);

          ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            Math.max(0, Math.min(MINIMAP_WIDTH - rectWidth, rectX)),
            Math.max(0, Math.min(minimapHeight - rectHeight, rectY)),
            Math.min(rectWidth, MINIMAP_WIDTH),
            Math.min(rectHeight, minimapHeight)
          );
          
          ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
          ctx.fillRect(
            Math.max(0, Math.min(MINIMAP_WIDTH - rectWidth, rectX)),
            Math.max(0, Math.min(minimapHeight - rectHeight, rectY)),
            Math.min(rectWidth, MINIMAP_WIDTH),
            Math.min(rectHeight, minimapHeight)
          );
        }
      }
    }
  }, [bitmap, viewport, canvasSize, appMode, folderKey, overrideScale, pinpointGlobalScale, refPoint]);

  if (!bitmap) {
    return null;
  }

  return (
    <div className="minimap">
      <canvas ref={canvasRef} />
    </div>
  );
};
