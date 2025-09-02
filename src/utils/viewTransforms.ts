import type { Viewport } from "../types";

export type PinpointTransform = {
  drawX: number;
  drawY: number;
  centerX: number;
  centerY: number;
  scale: number; // total scale
  theta: number; // radians
  imageW: number;
  imageH: number;
};

export function computePinpointTransform(params: {
  imageW: number;
  imageH: number;
  viewport: Viewport;
  individualScale: number; // per-viewer scale
  globalScale: number; // pinpoint global scale
  refPoint: { x: number; y: number };
  totalAngleDeg: number; // local + global
  canvasW: number;
  canvasH: number;
}): PinpointTransform {
  const { imageW, imageH, viewport, individualScale, globalScale, refPoint, totalAngleDeg } = params;
  const scale = individualScale * globalScale;
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const Sx = drawW / 2;
  const Sy = drawH / 2;
  const refImgX = refPoint.x * imageW;
  const refImgY = refPoint.y * imageH;
  const ux = refImgX * scale;
  const uy = refImgY * scale;
  const theta = (totalAngleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const refScreenX = viewport.refScreenX ?? (params.canvasW / 2);
  const refScreenY = viewport.refScreenY ?? (params.canvasH / 2);
  const drawX = refScreenX - Sx - (cos * (ux - Sx) - sin * (uy - Sy));
  const drawY = refScreenY - Sy - (sin * (ux - Sx) + cos * (uy - Sy));
  const centerX = drawX + Sx;
  const centerY = drawY + Sy;
  return { drawX, drawY, centerX, centerY, scale, theta, imageW, imageH };
}

export type StandardTransform = {
  drawX: number;
  drawY: number;
  centerX: number;
  centerY: number;
  scale: number;
  theta: number; // radians
  imageW: number;
  imageH: number;
};

export function computeStandardTransform(params: {
  imageW: number;
  imageH: number;
  viewport: Viewport;
  scale: number;
  angleDeg: number;
  canvasW: number;
  canvasH: number;
}): StandardTransform {
  const { imageW, imageH, viewport, scale, angleDeg, canvasW, canvasH } = params;
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const cx = (viewport.cx ?? 0.5) * imageW;
  const cy = (viewport.cy ?? 0.5) * imageH;
  const drawX = (canvasW / 2) - (cx * scale);
  const drawY = (canvasH / 2) - (cy * scale);
  const centerX = drawX + drawW / 2;
  const centerY = drawY + drawH / 2;
  const theta = (angleDeg * Math.PI) / 180;
  return { drawX, drawY, centerX, centerY, scale, theta, imageW, imageH };
}

export function screenToImage(screenX: number, screenY: number, t: { centerX: number; centerY: number; drawX: number; drawY: number; theta: number; scale: number; }) {
  // Inverse rotate about center, then unscale/translate
  const dx = screenX - t.centerX;
  const dy = screenY - t.centerY;
  const cos = Math.cos(-t.theta);
  const sin = Math.sin(-t.theta);
  const unrotX = t.centerX + dx * cos - dy * sin;
  const unrotY = t.centerY + dx * sin + dy * cos;
  const imgX = (unrotX - t.drawX) / t.scale;
  const imgY = (unrotY - t.drawY) / t.scale;
  return { imgX, imgY };
}

