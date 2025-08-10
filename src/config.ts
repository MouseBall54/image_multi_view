// src/config.ts
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;
export const WHEEL_ZOOM_STEP = 1.12;  // 휠 한 칸당 배율
export const PAN_SPEED = 2.0;         // drag 거리 보정
export const DEFAULT_VIEWPORT: { scale: number } = { scale: 1 };

export const CURSOR_ZOOM_CENTERED = true; // 커서 기준 zoom
export const RESPECT_EXIF = true;         // EXIF 회전 처리(createImageBitmap 옵션)
export const USE_OFFSCREEN = true;        // OffscreenCanvas 사용(지원시)
