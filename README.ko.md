# CompareX

로컬 폴더의 이미지를 비교·핀포인트·분석(필터)하기 위한 클라이언트 사이드 웹 애플리케이션입니다. React + TypeScript + Vite로 작성되어 브라우저에서만 동작하며, 파일이 서버로 업로드되지 않습니다.

## 설치 & 실행

```bash
npm install
npm run dev
```

## 상단 컨트롤(controls-main)

- Mode: Compare / Pinpoint / Analysis
- Layout: 행×열 레이아웃 선택(뷰어 수 자동 계산)
- Toggle: 선택한 뷰어를 토글 모달로 열기
- Capture: 화면 캡처(라벨/교차선/미니맵 포함 옵션)
- Minimap: 켜기/끄기 + 옵션 버튼(톱니) → 위치/크기 설정 모달
- Grid: 켜기/끄기 + 색상 인디케이터(클릭 시 색상 모달)
- Viewport(비-Pinpoint 모드): Scale/X/Y 입력으로 배율·좌표 직접 설정
- 제목(CompareX) 클릭: 페이지 새로고침(초기화)

## 모드 안내

### Compare(비교)
- 폴더 슬롯 A~Z에 폴더를 로드하고 동일 파일명(확장자 무시 옵션 지원)으로 매칭
- 선택된 뷰어만 모달에서 순서대로 토글(아래 단축키 참고)
- 전역 회전: 컨트롤 UI 또는 Alt+드래그(좌우)로 즉시 회전, 미니맵도 함께 회전

### Pinpoint(핀포인트)
- 각 뷰어에 서로 다른 이미지를 로드하고 기준점(핀)으로 정밀 정렬
- 개별 배율(뷰어별) + 글로벌 배율, 개별 회전(뷰어별) + 글로벌 회전
- 마우스 모드: Pin(핀 찍기) / Pan(이동) 전환 — 우클릭으로 토글
- = / -: 활성 뷰어의 개별 배율을 1% 단위로 증감
- Alt+드래그(좌우): 개별 회전(뷰어)
- 교차선/회전각/미니맵(회전 반영) 제공

### Analysis(분석)
- 한 장의 이미지를 여러 뷰어에서 서로 다른 필터로 분석
- 전역 회전(컨트롤 UI 또는 Alt+드래그), 미니맵도 함께 회전

## 토글 모달(Toggle)

- 선택된 뷰어만 모달에서 순환(Next/Prev)
- Compare/Analysis: 배율 % 및 X/Y 좌표 입력 가능(Enter로 적용) — 적용 시 강조 인디케이터 표시
- Space / Shift+Space / ← / → / Esc 단축키 지원
- 필터/라벨/미니맵 상태 유지, 필터 처리 캐시로 빠른 전환

## 캡처(Capture)

- 레이아웃을 한 장으로 합성하여 캡처
- 라벨/교차선/미니맵 포함 옵션
- 클립보드 복사 / 파일 저장 지원

## 미니맵(Minimap)

- 옵션 모달(톱니 버튼)에서 위치/크기 설정
  - 위치: Top-Left / Top-Right / Bottom-Left / Bottom-Right
  - 크기: Small(120) / Medium(150) / Large(200) / XL(240)
- 이미지 회전이 반영되어 미니맵 자체가 회전
- 캡처에도 동일하게 반영

## 그리드(Grid)

- 가이드 라인(3분할) 켜기/끄기
- 색상: white / red / yellow / blue (색상 인디케이터 클릭)

## 폴더 컨트롤 카드

- Unloaded: 폴더 선택 버튼(아이콘+텍스트)
- Loaded: 폴더 키 라벨, 별칭(연필 아이콘 또는 더블클릭으로 편집), 파일 수 칩, 변경/클리어 버튼

## 단축키

- 1 / 2 / 3: Compare / Pinpoint / Analysis 모드 전환
- R: 리셋(화면에 맞춤 배율)
- I: 정보 패널 토글
- + / -: 줌 인/아웃
- 화살표(←/→/↑/↓): 패닝(비-Pinpoint)
- Space: 토글 모달 열기 또는 다음(선택한 뷰어가 있을 때)
- Shift+Space: 토글 모달 이전
- Esc: 토글 모달 닫기
- Pinpoint 전용
  - = / -: 활성 뷰어 개별 배율 1% 증감
  - 우클릭: Pin ↔ Pan 전환
  - Alt+드래그(좌우): 개별 회전(뷰어)
- Compare/Analysis 공통
  - Alt+드래그(좌우): 전역 회전

## 필터(요약)

- General: None, Grayscale, Invert, Sepia
- Contrast: Linear Stretch, Histogram Equalization, Local/Adaptive HE, CLAHE, Gamma
- Blurring: Box, Gaussian(σ), Median, Weighted Median, Alpha-trimmed Mean(α)
- Sharpening: Sharpen, Unsharp Mask, High-pass, Laplacian
- Edge: Sobel, Prewitt, Scharr, Canny(low/high), Roberts, LoG(ksize, σ), DoG(σ1, σ2), Marr-Hildreth(ksize, σ, threshold)
- Advanced Denoising: Bilateral(ksize, sigmaColor/Space), Non-local Means(patchSize, searchWindow, h), Anisotropic Diffusion(iterations, kappa)
- Texture: Gabor(theta, sigma, lambda, psi), Laws Texture Energy, LBP
- Edge-preserving: Guided Filter

각 필터의 파라미터는 뷰어의 ‘필터 설정’ 버튼에서 즉시 조정 가능합니다.

## 빌드/배포

```bash
npm run build
npm run preview
npm run deploy
```

## 기술 스택 & 구조

- React 18 + TypeScript + Vite
- 상태: Zustand(`src/store.ts`)
- 모드: `src/modes/` (Compare/Pinpoint/Analysis)
- 컴포넌트: `src/components/`
- 유틸/필터: `src/utils/`
- 훅: `src/hooks/`

## 변경사항(최근)

- 토글 모달: 전역 버튼, 캐시 적용, 배율/X/Y 입력(Compare/Analysis)
- 회전: Compare/Analysis 전역 회전 + Alt+드래그, Pinpoint 개별/글로벌 회전 + Alt+드래그
- 미니맵: 옵션 모달(위치/크기), 이미지 회전 반영, 캡처 반영
- 그리드: 색상 선택 모달
- 폴더 카드: UI 개선, 별칭 편집 버튼 추가
- 제목 클릭 시 페이지 리셋
