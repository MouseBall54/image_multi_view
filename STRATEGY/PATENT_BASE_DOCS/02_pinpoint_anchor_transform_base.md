# 02. Pinpoint 참조점 고정 기반 회전/배율 정합 변환 (바탕 문서)

> 고지: 본 문서는 기술/전략 참고자료이며 법률 자문이 아닙니다.  
> 기준 문서: [PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md](../PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md)

## 문서 목적
Pinpoint 모드의 핵심 기술인 "참조점 고정 정합 변환"을 특허 작성 전 단계에서 설명 가능한 형태로 정리한다.  
특히 다음 3가지를 명확히 한다.
1. 왜 기존 정렬 방식으로는 오차가 누적되는지
2. compareX가 어떤 수식으로 위치를 맞추는지
3. 사용자가 어떤 절차로 기능 효과를 확인할 수 있는지

## 핵심 기술 한눈에 보기
1. 창별 `refPoint`를 고정하고 공통 `refScreenX/refScreenY`를 이동시키는 정합 모델
2. 정방향 배치식 + 역변환 클릭해석을 같은 파라미터로 연결한 폐루프 구조
3. `Layout -> slot 배치 -> 핀 지정 -> 개별/전역 조정 -> 동시 Pan`의 사용자 주도 정밀 정렬 파이프라인

## Pinpoint 모드란? (프로젝트 기준)
Pinpoint 모드는 compareX의 세 가지 모드(Compare/Pinpoint/Analysis) 중, **동일 관심 지점을 기준으로 다중 이미지를 정밀 정렬**하는 전용 모드다.
1. Compare 모드가 "많은 이미지를 빠르게 훑는 모드"라면, Pinpoint는 "적은 이미지라도 위치를 맞춰 깊게 비교하는 모드"다.
2. Analysis 모드가 "필터 결과 비교"에 초점을 맞춘다면, Pinpoint는 "기하 정합(위치/각도/배율 정렬)"에 초점을 맞춘다.
3. Pinpoint는 상단 툴바에서 `Layout(rows x cols)`을 선택하고, 선택한 레이아웃의 slot 단위로 이미지를 배치해 비교한다.
4. 이후 `Mouse(Pin/Pan)`, 전역 배율/회전, 뷰어별 개별 배율/회전/레벨링을 결합해 창별 핀 기준 정렬과 동기 탐색을 수행한다.
5. 이 모드는 자동 정합이 아니라, 사용자가 기준점을 지정하고 조정해 결과를 수렴시키는 사용자 주도 정밀 정렬 방식이다.

언제 이 모드를 선택하면 좋은가:
1. 같은 제품/샘플의 동일 부위를 여러 장에서 정밀 비교할 때
2. 확대/회전을 반복하면서도 기준점을 잃지 않아야 할 때
3. 클릭 좌표를 원본 기준으로 안정적으로 기록해야 할 때

## Pinpoint 모드 구성요소 한눈에 보기
| 구성요소 | 사용자 조작 | 내부 동작 | 얻는 효과 |
| --- | --- | --- | --- |
| Mouse: Pin/Pan | 툴바에서 `Pin` 또는 `Pan` 선택 | Pin이면 기준점 입력, Pan이면 화면 기준점 이동 | 작업 단계(지정 vs 탐색) 전환이 명확해짐 |
| 참조점 설정 | 캔버스 클릭으로 기준점 지정 | `refPoint`(이미지 좌표) + `refScreenX/refScreenY`(화면 기준점) 동시 갱신 | 확대/회전 후에도 같은 관심 지점 유지 |
| 개별 배율/전역 배율 | 뷰어별 배율 입력 + 글로벌 배율 입력 | `individualScale * globalScale`로 총 배율 계산 | 로컬 미세 조정과 전체 동기 조정을 분리 가능 |
| 개별 회전/전역 회전 | 뷰어별 각도 + 글로벌 각도 제어 | 로컬/글로벌 회전 합산 후 렌더링 변환 적용 | 이미지별 보정과 전체 방향 보정을 함께 수행 |
| 수평/수직 레벨링 | 2점 캡처 버튼으로 축 정렬 | 선택 축 기준 각도 산출 후 회전값 갱신 | 수동 회전 반복을 줄이고 정렬 속도 향상 |
| Shift/Swap 재배치 | 드래그 재배치 모드 선택 | 슬롯 고정 상태에서 이미지/변환 상태를 시프트 또는 스왑 | 배치를 바꿔도 정렬 맥락 유지 |
| Rect-zoom(뷰어별) | 특정 뷰어에서 사각형 영역 드래그 | 선택 영역 기준으로 뷰포트/배율 재계산 | 관심 구간으로 빠르게 확대 진입 |

