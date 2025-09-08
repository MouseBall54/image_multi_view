// src/config.ts
export const MIN_ZOOM = 0.1; // 10%
export const MAX_ZOOM = 30; // 3000%
export const WHEEL_ZOOM_STEP = 1.1;   // 휠 한 칸당 10% 증가/감소
export const PAN_SPEED = 2.0;         // drag 거리 보정
export const DEFAULT_VIEWPORT: { scale: number } = { scale: 1 };

export const CURSOR_ZOOM_CENTERED = true; // 커서 기준 zoom
export const RESPECT_EXIF = true;         // EXIF 회전 처리(createImageBitmap 옵션)
export const USE_OFFSCREEN = true;        // OffscreenCanvas 사용(지원시)
export const SHOW_FOLDER_LABEL = true;    // 뷰어에 폴더명 표시

// UTIF.js 디코딩 옵션
export const UTIF_OPTIONS = {
  pageStrategy: 'largest' as const,   // 'first' | 'largest' | number(index)
  autoContrast: true,                 // grayscale에 퍼센타일 기반 auto-contrast
  clipPercent: 0.5,                   // 상/하위 0.5% 클리핑
  manualWindow: null as null | { min: number; max: number }, // 예) {min: 20, max: 230}
};

// 성능 최적화 설정
export const PERFORMANCE = {
  // 필터 파라미터 변경 시 throttle 간격 (ms)
  FILTER_PARAM_THROTTLE: 100,        // 100ms = 10fps 업데이트 속도
  
  // 미리보기 업데이트 throttle 간격 (ms)  
  PREVIEW_UPDATE_THROTTLE: 120,      // 120ms = ~8fps 미리보기 업데이트
  
  // 복잡한 OpenCV 필터용 더 긴 throttle (ms)
  HEAVY_FILTER_THROTTLE: 200,        // 200ms = 5fps (bilateral, morphology 등)
  
  // Debounce 설정 (연속 입력 후 지연)
  SEARCH_DEBOUNCE: 300,              // 검색 입력 debounce
  SAVE_DEBOUNCE: 500,                // 자동 저장 debounce
} as const;
