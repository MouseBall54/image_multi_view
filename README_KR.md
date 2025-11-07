# compareX - 고급 이미지 비교 및 분석 도구

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://mouseball54.github.io/image_multi_view/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](#)
[![React](https://img.shields.io/badge/React-18-blue)](#)

**compareX**는 여러 이미지를 동시에 비교·분석·처리해야 하는 전문가를 위한 Electron 데스크톱 애플리케이션입니다. 세 가지 전문 viewing mode와 OpenCV 가속 필터를 제공하며, 모든 처리를 로컬에서 수행해 프라이버시를 보장합니다. 웹 데모도 제공되지만, 데스크톱 앱 사용이 기본 경험입니다.

## 💻 데스크톱 앱 (기본)

- 최신 패키지 앱을 설치하거나 로컬에서 빌드해 사용할 수 있습니다(아래 빌드 & 패키지 참고).
- 자동 업데이트(electron-updater) 지원.

## 🌐 선택적 웹 데모

브라우저 체험(데스크톱 대비 일부 기능 제한): **[https://mouseball54.github.io/image_multi_view/](https://mouseball54.github.io/image_multi_view/)**

## ✨ 주요 특징

### 🔒 Privacy 우선 설계
- **100% Client-Side Processing** - 파일 업로드 없음, 모든 처리가 로컬에서 진행
- **완전한 Privacy** - 이미지가 절대 기기를 벗어나지 않음
- **서버 불필요** - offline 기능을 갖춘 순수 web application

### 🎯 3가지 전문 Viewing Mode
1. **Compare Mode** - 지능적 파일 매칭을 통한 다중 폴더 side-by-side 비교
2. **Pinpoint Mode** - 참조점, 개별 스케일링, 회전 제어를 통한 정밀 정렬
3. **Analysis Mode** - 고급 필터 체인과 실시간 비교를 통한 단일 이미지 분석

### 🖼️ 고급 이미지 지원
- **표준 Format**: JPEG, PNG, WebP, GIF, BMP
- **TIFF 지원**: UTIF library를 이용한 완전한 TIFF decoding
- **대용량 이미지 처리**: 효율적인 bitmap caching 및 memory 관리
- **실시간 Processing**: 모든 작업의 즉각적인 preview

### 🎨 전문 Filter System
- **60+ 고급 Filter**: 기본 조정부터 복잡한 OpenCV 작업까지
- **Filter Chain**: 순차적 라벨링과 함께 사용자 정의 sequence에서 여러 filter 조합
- **실시간 Preview**: parameter 조정 시 즉각적인 변화 확인
- **Filter 미리보기 시스템**: 적용 전 side-by-side 비교로 미리보기
- **스마트 Filter 라벨**: 동적 filter chain 표시 (예: "Gaussian Blur → Sharpen → Canny")
- **Export 기능**: filter 설정 저장 및 여러 이미지에 적용

### ⚡ 고성능 Interface & 컨트롤
- **고급 Layout System**: 1×1부터 6×4까지 구성 가능한 대화형 그리드 선택기와 라이브 미리보기
- **동기화된 Navigation**: 정밀 좌표 입력과 함께 모든 viewer에서 pan, zoom, viewport 컨트롤
- **스마트 UI 컨트롤**: 폴더, 파일, 필터 라벨, 미니맵, 그리드 오버레이의 독립적 토글 제어
- **전문 캡처 System**: UI 요소의 세밀한 제어가 가능한 스크린샷 기능
- **광범위한 Keyboard Shortcut**: 전문적 효율성과 빠른 워크플로우를 위한 20+ 키보드 단축키
- **Responsive Design**: 터치 제스처 지원을 포함한 desktop 및 mobile 최적화

### 🎛️ 고급 제어 기능
- **Rect Zoom Tool**: 픽셀 정확도로 zoom 영역을 정의하는 두 점 클릭 기능
- **Global Scale 제어**: 모든 viewer에서 정밀한 스케일링을 위한 직접 백분율 입력
- **회전 제어**: 시각적 레벨링 도구(수평/수직 정렬)를 포함한 개별 및 글로벌 회전
- **재배열 Mode**: 시각적 피드백을 통한 이미지 재배열을 위한 Shift 및 Swap 모드
- **Minimap Navigation**: 클릭으로 이동 기능과 사용자 정의 가능한 위치 및 크기
- **Grid Overlay**: 다중 색상 옵션(흰색, 빨강, 노랑, 파랑)으로 색상 사용자 정의 가능한 그리드

## 🔄 최근 하이라이트 (요약)

- Pinpoint 재정렬 개선: 뷰어 슬롯(A, B, C, …)은 고정되고, 드래그로 이미지 할당만 이동합니다. 이미지 기준 이동으로 개별 줌/회전/필터가 함께 따라갑니다.
- Shift vs Swap 모드: 드래그 재배열 방식을 선택할 수 있습니다. 헤더 토글(미니맵/그리드처럼 파란 강조)로 활성 상태가 표시됩니다.
- 수평/수직 레벨링: 버튼 클릭 → 파란 십자선이 마우스를 따라 이동 → 두 점 클릭 → 기울기를 계산해 자동 정렬. Pinpoint는 뷰어별, Compare/Analysis는 글로벌 회전으로 적용됩니다.
- Pinpoint 글로벌 스케일 입력: 헤더에서 %를 직접 입력해 조정(화살표 제거, 컴팩트 UI, 안전 클램프 적용).
- 레이아웃 폴리시: 캔버스가 항상 셀 전체를 채우도록 정리했으며, 불필요한 hover 힌트를 제거해 스크롤바/미세 사이즈 흔들림을 해소했습니다.


## 🆕 최신 기능

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

### 빠른 시작 (데스크톱)
1. compareX 데스크톱 앱을 설치하거나 로컬에서 빌드합니다.
2. 앱을 실행하고 viewing mode를 선택합니다(Compare/Pinpoint/Analysis).
3. 폴더를 로드하거나, 파일리스트/특정 뷰어로 이미지를 드래그 앤 드롭합니다(Pinpoint는 뷰어 직접 드롭 지원).
4. 비교 및 분석을 시작합니다.

### Local Development
```bash
# repository clone
git clone https://github.com/MouseBall54/image_multi_view.git

# project directory로 이동
cd image_multi_view

# dependency 설치
npm install

# development server 시작 (개발 채널)
npm run dev

# (선택) 배포 환경 변수로 server 시작
npm run dev:prod

# production build
npm run build

# GitHub Pages에 deploy
npm run deploy
```

## 🎛️ Viewing Mode

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

- **고정 슬롯, 이미지 재배열**: 뷰어 슬롯(A, B, C, …)은 고정되며, Shift+드래그로 이미지 할당만 이동합니다.
- **재배열 모드**: Shift(밀려남) / Swap(교환) 모드를 헤더 토글로 전환(활성 파란 강조).
- **이미지 기준 이동**: 재배열 시 해당 이미지의 개별 줌/회전/필터 설정이 함께 이동합니다.
- **Reference Point System**: 서로 다른 이미지 간 공통 reference point 설정.
- **개별 Scaling**: viewer별 scale + 글로벌 스케일(헤더 % 입력식) 조합.
- **이중 Rotation 지원**: 뷰어 로컬 회전 + 글로벌 회전 제어.
- **레벨링 도구**: 수평/수직 두 점 클릭 정렬(파란 십자선 추적 → 두 점 클릭 → 각도 산출/적용, 뷰어별 적용).
- **유연한 이미지 로딩**: 임의 폴더/이미지를 임의 뷰어로 로드.
- **Mouse Mode Toggle**: Pin(참조점) / Pan(이동) 전환.

#### 주요 기능:
- 정확한 alignment를 위한 정밀 좌표 시스템
- reference point visualization을 위한 crosshair overlay
- viewer별 독립적 scaling
- 이미지 전환 중 rotation 보존
- 고급 측정 기능

### 3. Analysis Mode 🔬
**적합한 용도: Filter 비교, single 이미지 분석, processing workflow**

- **단일 이미지 집중**: 하나의 source 이미지에 여러 filter 적용
- **Side-by-Side Filter 비교**: 서로 다른 filter 효과 동시 확인
- **실시간 Parameter 조정**: 즉각적인 filter parameter 업데이트
- **Global Rotation 제어**: 일관된 방향 유지
- **레벨링 도구**: 수평/수직 두 점 정렬(글로벌 회전에 적용)
- **Filter Chain 관리**: 복잡한 filter sequence 생성 및 저장
 - **일관된 그리드 뷰**: 다른 모드와 동일하게 시작 시 뷰어 그리드를 렌더링합니다(이미지 선택 전에도 표시).

#### 주요 기능:
- 40가지 이상의 전문 grade filter
- Filter parameter 미세 조정
- 실시간 preview 업데이트
- Filter chain 생성 및 관리
- 처리된 결과 export

## 🔍 Filter 미리보기 시스템

### 고급 미리보기 기능
compareX는 filter를 적용하기 전에 효과를 확인할 수 있는 포괄적인 filter 미리보기 시스템을 제공합니다:

- **Side-by-Side 비교**: 원본과 필터 적용된 이미지를 동시에 미리보기
- **실시간 Parameter 조정**: filter parameter를 수정하면서 즉시 변화 확인
- **Filter Chain 미리보기**: 전체 filter chain 적용 전 미리보기
- **내장 에디터(Embedded Editor)**: 미리보기 패널에 실제 필터 에디터(타입 선택 + 컴팩트 파라미터)를 삽입. 변경 즉시 미리보기와 체인 스텝에 반영.
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
+- **Invert** - 색상 반전
+- **Sepia** - sepia tone 효과
+- **Brightness** - 밝기(−100..100)
+- **Contrast** - 대비(0..200%)

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

#### Colormap 필터
- 과학적 시각화와 변화 강조를 위한 지각적 균일/레거시/미적/발산형 컬러맵 제공
- 원본 휘도와 혼합 비율(강도) 조절 가능, 실시간 프리뷰 지원
- Compare/Analysis 모드 모두에서 동작

- 지각적 균일(권장): `Viridis`, `Inferno`, `Plasma`, `Magma`, `Parula`
- 레거시/레인보우: `Jet`, `HSV`, `Hot`
- 미적 그라디언트: `Cool`, `Warm`, `Spring`, `Summer`, `Autumn`, `Winter`
- 특수: `Bone`, `Copper`, `Pink`
- 발산형(변화 기반): `RdBu`, `RdYlBu`, `BWR`, `Seismic`, `CoolWarm`, `Spectral`
- 그라디언트 기반 오버레이: `Gradient Magnitude`, `Edge Intensity`, `Difference`

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
- **통합 TEMP 동작(모든 모드)**: 파일리스트 영역에 드롭하면 기본적으로 `TEMP` 폴더에 추가됩니다. 같은 파일명이 이미 있으면 `TEMP_2`, `TEMP_3` … 순으로 분산합니다(파일명 충돌 시에만).
- **Analysis**: 위와 동일하며, 첫 번째 드롭 이미지는 자동으로 분석 대상으로 선택됩니다.
- **Pinpoint (바탕화면 → 특정 뷰어)**: OS에서 특정 뷰어로 직접 드롭할 수 있습니다. 해당 뷰어에 즉시 표시되고, 해당 뷰어 폴더에도 추가됩니다(필요 시 `Temp <슬롯>` 생성).
- **Compare/Pinpoint (파일리스트 → 특정 뷰어)**: 앱 내부 파일리스트에서 끌어 특정 뷰어에 드롭하면 그 뷰어로 로드됩니다.

## ⌨️ Keyboard Shortcut

### Mode 전환
- **1** - Pinpoint Mode로 전환
- **2** - Analysis Mode로 전환
- **3** - Compare Mode로 전환
> 참고: modal/overlay가 활성화된 상태에서는 mode 전환이 비활성화됩니다

### Navigation & Viewport
- **Shift + 화살표 키** - 모든 방향으로 view pan (이미지 로드 시)
- **+/=** - zoom in (Compare/Analysis mode에서 글로벌 zoom)
- **-** - zoom out (Compare/Analysis mode에서 글로벌 zoom)
- **R** - 이미지에 맞춰 view reset
- **마우스 휠** - zoom in/out (커서 중심 zoom)
- **왼쪽 클릭 + 드래그** - 이미지 주변 pan

### Pinpoint Mode 전용
- **+/=** - 개별 viewer scale 증가 (특정 viewer 활성 시)
- **-** - 개별 viewer scale 감소 (특정 viewer 활성 시)
- **Alt + 드래그** - 개별 viewer에 로컬 rotation 적용
- **Shift + 드래그** - viewer 간 이미지 재배열 (재배열 모드에 따라: Shift/Swap)

### UI 컨트롤 & 가시성
- **F** - 폴더 컨트롤 표시/숨기기 (폴더 선택 panel 표시/숨기기)
- **L** - 파일 리스트 표시/숨기기 (파일 브라우저 표시/숨기기)
- **Ctrl+L** - 필터 라벨 표시/숨기기 (이미지의 필터 체인 이름 표시/숨기기)
- **M** - 미니맵 표시/숨기기 (overview navigator)
- **G** - 그리드 오버레이 표시/숨기기 (사용자 정의 색상)
- **I** - 이미지 정보 panel 토글 (파일 세부사항, 치수, 메타데이터)

### 고급 작업
- **C** - 캡처 modal 열기 (사용자 정의 옵션이 있는 스크린샷)
- **Ctrl+Shift+P** - 필터 미리보기 modal 열기 (side-by-side 필터 비교)
- **Space** - 토글 modal 열기 (선택된 이미지의 세부 비교를 위한 순환)
- **Escape** - 모든 modal 및 overlay를 위한 범용 닫기

### Filter System 단축키
- **드래그 & 드롭** - 필터 체인에서 필터 재정렬
- **더블 클릭** - 필터 parameter 편집
- **Delete 키** - 체인에서 선택된 필터 제거 (필터에 초점이 있을 때)

### Layout & Grid 컨트롤
- **그리드 선택기 클릭** - viewer layout 선택 (1×1부터 6×4 구성까지)
- **그리드 가장자리 드래그** - 그리드 크기 동적 조정
- **그리드 호버** - 선택 전 layout 미리보기

## 🔧 기술적 특징 & 시스템 요구사항

### 시스템 요구사항

#### 최소 요구사항
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 4GB 시스템 메모리 (browser가 사용 가능한 2GB)
- **Storage**: 캐시된 이미지용 100MB 여유 공간
- **CPU**: 듀얼코어 processor (2.0 GHz+)
- **GPU**: hardware acceleration 지원 (WebGL 호환)

#### 권장 사양
- **Browser**: 최신 stable version의 modern browser
- **RAM**: 8GB+ 시스템 메모리 (browser가 사용 가능한 4GB+)
- **Storage**: 대용량 이미지 workflow용 1GB+ 여유 공간
- **CPU**: 쿼드코어 processor (3.0 GHz+)
- **GPU**: WebGL 2.0 지원 전용 graphics card
- **Display**: 1920×1080 이상 해상도

#### 지원 이미지 Format
- **표준 Format**: JPEG, PNG, WebP, GIF, BMP
- **고급 Format**: TIFF (8/16/32-bit), Multi-page TIFF
- **최대 이미지 크기**: 이미지당 50MP (8000×6250 pixels)
- **메모리 제한**: 로드된 모든 이미지에 대해 총 2GB

### 성능 최적화

#### 핵심 성능 기능
- **지능적 Bitmap Caching** - 자동 메모리 관리와 LRU cache
- **점진적 Loading** - priority 기반 queue와 lazy loading
- **효율적 Memory 관리** - 자동 garbage collection 및 cleanup
- **Hardware Acceleration** - 사용 가능 시 WebGL 기반 rendering
- **Background Processing** - 비차단 작업을 위한 Web Workers
- **Throttled Update** - 60fps 부드러운 animation 및 interaction

#### 고급 최적화
- **Image Pyramid Caching** - 대용량 이미지를 위한 다해상도 tiles
- **Viewport Culling** - 보이는 이미지 영역만 rendering
- **Canvas Pool 관리** - GC pressure 감소를 위한 canvas 요소 재사용
- **Filter Pipeline 최적화** - 중간 결과 caching
- **Batch Processing** - 더 나은 성능을 위한 그룹 작업

### Browser 호환성 & APIs

#### 핵심 Web 기술
- **Canvas API** - 2D rendering 및 이미지 조작
- **WebGL** - hardware 가속 graphics (사용 가능 시)
- **File API** - 업로드 없이 로컬 파일 접근
- **Clipboard API** - 시스템 clipboard에 이미지 copy/paste
- **Drag & Drop API** - 직관적 파일 loading interface

#### 고급 Browser 기능
- **Web Workers** - background thread의 무거운 processing
- **Shared Array Buffer** - 효율적 메모리 공유 (지원 시)
- **Offscreen Canvas** - background rendering 최적화
- **Image Bitmap API** - 효율적 이미지 decoding
- **Pointer Events** - 향상된 터치 및 마우스 interaction

#### Browser별 최적화
- **Chrome**: 완전한 WebGL 2.0, SharedArrayBuffer, OffscreenCanvas
- **Firefox**: WebGL 1.0/2.0, Web Workers, 효율적 TIFF decoding
- **Safari**: hardware acceleration, Core Image 통합
- **Edge**: Chromium 기반 최적화, Windows 통합

### Architecture & 기술 Stack

#### Frontend Framework
- **React 18** - concurrent 기능과 Suspense를 갖춘 최신 React
- **TypeScript 5.2+** - 완전한 type safety 및 향상된 개발자 경험
- **Vite 5.0** - 초고속 build tool 및 hot module replacement
- **Modern ESM** - 최적 bundling을 위한 네이티브 ES modules

#### State 관리 & Data Flow
- **Zustand 4.5** - 경량, 고성능 state 관리
- **Immer 통합** - 예측 가능성을 위한 불변 state update
- **영구 State** - 사용자 기본 설정을 위한 local storage 통합
- **실시간 동기화** - 크로스 컴포넌트 state 동기화

#### 이미지 Processing Pipeline
- **OpenCV.js 4.8** - 고급 computer vision algorithm
- **UTIF 3.1** - multi-page 지원을 포함한 포괄적 TIFF decoding
- **Canvas API** - 직접 pixel 조작 및 rendering
- **WebAssembly** - 고성능 processing module

#### Development & Build Tools
- **TypeScript Compiler** - strict type checking 및 고급 언어 기능
- **Vite Plugin System** - React refresh, TypeScript 통합
- **ESLint Configuration** - 코드 품질 및 일관성
- **Modern Bundling** - Tree shaking, code splitting, dynamic imports

### Desktop Application 기능 (Electron)

#### 네이티브 통합
- **크로스 플랫폼 지원** - Windows, macOS, Linux
- **네이티브 파일 대화상자** - OS 통합 파일 선택
- **창 관리** - 크기 조정 가능, 최소화 가능한 애플리케이션 창
- **메뉴 통합** - 네이티브 애플리케이션 메뉴 및 단축키

#### Electron 사양
- **Electron Version**: 37.3.1+
- **Node.js 통합**: 보안을 위해 비활성화
- **Context Isolation**: sandboxing을 위해 활성화
- **최소 창 크기**: 800×600 pixels
- **기본 창 크기**: 1200×800 pixels

#### 보안 기능
- **Content Security Policy** - XSS 보호를 위한 strict CSP
- **Sandboxed Renderer** - 격리된 실행 환경
- **보안 파일 접근** - Node.js 노출 없이 로컬 파일 시스템 접근
- **원격 코드 실행 없음** - 모든 코드는 빌드 시 번들됨

### Library 및 Dependency

#### 핵심 Dependency
- **react**: ^18.2.0 - UI framework 및 컴포넌트 시스템
- **react-dom**: ^18.2.0 - React 컴포넌트를 위한 DOM rendering
- **zustand**: ^4.5.2 - State 관리 및 data flow
- **opencv-ts**: ^1.3.6 - OpenCV.js를 위한 TypeScript 바인딩
- **utif**: ^3.1.0 - TIFF 이미지 format decoding library
- **tiff**: ^7.1.0 - 추가 TIFF processing utilities

#### Development Dependency
- **typescript**: ^5.2.2 - Type checking 및 compilation
- **vite**: ^5.2.0 - Build tool 및 development server
- **electron**: ^37.3.1 - Desktop application framework
- **electron-builder**: ^26.0.12 - Application packaging 및 distribution

### Electron 앱 & 자동 업데이트
- **자동 업데이트 (electron-updater)**: Generic provider 기반 업데이트 확인/다운로드/설치 지원
- **릴리즈 노트 자동화**: `build/build-and-deploy.cjs`가 마지막 PR 머지 이후 커밋을 분석하여 `latest.yml`에 릴리즈 노트를 자동 생성합니다((Add)/(Mod)/(Fix)/(Del) 분류).

#### 빌드 & 패키지
```bash
# 웹 개발
npm run dev

# Electron 패키징 (데스크톱 개발 빌드)
npm run electron:pack:dev

# Electron 패키징 (데스크톱 배포 빌드)
npm run electron:pack:prod

# Windows 설치 관리자
npm run electron:pack:win

# 전체 배포(퍼블리시 설정 시)
npm run electron:dist

# 업데이트 산출물 + latest.yml 생성(배포)
npm run build:deploy:prod

# 업데이트 산출물 + latest.yml 생성(개발 채널)
npm run build:deploy:dev
```

> `build:deploy`는 기본적으로 `prod` 모드로 실행되며 산출물은 `updates/<mode>` 폴더에 구분 저장됩니다. 별도의 단축 스크립트(`build:deploy:prod`, `build:deploy:dev`)도 제공합니다.
> `npm run electron:pack:dev` 및 `npm run build:deploy:dev`로 생성한 데스크톱 개발 채널 빌드는 개발자 메뉴가 그대로 노출되며, 실제 업데이트 동작은 Electron 환경에서만 가능하도록 유지됩니다.

#### 업데이트 플로우
- 데스크톱 개발 빌드에서만 “Check for Updates” 버튼이 노출되며, 배포 빌드는 설치 프로그램 업데이트 흐름에 의존합니다.
- 배포 설치본은 실행 시와 4시간 간격으로 자동으로 업데이트를 확인하며, 새 버전이 있으면 모달로 안내합니다.
- 업데이트 오류는 팝업 대신 토스트로 표시되어 작업을 방해하지 않습니다.
- 사용 가능 시 다이얼로그에서 다운로드 → “Install and Restart Now”로 적용
- 최신 변경사항은 `latest.yml` 기반으로 표시(서버 URL 일치 확인 필요)

#### 선택적 Dependency
- **sharp**: ^0.34.3 - 이미지 processing (build-time 최적화)
- **svg2img**: ^1.0.0 - SVG to raster 변환 (development)

### 성능 벤치마크

#### 일반적 성능 Metrics
- **이미지 Loading**: 10MP JPEG 이미지에 대해 <500ms
- **Filter 적용**: 기본 filter에 <100ms, 복잡한 OpenCV 작업에 <1s
- **UI 반응성**: 60fps interaction, <16ms frame times
- **메모리 사용량**: ~50MB baseline, 로드된 이미지당 +5-10MB
- **시작 시간**: web application <2s, Electron application <5s

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
│   ├── CompareMode.tsx     # Multi-folder 비교
│   ├── PinpointMode.tsx    # Reference 기반 alignment
│   └── AnalysisMode.tsx    # 단일 이미지 분석
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
npm run dev       # 개발 채널 서버 시작
npm run dev:prod  # 배포 환경 변수를 사용한 서버 시작
npm run build    # production build
npm run lint     # TypeScript로 type 검사
npm run preview  # production build preview
npm run deploy   # GitHub Pages에 deploy
```

### 프로젝트 구조
```
src/
├── components/             # UI 컴포넌트
│   ├── ImageCanvas.tsx         # 핵심 이미지 렌더러
│   ├── FilterControls.tsx      # 필터 UI
│   ├── FilterPreviewModal.tsx  # 미리보기(모달/사이드바)
│   ├── FilterCart.tsx          # 필터 체인/프리셋/임포트/익스포트
│   ├── LayoutGridSelector.tsx  # 그리드 레이아웃 선택기
│   ├── FolderControl.tsx       # 폴더 선택
│   ├── Toast*.tsx              # 토스트 알림
│   └── ...
├── modes/                 # 모드
│   ├── CompareMode.tsx
│   ├── PinpointMode.tsx
│   └── AnalysisMode.tsx
├── utils/                 # 유틸리티
│   ├── filters.ts             # 필터 구현
│   ├── filterChain.ts         # 연속 체인 처리기
│   ├── filterChainLabel.ts    # 체인 라벨링
│   ├── opencv.ts              # OpenCV 연동
│   └── utif.ts                # TIFF 디코딩 헬퍼
├── hooks/                 # 커스텀 훅
├── store.ts               # Zustand 스토어
├── types.ts               # 공용 타입
└── App.tsx                # 메인 앱 컴포넌트
```

### 기여 가이드라인
1. repository **Fork**
2. feature branch **생성** (`git checkout -b feature/amazing-feature`)
3. 변경사항 **Commit** (`git commit -m 'Add amazing feature'`)
4. branch에 **Push** (`git push origin feature/amazing-feature`)
5. Pull Request **열기**

### Code Style
- **TypeScript** - strict 모드 (tsc로 타입 체크)
- **ESLint/Prettier 없음** - 일관된 스타일 유지, `npm run lint` 통과 기준
- **컴포넌트** - 함수형 컴포넌트 + 훅
- **상태** - Zustand 중앙 집중 관리

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
4. `npm run dev`(또는 배포 환경을 모사하려면 `npm run dev:prod`)로 development server 시작
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
- **Colormap 필터 추가**: Viridis/Inferno/Plasma/Magma/Parula (지각적 균일), Jet/HSV/Hot (레거시),
  Cool/Warm/Spring/Summer/Autumn/Winter (미적 그라디언트), Bone/Copper/Pink (특수),
  RdBu/RdYlBu/BWR/Seismic/CoolWarm/Spectral (발산형), Gradient Magnitude/Edge Intensity/Difference (그라디언트 기반)
- **필터 수 확장**: 60+ 필터로 확대, 강도(혼합) 조절 및 실시간 프리뷰 지원
- **스마트 필터 라벨**: 필터 체인의 동적 표시와 순차적 라벨링 (예: "Gaussian Blur → Sharpen → Canny")
- **필터 미리보기 시스템**: 적용하기 전 필터의 side-by-side 미리보기
- **향상된 그리드 레이아웃 시스템**: 라이브 미리보기와 동적 확장이 가능한 대화형 그리드 선택기
- **향상된 UI 토글 시스템**: 폴더, 파일, 필터 라벨의 독립적 제어
- **개선된 캡처 시스템**: 스크린샷에 표시될 요소의 세밀한 제어
- **필터 체인 관리**: 복잡한 필터 시퀀스 생성 및 관리를 위한 향상된 인터페이스

#### 워크플로우 & UX
- 단축키 최신화: 1 → Pinpoint, 2 → Analysis, 3 → Compare (모달/오버레이 활성 시 전환 차단)
- 이동: Shift + 화살표 (팬), +/− (줌), R (Fit)
- 미리보기/에디터: 체인 스텝 편집 시 해당 스텝까지 실시간 미리보기

#### Filter Cart
- JSON 다중 임포트: 드래그&드롭으로 여러 체인 파일을 가져오기(상세 토스트 요약)
- 현재 카트 Export, 프리셋 관리 통합

#### 안정성 & 호환성
- 필터 체인 캐시를 Canvas 기반으로 재구성 (detached ImageBitmap drawImage 오류 방지)
- OpenCV 감마 보정: `cv.LUT` 대신 `cv.pow` 기반으로 수정
- UTIF 타이핑 추가; TIFF 미리보기 파이프라인 안정화

#### 개발 경험
- TypeScript strict 오류 전반 해결; 뷰어 배치/프리셋/카트 로직 타입 안정성 강화

### 곧 출시 예정
- **추가 키보드 단축키**: UI 컨트롤을 위한 전체 키보드 접근성
- **배치 처리**: 여러 이미지에 동일한 필터 체인 적용
- **향상된 내보내기**: 더 많은 이미지 형식 및 품질 옵션

## 📞 지원

- **Issue** - [GitHub Issues](https://github.com/MouseBall54/image_multi_view/issues)
-compareXssion** - [GitHub Discussions](https://github.com/MouseBall54/image_multi_view/discussions)
- **Wiki** - [Project Wiki](https://github.com/MouseBall54/image_multi_view/wiki)


*CompareX - 이미지 분석과 전문 workflow의 만남*
