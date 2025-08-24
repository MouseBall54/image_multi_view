# CompareX - 고급 이미지 비교 및 분석 도구

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://mouseball54.github.io/image_multi_view/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](#)
[![React](https://img.shields.io/badge/React-18-blue)](#)

**CompareX**는 여러 이미지를 동시에 비교, 분석, 처리해야 하는 전문가를 위해 설계된 강력한 브라우저 기반 이미지 비교 및 분석 애플리케이션입니다. React와 TypeScript로 구축되어 고급 Filter 기능을 갖춘 네 가지 전문 viewing mode를 제공하며, 클라이언트 사이드 처리를 통해 완전한 프라이버시를 보장합니다.

## 🌐 Live Demo

브라우저에서 CompareX를 직접 체험해보세요: **[https://mouseball54.github.io/image_multi_view/](https://mouseball54.github.io/image_multi_view/)**

설치가 필요 없습니다 - 모든 처리는 브라우저에서 로컬로 진행됩니다!

## ✨ 주요 특징

### 🔒 Privacy 우선 설계
- **100% Client-Side Processing** - 파일 업로드 없음, 모든 처리가 로컬에서 진행
- **완전한 Privacy** - 이미지가 절대 기기를 벗어나지 않음
- **서버 불필요** - offline 기능을 갖춘 순수 web application

### 🎯 4가지 전문 Viewing Mode
1. **Single Mode** - 통합 파일 리스트 기반의 집중 단일 뷰
2. **Compare Mode** - 여러 folder의 side-by-side 비교
3. **Pinpoint Mode** - reference point와 rotation을 이용한 정밀 alignment
4. **Analysis Mode** - 고급 filter 적용 및 비교

### 🖼️ 고급 이미지 지원
- **표준 Format**: JPEG, PNG, WebP, GIF, BMP
- **TIFF 지원**: UTIF library를 이용한 완전한 TIFF decoding
- **대용량 이미지 처리**: 효율적인 bitmap caching 및 memory 관리
- **실시간 Processing**: 모든 작업의 즉각적인 preview

### 🎨 전문 Filter System
- **40+ 고급 Filter**: 기본 조정부터 복잡한 OpenCV 작업까지
- **Filter Chain**: 순차적 라벨링과 함께 사용자 정의 sequence에서 여러 filter 조합
- **실시간 Preview**: parameter 조정 시 즉각적인 변화 확인
- **Filter 미리보기 시스템**: 적용 전 side-by-side 비교로 미리보기
- **스마트 Filter 라벨**: 동적 filter chain 표시 (예: "Gaussian Blur → Sharpen → Canny")
- **Export 기능**: filter 설정 저장 및 여러 이미지에 적용

### ⚡ 고성능 Interface
- **유연한 Layout**: 대화형 그리드 선택기로 최대 24개 viewer까지 다양한 배치 구성
- **동기화된 Navigation**: 모든 viewer에서 pan 및 zoom 동시 적용
- **스마트 UI 컨트롤**: 폴더, 파일, 필터 라벨 표시/숨기기 토글 버튼
- **Keyboard Shortcut**: 빠른 workflow를 위한 광범위한 hotkey 지원
- **Responsive Design**: desktop과 mobile 장치 모두 최적화

## 📋 목차

- [시작하기](#시작하기)
- [Viewing Mode](#viewing-mode)
- [Filter System](#filter-system)
- [Interface 기능](#interface-기능)
- [Keyboard Shortcut](#keyboard-shortcut)
- [기술적 특징](#기술적-특징)
- [Development](#development)
- [기여하기](#기여하기)
- [License](#license)

## 🚀 시작하기

### 빠른 시작
1. [live demo](https://mouseball54.github.io/image_multi_view/)에 접속
2. 원하는 viewing mode 선택 (Single/Compare/Pinpoint/Analysis)
3. folder button을 클릭하여 이미지 로드
4. 비교 및 분석 시작!

### Local Development
```bash
# repository clone
git clone https://github.com/MouseBall54/image_multi_view.git

# project directory로 이동
cd image_multi_view

# dependency 설치
npm install

# development server 시작
npm run dev

# production build
npm run build

# GitHub Pages에 deploy
npm run deploy
```

## 🎛️ Viewing Mode

### 0. Single Mode 🎥
**적합한 용도: 집중 뷰, 빠른 필터링, 방해 요소 없는 관찰**

- **통합 파일 리스트**: 로드된 폴더 전반의 파일을 통합해 보여줌 (파일 매칭/확장자 무시 옵션 없음)
- **단일 뷰어**: 뷰어 영역을 가득 채우는 1×1 레이아웃
- **Compare급 기능**: 필터, 미니맵, 그리드, 캡처, 프리뷰 시스템 그대로 사용
- **드래그 앤 드롭**: 비어있는 폴더가 있으면 임시 폴더 생성, 없으면 첫 이미지를 즉시 표시

#### 주요 기능:
- 폴더 필터 + 검색이 가능한 통합 파일 리스트
- 폴더별 필터 설정 및 프리뷰
- 라벨 오버레이 포함 캡처

### 1. Compare Mode 🔍
**적합한 용도: Multi-folder 비교, 파일 matching, side-by-side 분석**

- **Multi-Folder 지원**: 최대 9개 folder 동시 비교
- **지능적 파일 Matching**: 확장자 제거 옵션을 포함한 자동 파일명 matching
- **동기화된 Navigation**: 모든 viewer에 pan 및 zoom 전파
- **유연한 Layout**: 20가지 이상의 layout 구성 (1×2부터 6×4까지)
- **Toggle 기능**: 선택된 이미지들을 순환하며 세부 비교

#### 주요 기능:
- folder 간 자동 파일 matching
- 더 나은 matching을 위한 확장자 제거 옵션
- 실시간 folder 동기화
- 검색 및 filter 기능
- batch 작업 지원

### 2. Pinpoint Mode 🎯
**적합한 용도: 정밀 alignment, reference 기반 비교, 세부 측정**

- **Reference Point System**: 서로 다른 이미지 간 공통 reference point 설정
- **개별 Scaling**: global multiplier와 함께 viewer별 scale 제어
- **이중 Rotation 지원**: 
  - Local rotation (개별 viewer에서 Alt+drag)
  - 모든 viewer를 위한 global rotation 제어
- **유연한 이미지 로딩**: 임의 folder의 임의 이미지를 임의 viewer에 로드
- **Mouse Mode Toggle**: Pin mode(reference 설정)와 Pan mode(navigation) 간 전환

#### 주요 기능:
- 정확한 alignment를 위한 정밀 좌표 시스템
- reference point visualization을 위한 crosshair overlay
- viewer별 독립적 scaling
- 이미지 전환 중 rotation 보존
- 고급 측정 기능

### 3. Analysis Mode 🔬
**적합한 용도: Filter 비교, single 이미지 분석, processing workflow**

- **Single 이미지 집중**: 하나의 source 이미지에 여러 filter 적용
- **Side-by-Side Filter 비교**: 서로 다른 filter 효과 동시 확인
- **실시간 Parameter 조정**: 즉각적인 filter parameter 업데이트
- **Global Rotation 제어**: 일관된 방향 유지
- **Filter Chain 관리**: 복잡한 filter sequence 생성 및 저장

#### 주요 기능:
- 40가지 이상의 전문 grade filter
- Filter parameter 미세 조정
- 실시간 preview 업데이트
- Filter chain 생성 및 관리
- 처리된 결과 export

## 🔍 Filter 미리보기 시스템

### 고급 미리보기 기능
CompareX는 filter를 적용하기 전에 효과를 확인할 수 있는 포괄적인 filter 미리보기 시스템을 제공합니다:

- **Side-by-Side 비교**: 원본과 필터 적용된 이미지를 동시에 미리보기
- **실시간 Parameter 조정**: filter parameter를 수정하면서 즉시 변화 확인
- **Filter Chain 미리보기**: 전체 filter chain 적용 전 미리보기
- **인터랙티브 미리보기 Modal**: 컨트롤이 포함된 전용 미리보기 인터페이스
- **Zoom 및 Pan**: 세부사항 검토를 위한 미리보기 이미지 탐색
- **빠른 적용**: 미리본 filter를 한 번의 클릭으로 적용

### 미리보기 Workflow
1. **Filter 선택**: 40가지 이상의 사용 가능한 filter 중 선택
2. **Parameter 조정**: 실시간으로 filter 설정 미세 조정
3. **결과 미리보기**: 즉시 side-by-side 비교 확인
4. **세부사항 검토**: zoom 및 pan으로 특정 영역 자세히 검토
5. **적용 또는 취소**: filter 적용하거나 다른 filter 시도

## 🎨 Filter System

### Filter 카테고리

#### 기본 조정
- **Grayscale** - grayscale로 변환
- **Invert** - 색상 반전
- **Sepia** - sepia tone 효과

#### Smoothing Filter
- **Gaussian Blur** - 조정 가능한 sigma로 부드러운 Gaussian blur
- **Box Blur** - 간단한 box filter blur
- **Median Filter** - edge 보존과 함께 noise 감소
- **Weighted Median** - 고급 median filtering
- **Alpha Trimmed Mean** - 통계적 smoothing filter

#### Edge Detection
- **Sobel** - 클래식 edge detection
- **Prewitt** - Prewitt edge operator
- **Scharr** - 개선된 Sobel operator
- **Canny** - 다단계 edge detection
- **Roberts Cross** - 간단한 edge detection
- **Laplacian of Gaussian (LoG)** - blob detection
- **Difference of Gaussians (DoG)** - multi-scale edge detection
- **Marr-Hildreth** - zero-crossing edge detection

#### Sharpening
- **Sharpen** - 기본 sharpening filter
- **Laplacian** - Laplacian sharpening
- **Unsharp Mask** - 전문적인 unsharp masking
- **High Pass** - 고주파수 enhancement

#### Contrast Enhancement
- **Linear Stretch** - dynamic range stretching
- **Histogram Equalization** - global contrast enhancement
- **CLAHE** - adaptive histogram equalization
- **Gamma Correction** - 비선형 contrast 조정
- **Local Histogram Equalization** - 국소화된 contrast enhancement

#### 고급 Processing
- **Bilateral Filter** - edge 보존 denoising
- **Non-Local Means** - 고급 denoising algorithm
- **Anisotropic Diffusion** - edge 보존 smoothing
- **Gabor Filter** - texture 분석
- **Laws Texture Energy** - texture feature 추출
- **Local Binary Pattern (LBP)** - texture 설명

#### Morphological 연산
- **Opening** - 작은 객체 제거
- **Closing** - 작은 구멍 채우기
- **Top Hat** - 작은 요소 추출
- **Black Hat** - 어두운 특징 추출
- **Gradient** - edge 추출
- **Distance Transform** - distance map 계산

#### 주파수 Domain
- **DFT** - Discrete Fourier Transform
- **DCT** - Discrete Cosine Transform
- **Wavelet** - Wavelet transform 분석

### Filter Chain System
- **Chain 생성**: 여러 filter를 sequence로 결합
- **스마트 라벨링**: filter chain을 순차적으로 표시 (예: "Gaussian Blur → Sharpen → Canny")
- **동적 라벨 관리**: 긴 filter chain의 자동 축약 및 툴팁 지원
- **라벨 토글**: filter 라벨 표시/숨기기 컨트롤로 깔끔한 UI 유지
- **Parameter 보존**: filter 구성 저장 및 로드
- **Preview System**: 전체 chain의 실시간 preview
- **Export/Import**: filter 구성 공유
- **Preset 관리**: filter preset 생성 및 관리

## 🎮 Interface 기능

### Layout System
- **Grid Layout Selector**: 대화형 그리드 선택기로 1×1부터 최대 24개 viewer 배치
- **유연한 Grid 구성**: 다양한 행/열 조합 (1×2, 2×2, 3×3, 4×6 등) 지원
- **Live Preview**: 레이아웃 선택 중 실시간 미리보기 오버레이
- **동적 Grid 확장**: 마우스 호버 시 그리드 선택 영역 자동 확장
- **Viewer 제한**: 최대 24개 viewer까지 지원 (성능 및 사용성 고려)
- **최적 배치**: 선택된 viewer 수에 따른 자동 행/열 계산

### Navigation 및 Viewport
- **동기화된 Zoom**: 모든 viewer가 함께 zoom (Compare/Analysis mode)
- **독립적 Scaling**: 개별 viewer scaling (Pinpoint mode)
- **정밀 제어**: 수동 좌표 및 scale 입력
- **Minimap**: position indicator가 있는 overview navigation
- **Grid Overlay**: 색상 옵션이 있는 사용자 정의 grid

### Visual Enhancement
- **Crosshair Overlay**: reference point visualization (Pinpoint mode)
- **이미지 정보 Panel**: 세부 파일 및 dimension 정보
- **Progress Indicator**: 로딩 및 processing feedback
- **Capture System**: 옵션이 있는 screenshot 기능
- **Toggle Modal**: 선택된 이미지들을 순환하여 비교

### 파일 관리
- **Multi-Format 지원**: JPEG, PNG, TIFF, WebP, GIF, BMP
- **Folder 조직**: 알파벳순 folder 할당 (A–Z)
- **검색 및 Filter**: 모든 folder에서 파일 빠르게 찾기
- **Batch 작업**: 여러 파일 동시 처리

#### 드래그 앤 드롭 상세
- **Single**: 이미지를 드롭하면 첫 빈 폴더에 임시 폴더 생성. 빈 폴더가 없으면 첫 이미지를 즉시 선택하여 표시.
- **Compare**: 이미지를 드롭하면 첫 빈 폴더에 임시 폴더 생성, 폴더 간 파일명으로 매칭하여 비교.
- **Pinpoint**: 이미지를 드롭하면 첫 빈 폴더에 임시 폴더 생성, 어느 뷰어에도 임의 이미지 로드 가능.
- **Analysis**: 이미지를 드롭하면 임시 폴더 생성 후 첫 이미지를 자동 로드(나머지는 리스트에서 선택 가능).

## ⌨️ Keyboard Shortcut

### Mode 전환 ✅
- **1** - Single Mode로 전환
- **2** - Compare Mode로 전환
- **3** - Pinpoint Mode로 전환  
- **4** - Analysis Mode로 전환

### Navigation ✅
- **화살표 키** - view pan (이미지 로드 시)
- **+/=** - zoom in
- **-** - zoom out
- **R** - view를 fit으로 reset
- **I** - 이미지 정보 panel toggle

### Pinpoint Mode 전용 ✅
- **+/=** - 개별 scale 증가 (viewer 활성 시)
- **-** - 개별 scale 감소 (viewer 활성 시)
- **Alt + Drag** - local rotation (개별 viewer에서)

### UI 컨트롤 🔄 *예정*
- **F** - 폴더 컨트롤 표시/숨기기
- **L** - 파일 리스트 표시/숨기기
- **Ctrl+L** - 필터 라벨 표시/숨기기
- **M** - 미니맵 표시/숨기기
- **G** - 그리드 오버레이 표시/숨기기

### 일반 🔄 *예정*
- **Space** - toggle modal 열기 (이미지 선택 시) *참고: 현재 버튼으로만 작동*
- **Escape** - modal 및 overlay 닫기
- **Ctrl+Shift+P** - 필터 미리보기 modal 열기
- **C** - 캡처 modal 열기

### Modal Navigation ✅
- **Escape** - 활성 modal 및 overlay 닫기 (개별 modal 컴포넌트에서 구현됨)

## 🔧 기술적 특징

### 성능 최적화
- **Bitmap Caching** - 로드된 이미지를 위한 지능적 caching system
- **Memory 관리** - 대용량 이미지 dataset의 효율적 처리
- **Lazy Loading** - 필요할 때만 이미지 로드
- **Throttled Update** - 부드러운 animation 및 interaction
- **Background Processing** - 비차단 이미지 작업

### Browser 호환성
- **최신 Browser 지원** - Chrome, Firefox, Safari, Edge
- **WebWorker 지원** - 무거운 processing 작업용
- **Canvas API** - 고성능 이미지 rendering
- **File API** - 업로드 없이 로컬 파일 접근
- **Clipboard API** - copy/paste 기능

### Architecture
- **React 18** - hook 및 concurrent 기능을 갖춘 최신 React
- **TypeScript** - 완전한 type safety 및 개발자 경험
- **Zustand** - 경량 state 관리
- **Vite** - 빠른 build tool 및 development server
- **OpenCV.js** - 고급 computer vision algorithm

### Library 및 Dependency
- **UTIF** - TIFF 이미지 decoding
- **OpenCV-TS** - Computer vision 작업
- **React** - UI framework
- **Zustand** - State 관리
- **Vite** - Build tool

## 🛠️ Development

### Project 구조
```
src/
├── components/          # UI component
│   ├── ImageCanvas.tsx     # 핵심 이미지 renderer
│   ├── FilterControls.tsx  # Filter system UI
│   ├── FolderControl.tsx   # 파일 browser
│   └── ...
├── modes/              # Application mode
│   ├── SingleMode.tsx      # 집중 단일 뷰
│   ├── CompareMode.tsx     # Multi-folder 비교
│   ├── PinpointMode.tsx    # Reference 기반 alignment
│   └── AnalysisMode.tsx    # Single 이미지 분석
├── utils/              # Utility 함수
│   ├── filters.ts          # Filter 구현
│   ├── opencv.ts           # OpenCV 통합
│   └── ...
├── hooks/              # 사용자 정의 React hook
├── store.ts           # Zustand state 관리
├── types.ts           # TypeScript 정의
└── App.tsx            # 메인 application component
```

### Development 명령어
```bash
npm run dev      # development server 시작
npm run build    # production build
npm run lint     # TypeScript로 type 검사
npm run preview  # production build preview
npm run deploy   # GitHub Pages에 deploy
```

### 기여 가이드라인
1. repository **Fork**
2. feature branch **생성** (`git checkout -b feature/amazing-feature`)
3. 변경사항 **Commit** (`git commit -m 'Add amazing feature'`)
4. branch에 **Push** (`git push origin feature/amazing-feature`)
5. Pull Request **열기**

### Code Style
- **TypeScript** - strict typing 활성화
- **ESLint** - code 품질 강제
- **Prettier** - code 형식화
- **Component 구조** - hook을 사용한 함수형 component
- **State 관리** - global state용 Zustand

## 🏗️ Architecture 심층 분석

### State 관리
애플리케이션은 경량의 효율적인 state 관리를 위해 Zustand를 사용합니다:
- **Viewport State** - zoom, pan, 좌표 추적
- **Mode State** - 현재 mode 및 mode별 설정
- **Filter State** - 적용된 filter 및 parameter
- **UI State** - modal visibility, 활성 component

### 이미지 Processing Pipeline
1. **파일 로딩** - 로컬 파일 접근을 위한 browser File API
2. **Format 감지** - 자동 format 감지 및 적절한 decoder
3. **Bitmap 생성** - 효율적인 rendering을 위해 ImageBitmap으로 변환
4. **Caching** - 중복 processing 방지를 위한 smart caching
5. **Filter 적용** - Canvas 기반 또는 OpenCV 기반 processing
6. **Rendering** - 고성능 Canvas rendering

### Filter System Architecture
- **모듈식 설계** - 각 filter는 별도의 테스트 가능한 모듈
- **Parameter System** - 유연한 parameter 정의 및 검증
- **Preview Pipeline** - 효율적인 실시간 preview 생성
- **Chain 관리** - 순차적 filter 적용 system
- **Export System** - filter 구성 저장/로드

## 📱 사용 시나리오

### 전문 Photography
- RAW processing 결과 비교
- exposure 차이 분석
- 여러 shot의 focus 정확도 확인
- 서로 다른 lens 특성 비교

### Quality Control
- 제품 이미지 비교
- 결함 감지 workflow
- batch processing 검증
- 일관성 분석

### 연구 및 분석
- 과학적 이미지 비교
- 의료 이미지 분석
- 현미경 이미지 processing
- 시계열 이미지 분석

### 교육용
- 이미지 processing 개념 교육
- filter 효과 시연
- 비교 분석 연습
- 기술적 photography 교육

## 🤝 기여하기

기여를 환영합니다! 자세한 내용은 [기여 가이드라인](CONTRIBUTING.md)을 참조하세요.

### 기여 유형
- **Bug Report** - 문제 식별 및 수정 도움
- **Feature 요청** - 새로운 기능 제안
- **Code 기여** - 개선사항 및 새 기능 제출
- **Documentation** - documentation 개선 도움
- **Testing** - 새 기능 테스트 및 문제 보고

### Development 설정
1. repository fork
2. fork를 로컬에 clone
3. `npm install`로 dependency 설치
4. `npm run dev`로 development server 시작
5. 변경사항을 만들고 철저히 테스트
6. pull request 제출

## 📄 License

이 project는 MIT License에 따라 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- **OpenCV.js** - Computer vision library
- **UTIF** - TIFF decoding library
- **React Community** - Framework 및 ecosystem
- **TypeScript Team** - Type safety 및 개발자 경험
- **Vite Team** - Build tool 및 개발 경험

----

## 🆕 최신 기능

### 최근 추가된 기능
- **스마트 필터 라벨**: 필터 체인의 동적 표시와 순차적 라벨링 (예: "Gaussian Blur → Sharpen → Canny")
- **필터 미리보기 시스템**: 적용하기 전 필터의 side-by-side 미리보기
- **향상된 그리드 레이아웃 시스템**: 라이브 미리보기와 동적 확장이 가능한 대화형 그리드 선택기
- **향상된 UI 토글 시스템**: 폴더, 파일, 필터 라벨의 독립적 제어
- **개선된 캡처 시스템**: 스크린샷에 표시될 요소의 세밀한 제어
- **필터 체인 관리**: 복잡한 필터 시퀀스 생성 및 관리를 위한 향상된 인터페이스

### 곧 출시 예정
- **추가 키보드 단축키**: UI 컨트롤을 위한 전체 키보드 접근성
- **필터 프리셋**: 자주 사용하는 필터 조합의 저장 및 공유
- **배치 처리**: 여러 이미지에 동일한 필터 체인 적용
- **향상된 내보내기**: 더 많은 이미지 형식 및 품질 옵션

## 📞 지원

- **Issue** - [GitHub Issues](https://github.com/MouseBall54/image_multi_view/issues)
- **Discussion** - [GitHub Discussions](https://github.com/MouseBall54/image_multi_view/discussions)
- **Wiki** - [Project Wiki](https://github.com/MouseBall54/image_multi_view/wiki)


*CompareX - 이미지 분석과 전문 workflow의 만남*