## 기능 정의
### 1) 이 기술이 해결하는 문제
일반 이미지 비교에서는 확대/회전을 조절할 때 관심 지점(결함, 마커, 경계)이 쉽게 화면에서 밀려난다.  
그래서 사용자는 팬과 줌을 반복 보정해야 하고, 반복할수록 미세 오차가 누적된다.

### 2) 핵심 좌표 모델
핵심은 "이미지 기준점"과 "화면 기준점"을 분리해 관리하는 것이다.
1. `refPoint`: 뷰어별 이미지 안에서 고정할 기준 점
2. `refScreenX/refScreenY`: 화면에서 기준점이 보일 공통 위치
3. `total scale`: 개별 확대(`individualScale`) x 전체 확대(`globalScale`)

### 3) 폐루프 정합 구조(정방향 + 역변환)
1. 정방향 변환으로 `drawX/drawY`를 계산해 기준점을 목표 화면 위치에 배치한다.
2. 확대/회전이 바뀌어도 같은 기준점이 같은 화면 위치를 유지하도록 재계산한다.
3. 화면 클릭 좌표는 역변환(`screenToImage`)으로 원본 이미지 좌표로 복원한다.
4. 복원 좌표를 다시 핀/줌 제어에 활용해 다음 조작에서도 정렬 일관성을 유지한다.
5. 핀은 기준점 고정 역할이며, 배율/회전 정합은 개별 제어와 전역 제어를 결합해 수행한다.

### 4) 사용자가 얻는 기술 효과
1. 확대/회전 중에도 관심 지점을 붙잡고 비교할 수 있어 재정렬 횟수가 줄어든다.
2. 반복 조작에서 기준점 드리프트가 감소해 오차가 작아진다.
3. 다중 이미지 비교 시 동일 위치 기준 확인이 쉬워져 판단 신뢰도가 높아진다.

### 5) 처음 보는 사용자 요약
한 줄 요약:
기준점을 한 번 잡으면, 확대/회전을 바꿔도 그 점을 화면에서 계속 고정해 보여주는 기능이다.

## Pinpoint 작업 흐름 (현재 구현 기준)
1. 레이아웃 선택: 상단 Layout에서 rows x cols를 고른다.  
사용자 체감 효과: 비교 대상 수에 맞게 화면 밀도를 즉시 바꿀 수 있다.
2. 슬롯별 이미지 배치: 파일리스트 드래그/드롭 또는 자동 배치로 각 slot에 이미지를 넣는다.  
사용자 체감 효과: 같은 장면의 다른 샘플을 원하는 창 순서대로 빠르게 구성한다.
3. 뷰어별 refPoint 지정: `Mouse=Pin`에서 각 창의 기준점을 찍는다.  
사용자 체감 효과: 창마다 관심 부위(결함/마커)를 기준으로 고정할 수 있다.
4. 배율/회전 정합: `개별 + 전역` 배율/회전, 필요 시 수평/수직 레벨링으로 정렬을 맞춘다.  
사용자 체감 효과: 전체 방향을 맞추면서 특정 창만 미세 조정할 수 있다.
5. 동시 Pan 탐색: `Mouse=Pan`에서 드래그하면 공통 화면 기준점이 이동한다.  
사용자 체감 효과: 모든 창이 동시에 같은 방향으로 이동해 재팬 반복이 줄어든다.
6. 배치 보정: 필요 시 Shift/Swap 재배치 후 기준점 유지 여부를 확인한다.  
사용자 체감 효과: 화면 배치를 바꿔도 정렬 맥락을 유지한 채 비교 집중도를 높일 수 있다.

