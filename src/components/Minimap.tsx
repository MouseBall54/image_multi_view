import React, { useEffect, useRef } from 'react';
import type { Viewport } from '../types';

type Props = {
  bitmap: ImageBitmap | null;
  viewport: Viewport;
  canvasSize?: { width: number; height: number }; // 실제 뷰어 캔버스 크기
};

const MINIMAP_WIDTH = 150;

export const Minimap: React.FC<Props> = ({ bitmap, viewport, canvasSize }) => {
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

    // Draw the viewport rectangle more accurately
    const { scale, cx = 0.5, cy = 0.5 } = viewport;
    
    if (canvasSize && scale) {
      // 실제 뷰어에서 보이는 영역을 정확히 계산
      const imageWidth = bitmap.width;
      const imageHeight = bitmap.height;
      
      // 실제 뷰어 캔버스에서 이미지가 차지하는 크기
      const scaledImageWidth = imageWidth * scale;
      const scaledImageHeight = imageHeight * scale;
      
      // 뷰어에서 실제로 보이는 이미지 영역의 비율 계산
      const visibleWidthRatio = Math.min(1, canvasSize.width / scaledImageWidth);
      const visibleHeightRatio = Math.min(1, canvasSize.height / scaledImageHeight);
      
      // 미니맵에서 표시할 사각형 크기
      const rectWidth = MINIMAP_WIDTH * visibleWidthRatio;
      const rectHeight = minimapHeight * visibleHeightRatio;
      
      // 중심점을 기준으로 사각형 위치 계산
      const rectX = (cx * MINIMAP_WIDTH) - (rectWidth / 2);
      const rectY = (cy * minimapHeight) - (rectHeight / 2);

      // 빨간 사각형 그리기
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.max(0, Math.min(MINIMAP_WIDTH - rectWidth, rectX)),
        Math.max(0, Math.min(minimapHeight - rectHeight, rectY)),
        Math.min(rectWidth, MINIMAP_WIDTH),
        Math.min(rectHeight, minimapHeight)
      );
      
      // 반투명 빨간 배경으로 더 명확하게 표시
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(
        Math.max(0, Math.min(MINIMAP_WIDTH - rectWidth, rectX)),
        Math.max(0, Math.min(minimapHeight - rectHeight, rectY)),
        Math.min(rectWidth, MINIMAP_WIDTH),
        Math.min(rectHeight, minimapHeight)
      );
    }
  }, [bitmap, viewport, canvasSize]);

  if (!bitmap) {
    return null;
  }

  return (
    <div className="minimap">
      <canvas ref={canvasRef} />
    </div>
  );
};