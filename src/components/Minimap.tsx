import React, { useEffect, useRef } from 'react';
import type { Viewport } from '../types';

type Props = {
  bitmap: ImageBitmap | null;
  viewport: Viewport;
};

const MINIMAP_WIDTH = 150;

export const Minimap: React.FC<Props> = ({ bitmap, viewport }) => {
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

    // Draw the viewport rectangle
    const { scale, cx, cy } = viewport;
    if (scale > 1) {
      const rectWidth = MINIMAP_WIDTH / scale;
      const rectHeight = minimapHeight / scale;
      const rectX = (cx - 0.5 / scale) * MINIMAP_WIDTH;
      const rectY = (cy - 0.5 / scale) * minimapHeight;

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    }
  }, [bitmap, viewport]);

  if (!bitmap) {
    return null;
  }

  return (
    <div className="minimap">
      <canvas ref={canvasRef} />
    </div>
  );
};