## 동기화 범위 매트릭스
요약:
1. 위치 동기화는 공통 `refScreenX/refScreenY`를 공유하는 방식으로 처리된다.
2. 배율/회전 정합은 `개별 + 전역` 혼합 제어로 수행된다.
3. 핀(`refPoint`)은 뷰어별로 독립 저장되어 창별 정밀 정렬 기준을 유지한다.

| 항목 | 동기화 단위 | 제어 방식 | 현재 구현 | 비고 |
| --- | --- | --- | --- | --- |
| 위치(화면 기준점) | 공통(shared) | `viewport.refScreenX/refScreenY` | 구현됨 | Pan 시 모든 뷰어가 같은 기준점 이동을 공유 |
| 배율 | 개별 + 전역 혼합 | `pinpointScales[key]` + `pinpointGlobalScale` | 구현됨 | `totalScale = individualScale * globalScale` |
| 회전 | 개별 + 전역 혼합 | `pinpointRotations[key]` + `pinpointGlobalRotation` | 구현됨 | 레벨링으로 개별/전역 회전 보정 가능 |
| 핀 좌표(`refPoint`) | 뷰어별 독립 | `pinpointImages[key].refPoint` | 구현됨 | 창마다 기준점이 별도로 저장됨 |
| 팬(Pan) | 공통(shared) | `setViewport({ refScreenX, refScreenY })` | 구현됨 | 동시 Pan 이동의 핵심 메커니즘 |

## 적용 수식(구현 기준)
정방향 변환(이미지 -> 화면):
핵심기술 연결:
참조점(`refPoint`)이 목표 화면 좌표(`refScreenX/refScreenY`)에 고정되도록 이미지 배치 좌표를 계산한다.

```text
scale = individualScale * globalScale
theta = (totalAngleDeg * π) / 180

drawX = refScreenX - Sx - (cos(theta) * (ux - Sx) - sin(theta) * (uy - Sy))
drawY = refScreenY - Sy - (sin(theta) * (ux - Sx) + cos(theta) * (uy - Sy))
```

쉬운 해석(정방향):
1. 확대/회전된 이미지 전체를 어디에 놓아야 기준점이 정확히 목표 화면 위치에 오는지를 계산한다.
2. 즉, "기준점 고정"을 위해 이미지의 시작 위치(`drawX/drawY`)를 정하는 식이다.

역변환(화면 -> 이미지):
핵심기술 연결:
사용자 클릭을 원본 이미지 좌표로 되돌려, 다음 정렬 조작에 다시 반영하는 폐루프를 완성한다.

```text
dx = screenX - centerX
dy = screenY - centerY

unrotX = centerX + dx * cos(-theta) - dy * sin(-theta)
unrotY = centerY + dx * sin(-theta) + dy * cos(-theta)

imgX = (unrotX - drawX) / scale
imgY = (unrotY - drawY) / scale
```

쉬운 해석(역변환):
1. 사용자가 화면에서 누른 위치를 회전/확대 이전 좌표계로 되돌린다.
2. 즉, 화면 클릭을 원본 이미지 좌표로 환산해 기록/재사용할 수 있게 한다.

변수 의미:

| 변수 | 의미 |
| --- | --- |
| `Sx`, `Sy` | 스케일 적용 후 이미지 절반 크기 (`drawW/2`, `drawH/2`) |
| `ux`, `uy` | 기준점의 스케일 적용 좌표 |
| `drawX`, `drawY` | 캔버스에 이미지를 그리기 시작할 좌상단 좌표 |
| `centerX`, `centerY` | 변환 기준 중심 좌표 |
| `theta` | 회전 각도(라디안) |

