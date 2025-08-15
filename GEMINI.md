## 📄 Grayscale 이미지 분석 필터 작업 지시서 (Markdown 문서)

---
## 📌 개요

그레이 스케일 이미지 프로세싱에서 사용되는 필터들은 **목적**에 따라 크게 **대비 향상**, **노이즈 제거**, **엣지 검출/강조**, **특수 효과 및 변환** 등으로 분류할 수 있습니다.
아래는 **대분류 → 중분류 → 대표 필터** 형태로 가능한 많이 정리한 목록입니다.

---

## 1. **대비(Contrast) 향상**

- [x] Histogram Equalization
- [x] CLAHE (Contrast Limited Adaptive Histogram Equalization)
- [x] Linear Contrast Stretching (Min-Max Normalization)
- [x] Gamma Correction

### 1.2 지역 대비 향상

- [x] Local Histogram Equalization
- [x] Adaptive Histogram Equalization

---

## 2. **노이즈 제거(Smoothing / Denoising)**

### 2.1 선형 필터(Linear Filters)

- [x] Mean Filter (Average Filter) - `Box Blur`로 구현
- [x] Gaussian Filter
- [x] Box Filter - `Box Blur`로 구현

### 2.2 비선형 필터(Non-linear Filters)

- [x] Median Filter 
- [x] Weighted Median Filter
- [x] Alpha-trimmed Mean Filter

### 2.3 고급 노이즈 제거

- [x] Bilateral Filter
- [x] Non-local Means Denoising
- [x] Anisotropic Diffusion (Perona–Malik)

---

## 3. **엣지 검출(Edge Detection)**

### 3.1 1차 미분 기반

- [x] Sobel Operator
- [x] Prewitt Operator
- [x] Scharr Operator
- [x] Roberts Cross Operator

### 3.2 2차 미분 기반

- [x] Laplacian Filter
- [x] LoG (Laplacian of Gaussian)
- [x] DoG (Difference of Gaussian)

### 3.3 고급 엣지 검출

- [x] Canny Edge Detector - (기본 기능만 구현, Hysteresis Thresholding 미적용)
- [x] Marr–Hildreth Edge Detector

---

## 4. **샤프닝(Sharpening)**

### 4.1 공간 영역 기반
- [x] Unsharp Masking
- [x] High-pass Filter
- [x] Laplacian Sharpening - (기본 `Sharpen`으로 구현)

## 5. **특수 효과 및 특징 강조**

### 5.1 텍스처 분석

- [x] Gabor Filter
- [ ] Laws' Texture Energy
- [ ] Local Binary Patterns (LBP)

### 5.2 경계 보존 필터

- [ ] Guided Filter
- [ ] Edge-preserving Filter (OpenCV: `cv2.edgePreservingFilter`)

---

## 6. **변환 및 전처리 관련**

### 6.1 주파수 영역 변환

- [ ] Discrete Fourier Transform (DFT)
- [ ] Discrete Cosine Transform (DCT)
- [ ] Wavelet Transform

### 6.2 공간 변환

- [ ] Morphological Gradient (Opening, Closing, Top-hat, Black-hat)
- [ ] Distance Transform

---
## ✅ 지시 규칙

1. 필터 적용시  **Grayscale** 상태여야할 경우. 초기에 Grayscale로 변형 후 진행
2. 필터 적용 전 후 이미지를 저장하여 비교 가능하게 할 것.
3. 커널 크기, σ 값, 임계값 등 **변수는 파라미터화**하여 조정 가능하게 할 것.
4. Morphological Filter는 이진화 후 적용할 것.
5. 여러 필터를 조합해 실험하고 최적 조합을 보고할 것.

---

## 🚀 신규 필터 추가 작업 절차

새로운 이미지 필터를 추가할 때는 아래의 4단계 절차를 따른다. 이 절차는 코드의 일관성과 유지보수성을 보장한다.
왠만하면 openCV.js에 있는 걸 가져다 쓰고 없을 경우 직접 구현하되, 성능향으로 구현.

1.  **`src/types.ts` 수정 (타입 정의)**
    - `FilterType` 유니온 타입에 새로운 필터를 식별할 수 있는 고유한 문자열 리터럴 타입을 추가한다. (예: `'histogramequalization'`).

2.  **`src/utils/filters.ts` 수정 (핵심 로직 구현)**
    - 실제 이미지 처리를 수행하는 `apply[FilterName]` 함수를 새로 작성하고 `export` 한다.
    - 함수는 `ctx: CanvasRenderingContext2D`를 첫 번째 인자로 받는다.
    - 필터가 파라미터를 필요로 하는 경우, `params: FilterParams`를 두 번째 인자로 받도록 정의한다.

3.  **`src/components/FilterControls.tsx` 수정 (UI 연동)**
    - `ALL_FILTERS` 배열에 새로 추가된 필터 정보를 객체 형태로 추가한다. (`name`, `type`, `group` 포함)
    - 필터의 그룹이 기존에 없다면 `filterGroups` 배열에도 새 그룹명을 추가한다.
    - 만약 필터가 파라미터를 사용한다면, `renderParams` 함수 내의 `switch`문에 `case`를 추가하여 해당 파라미터를 조절할 수 있는 UI(슬라이더, 입력 필드 등)를 구현한다.

4.  **`src/components/ImageCanvas.tsx` 수정 (필터 호출)**
    - 이미지 처리를 담당하는 `useEffect` 훅 내부의 `switch`문에 새로운 필터 타입에 대한 `case`를 추가한다.
    - 해당 `case`에서 `filters.ts`에 구현된 `apply[FilterName]` 함수를 호출하도록 연결한다.

---

## 🚀 작업 완료 내역

- **2025-08-15**
  - [x] 필터 파라미터 조절 UI 추가 (`FilterControls.tsx`)
  - [x] 필터 적용 방식 개선 (실시간 → 'Apply' 버튼 클릭 시)
  - [x] 필터 선택 UI 개선 (우클릭 메뉴 → 드롭다운)
  - [x] 필터 적용 성능 개선 (필터링된 이미지 캐싱 처리)
  - [x] Pinpoint 모드 우클릭 기능 복원 (pin/pan 전환)
  - [x] `GEMINI.md` 파일에 구현된 필터 목록 현행화 

