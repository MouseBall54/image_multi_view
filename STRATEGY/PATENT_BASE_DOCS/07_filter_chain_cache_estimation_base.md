# 07. 컴퓨터 비전 필터 체인 실행·재현 파이프라인 (캐시·진행률·비용추정·JSON I/O·Python 변환 예정) (바탕 문서)

> 고지: 본 문서는 기술/전략 참고자료이며 법률 자문이 아닙니다.  
> 기준 문서: [PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md](../PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md)

## 문서 목적
compareX의 필터 기능을 단순 "효과 적용"이 아니라, 재현 가능한 컴퓨터 비전 이미지 처리 파이프라인으로 설명하기 위한 바탕 문서다.  
아래 범위를 한 문서에서 연결한다.
1. `[현재 구현됨]` 필터 체인 실행, 캐시, 진행률, 비용추정
2. `[현재 구현됨]` JSON import/export를 통한 실험 공유와 복원
3. `[예정 기능]` Python(OpenCV/NumPy) 코드 변환/내보내기 시안

---

## 기능 정의
### 문제 상황
이미지 분석 실험에서 사용자는 보통 아래 문제를 반복해서 겪는다.
1. 같은 필터 조합을 다시 실행할 때 처리 시간이 매번 불확실함
2. 팀원에게 실험 조건을 전달할 때 설정이 누락되거나 순서가 달라짐
3. 웹 앱에서 확인한 결과를 Python 실험 코드로 옮길 때 다시 코딩해야 함

### 핵심 개념(일반 사용자 + 기술자 혼합 설명)
1. 필터 체인: 여러 컴퓨터 비전 이미지 처리 필터를 순서대로 묶은 "레시피"
2. 파라미터 조절: 각 필터 세기를 슬라이더/숫자입력으로 조절하는 "세부 튜닝 장치"
3. 파라미터 저장: 필터 종류뿐 아니라 파라미터 값까지 체인에 저장하는 "재현 보장 장치"
4. 캐시: 같은 이미지 + 같은 레시피면 이전 결과를 재사용하는 "재실행 가속 장치"
5. 진행률: 체인 전체 단계 중 현재 위치를 보여주는 "실행 상태 표시"
6. 비용추정: 실행 전 예상 연산량/시간을 제시하는 "사전 안내값"
7. JSON I/O: 레시피를 파일로 저장·공유·복구하는 "재현 포맷"
8. Python 변환(예정): 레시피를 OpenCV/NumPy 코드로 옮기는 "실험 연계 확장"

### 한 줄 정의
이 기능은 **컴퓨터 비전 이미지 처리 필터를 체인으로 관리하고, 동일 결과를 반복 재현할 수 있게 하는 실행 파이프라인**이다.
필터 체인은 필터 순서뿐 아니라 각 필터 파라미터까지 포함해 재현된다.

### 구현 범위 구분
1. `[현재 구현됨]` 체인 실행, 캐시 재사용, 진행률 업데이트, 비용추정, JSON import/export
2. `[예정 기능]` JSON 체인을 Python 코드(`.py`)로 변환해 내보내는 기능

---

## [현재 구현됨] 처리 파이프라인 개요
1. 사용자가 만든 체인에서 `enabled=true` 필터만 추린다.
2. 입력 이미지 해시와 체인 파라미터를 결합해 캐시 키를 생성한다.
3. 캐시 히트면 즉시 결과를 복원하고 진행률 UI를 일관되게 표시한다.
4. 캐시 미스면 필터를 순차 적용하며 단계별 진행률을 갱신한다.
5. 최종 결과를 캐시에 저장하고, 캐시 최대 크기 정책으로 메모리를 관리한다.
6. 실행 전 비용추정 함수로 예상 시간(ms)을 안내한다.

사용자 관찰 포인트:
1. 같은 레시피 재실행 시 체감 대기시간 단축
2. 긴 체인에서 진행률 표시가 끊기지 않고 유지
3. 실행 전 예상값으로 레시피를 미리 경량화 가능

---

## [현재 구현됨] 파라미터 조절 및 저장 원리
아래 순서로 파라미터가 조절되고, 체인 및 JSON까지 반영된다.
1. Filter Editor에서 슬라이더/숫자입력/체크박스로 파라미터를 변경한다.
2. 변경값은 임시 상태 `tempViewerFilterParams`로 즉시 갱신된다.
3. `Add to Cart` 시점에 해당 파라미터 스냅샷이 `filterCart` 아이템 `params`로 저장된다.
4. 체인 아이템 편집 모달에서 재조절하면 `updateFilterCartItem(itemId, { params })`로 아이템별 파라미터가 다시 저장된다.
5. export 시 저장된 `params`가 JSON의 각 `items[n].params`에 기록된다.