## 사용방법
### 0) Pinpoint 모드 빠른 시작 6단계
1. 상단 `Mode`에서 Pinpoint를 선택한다.
2. 상단 `Layout`에서 작업 목적에 맞는 창 배열(rows x cols)을 선택한다.
3. 파일리스트 드래그/드롭 또는 자동 배치로 이미지를 각 slot에 넣는다.
4. `Mouse=Pin` 상태에서 뷰어별 기준점(`refPoint`)을 지정한다.
5. 개별/전역 배율·회전(필요 시 레벨링)으로 정합한 뒤 `Mouse=Pan`으로 동시 이동을 확인한다.
6. 필요하면 Shift/Swap으로 재배치하고, 기준점 유지/좌표 일관성을 최종 확인한다.

### 0-1) 레이아웃·배치·동시 Pan 체크리스트
1. `Layout` 변경 후에도 목표 이미지가 예상 slot에 배치되는지 확인한다.
2. 각 slot의 `refPoint`가 독립적으로 저장되는지 확인한다.
3. Pan 드래그 시 모든 창에서 기준점 이동 방향이 동일한지 확인한다.
4. `pinpointGlobalScale`/`pinpointGlobalRotation` 조정 후에도 창별 미세 조정이 가능한지 확인한다.
5. Shift/Swap 후에도 정렬 맥락(기준점 중심 비교)이 유지되는지 확인한다.

### 1) 시작 전 준비
1. Pinpoint 모드에서 기준 이미지와 비교 이미지를 로드한다.
2. 기준점은 배경이 아닌, 형태가 명확하고 반복 식별이 쉬운 지점(마커, 결함 중심)에 둔다.
3. minimap/crosshair를 켜서 위치 변화 관찰을 쉽게 만든다.

### 2) 기본 조작 순서
1. 기준점(`refPoint`)을 지정한다.
2. 개별 확대/전역 확대/회전을 조정한다.
3. 기준점이 화면 기준 위치에서 유지되는지 확인한다.
4. 필요한 경우 체감상 가장 보기 쉬운 배율/각도로 미세 조정한다.

### 3) 검증 체크포인트
1. 기준점 드리프트(px): 확대/회전 전후 기준점 위치 차이
2. 반복 일치성: 같은 설정으로 되돌렸을 때 기준점 재일치 여부
3. 조작 효율: 목표 위치 맞춤까지 필요한 팬/줌 재조정 횟수
4. 동시 Pan 일관성: Pan 시 모든 뷰어에서 기준점 이동 방향/양이 같은지
5. 혼합 제어 안정성: 개별/전역 회전·배율을 섞어도 기준점 정렬이 유지되는지

### 4) 심화 검증(선택): 클릭 좌표 역변환
1. 화면에서 같은 물체 지점을 배율/회전을 바꿔 여러 번 클릭한다.
2. 각 클릭의 `imgX/imgY`가 안정적으로 일치하는지 비교한다.
3. 회전 각도가 커져도 오차가 급증하지 않는지 확인한다.

## 결과
기술효과 요약:
1. 위치 정합: 기준점 고정 + 공통 화면 기준점 이동으로 다중 창 정렬 일관성이 높아진다.
2. 조작 효율: 동시 Pan과 혼합 제어(개별+전역)로 재팬/재정렬 반복이 줄어든다.
3. 판단 신뢰도: 동일 위치 비교가 쉬워져 판독/리뷰의 반복성이 개선된다.

정성 효과:
1. 회전과 확대가 동시에 바뀌어도 기준점 위치 일관성이 유지된다.
2. 뷰어 간 기준점 정렬이 안정화되어 결함 비교 신뢰도가 올라간다.

정량 관찰 항목:
1. 기준점 위치 편차(px)
2. 반복 정렬 오차(각도/좌표)
3. 목표 정렬 도달까지 필요한 조작 횟수

측정 방법 예시:
1. 동일 샘플 10회 반복 측정으로 평균/표준편차 기록
2. 배율 3단계 x 회전 3단계(총 9조건)에서 오차 측정
3. 기존 중심 고정 방식과 조작 횟수 및 오차 비교

