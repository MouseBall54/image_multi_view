# Image Compare Viewer

로컬 Folder Image를 비교·분석하기 위한 Client-side Web Application입니다. React와 TypeScript로 작성되어 Browser 안에서만 동작하며 File이 Server로 전송되지 않습니다. 품질 검수, 학습 Data 확인 등 많은 Image를 빠르게 정렬하고 살펴봐야 하는 작업에 적합합니다.

## 목적
Image Compare Viewer는 연구자, Artist, QA Team이 대량의 Image를 빠르게 점검하도록 돕습니다. 서로 다른 Version의 Image가 정확히 정렬되는지 확인하거나 Algorithm 결과를 비교하고 학습용 Dataset을 검증해야 할 때 유용하며, 모든 File을 Server에 Upload하지 않고 Browser 안에서 처리합니다.

## 주요 기능
- **Privacy-friendly:** 모든 처리가 Local에서 이루어져 File이 외부로 Upload되지 않습니다.
- **Flexible Viewer:** 최대 아홉 개의 Folder를 Load하여 원하는 조합으로 나란히 비교합니다.
- **Flexible Layout System:** Auto Layout은 Viewer 수에 따라 Grid를 자동 구성하고 Free Layout에서는 Viewer를 자유롭게 이동하고 크기를 조절할 수 있습니다. Layout은 다음 접속 때도 유지됩니다.
- **Advanced Analysis Tools:** 다양한 Filter를 적용하고 현재 화면을 Capture할 수 있습니다.
- **Keyboard 중심 조작:** 여러 Shortcut으로 빠르게 탐색하고 Mode를 Switch합니다.
- **Synchronized Viewports:** 한 Viewer에서 Pan/Zoom하면 다른 Viewer도 동일하게 움직입니다.
- **Auto Fit on Resize:** Window 크기가 변하면 Image가 자동으로 Viewer에 맞춰집니다.
- **Flexible File Matching:** 전체 Filename 또는 확장자 무시 방식으로 Matching합니다.
- **Per-Viewer Filters:** 대비, Blur, Edge Detection, Texture, Noise Reduction Filter를 개별적으로 적용합니다.
- **Collapsible Folder List:** Folder Picker를 숨겨 작업 공간을 넓힐 수 있습니다.
- **Capture Tool:** 현재 Viewer 화면을 Image File이나 Clipboard로 내보내며, Minimap을 포함할 수 있습니다.
- **Minimap & Grid:** 선택적인 Minimap과 조절 가능한 Grid Overlay를 제공합니다.
- **Image Info Panel:** 활성 Image의 Filename, Dimensions, File Size를 표시합니다.

## Layout Modes

Viewer 영역은 두 가지 Layout 방식을 지원합니다.

- **Auto Layout**은 Viewer 수에 따라 균형 잡힌 Grid를 자동 구성합니다.
- **Free Layout**에서는 Panel 헤더를 Drag하여 아무 곳이나 배치하고 Edge Handle로 Grid 제약 없이 크기를 조절할 수 있습니다.

우측 상단의 Layout Controls로 Mode를 전환하거나 Reset할 수 있으며, 변경된 Layout은 Local Storage에 저장되어 다음 접속 시에도 유지됩니다.

## Mode 및 사용법
Application은 네 가지 작업 Mode를 제공합니다.

### Compare Mode
- 2–9개의 Folder Image를 Grid 형태로 동시에 표시합니다.
- Dataset 간 정렬이나 Model Output 비교에 적합합니다.
- 한 Image를 Pan/Zoom하면 다른 Viewer도 함께 이동합니다.
- Folder Alias를 변경하고 File Extension을 무시한 Matching이 가능합니다.

### Toggle Mode
- 한 번에 한 Folder만 표시하되 Viewport는 유지합니다.
- 차이점을 한눈에 확인하고 싶을 때 사용합니다.
- `Space` 키로 Load된 Folder를 순환합니다.

### Pinpoint Mode
- 원하는 Image를 원하는 Viewer에 Load해 기준점을 맞춥니다.
- 기하학적 차이나 특정 영역을 정밀 비교할 때 유용합니다.
- 각 Viewer는 독립적인 Scale과 Rotation을 가지며 전역 Scale을 공유합니다.
- Click으로 십자선을 설정하고 `Alt` + Drag로 활성 Image를 회전합니다.

### Analysis Mode
- 동일한 Image에 서로 다른 Filter를 적용하여 나란히 비교합니다.
- Filter, Rotation, Capture를 실험하며 한 장의 원본을 다양한 방식으로 살펴볼 수 있습니다.

## 적용 가능한 Filter
각 Viewer에 다음과 같은 Filter를 적용할 수 있습니다.

- Box Blur, Gaussian Blur
- Sharpen, Unsharp Mask, Highpass, Gabor
- Prewitt, Scharr, Sobel, Roberts Cross
- Laplacian, LoG, DoG, Marr–Hildreth, Canny
- Linear Contrast Stretch, Histogram Equalization, CLAHE, Gamma Correction
- Local/Adaptive Histogram Equalization
- Median, Weighted Median, Alpha-trimmed Mean
- Bilateral Filter, Non-local Means, Anisotropic Diffusion, Guided Filter
- LBP, Laws Texture Energy

## 시작하기
```bash
npm install
npm run dev
```

터미널에 출력되는 주소를 Browser에서 열고 **Mode** 드롭다운 또는 Shortcut(`1`: Compare, `2`: Toggle, `3`: Pinpoint,
`4`: Analysis)으로 Mode를 Switch합니다.

1. A, B 등 Folder를 선택해 Image를 Load합니다.
2. 왼쪽 목록에서 Filename을 선택합니다.
3. Mouse나 Shortcut으로 Pan·Zoom하며 Image를 분석합니다.
   - **Toggle** Mode에서는 `Space` 키로 Folder를 전환합니다.
   - **Pinpoint** Mode에서는 Click으로 기준점을 지정하고 `Alt` + Drag로 Rotation합니다.

## 단축키

| Key                         | Action                                       |
| --------------------------- | -------------------------------------------- |
| `1` / `2` / `3` / `4`       | Compare / Toggle / Pinpoint / Analysis Mode로 Switch |
| `Space` (Toggle Mode)      | Source Folder 순환                          |
| `=` 또는 `+` / `-`         | Zoom In / Zoom Out                          |
| 방향키                      | Image Pan (상·하·좌·우)                     |
| `R`                         | View Reset                                  |
| `I`                         | Image Info Panel Toggle                     |
| `Alt` + Drag (Pinpoint)    | 활성 Image Rotation                         |

## 기대 효과

- 여러 Image를 동시에 확인하여 품질 검수를 빠르게 진행할 수 있습니다.
- Dataset 정제와 Algorithm 비교 작업이 수월해집니다.
- 모든 처리가 Browser 안에서 이루어져 개인정보가 외부로 유출되지 않습니다.
- 다양한 Filter와 Capture 기능으로 세부적인 Image 분석이 가능합니다.

## 빌드
```bash
npm run build
```

`npm run deploy` 명령으로 GitHub Pages에 배포할 수 있습니다.

