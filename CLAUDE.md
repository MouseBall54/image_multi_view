# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요 (Project Overview)

**CompareX**는 전문적인 이미지 비교 및 분석을 위한 Electron 기반 데스크톱 애플리케이션입니다. 현재 상업화를 준비 중인 프로젝트로, MIT 오픈소스에서 듀얼 라이센싱 모델로 전환을 계획하고 있습니다.

### 핵심 특징 및 경쟁력
- **3가지 전문 모드**: Compare, Pinpoint, Analysis - 각각 다른 사용 시나리오에 최적화
- **60+ OpenCV 필터**: 과학적 정확성을 갖춘 전문 이미지 처리
- **100% 프라이버시**: 클라이언트 사이드 처리, 데이터 유출 없음
- **실시간 처리**: Canvas 기반 고성능 렌더링과 비트맵 캐싱
- **과학적 Colormap**: Viridis, Inferno 등 지각적으로 균일한 색상 매핑
- **크로스 플랫폼**: Windows, macOS, Linux 지원

### 시장 가치 및 상업화 계획
- **추정 가치**: $650,000 - $1,200,000
- **타겟 시장**: 제조업 품질관리, 의료영상 분석, 연구기관, 디지털 포렌식
- **수익 모델**: Community Edition (MIT) + Enterprise Edition (Commercial)
- **상세 계획**: `STRATEGY/` 폴더의 VALUATION_REPORT.md, COMMERCIALIZATION_STRATEGY.md 참조

## 개발 명령어 (Development Commands)

### 웹 개발 (Vite + React)
```bash
npm run dev          # 개발 서버 시작 (localhost:5173)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run lint         # TypeScript 타입 체크
npm run deploy       # GitHub Pages 배포
```

### Electron 개발
```bash
npm run electron:dev        # Electron 개발 모드 (concurrently로 웹+Electron 동시 실행)
npm run electron:pack       # Electron 앱 패키징 (배포 안 함)
npm run electron:pack:win   # Windows 전용 패키징
npm run electron:dist       # Windows 배포판 빌드 (자동 배포)
npm run electron:dist:generic  # Generic 배포판 (태그/드래프트 시에만)
```

### 빌드 환경 변수
- `NODE_ENV=development`: 개발 모드, OpenCV 에러 무시, DevTools 열림
- `ELECTRON=1`: Electron 전용 빌드 설정 활성화

## 아키텍처 개요 (High-Level Architecture)

### 핵심 구조
```
src/
├── App.tsx                 # 메인 앱 컴포넌트, 모드 관리
├── store.ts               # Zustand 전역 상태 관리 (1,085 LOC)
├── types.ts               # TypeScript 타입 정의
├── config.ts              # 앱 설정 상수
├── modes/                 # 3가지 전문 모드
│   ├── CompareMode.tsx    # 다중 폴더 비교
│   ├── PinpointMode.tsx   # 정밀 정렬 및 측정
│   └── AnalysisMode.tsx   # 단일 이미지 분석
├── components/            # 재사용 가능한 UI 컴포넌트
├── utils/                 # 핵심 유틸리티
│   ├── opencv.ts          # OpenCV 초기화 및 래퍼
│   ├── opencvFilters.ts   # OpenCV 필터 구현 (1,478 LOC)
│   ├── filters.ts         # 필터 시스템 (1,741 LOC)
│   ├── colormaps.ts       # 과학적 색상 매핑 (795 LOC)
│   ├── utif.ts            # TIFF 이미지 디코딩
│   └── filterChain.ts     # 필터 체인 관리
```

### 주요 컴포넌트 크기 (LOC)
- **ImageCanvas.tsx**: 1,773 LOC - 핵심 캔버스 렌더링
- **FilterControls.tsx**: 1,739 LOC - 필터 UI 및 파라미터 조정
- **FilterCart.tsx**: 1,224 LOC - 필터 체인 관리 UI
- **store.ts**: 1,085 LOC - 전역 상태 관리

### 기술 스택
- **Frontend**: React 18 + TypeScript 5.2
- **Desktop**: Electron 37.3.1 + electron-updater
- **상태관리**: Zustand 4.5.2 (Redux보다 경량)
- **이미지처리**: OpenCV-TS 1.3.6, UTIF 3.1.0
- **빌드**: Vite 5.2.0 (Webpack 대신 고성능)

## 3가지 전문 모드 (Three Specialized Modes)

### 1. Compare Mode 🔍
**용도**: 다중 폴더 간 이미지 비교
- 2-9개 폴더 동시 비교
- 지능적 파일명 매칭 (확장자 제거 옵션)
- 동기화된 네비게이션 (팬/줌)
- 1×2부터 6×4까지 다양한 레이아웃

### 2. Pinpoint Mode 🎯  
**용도**: 정밀 정렬 및 측정
- 고정 슬롯 (A, B, C, ...) + 이미지 재정렬
- Shift/Swap 모드로 이미지 순서 조정
- 개별 스케일링 + 글로벌 스케일 제어
- 참조점 시스템으로 정밀 정렬
- 수평/수직 레벨링 도구

