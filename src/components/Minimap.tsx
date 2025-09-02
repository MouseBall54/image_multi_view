import React, { useEffect, useRef } from 'react';
import type { Viewport, AppMode, FolderKey } from '../types';
import { computePinpointTransform, computeStandardTransform, screenToImage } from '../utils/viewTransforms';

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
  width?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

const DEFAULT_MINIMAP_WIDTH = 150;

export const Minimap: React.FC<Props> = ({ bitmap, viewport, canvasSize, appMode, folderKey, overrideScale, pinpointGlobalScale, refPoint, rotationDeg = 0, width = DEFAULT_MINIMAP_WIDTH, position = 'bottom-right' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const MINIMAP_WIDTH = Math.max(60, Math.min(400, width));
    const aspectRatio = bitmap.height / bitmap.width;
    const minimapHeight = MINIMAP_WIDTH * aspectRatio;
    canvas.width = MINIMAP_WIDTH;
    canvas.height = minimapHeight;

    // Optional rotation for pinpoint mode: rotate the minimap instead of the box
    const angleRad = (rotationDeg || 0) * Math.PI / 180;
    ctx.save();
    if (angleRad !== 0 && (appMode === 'pinpoint' || appMode === 'analysis' || appMode === 'compare')) {
      ctx.translate(MINIMAP_WIDTH / 2, minimapHeight / 2);
      ctx.rotate(angleRad);
      ctx.translate(-MINIMAP_WIDTH / 2, -minimapHeight / 2);
    }

    // Draw the full image scaled down (with rotation applied if any)
    ctx.drawImage(bitmap, 0, 0, MINIMAP_WIDTH, minimapHeight);

    // Draw the viewport rectangle with mode-specific calculations
    if (canvasSize) {
      if (appMode === 'pinpoint' && typeof folderKey === 'string' && pinpointGlobalScale !== undefined) {
        // Pinpoint mode: complex calculations
        const individualScale = overrideScale ?? viewport.scale;
        const currentRefPoint = refPoint || { x: 0.5, y: 0.5 };
        const xform = computePinpointTransform({
          imageW: bitmap.width,
          imageH: bitmap.height,
          viewport,
          individualScale,
          globalScale: pinpointGlobalScale,
          refPoint: currentRefPoint,
          totalAngleDeg: rotationDeg || 0,
          canvasW: canvasSize.width,
          canvasH: canvasSize.height,
        });

        const cornersCanvas = [
          { x: 0, y: 0 },
          { x: canvasSize.width, y: 0 },
          { x: canvasSize.width, y: canvasSize.height },
          { x: 0, y: canvasSize.height },
        ];

        const cornersMini = cornersCanvas.map(({ x: cx, y: cy }) => {
          const { imgX, imgY } = screenToImage(cx, cy, xform);
          return {
            x: (imgX / bitmap.width) * MINIMAP_WIDTH,
            y: (imgY / bitmap.height) * minimapHeight,
          };
        });

        // Draw rotated polygon (minimap is rotated, overlay drawn in same transform)
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
        // Standard mode: draw rotated polygon if rotated; otherwise axis-aligned rect
        const { scale, cx = 0.5, cy = 0.5 } = viewport;
        if (scale) {
          const imageWidth = bitmap.width;
          const imageHeight = bitmap.height;
          if ((rotationDeg || 0) !== 0 && (appMode === 'analysis' || appMode === 'compare')) {
            const xform = computeStandardTransform({
              imageW: imageWidth,
              imageH: imageHeight,
              viewport: { ...viewport, cx, cy },
              scale,
              angleDeg: rotationDeg || 0,
              canvasW: canvasSize.width,
              canvasH: canvasSize.height,
            });
            const cornersCanvas = [
              { x: 0, y: 0 },
              { x: canvasSize.width, y: 0 },
              { x: canvasSize.width, y: canvasSize.height },
              { x: 0, y: canvasSize.height },
            ];
            const cornersMini = cornersCanvas.map(({ x: cxp, y: cyp }) => {
              const { imgX, imgY } = screenToImage(cxp, cyp, xform);
              return {
                x: (imgX / imageWidth) * MINIMAP_WIDTH,
                y: (imgY / imageHeight) * minimapHeight,
              };
            });

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
            // No rotation: simple axis-aligned rectangle
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
    }
    // Restore rotation transform if applied
    ctx.restore();
  }, [bitmap, viewport, canvasSize, appMode, folderKey, overrideScale, pinpointGlobalScale, refPoint, rotationDeg, width]);

  if (!bitmap) {
    return null;
  }

  return (
    <div className="minimap" style={{
      position: 'absolute',
      ...(position.includes('top') ? { top: 10 } : { bottom: 10 }),
      ...(position.includes('left') ? { left: 10 } : { right: 10 }),
    }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