실무 해석:
1. "필터 종류는 같은데 값이 달라 결과가 다른 문제"를 줄일 수 있다.
2. 체인 공유 시 수치 조건까지 동기화되어 팀 재현성이 높아진다.

---

## [현재 구현됨] 제공 필터 카탈로그 (컴퓨터 비전 이미지 처리 기준)
코드 기준 제공 필터는 총 **81개(17개 그룹)** 이며, 대부분 OpenCV 계열 처리 개념(노이즈 억제, 에지 검출, 이진화, 텍스처 분석 등)으로 구성된다.

| 그룹 | 개수 | 대표 필터 | CV 활용 목적 |
| --- | ---: | --- | --- |
| Tone & Basics | 8 | `grayscale`, `brightness`, `gammacorrection` | 기본 톤/명암 보정, 전처리 |
| Contrast Enhancement | 4 | `histogramequalization`, `clahe` | 저대비 이미지 대비 개선 |
| Binarization | 10 | `threshold_otsu`, `threshold_adaptive_gaussian` | 문서/결함 분리, 전경-배경 분할 |
| Noise Reduction & Blurring | 7 | `gaussianblur`, `median`, `alphatrimmedmean` | 노이즈 완화, 고주파 억제 |
| Edge-Preserving Smoothing | 2 | `guided`, `edgepreserving` | 에지는 살리고 잡음 제거 |
| Sharpening | 3 | `sharpen`, `unsharpmask`, `highpass` | 경계 강조, 흐림 보정 |
| Edge Detection - Basic | 3 | `sobel`, `scharr`, `laplacian` | 기초 경계/기울기 검출 |
| Edge Detection - Advanced | 6 | `canny`, `log`, `marrhildreth` | 정밀 경계 추출 |
| Texture Analysis | 3 | `gabor`, `lawstextureenergy`, `lbp` | 패턴/결 무늬 특징 추출 |
| Morphology & Distance | 6 | `morph_open`, `morph_close`, `distancetransform` | 형상 보정, 거리 기반 분석 |
| Frequency Domain (Experimental) | 3 | `dft`, `dct`, `wavelet` | 주파수 기반 실험 분석 |
| Colormap - Perceptually Uniform | 5 | `colormap_viridis`, `colormap_inferno` | 시각화 일관성 개선 |
| Colormap - Rainbow/Legacy | 3 | `colormap_jet`, `colormap_hsv` | 기존 워크플로 호환 시각화 |
| Colormap - Aesthetic | 6 | `colormap_cool`, `colormap_summer` | 결과 시각 구분 강화 |
| Colormap - Specialized | 3 | `colormap_bone`, `colormap_copper` | 특정 도메인 스타일 표현 |
| Colormap - Diverging | 6 | `colormap_rdbu`, `colormap_bwr` | 변화량/부호형 데이터 강조 |
| Colormap - Gradient-based | 3 | `colormap_gradient_magnitude`, `colormap_edge_intensity` | 기울기/에지 강도 맵 시각화 |

실무 해석:
1. 전처리(노이즈/대비) + 특징추출(에지/텍스처) + 시각화(컬러맵)를 하나의 체인에서 연속 실험할 수 있다.
2. 특정 필터 하나의 성능보다, "필터 조합 레시피"의 재현성이 핵심 경쟁력이다.

---

## [현재 구현됨] JSON import/export 기능
### 1) JSON 구조 원리
앱은 한 개의 체인을 "메타데이터 + 체인 본문(items)" 형태로 저장하거나 불러온다.
1. 체인 본문 핵심: `name`, `items[]`
2. 아이템 핵심: `id`, `filterType`, `params`, `enabled`
3. Wrapper 포맷 사용 시: `version`, `exportedAt`, `metadata`를 추가 보존

### 2) 저장(export) 시 원리
저장 시 `FILTER_PARAMETER_MAP`을 기준으로 필터 타입별 관련 파라미터만 남긴다.
1. 장점: 불필요한 파라미터 노이즈를 줄여 가독성과 호환성을 높임
2. 결과: `params`에는 실제 사용된 값만 저장됨