### 3. Analysis Mode 🔬
**용도**: 단일 이미지 심층 분석
- 고급 필터 체인 적용
- 실시간 Before/After 비교
- 과학적 분석 도구
- 결과 내보내기 기능

## 이미지 처리 시스템 (Image Processing System)

### OpenCV 통합
```typescript
// OpenCV 초기화 패턴
await initializeOpenCV();
if (isOpenCVReady()) {
  const cv = getOpenCV();
  // OpenCV 작업 수행
}
```

### 필터 시스템 아키텍처
- **60+ 필터**: 기본 조정부터 고급 OpenCV 연산까지
- **필터 체인**: 다중 필터 순차 적용
- **실시간 미리보기**: 파라미터 조정 시 즉시 반영
- **성능 최적화**: 비트맵 캐싱과 Canvas 최적화

### 지원 이미지 포맷
- **표준**: JPEG, PNG, WebP, GIF, BMP
- **전문**: TIFF (UTIF 라이브러리 사용)
- **대용량 처리**: 효율적인 메모리 관리

### Colormap 시스템
과학적 정확성을 위한 지각적 균일 색상 매핑:
- **Perceptually Uniform**: Viridis, Inferno, Plasma, Magma (권장)
- **Legacy**: Jet, HSV, Hot (호환성 용)
- **특수 용도**: 그라데이션 기반, 변화량 기반

## 상태 관리 (State Management)

### Zustand Store 구조
```typescript
interface State {
  // 앱 모드 관리
  appMode: 'compare' | 'pinpoint' | 'analysis';
  
  // 뷰포트 및 네비게이션
  viewport: Viewport;
  
  // 폴더 및 파일 관리
  folders: Map<FolderKey, FolderState>;
  current: MatchedItem[];
  
  // 필터 시스템
  viewerFilters: Map<string, FilterType>;
  viewerFilterParams: Map<string, FilterParams>;
  
  // UI 상태
  showMinimap: boolean;
  showGrid: boolean;
  showFilterLabels: boolean;
}
```

## 성능 최적화 (Performance Optimization)

### Canvas 최적화
- **비트맵 캐싱**: `Map<string, DrawableImage>`로 중복 로딩 방지
- **오프스크린 렌더링**: 필터 적용 시 백그라운드 처리
- **메모리 관리**: 대용량 이미지 효율적 처리

### OpenCV 최적화
- **지연 초기화**: 필요시에만 OpenCV 로드
- **에러 핸들링**: OpenCV 실패 시 fallback 제공
- **성능 메트릭**: 처리 시간 추정 및 복잡도 분석

### Electron 최적화
- **IPC 최적화**: 최소한의 데이터 전송
- **메모리 누수 방지**: 적절한 정리 및 가비지 컬렉션
- **자동 업데이트**: electron-updater로 seamless 업데이트

## 개발 시 주의사항 (Development Notes)

### TypeScript 설정
- 엄격한 타입 체크 활성화
- `@ts-nocheck`는 OpenCV 관련 파일에만 사용
- 모든 컴포넌트에 명시적 타입 정의

### OpenCV 개발
```typescript
// 항상 초기화 확인
if (!isOpenCVReady()) {
  throw new Error('OpenCV not initialized');
}

// 메모리 누수 방지 - Mat 객체 정리
const mat = new cv.Mat();
try {
  // OpenCV 작업
} finally {
  mat.delete(); // 필수!
}
```

### 성능 고려사항
- 대용량 이미지 처리 시 워커 스레드 사용 고려
- Canvas 작업은 `requestAnimationFrame` 사용
- 필터 적용은 debounce/throttle 적용

### 상용화 준비
- Community/Enterprise 기능 분리 준비
- 라이센스 검증 시스템 구현 계획
- 사용 통계 및 성능 메트릭 수집

## 프로젝트 현황 및 목표

### 현재 상태 (v1.1.1)
- ✅ 완전한 기능 구현 (19,894 LOC)
- ✅ 3가지 전문 모드 완성
- ✅ 60+ OpenCV 필터 시스템
- ✅ 크로스 플랫폼 지원
- ✅ 자동 업데이트 시스템

### 상업화 계획 (2024-2025)
- 🎯 듀얼 라이센싱 전환 (Community + Enterprise)
- 🎯 Year 1 목표: $100,000 매출
- 🎯 Enterprise 기능: API 서버, 배치 처리, 고급 지원
- 🎯 시장 진출: 제조업, 의료, 연구기관

### 기술 로드맵
- 🔄 멀티스레드 성능 최적화 (Worker threads)
- 🔄 AI/ML 기능 통합 검토
- 🔄 클라우드 서비스 연동
- 🔄 모바일 앱 확장

이 프로젝트는 높은 기술적 완성도와 상업적 잠재력을 가진 전문적인 이미지 분석 도구입니다. 개발 시에는 성능 최적화, 사용자 경험, 그리고 상업적 가치를 모두 고려해야 합니다.