## 강점
1. 동시 Pan(공통 기준점 이동)과 창별 미세정렬(로컬 배율/회전)을 병행할 수 있어 작업 효율이 높다.
2. 중심 고정 방식과 달리 "관심 지점 고정"을 직접 제어하므로 목표 위치 재현성이 높다.
3. 정방향/역방향 변환이 동일 파라미터를 공유해 화면 표시와 클릭 좌표 해석이 서로 어긋나지 않는다.
4. 회전 상태에서도 좌표 해석이 안정적이어서 고배율 비교 시 체감 흔들림이 적다.
5. 다중 이미지 비교에서 같은 부위를 빠르게 왕복 확인할 수 있어 판단 속도와 일관성이 좋아진다.
6. minimap/rect-zoom 등 다른 시각화 기능과 변환 체계를 공유해 기능 확장 시 정합 기준을 유지하기 쉽다.

## 구현 근거 (코드/문서)
### 근거 1) App 상단 툴바에서 Pinpoint 모드/마우스/글로벌 컨트롤 제어
참조: [../../src/App.tsx#L1200](../../src/App.tsx#L1200)

```ts
<select className="mode-selector" value={appMode} onChange={e => setAppMode(e.target.value as AppMode)}>
  <option value="pinpoint" className="mode-option">🎯 Pinpoint</option>
</select>
<LayoutGridSelector
  currentRows={viewerRows}
  currentCols={viewerCols}
  onLayoutChange={(rows, cols) => setViewerLayout(rows, cols)}
/>
{appMode === 'pinpoint' && (
  <label><span>Mouse:</span>
    <select value={pinpointMouseMode} onChange={e => setPinpointMouseMode(e.target.value as any)}>
      <option value="pin">Pin</option>
      <option value="pan">Pan</option>
    </select>
  </label>
)}
{appMode === 'pinpoint' && <PinpointGlobalRotationControl />}
{appMode === 'pinpoint' && (
  <div className="global-controls-wrapper">
    <PinpointGlobalScaleControl />
  </div>
)}
```

해설:
1. Pinpoint 모드는 공통 툴바에서 Mode, Layout, Mouse, 전역 회전/전역 배율까지 한 번에 제어된다.
2. 즉, "레이아웃 선택 -> 동기 제어"가 같은 진입점에서 연결된다.
3. 사용자 체감 의미: 화면 구성과 조작 전환을 오가느라 메뉴를 헤매지 않는다.

### 근거 2) 참조점 입력 시 이미지 좌표 + 화면 기준점 동시 갱신
참조: [../../src/modes/PinpointMode.tsx#L478](../../src/modes/PinpointMode.tsx#L478)

```ts
const handleSetRefPoint = (key: FolderKey, imgPoint: { x: number, y: number }, screenPoint: {x: number, y: number}) => {
  setPinpointImages(prev => {
    const currentImage = prev[key];
    if (!currentImage) return prev;
    return { ...prev, [key]: { ...currentImage, refPoint: imgPoint } };
  });
  setViewport({ refScreenX: screenPoint.x, refScreenY: screenPoint.y });
};
```

해설:
1. 클릭 한 번으로 `refPoint`(이미지 좌표)와 `refScreenX/Y`(화면 기준점)가 함께 저장된다.
2. 이 구조가 Pinpoint 모드의 고정점 정렬을 성립시키는 핵심 상태 모델이다.
3. 사용자 체감 의미: 기준점이 밀려도 다시 크게 맞출 필요 없이 같은 화면 기준에서 정렬을 유지할 수 있다.

### 근거 3) 슬롯별 이미지 배치 + 뷰어별 refPoint 유지
참조: [../../src/modes/PinpointMode.tsx#L507](../../src/modes/PinpointMode.tsx#L507)

```ts
const loadFileToViewer = (file: File, sourceKey: FolderKey, targetKey: FolderKey) => {
  const oldPinpointImage = pinpointImages[targetKey as FolderKey];
  const refPoint = (oldPinpointImage && oldPinpointImage.file?.name === file.name)
    ? oldPinpointImage.refPoint
    : { x: 0.5, y: 0.5 };
  setPinpointImages(prev => ({
    ...prev,
    [targetKey]: { file, refPoint, sourceKey }
  }));
};
```

해설:
1. slot(`targetKey`) 단위로 이미지를 배치하면서 뷰어별 refPoint를 함께 관리한다.
2. "창마다 각각의 핀"이라는 동작이 상태 모델로 직접 구현되어 있다.
3. 사용자 체감 의미: 원하는 이미지 조합을 여러 창에 올려도 기준점 중심 비교를 이어갈 수 있다.

### 근거 4) Pan 시 공통 화면 기준점(shared viewport) 동시 이동
참조: [../../src/components/ImageCanvas.tsx#L1459](../../src/components/ImageCanvas.tsx#L1459)
핵심기술 연결:
공통 viewport를 이동시켜 다중 창을 동시에 움직이는 동기 탐색 메커니즘이다.

```ts
const { viewport: currentViewport } = useStore.getState();
if (appMode === 'pinpoint') {
  const refScreenX = (currentViewport.refScreenX || (canvas.width / 2)) + dx;
  const refScreenY = (currentViewport.refScreenY || (canvas.height / 2)) + dy;
  setViewport({ refScreenX, refScreenY });
}
```

해설:
1. Pan은 뷰어별 개별 위치를 따로 옮기지 않고 공통 기준점(`refScreenX/refScreenY`)을 이동시킨다.
2. 따라서 활성 창에서 드래그하면 모든 창이 같은 좌표계 기준으로 함께 이동한다.
3. 사용자 체감 의미: 동시 Pan으로 여러 이미지의 같은 부위를 빠르게 스캔할 수 있다.

### 근거 5) 정방향 변환 핵심 수식
참조: [../../src/utils/viewTransforms.ts#L25](../../src/utils/viewTransforms.ts#L25)
핵심기술 연결:
참조점을 목표 화면 좌표에 고정하기 위해 배치 좌표를 산출하는 정합 계산의 핵심 부분이다.

```ts
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
```

해설:
1. 기준점 좌표를 스케일 좌표계로 변환한 뒤 회전을 준비한다.
2. 이후 `drawX/drawY` 계산으로 기준점을 화면 목표 위치에 맞춘다.
3. 사용자 체감 의미: 줌/회전 후에도 기준으로 잡은 부위를 다시 찾기 위한 재팬 작업이 줄어든다.

### 근거 6) 화면 -> 이미지 역변환
참조: [../../src/utils/viewTransforms.ts#L80](../../src/utils/viewTransforms.ts#L80)
핵심기술 연결:
화면 입력을 원본 좌표로 복원해 정렬 루프를 닫는 입력 해석 단계다.

```ts
const dx = screenX - t.centerX;
const dy = screenY - t.centerY;
const cos = Math.cos(-t.theta);
const sin = Math.sin(-t.theta);
const unrotX = t.centerX + dx * cos - dy * sin;
const unrotY = t.centerY + dx * sin + dy * cos;
const imgX = (unrotX - t.drawX) / t.scale;
const imgY = (unrotY - t.drawY) / t.scale;
return { imgX, imgY };
```

해설:
1. 회전을 먼저 되돌린 뒤 스케일/이동을 역적용한다.
2. 이 순서를 지켜야 클릭 좌표를 원본 이미지 좌표로 정확히 복원할 수 있다.
3. 사용자 체감 의미: 배율/각도가 달라도 같은 지점을 클릭했을 때 좌표 기록 일관성이 높아진다.

### 근거 7) 실제 Pinpoint 인터랙션에서 수식 적용
참조: [../../src/components/ImageCanvas.tsx#L1144](../../src/components/ImageCanvas.tsx#L1144)

```ts
const individualScale = (typeof folderKey === 'string' ? (overrideScale ?? vp.scale) : vp.scale);
const scale = individualScale * gScale;
const currentRefPoint = refPoint || { x: 0.5, y: 0.5 };
const refScreenX = vp.refScreenX || (width / 2);
const refScreenY = vp.refScreenY || (height / 2);
const refImgX = currentRefPoint.x * (sourceImage as any).width;
const refImgY = currentRefPoint.y * (sourceImage as any).height;
const drawX = refScreenX - Sx - (cos * (ux - Sx) - sin * (uy - Sy));
const drawY = refScreenY - Sy - (sin * (ux - Sx) + cos * (uy - Sy));
```

해설:
1. 정방향 수식이 문서 설명이 아니라 실제 이벤트 처리 코드에 직접 적용된다.
2. 사용자 조작(줌/회전) 직후 좌표 재계산이 즉시 반영된다.
3. 사용자 체감 의미: 조작 반응이 즉시 반영되어 "밀리는 느낌" 없이 미세 정렬이 가능하다.

### 근거 8) 동일 변환을 미니맵에도 재사용
참조: [../../src/components/Minimap.tsx#L57](../../src/components/Minimap.tsx#L57)

```ts
const xform = computePinpointTransform({
  imageW: bitmap.width,
  imageH: bitmap.height,
  viewport,
  individualScale,
  globalScale: pinpointGlobalScale,
  refPoint: currentRefPoint,
  totalAngleDeg: rotationDeg || 0,
  canvasW: canvasSize.width,
  canvasH: canvasSize.height,
});
```

해설:
1. 본 변환 로직이 캔버스 본문뿐 아니라 minimap 시각화에도 동일하게 사용된다.
2. 즉, 사용자에게 보이는 보조 UI와 본 화면의 좌표계가 일치한다.
3. 사용자 체감 의미: 미니맵에서 본 위치와 본문 화면 위치가 맞아 떨어져 탐색 실수가 줄어든다.

## 특허 문서 전환을 위한 작성 포인트
권리화 핵심 구성요소:
1. 기준점(`refPoint`)과 화면 기준점(`refScreenX/Y`)의 분리 관리  
   예시 표현: "기준 이미지 점과 화면 기준점을 독립 파라미터로 관리하여 정렬 기준을 고정한다."
2. 로컬/전역 배율 결합 기반 변환  
   예시 표현: "복수 배율 요소를 결합한 총 배율로 렌더링 좌표를 산출한다."
3. 역변환 기반 입력 해석 루프  
   예시 표현: "화면 입력을 역변환하여 원본 좌표로 환산하고 후속 정렬 제어에 재활용한다."

차별 주장 포인트:
1. 단순 중심 고정 또는 단일 affine 적용이 아니라, "기준점 고정 목표"를 직접 수식화한 구조
2. 표시 변환과 입력 해석 변환이 분리되지 않고 폐루프로 연결된 구조

실험/증빙으로 보강할 요소:
1. 기준점 드리프트(px) 비교 실험 (본 방식 vs 중심 고정 방식)
2. 반복 조정 시 오차 분포(평균/표준편차)
3. 회전 각도 변화 조건에서의 입력 좌표 일관성 결과

## 작성 시 주의사항/한계
1. 완전 자동 정합 기술로 표현하면 과장이다. 현재는 사용자 기준점 입력이 필요하다.
2. 핀 지정만으로 배율/회전이 자동 추정되는 구조는 아니다. 현재는 `개별 + 전역` 제어와 레벨링을 조합한다.
3. 뷰어당 다중 핀 동시 운용이 핵심 플로우인 것으로 과장하지 않는다. 현재 핵심은 뷰어별 단일 기준점(`refPoint`) 중심이다.
4. 정규화 좌표(`0~1`)와 픽셀 좌표를 혼용해 설명하면 오해가 생기므로 문서에서 명확히 구분한다.
5. 구현 버전 변경 시 수식/코드 발췌와 본문 설명을 함께 동기화해야 한다.
6. 특허 문서화 시 일반 registration 선행기술과의 차별점(기준점 고정 + 역변환 루프)을 반드시 분리 서술한다.