간단 예시(직접 체인 포맷):
```json
{
  "name": "basic-denoise-edge",
  "items": [
    {
      "id": "filter-1",
      "filterType": "gaussianblur",
      "params": { "kernelSize": 5, "sigma": 1.2 },
      "enabled": true
    },
    {
      "id": "filter-2",
      "filterType": "canny",
      "params": { "lowThreshold": 60, "highThreshold": 150 },
      "enabled": true
    }
  ]
}
```

실전 예시(wrapper 포맷):
```json
{
  "version": "1.0.0",
  "exportedAt": 1767139200000,
  "chain": {
    "id": "exported-1767139200000",
    "name": "inspection-chain",
    "items": [
      {
        "id": "filter-abc",
        "filterType": "clahe",
        "params": { "clipLimit": 2.5, "gridSize": 8 },
        "enabled": true
      },
      {
        "id": "filter-def",
        "filterType": "threshold_adaptive_gaussian",
        "params": { "blockSize": 21, "constant": 3, "maxValue": 255, "binaryInvert": false },
        "enabled": true
      }
    ],
    "createdAt": 1767139100000,
    "modifiedAt": 1767139200000
  },
  "metadata": {
    "appVersion": "1.0.0",
    "description": "Filter chain: inspection-chain"
  }
}
```

### 3) 불러오기(import) 시 원리
import는 아래 3개 포맷을 순서대로 수용한다.
1. `version + chain` wrapper 포맷
2. `name + items` direct 포맷
3. `preset.name + preset.chain` preset 포맷

그 다음 구조 검증을 수행한다.
1. 체인 레벨: `name` 문자열, `items` 배열
2. 아이템 레벨: `id`, `filterType`, `params`, `enabled` 타입 검사

### 4) 실패 시 사용자 피드백
1. JSON 형식 오류/필드 누락 시 명시적 에러 메시지 반환
2. UI에서는 토스트로 실패 원인과 재시도 가이드를 안내

실무 가치:
1. 팀원이 같은 JSON을 가져오면 필터 순서와 파라미터까지 동일 조건으로 재현 가능
2. 장비/환경이 달라도 실험 레시피를 표준 파일로 관리 가능

---

## [예정 기능] Python 코드 변환/내보내기
### 목적
웹 앱에서 검증한 체인을 Python(OpenCV/NumPy) 코드로 전개해, 연구/검증 파이프라인에서 직접 실행 가능하도록 한다.

### 출력물(예정)
1. `chain_name.py`: 체인 순회 실행 스크립트
2. `chain_name.mapping.json`(선택): 필터 타입-함수 매핑 로그

### JSON -> Python(OpenCV/NumPy) 매핑 시안
| filterType | Python 매핑 예 |
| --- | --- |
| `gaussianblur` | `cv2.GaussianBlur(img, (k, k), sigma)` |
| `median` | `cv2.medianBlur(img, k)` |
| `canny` | `cv2.Canny(gray, low, high)` |
| `threshold_binary` | `cv2.threshold(gray, t, maxv, mode)` |
| `threshold_adaptive_*` | `cv2.adaptiveThreshold(...)` |
| `histogramequalization` | `cv2.equalizeHist(gray)` |
| `clahe` | `cv2.createCLAHE(...).apply(gray)` |
| `morph_*` | `cv2.morphologyEx(..., kernel, iterations=...)` |

상태 명시:
1. 본 항목은 `[예정 기능]`이며 현재 저장소에는 구현되어 있지 않다.
2. "현재 앱에서 바로 Python export 가능"으로 해석될 문구는 사용하지 않는다.

---

## 적용 로직/식(구현 기준)
### 1) 캐시 키
```text
chainHash = join("|", enabledItems.map(item => filterType + "-" + JSON.stringify(params)))
cacheKey  = imageHash + "-" + chainHash
```
한 줄 해석: 같은 이미지와 같은 필터 레시피면 같은 키가 만들어진다.

### 2) 이미지 해시
```text
imageHash = "{width}x{height}-{first_10_pixels_subset}"
```
한 줄 해석: 전체 픽셀 해시보다 빠르게 "같은 입력인지" 판별한다.

### 3) 비용추정
```text
pixelCount = imageWidth * imageHeight
totalCost = Σ(baseCost(filterType) * paramMultiplier)
estimatedMs = (totalCost * pixelCount / 1000) + (enabledItems.length * 50)
```
한 줄 해석: 필터 종류, 파라미터 크기, 이미지 크기, 체인 길이를 합쳐 대략 시간을 계산한다.

파라미터 가중 예:
```text
if kernelSize > 5:
  paramMultiplier *= (kernelSize / 5)^2
```

