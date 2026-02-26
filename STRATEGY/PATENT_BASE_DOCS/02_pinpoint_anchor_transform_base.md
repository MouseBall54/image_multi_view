# 02. Pinpoint 참조점 고정 기반 회전/배율 정합 변환 (바탕 문서)

> 고지: 본 문서는 기술/전략 참고자료이며 법률 자문이 아닙니다.  
> 기준 문서: [PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md](../PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md)

## 문서 목적
Pinpoint 모드의 핵심 기술인 "참조점 고정 정합 변환"을 특허 작성 전 단계에서 설명 가능한 형태로 정리한다.  
특히 다음 3가지를 명확히 한다.
1. 왜 기존 정렬 방식으로는 오차가 누적되는지
2. compareX가 어떤 수식으로 위치를 맞추는지
3. 사용자가 어떤 절차로 기능 효과를 확인할 수 있는지

## 기능 정의
### 1) 문제 상황
일반적인 확대/회전 정렬에서는 확대 비율이나 각도를 바꿀 때 기준점이 화면에서 밀려나는 문제가 자주 발생한다.  
이때 사용자는 다시 팬(pan)과 줌을 반복해야 하므로 작업 시간이 길어지고 정렬 오차도 커진다.

### 2) 핵심 개념 3가지 (일반 사용자 용어)
1. `refPoint`: 이미지 안에서 "붙잡아 둘 기준 점" (예: 결함 중심, 특정 마커)
2. `refScreenX/refScreenY`: 화면에서 그 기준점이 보여야 할 위치
3. `total scale`: 개별 확대(`individualScale`) x 전체 확대(`globalScale`)

### 3) 동작 원리 요약
1. 먼저 정방향 변환으로 "이미지를 어디에 그릴지(drawX/drawY)" 계산한다.
2. 이 계산은 기준점이 화면 목표 위치에 오도록 맞춰진다.
3. 사용자가 화면을 클릭하면 역변환으로 이미지 좌표를 복원한다.
4. 복원된 좌표를 다시 줌 중심/핀 설정에 재사용해 정렬 일관성을 유지한다.

## 적용 수식(구현 기준)
정방향 변환(이미지 -> 화면):

```text
scale = individualScale * globalScale
theta = (totalAngleDeg * π) / 180

drawX = refScreenX - Sx - (cos(theta) * (ux - Sx) - sin(theta) * (uy - Sy))
drawY = refScreenY - Sy - (sin(theta) * (ux - Sx) + cos(theta) * (uy - Sy))
```

역변환(화면 -> 이미지):

```text
dx = screenX - centerX
dy = screenY - centerY

unrotX = centerX + dx * cos(-theta) - dy * sin(-theta)
unrotY = centerY + dx * sin(-theta) + dy * cos(-theta)

imgX = (unrotX - drawX) / scale
imgY = (unrotY - drawY) / scale
```

변수 의미:

| 변수 | 의미 |
| --- | --- |
| `Sx`, `Sy` | 스케일 적용 후 이미지 절반 크기 (`drawW/2`, `drawH/2`) |
| `ux`, `uy` | 기준점의 스케일 적용 좌표 |
| `drawX`, `drawY` | 캔버스에 이미지를 그리기 시작할 좌상단 좌표 |
| `centerX`, `centerY` | 변환 기준 중심 좌표 |
| `theta` | 회전 각도(라디안) |

한 줄 해석:
1. 정방향 수식은 "기준점이 화면 목표 지점에 오도록" 이미지 전체 위치를 이동시킨다.
2. 역변환 수식은 "회전과 확대를 되돌려" 사용자가 찍은 화면 좌표를 원본 이미지 좌표로 환산한다.

## 사용방법
### 시나리오 A: 정렬 작업에서 기준점 고정 검증
1. Pinpoint 모드에서 기준 이미지와 비교 이미지를 로드한다.
2. 기준점(`refPoint`)을 결함 또는 마커 위치에 찍는다.
3. 개별 확대/전역 확대/회전을 조정한다.
4. 기준점이 화면에서 밀리지 않는지 확인한다.

확인할 관찰값:
1. 기준점 드리프트(px): 확대/회전 전후 위치 차이
2. 반복 조정 후 기준점 재현성: 같은 설정으로 돌아왔을 때 위치 일치 여부

### 시나리오 B: 클릭 좌표 역변환 검증
1. 화면에서 특정 지점을 클릭한다.
2. 내부 역변환으로 계산된 `imgX/imgY`를 확인한다.
3. 같은 지점을 다른 배율/회전 상태에서 다시 클릭해 좌표 일관성을 비교한다.

확인할 관찰값:
1. 클릭 지점 오차(px): 화면상 의도 위치와 계산 좌표의 대응 오차
2. 회전 각도 변화에 따른 오차 안정성

운영 팁:
1. 기준점은 화면 중심보다 실제 분석 대상의 핵심 지점에 두는 것이 효과적이다.
2. 검증 시 minimap/crosshair를 함께 켜면 위치 오차를 빠르게 파악할 수 있다.

## 결과
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
1. 기준점 고정을 명시적으로 제어하므로 중심 고정 방식보다 목표 위치 재현성이 높다.
2. 정방향/역방향 변환이 동일 파라미터를 공유해 좌표 해석 불일치가 줄어든다.
3. 회전 상태에서도 입력 좌표 해석이 안정적이어서 사용자 체감 일관성이 좋다.
4. minimap/rect-zoom 등 다른 기능에 같은 변환 체계를 재사용할 수 있어 확장성이 높다.

## 구현 근거 (코드/문서)
### 근거 1) 정방향 변환 핵심 수식
참조: [../../src/utils/viewTransforms.ts#L25](../../src/utils/viewTransforms.ts#L25)

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

### 근거 2) 화면 -> 이미지 역변환
참조: [../../src/utils/viewTransforms.ts#L80](../../src/utils/viewTransforms.ts#L80)

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

### 근거 3) 실제 Pinpoint 인터랙션에서 수식 적용
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

### 근거 4) 동일 변환을 미니맵에도 재사용
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
2. 정규화 좌표(`0~1`)와 픽셀 좌표를 혼용해 설명하면 오해가 생기므로 문서에서 명확히 구분한다.
3. 구현 버전 변경 시 수식/코드 발췌와 본문 설명을 함께 동기화해야 한다.
4. 특허 문서화 시 일반 registration 선행기술과의 차별점(기준점 고정 + 역변환 루프)을 반드시 분리 서술한다.
