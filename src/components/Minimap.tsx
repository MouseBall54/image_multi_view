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
};

const MINIMAP_WIDTH = 150;

export const Minimap: React.FC<Props> = ({ bitmap, viewport, canvasSize, appMode, folderKey, overrideScale, pinpointGlobalScale, refPoint }) => {
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
      if (appMode === 'pinpoint' && typeof folderKey === 'string' && pinpointGlobalScale !== undefined && overrideScale !== undefined) {
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
        
        // Minimap rectangle
        const rectX = visibleLeft * MINIMAP_WIDTH;
        const rectY = visibleTop * minimapHeight;
        const rectWidth = (visibleRight - visibleLeft) * MINIMAP_WIDTH;
        const rectHeight = (visibleBottom - visibleTop) * minimapHeight;
        
        // Draw rectangle if valid
        if (rectWidth > 0 && rectHeight > 0) {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
          
          ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        }
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