---

## 사용방법
### 시나리오 A: 캐시 히트 기반 성능 실험
1. 동일 이미지 1장을 선택하고 필터 체인(3~6단계)을 구성한다.
2. 1차 실행 시간을 기록한다(캐시 미스 기준).
3. 같은 체인을 다시 실행해 2차 시간을 기록한다(캐시 히트 기대).
4. 실행 전 표시된 비용추정값과 실제 시간을 비교한다.

확인할 관찰값:
1. 1차/2차 처리시간(ms)
2. 캐시 히트 시 체감 응답성
3. 추정값 대비 실측 오차율

### 시나리오 B: JSON 공유 + Python 연계 준비
1. Filter Cart에서 임의 필터 2~3개의 파라미터를 먼저 조절한다.
2. JSON으로 export 한다.
3. 다른 환경에서 JSON을 import해 같은 체인을 복원한다.
4. 복원된 아이템의 `params` 값이 export 전과 동일한지 확인한다.
5. `[예정 기능]` Python 변환 시안 기준으로 OpenCV 실행 스크립트 설계를 진행한다.

확인할 관찰값:
1. `filterType/params/enabled` 일치율
2. 재현 결과(시각 비교 또는 픽셀 차이)
3. Python 매핑 누락 필터 목록

---

## 결과
### 정성 효과
1. "필터 적용"이 단발 기능에서 "재현 가능한 실험 파이프라인"으로 바뀐다.
2. 반복 실험 속도와 공유 재현성이 동시에 개선된다.
3. 향후 Python 연계 시 웹-실험 코드 간 전환 비용이 감소한다.

### 정량 관찰 항목
1. 캐시 히트 시 평균 처리시간 감소율
2. 비용추정 대비 실측 오차율
3. JSON round-trip 후 체인 복원 정확도

### 측정 방법 예시
1. 이미지 10장 x 체인 5종을 3회 반복 실행
2. 평균/표준편차로 시간 분포 기록
3. JSON 재로딩 후 필드 diff(`filterType`, `params`, `enabled`) 검사

---

## 강점
1. 실행·캐시·진행률·비용추정을 하나로 묶어 사용자 의사결정이 빠르다.  
이유: "지금 실행하면 얼마나 걸리는지"를 실행 전/중/후 단계에서 연속적으로 확인할 수 있다.
2. JSON I/O로 실험 레시피 전달이 표준화된다.  
이유: 구두 전달 대신 파일 단위 공유로 누락 위험을 줄인다.
3. 81개 CV 필터를 체인 단위로 조합해 도메인별 실험 폭이 넓다.  
이유: 전처리-특징추출-시각화를 한 흐름으로 묶을 수 있다.
4. 캐시 키가 이미지+파라미터를 반영해 잘못된 재사용을 줄인다.  
이유: 필터 순서/파라미터 변경 시 다른 키가 생성된다.
5. Python 변환으로 확장 가능한 데이터 구조를 이미 사용한다.  
이유: JSON 체인이 플랫폼 중립적인 중간 포맷 역할을 한다.

---

## 구현 근거 (코드/문서)
### 근거 1) FilterControls에서 파라미터 입력값을 임시 상태로 반영
참조: [../../src/components/FilterControls.tsx#L524](../../src/components/FilterControls.tsx#L524), [../../src/components/FilterControls.tsx#L570](../../src/components/FilterControls.tsx#L570)

```ts
const handleParamChangeImmediate = React.useCallback((param: string, value: string) => {
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    const newParams = { ...tempViewerFilterParams, [param]: numValue };
    setTempFilterParams({ [param]: numValue });
    applyParamUpdates(newParams);
  }
}, [tempViewerFilterParams, applyParamUpdates, setTempFilterParams]);
```

해설:
1. 슬라이더/입력값이 `tempViewerFilterParams`로 즉시 반영된다.
2. 미리보기(`applyParamUpdates`)와 저장 후보 파라미터가 동시에 갱신된다.

### 근거 2) 체인 아이템 편집 모달에서 파라미터 재조절
참조: [../../src/components/FilterChainItemEditorModal.tsx#L55](../../src/components/FilterChainItemEditorModal.tsx#L55), [../../src/components/FilterCart.tsx#L88](../../src/components/FilterCart.tsx#L88)

```ts
const handleParamChange = (params: FilterParams) => {
  setLocalParams(params);
  onParamsChange(params);
};

const handleEditorParamChange = React.useCallback((itemId: string, params: FilterParams) => {
  updateFilterCartItem(itemId, { params });
}, [updateFilterCartItem]);
```

해설:
1. 모달에서 바꾼 값이 로컬 표시만 바뀌는 것이 아니라 체인 아이템 `params`까지 갱신된다.
2. 기존 체인 단계별로 개별 파라미터를 재편집할 수 있다.

### 근거 3) store에서 파라미터를 체인 스냅샷으로 저장/갱신
참조: [../../src/store.ts#L722](../../src/store.ts#L722), [../../src/store.ts#L751](../../src/store.ts#L751)

```ts
addToFilterCart: () => set(state => {
  const newItem: FilterChainItem = {
    id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    filterType: state.tempViewerFilter,
    params: { ...state.tempViewerFilterParams },
    enabled: true,
  };
  return { filterCart: [...state.filterCart, newItem] };
}),

updateFilterCartItem: (itemId, updates) => set(state => ({
  filterCart: state.filterCart.map(item =>
    item.id === itemId ? { ...item, ...updates } : item
  )
})),
```

해설:
1. 카트에 추가되는 시점의 `tempViewerFilterParams`가 아이템 `params`로 스냅샷 저장된다.
2. 이후 재편집 시 `updateFilterCartItem` 경로로 해당 아이템의 파라미터가 다시 기록된다.

### 근거 4) export 시 관련 파라미터만 선별 저장
참조: [../../src/utils/filterExport.ts#L135](../../src/utils/filterExport.ts#L135), [../../src/utils/filterExport.ts#L152](../../src/utils/filterExport.ts#L152)

```ts
export function getRelevantParams(filterType: FilterType, allParams: any): any {
  const relevantParamKeys = FILTER_PARAMETER_MAP[filterType] || [];
  if (relevantParamKeys.length === 0) {
    return {};
  }

  const relevantParams: any = {};
  relevantParamKeys.forEach(key => {
    if (allParams[key] !== undefined) {
      relevantParams[key] = allParams[key];
```

해설:
1. 필터 타입별로 유효한 파라미터만 남겨 JSON 저장 품질을 높인다.
2. 체인 공유 시 불필요한 필드 혼입을 줄여 재현 안정성을 확보한다.

### 근거 5) import 시 다중 포맷 수용 + 구조 검증
참조: [../../src/utils/filterExport.ts#L199](../../src/utils/filterExport.ts#L199)

```ts
if (data.version && data.chain) {
  chainData = data.chain;
}
else if (data.name && Array.isArray(data.items)) {
  chainData = data;
}
else if (data.preset && data.preset.name && Array.isArray(data.preset.chain)) {
  chainData = {
    name: data.preset.name,
    items: data.preset.chain,
```

해설:
1. wrapper/direct/preset 포맷을 모두 수용해 실무 호환성을 높인다.
2. 이후 `name/items/id/filterType/params/enabled` 검증으로 잘못된 파일을 조기 차단한다.

---

## 특허 문서 전환을 위한 작성 포인트
1. 권리화 핵심 구성요소  
핵심: 체인 실행기, 캐시 키 생성 규칙, 진행률 콜백, 비용추정 모듈, JSON 정규화 계층.  
명세서 표현 예시: "동일 입력 영상 및 동일 파라미터 체인에 대해 결과를 재사용하는 캐시 키 생성부를 포함하는 영상처리 시스템".
2. 차별 주장 포인트  
핵심: 실행/예측/재현(공유)을 단일 파이프라인으로 결합한 구조.  
명세서 표현 예시: "처리 전 비용추정값을 제공하면서, 처리 체인의 외부 교환 및 복원을 지원하는 통합 처리 장치".
3. 실험 증빙 보강 요소  
핵심: 캐시 히트율, 시간 절감률, JSON 왕복 복원 정확도.  
명세서 표현 예시: "동일 체인 반복 처리 시 평균 처리시간 감소율 및 체인 복원 정확도를 기준으로 성능을 검증".

---

## 작성 시 주의사항/한계
1. `[예정 기능]`은 구현 완료처럼 기술하지 않는다.
2. 비용추정은 운영환경/브라우저/이미지 특성에 따라 달라지는 안내값이다.
3. 필터 개수(현재 81개)는 코드 변경 시 달라질 수 있으므로 문서 갱신 시 재검증한다.
4. JSON 스키마가 변경되면 import/export 설명과 예시도 동시에 갱신한다.
5. 본 기능은 사용자 정의 체인 기반이며, 자동 최적 체인 탐색을 보장하지 않는다.
