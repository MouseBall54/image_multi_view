# compareX 특허 포트폴리오 심층 분석 (KR 우선 + PCT 확장)

- 작성일: 2026-02-26
- 대상 제품: compareX (Web + Electron 공용 워크스페이스)
- 범위: 저장소 구현 기반 기술분석 + 권리화 전략 초안
- 법적 고지: **본 문서는 기술/전략 분석 문서이며 법률 자문이 아닙니다.** 실제 출원/권리범위 확정은 변리사 검토가 필요합니다.

---

## 1. Executive Summary (KR)

compareX는 단순 이미지 뷰어가 아니라, 비교(Compare)·정합(Pinpoint)·분석(Analysis) 모드를 하나의 상태 모델로 통합해 대량 이미지 검토, 정밀 정렬, 필터 실험을 끊김 없이 수행하는 로컬 우선 워크스페이스다.  
본 분석은 저장소 구현을 근거로 특허 후보 8개를 선정했고, 각 후보에 대해 청구항 스켈레톤(독립 1 + 종속 3~5), 침해판별 포인트, 설계회피 리스크, 출원 우선순위를 제시한다.

핵심 결론은 다음과 같다.

1. 권리화 우선순위는 `Pinpoint 참조점 고정 정합 변환`, `2점 레벨링 자동 회전 보정`, `체인형 필터 실행/캐시/성능추정 결합`이 가장 높다.
2. `하이브리드 폴더 동기화(Electron watch + Web meta diff)`는 신규성보다 실무 침해판별성과 제품 핵심성이 강점이다.
3. `멀티모드 통합 워크플로우`와 `TEMP 스필오버 배치`는 단독으로는 넓은 선행기술 군과 충돌 가능성이 있으므로, 청구항은 UI 개념이 아닌 **상태전이/충돌회피/결과 보존 로직** 중심으로 좁혀야 한다.
4. 출원 전략은 KR 1차 명세서에서 핵심 구현을 기능 블록 단위로 권리화하고, 12개월 이내 PCT에서 청구군 분할(정합군/필터군/동기화군)로 확장하는 것이 합리적이다.

Public API / Interface / Type 변경: 없음 (`None`)

---

## 2. English Abstract

This document analyzes compareX’s implementation-level innovations and defines a patent portfolio strategy with Korea-first filing and PCT expansion.  
The scope is limited to technologies verifiable from the repository, excluding unimplemented ideas. Eight patent candidates are selected and analyzed with fixed sections: problem definition, technical configuration, execution flow, differentiation points, strengths, implementation evidence, infringement indicators, design-around risks, filing difficulty, and priority.

The strongest candidates are: (1) reference-point anchored alignment transform in Pinpoint mode, (2) two-point leveling-based automatic rotation correction, and (3) chain-style filter execution architecture integrating cache, progress signaling, and cost estimation.  
A non-exhaustive prior-art quick check was conducted using Google Patents, KIPRIS resources, and arXiv references (retrieval date: 2026-02-26).  
The recommended filing roadmap is KR draft in 0-2 months, evidence reinforcement in 3-6 months, and PCT filing before the 12-month priority deadline.

---

## 3. Product Innovation Map

| 기능 설명 | 구현 포인트 | 기술적 효과 |
| --- | --- | --- |
| 멀티모드 단일 워크플로우 | 모드 전환 시 공통 상태(레이아웃/툴바/입력경로) 유지 + 선택적 상태 리셋 | 툴 전환 비용 감소, 대량 검토 속도 향상 |
| Pinpoint 참조점 고정 정합 | `computePinpointTransform` + 역변환 `screenToImage`로 회전/배율/참조좌표 동시 정합 | 다중 이미지 정밀 정렬 정확도 개선 |
| 회전 안전 Rect-zoom | 사각영역 중심을 역회전/역스케일로 이미지 좌표에 투영해 차기 뷰포트 계산 | 회전 상태에서도 직관적 확대 동작 유지 |
| 2점 레벨링 캡처 | 2클릭 점으로 각도 계산, 수평/수직 축 모드별 delta 회전 적용 | 수작업 각도 보정 시간 단축, 일관성 향상 |
| 모드별 sync-capture | 특정 뷰어 필터 상태를 활성 뷰어 집합 전체로 전파 | 다중 슬롯 필터 실험 반복작업 절감 |
| TEMP 다중 버킷 스필오버 | 파일명 충돌 시 `TEMP -> TEMP_2 -> TEMP_3` 자동 할당 | 드롭 입력 충돌 복구 자동화, 데이터 손실 방지 |
| 필터 체인 실행 인프라 | 체인 실행 + 결과 캐시 + UI 진행률 + 비용추정 결합 | 대용량 이미지에서 예측 가능한 처리 UX |
| 하이브리드 폴더 동기화 | Electron `fs.watch` 이벤트 + Web FSA 메타 diff 이중 경로 | 플랫폼별 변경 감지를 통합하면서 I/O 비용 절감 |

---

## 4. Patent Candidate Deep Dive (8 Items)

### 4.1 특허 아이템 #1: 멀티모드 통합 비교 워크플로우 전환 구조

#### 문제정의
일반적인 비교/정렬/분석 도구는 모드 또는 화면 전환마다 작업 컨텍스트가 분리되어, 사용자 재설정 비용(파일 재로드, 뷰포트 재조정, 필터 재적용)이 크다.

#### 기술구성
1. 공통 전역 상태 모델(Zustand) 기반 모드 전환.
2. 모드 전환 시 리셋 대상과 유지 대상을 분리한 상태전이 규칙.
3. 동일 입력 경로(드래그앤드롭, 폴더 로드)와 공통 캡처/토글 인터페이스.

#### 동작 플로우
1. 사용자가 모드 전환 요청.
2. 전역 상태 구독자가 모드 변경 이벤트 감지.
3. 정책 기반으로 일부 상태(필터/선택/뷰포트)를 초기화.
4. 모드별 캔버스는 동일 파일 자원 및 공통 도구 상태를 재사용.
5. 사용자 작업이 재로드 없이 즉시 이어짐.

#### 핵심 차별점
- “모드 분리”가 아니라 “모드별 기능 집합을 공유 상태 그래프 위에 매핑”하는 구조.
- 전환 시 무조건 초기화가 아닌, 작업 지속성 중심의 선택적 초기화 로직.

#### 강점
- 대량 이미지 검토 워크플로우에서 인지 전환 비용이 낮다.
- 향후 엔터프라이즈 운영 시 사용 시간 단축을 수치화하기 쉬움.

#### 구현근거
- `src/store.ts:1106`
- `src/store.ts:1112`
- `src/App.tsx:364`
- `README_KR.md:7`

#### 침해판별 포인트
1. 서로 다른 분석 모드가 공통 상태 저장소를 사용하고 있는지.
2. 모드 전환 시 상태를 일괄 초기화하지 않고 정책적으로 유지/삭제하는지.
3. 모드 간 동일 이미지 세트가 재로딩 없이 이어지는지.

#### 설계회피 리스크
- 경쟁사가 모드별 독립 프로세스를 유지하면 회피 가능.
- 단순 “탭 UI” 형태로만 청구하면 신규성/진보성 약화 가능.

#### 권리화 난이도
- 중간 (UI 추상화가 넓어 선행기술이 많음, 상태전이 규칙을 구체화해야 함)

#### 출원 우선순위
- B

#### 청구항 스켈레톤
- 독립항(예시):  
  “복수의 이미지 분석 모드를 제공하는 시스템에 있어서, 공통 전역 상태 저장소를 통해 입력 자원과 작업 컨텍스트를 공유하고, 모드 전환 시 사전 정의된 상태전이 정책에 따라 상태 유지/초기화를 선택적으로 수행함으로써 재로딩 없이 작업을 연속 수행하는 것을 특징으로 하는 이미지 분석 방법.”
- 종속항 1: 모드 전환 시 뷰포트 중심좌표/배율의 유지 조건을 포함.
- 종속항 2: 필터 파라미터 상태의 초기화 대상/유지 대상을 모드별로 분기.
- 종속항 3: 모드 공통 캡처 옵션(라벨/그리드/미니맵) 공유를 포함.
- 종속항 4: 상태전이 정책을 사용자 프로파일에 따라 변경하는 구성을 포함.

#### English claim gist
The invention maintains a unified global state across multiple analysis modes instead of isolating each mode state.  
During mode switching, only selected states are reset while reusable context remains available.  
This enables seamless continuation of image review tasks without reloading assets or rebuilding view settings.  
The claim scope focuses on policy-driven state transition logic rather than generic tab switching UI.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"multi-view image analysis synchronized state interface patent"`
  - `"multi-modal visualization tool synchronized workflows"`
  - `"KIPRIS patent keyword search multi image analysis"`
- Top references:
  - US20160309087A1 (synchronized panoramic streams and shared state): https://patents.google.com/patent/US20160309087
  - MMVT (multi-modal visualization workflow): https://arxiv.org/abs/1912.10079
  - KIPRIS Plus Patent API catalog (reproducible KR search entry): https://plus.kipris.or.kr/eng/data/service/DBII_000000000000001/view.do?menuNo=300100&subTab=SC001
- 차별 포인트:
  - compareX는 영상 스트림 동기보다 **모드 간 상태전이 정책과 분석 컨텍스트 유지**에 초점.

---

### 4.2 특허 아이템 #2: Pinpoint 참조점 고정 기반 회전/배율 정합 변환

#### 문제정의
다중 이미지 정렬에서 회전/확대가 동시에 적용되면 동일 기준점을 화면상 동일 위치에 유지하기 어렵고, 정밀 비교 오차가 누적된다.

#### 기술구성
1. 참조 이미지 좌표(`refPoint`)와 화면 기준점(`refScreenX/Y`) 분리.
2. 로컬 스케일과 글로벌 스케일 곱으로 총 배율 계산.
3. 회전 행렬을 포함한 정방향/역방향 변환 계산.

#### 동작 플로우
1. 참조점과 현재 배율/회전 상태를 수집.
2. 참조점이 화면 기준점에 고정되도록 `drawX/drawY` 계산.
3. 렌더링 중 사용자 클릭 좌표를 `screenToImage`로 역투영.
4. 역투영 결과를 다시 정합/줌/핀 동작에 사용.

#### 핵심 차별점
- 참조점 고정(anchor lock)과 회전/배율 결합을 동일 수식계에서 처리.
- 역변환 결과를 인터랙션(핀/줌/미니맵)에 재사용하는 폐루프 구조.

#### 강점
- 정밀 계측/불량 분석 등 고정밀 도메인에서 실사용 가치가 큼.
- 침해 판단 시 수학적 처리 절차가 명확해 증거 확보가 용이.

#### 구현근거
- `src/utils/viewTransforms.ts:14`
- `src/utils/viewTransforms.ts:80`
- `src/components/ImageCanvas.tsx:1146`
- `src/components/Minimap.tsx:53`

#### 침해판별 포인트
1. 기준 이미지 점과 화면 기준점을 분리 관리하는지.
2. 로컬/글로벌 스케일을 분리 후 합성해 변환하는지.
3. 역변환 함수를 통해 클릭 좌표를 이미지 좌표로 환산하는지.

#### 설계회피 리스크
- 기준점 대신 단순 중심 고정 전략으로 회피 가능.
- 변환식을 블랙박스 모델(학습모델)로 대체 시 증명 난도 상승.

#### 권리화 난이도
- 중간~낮음 (구성요소가 명확하고 효과가 직접적)

#### 출원 우선순위
- A

#### 청구항 스켈레톤
- 독립항(예시):  
  “기준 이미지 좌표와 화면 기준좌표를 이용해 복수 이미지의 회전 및 배율 변환을 수행하는 방법에 있어서, 로컬 배율과 글로벌 배율을 결합한 총 배율 및 회전각에 따라 기준 이미지 점이 화면 기준점에 고정되도록 렌더링 오프셋을 산출하고, 사용자 입력 화면좌표를 역변환하여 이미지좌표로 환산하는 단계를 포함하는 것을 특징으로 하는 정합 방법.”
- 종속항 1: 총 배율 계산식이 로컬×글로벌 곱셈 형태임을 한정.
- 종속항 2: 화면 기준점이 사용자 인터랙션으로 이동 가능함을 포함.
- 종속항 3: 역변환 결과를 확대 중심점 결정에 재사용하는 단계를 포함.
- 종속항 4: 동일 변환을 미니맵 표시좌표에 적용하는 단계를 포함.

#### English claim gist
The method anchors a reference image point to a screen-space reference while applying combined local and global scaling with rotation.  
It computes rendering offsets so the anchor remains stable under transform updates.  
User interactions are mapped back to image space through inverse transform and reused in subsequent alignment actions.  
The claim emphasizes deterministic transform coupling and interaction feedback integration.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"landmark based image registration patent anchor point rotation scale"`
  - `"keypoint registration affine transform arxiv"`
  - `"KIPRIS image registration landmark search"`
- Top references:
  - US6009212A (image registration with selected points): https://patents.google.com/patent/US6009212A/en
  - WO2023044071A1 (landmark-based alignment/registration): https://patents.google.com/patent/WO2023044071A1/en
  - KeyMorph (keypoint-based registration): https://arxiv.org/abs/2304.09941
- 차별 포인트:
  - compareX는 의료 전용 등록 알고리즘보다 **실시간 인터랙션용 앵커 고정 렌더링 + 역투영 루프**에 초점.

---

### 4.3 특허 아이템 #3: 회전 안전(Rect-zoom) 역변환 줌 결정 로직

#### 문제정의
회전된 이미지에서 일반 사각 줌은 화면상의 선택 영역과 실제 확대 결과가 불일치하기 쉽다.

#### 기술구성
1. 1차 클릭으로 사각 선택 시작점 고정, 2차 클릭으로 종료.
2. 선택 중심점을 역회전/역스케일로 이미지 공간에 변환.
3. 선택 폭/높이 대비 캔버스 비율로 차기 스케일 계산.

#### 동작 플로우
1. 사용자 1차 클릭 시 시작점 저장.
2. 마우스 이동으로 프리뷰 사각형 표시.
3. 2차 클릭 시 선택 영역 확정.
4. 선택 중심을 이미지 좌표로 역변환.
5. scaleFactor 적용 후 새 뷰포트 중심/배율 업데이트.

#### 핵심 차별점
- 회전이 있는 상태에서도 선택 영역의 의미를 보존하는 역변환 기반 확대.
- Pinpoint 개별 줌과 Compare/Analysis 전역 줌을 동일 인터랙션 패턴으로 제공.

#### 강점
- 사용자 체감 정확도가 높고 학습비용이 낮다.
- 엔드유저 설명이 쉬워 상용 UX 차별화 포인트로 활용 가능.

#### 구현근거
- `src/components/ImageCanvas.tsx:1129`
- `src/components/ImageCanvas.tsx:1204`
- `src/components/ImageCanvas.tsx:1234`
- `src/components/ImageCanvas.tsx:1347`

#### 침해판별 포인트
1. 회전이 적용된 상태에서 사각형 중심의 역변환 계산 여부.
2. 선택폭 기반 scaleFactor 계산 후 뷰포트 갱신 여부.
3. 2클릭 확정형 인터랙션 여부.

#### 설계회피 리스크
- 드래그 릴리즈 방식으로 UI를 바꾸거나 회전 지원을 제외하면 회피 가능.
- 특허청구가 단순 “사각 줌” 표현이면 무효 가능성 큼.

#### 권리화 난이도
- 중간

#### 출원 우선순위
- B+

#### 청구항 스켈레톤
- 독립항(예시):  
  “회전된 이미지에 대한 사각 확대 제어 방법에 있어서, 화면에서 선택된 사각 영역의 중심점을 회전 역변환 및 배율 역변환하여 원본 이미지 좌표로 변환하고, 상기 사각 영역의 크기와 표시영역 크기의 비율에 따라 확대배율을 산출하여 차기 뷰포트를 결정하는 단계를 포함하는 것을 특징으로 하는 방법.”
- 종속항 1: 2클릭 방식의 시작/종료점 확정 절차 포함.
- 종속항 2: 프리뷰 사각형 표시 단계 포함.
- 종속항 3: 모드별(개별/전역) 줌 대상을 분기하는 단계 포함.
- 종속항 4: 배율 상한/하한 클램프 단계를 포함.

#### English claim gist
The method applies rectangle-based zoom under arbitrary image rotation by mapping the selected rectangle center back to image coordinates.  
A new scale is computed from the ratio between canvas size and selected rectangle size.  
The viewport is updated with rotation-safe center and scale values.  
The scope focuses on transform-consistent zoom decision logic rather than generic rectangle selection UI.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"zoom window gesture patent rotated image viewer"`
  - `"image panning zooming effect patent"`
  - `"KIPRIS zoom viewer patent search"`
- Top references:
  - WO2020131536A1 (interactive viewing/editing; zoom window): https://patents.google.com/patent/WO2020131536A1/en
  - US10459621B2 (image panning and zooming effect): https://patents.google.com/patent/US10459621B2/en
  - Methods and apparatus for navigating an image: https://patents.google.com/patent/US20070047101A1/en
- 차별 포인트:
  - compareX는 제스처 일반론이 아니라 **역변환 중심 기반의 회전 안전 줌 결정식**이 핵심.

---

### 4.4 특허 아이템 #4: 2점 레벨링 캡처 기반 축 정렬 자동 회전 보정

#### 문제정의
정렬 작업에서 기준선 수평/수직 보정을 반복 수동으로 수행하면 편차와 시간이 크게 증가한다.

#### 기술구성
1. 레벨링 캡처 상태머신(활성/타깃/포인트/축).
2. 2개 점 선택 후 `atan2`로 각도 계산.
3. 축(horizontal/vertical)별 delta 변환.
4. 모드별 회전 파라미터(개별/전역)에 적용.

#### 동작 플로우
1. 레벨링 모드 시작(축 지정).
2. 첫 점 선택 시 타깃 캔버스 확정.
3. 두 번째 점 선택 시 각도 산출.
4. 축 기준으로 회전 delta 계산.
5. 해당 모드 회전값 갱신 후 캡처 상태 종료.

#### 핵심 차별점
- 단순 측정이 아니라 “입력 2점 -> 축 기준 각도 보정 -> 회전 상태 반영” 자동화 파이프.
- Pinpoint(개별/전역), Compare, Analysis에 동일 패턴으로 적용.

#### 강점
- 실무 사용자에게 즉시 가치가 전달되는 기능.
- 각도 계산 및 반영 절차가 코드로 명확해 권리화 문서화 용이.

#### 구현근거
- `src/store.ts:1000`
- `src/store.ts:1014`
- `src/store.ts:1039`
- `src/components/ImageCanvas.tsx:1628`

#### 침해판별 포인트
1. 2점 캡처 후 축 기준 delta 계산 수행 여부.
2. 수평/수직 모드 선택을 제공하는지.
3. 캡처 종료 시 자동 회전 반영 여부.

#### 설계회피 리스크
- 3점 이상 또는 외부 피처기반 자동정렬로 우회 가능.
- 기능이 UX만 강조되면 기술적 진보 주장 약화 위험.

#### 권리화 난이도
- 중간~낮음

#### 출원 우선순위
- A

#### 청구항 스켈레톤
- 독립항(예시):  
  “영상 정렬 보정 방법에 있어서, 사용자에 의해 선택된 제1점 및 제2점의 좌표로부터 기울기 각도를 계산하고, 사전 선택된 기준축(수평 또는 수직)에 대한 각도 오차를 산출하여 대상 이미지 또는 이미지 집합의 회전값을 자동 보정하는 단계를 포함하는 것을 특징으로 하는 방법.”
- 종속항 1: 대상 이미지가 모드별로 개별/전역 선택 가능함을 포함.
- 종속항 2: 제1점 선택 시 대상 캔버스를 자동 고정하는 단계 포함.
- 종속항 3: 각도값 정규화(0~360) 단계 포함.
- 종속항 4: 보정 완료 후 레벨링 상태를 자동 종료하는 단계 포함.

#### English claim gist
The method uses two user-selected points to compute orientation error relative to a selected axis (horizontal or vertical).  
The computed error is converted into a rotation correction and automatically applied to target image states.  
The flow includes target locking on first click and automatic state termination after correction.  
This is an interaction-driven alignment correction pipeline rather than passive angle measurement.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"landmark based alignment patent rotation correction"`
  - `"distance map supervised landmark localization registration arxiv"`
  - `"KIPRIS alignment correction patent search"`
- Top references:
  - WO2023044071A1 (landmark-based alignment): https://patents.google.com/patent/WO2023044071A1/en
  - US12165293B2 (global/local alignment with landmarks): https://patents.google.com/patent/US12165293B2/en
  - Distance Map Supervised Landmark Localization: https://arxiv.org/abs/2210.05738
- 차별 포인트:
  - compareX는 복잡한 의료 장비 캘리브레이션보다 **사용자 2점 입력 기반 즉시 보정 루프**에 집중.

---

### 4.5 특허 아이템 #5: 모드별 필터 상태 동기 전파 (sync-capture)

#### 문제정의
다중 뷰어에서 동일 필터 조건을 반복 수작업 적용하면 실험 재현성과 속도가 떨어진다.

#### 기술구성
1. sync-capture 활성 상태와 대상 모드(`compare/pinpoint/analysis`) 저장.
2. 특정 타깃 뷰어의 필터 타입/파라미터 추출.
3. 활성 배열(뷰어 수)에 맞춰 일괄 전파.

#### 동작 플로우
1. 사용자 sync 모드 활성화.
2. 기준 뷰어 선택.
3. 기준 필터/파라미터를 활성 뷰어 집합에 전파.
4. sync 상태 종료 및 UI 갱신.

#### 핵심 차별점
- 모드별 데이터 구조(문자 키 vs 인덱스 키)를 통합하는 전파 로직.
- 파라미터 없음(null) 케이스까지 일관 처리.

#### 강점
- 실험 설계 시간 절감, 재현성 확보.
- 향후 자동 실험(배치 테스트) 기능 확장 기반.

#### 구현근거
- `src/store.ts:949`
- `src/store.ts:956`
- `src/store.ts:979`
- `src/App.tsx:1263`

#### 침해판별 포인트
1. 기준 뷰어 선택 후 필터 상태 일괄 복제 여부.
2. 모드별 키 구조 차이를 내부에서 추상화하는지.
3. sync 종료 상태 리셋 절차 보유 여부.

#### 설계회피 리스크
- 경쟁사가 프리셋 기반 적용으로 우회 가능.
- 단순 “복사 버튼” 수준으로 청구 시 진보성 약화.

#### 권리화 난이도
- 중간

#### 출원 우선순위
- B

#### 청구항 스켈레톤
- 독립항(예시):  
  “다중 뷰어 이미지 분석 시스템에서 필터 설정 동기화 방법에 있어서, 기준 뷰어로부터 필터 유형 및 파라미터를 추출하고, 현재 활성 모드의 뷰어 집합에 대응하는 키 구조에 맞추어 상기 필터 설정을 일괄 반영하며, 동기화 완료 후 동기화 상태를 비활성화하는 단계를 포함하는 것을 특징으로 하는 방법.”
- 종속항 1: 뷰어 키가 문자 기반인 모드와 인덱스 기반 모드를 모두 지원.
- 종속항 2: 파라미터 미존재 시 대상 파라미터를 삭제 처리.
- 종속항 3: 활성 뷰어 범위를 레이아웃/뷰어 수에 따라 제한.
- 종속항 4: 동기화 진행 상태를 UI에 표시.

#### English claim gist
The invention propagates filter type and parameters from a selected source viewer to all active viewers within the current mode.  
It handles heterogeneous key models across modes and preserves null-parameter semantics.  
After propagation, synchronization state is reset to avoid unintended repeated application.  
The claim focuses on mode-aware bulk propagation logic for reproducible image analysis.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"synchronized state across multiple image views patent"`
  - `"multi-view synchronized panoramic playback patent"`
  - `"KIPRIS synchronized image processing settings search"`
- Top references:
  - US20160309087A1 (synchronized state across panoramic feeds): https://patents.google.com/patent/US20160309087
  - MMVT (simultaneous multi-modal visualization): https://arxiv.org/abs/1912.10079
  - KIPRIS Plus search catalog (KR retrieval entry): https://plus.kipris.or.kr/eng/search/clasList/List.do?menuNo=310000&subTab=SC011
- 차별 포인트:
  - compareX는 비디오 시간 동기화가 아니라 **필터 상태의 모드인지적 일괄 전파**가 본질.

---

### 4.6 특허 아이템 #6: 파일명 충돌 회피 TEMP 다중 버킷 스필오버 배치

#### 문제정의
대량 이미지 드롭 시 동일 파일명 충돌로 덮어쓰기/누락이 발생하기 쉽다.

#### 기술구성
1. alias->key 매핑 및 예약 키 집합 관리.
2. `TEMP`, `TEMP_2`, `TEMP_3...` 단계적 버킷 할당.
3. 기존 파일/대기열 파일 동시 충돌 검사.
4. 버킷별 머지 저장 및 요약 토스트.

#### 동작 플로우
1. 드롭 파일 집합 수신.
2. TEMP 슬롯 확보/예약.
3. 각 파일마다 충돌 없는 버킷 탐색.
4. 버킷별 병합 저장.
5. 사용자에게 배치 결과 요약 제공.

#### 핵심 차별점
- 비동기 상태 업데이트 경쟁조건을 피하기 위한 로컬 예약 맵 사용.
- 충돌 해결을 단일 폴더 덮어쓰기가 아닌 다중 버킷 분산으로 처리.

#### 강점
- 현업에서 자주 발생하는 드롭 충돌 문제를 손실 없이 처리.
- 대량 입력 자동화 기능으로 도입장벽 감소.

#### 구현근거
- `src/modes/CompareMode.tsx:120`
- `src/modes/PinpointMode.tsx:155`
- `src/modes/AnalysisMode.tsx:138`
- `src/utils/dragDrop.ts:96`

#### 침해판별 포인트
1. 임시 슬롯 다단계 스필오버 구조 보유 여부.
2. alias-key 예약으로 충돌 탐색을 수행하는지.
3. 기존+신규 큐 충돌을 동시에 검사하는지.

#### 설계회피 리스크
- 고유 해시명으로 즉시 rename하면 회피 가능.
- 기능이 일반 파일시스템 충돌해결로 해석되면 범용성 과다.

#### 권리화 난이도
- 중간~높음 (범용 파일관리 선행기술이 많음)

#### 출원 우선순위
- C+

#### 청구항 스켈레톤
- 독립항(예시):  
  “이미지 배치 입력 처리 방법에 있어서, 입력 이미지 파일명 충돌을 감지하면 기본 임시 버킷으로부터 순차 인덱스가 부여된 복수 임시 버킷으로 배치 대상을 스필오버시키고, 버킷 예약 맵을 이용해 비동기 상태 갱신에 따른 충돌을 회피하면서 파일 집합을 병합 저장하는 단계를 포함하는 것을 특징으로 하는 방법.”
- 종속항 1: 기본 버킷 명칭이 `TEMP`이고 스필오버 버킷이 `TEMP_n` 형태임을 한정.
- 종속항 2: 충돌 판단 시 기존 저장 데이터와 대기열 데이터를 함께 비교.
- 종속항 3: 버킷별 처리 결과를 사용자 피드백으로 출력.
- 종속항 4: 모드별 공통 배치 유틸로 재사용.

#### English claim gist
The method resolves filename conflicts during bulk image drop by assigning files into sequential temporary buckets (TEMP, TEMP_2, ...).  
A reservation map is used to avoid race conditions from asynchronous state updates.  
Conflict checks include both existing stored files and pending bucket assignments before merge persistence.  
The scope targets deterministic spillover allocation for collision-safe bulk intake.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"conflict management file synchronization patent"`
  - `"image pool naming conflict patent"`
  - `"KIPRIS file conflict metadata search"`
- Top references:
  - US20130124612A1 (conflict management in synchronization): https://patents.google.com/patent/US20130124612
  - US20030113038A1 (image pool naming / replacement behavior): https://patents.google.com/patent/US20030113038A1/en
  - KIPRIS citing/cited metadata source (KR prior-art expansion entry): https://plus.kipris.or.kr/eng/data/clasList/DBII_000000000000334/view.do%3Bjsessionid%3D0B41605BC2BD8B0A06AA15B95F5138C6.9f54eac2acae00402?clasKeyword=&entYn=&kppSCode=KPP010305&menuNo=310000&subTab=
- 차별 포인트:
  - compareX는 일반 sync 충돌이 아닌 **이미지 실험 워크스페이스의 임시 버킷 자동 배치**에 특화.

---

### 4.7 특허 아이템 #7: 체인형 필터 실행 캐시 + 진행률 + 비용추정 결합 구조

#### 문제정의
필터 체인이 길어질수록 처리시간 예측이 어렵고 반복 실행 비용이 커진다.

#### 기술구성
1. 체인 활성 아이템 필터링 및 순차 실행.
2. 이미지 해시 + 체인 파라미터 기반 결과 캐시 키.
3. 캐시 히트 시 진행률 시뮬레이션 유지.
4. 필터별 단위 비용 사전테이블 기반 처리시간 추정.

#### 동작 플로우
1. 활성 체인 추출.
2. 캐시 조회 후 히트 시 결과 복제 반환.
3. 미스 시 필터 순차 적용/중간 캔버스 관리.
4. 결과 캐싱 및 캐시 사이즈 정리.
5. 비용추정 함수로 UI 성능 게이지 제공.

#### 핵심 차별점
- “실행엔진 + UX 진행률 + 사전 비용모델”을 분리하지 않고 한 파이프라인으로 결합.
- 체인 프리뷰/카트 편집 루프와 직접 연동.

#### 강점
- 엔터프라이즈 데모/세일즈 시 체감 성능과 예측가능성을 동시에 제시 가능.
- 기술문서화가 구조적으로 명확해 분할 출원(엔진/추정) 가능성.

#### 구현근거
- `src/utils/filterChain.ts:69`
- `src/utils/filterChain.ts:130`
- `src/utils/filterChain.ts:184`
- `src/components/FilterCart.tsx:166`

#### 침해판별 포인트
1. 체인 파라미터 포함 캐시 키 구성 여부.
2. 캐시 히트 상황에서도 UI 진행률 피드백 제공 여부.
3. 필터 타입별 단위비용 모델로 시간 추정 제공 여부.

#### 설계회피 리스크
- 캐시/추정을 분리 모듈로 완전 분할하면 회피 가능.
- 비용추정 정확도 근거 부족 시 기술효과 입증 약화.

#### 권리화 난이도
- 중간~낮음

#### 출원 우선순위
- A

#### 청구항 스켈레톤
- 독립항(예시):  
  “복수 필터 체인 처리 방법에 있어서, 입력 이미지 특징값 및 활성 필터 파라미터 조합으로 캐시 키를 생성하여 체인 처리 결과를 캐시하고, 캐시 조회 결과에 따라 실행 경로를 전환하며, 필터별 연산비용 테이블을 이용해 처리시간을 추정하고 진행률 정보를 출력하는 단계를 포함하는 것을 특징으로 하는 방법.”
- 종속항 1: 캐시 적중 시 결과 복제 반환과 함께 진행률 시뮬레이션 출력.
- 종속항 2: 캐시 크기 상한 초과 시 선입 항목 정리 단계 포함.
- 종속항 3: 중첩 체인(filterchain) 재귀 실행 지원.
- 종속항 4: 비용추정에 커널 크기 등 파라미터 가중치를 반영.
- 종속항 5: 비용추정 결과를 UI 경고/색상 표시로 제공.

#### English claim gist
The method integrates filter-chain execution, parameterized result caching, progress reporting, and computational cost estimation in one processing loop.  
Cache keys are generated from image descriptors and active filter parameters.  
The pipeline switches execution paths based on cache hit/miss while preserving user feedback consistency.  
A per-filter cost model estimates processing time and is surfaced to the UI for planning.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"method of creating image chain patent"`
  - `"image chain command processing patent"`
  - `"image signal processing pipeline learning arxiv"`
- Top references:
  - EP3567544B1 (method of creating an image chain): https://patents.google.com/patent/EP3567544B1/en
  - US20030113038A1 (image chain command representation): https://patents.google.com/patent/US20030113038A1/en
  - CameraNet (two-stage ISP pipeline learning): https://arxiv.org/abs/1908.01481
- 차별 포인트:
  - compareX는 영상 장치 내부 ISP 최적화가 아니라 **인터랙티브 체인 실험 환경에서 캐시/진행률/비용추정을 통합**.

---

### 4.8 특허 아이템 #8: 하이브리드 폴더 동기화 (Electron watch + Web 메타 diff)

#### 문제정의
웹/데스크톱 겸용 앱에서 폴더 변경 감지는 플랫폼별 제약이 달라 단일 방식으로는 정확성과 성능을 동시에 확보하기 어렵다.

#### 기술구성
1. 소스 유형(`picker`/`electron`/`files`) 메타모델.
2. Electron 경로: `fs.watch` 이벤트 + 디바운스 리프레시.
3. Web 경로: 주기적 메타(`mtime,size`) 스캔 + 변경분만 재로딩.
4. 변경 없으면 스킵, 변경분만 반영(diff 적용).

#### 동작 플로우
1. 폴더 소스 유형 식별.
2. Electron이면 watcher 등록, 이벤트 수신 시 디바운스 refresh.
3. Web FSA면 interval tick에서 메타 비교.
4. changed file만 readFile/getFile 수행.
5. 추가/수정/삭제 요약을 UI에 통지.

#### 핵심 차별점
- 이벤트 기반과 폴링 기반을 소스 유형에 따라 혼합 운용.
- 파일 내용이 아니라 메타 우선 비교로 I/O 최소화.

#### 강점
- 크로스플랫폼 제품에서 운영 안정성과 성능을 동시에 확보.
- 실사용 환경(대량 파일)에서 비용 절감 효과가 명확.

#### 구현근거
- `src/utils/folderSync.ts:44`
- `src/utils/folderSync.ts:87`
- `src/hooks/useElectronFolderWatcher.ts:29`
- `src/hooks/useFolderSync.ts:13`
- `electron.js:302`

#### 침해판별 포인트
1. 소스 유형별 동기화 전략 분기 여부.
2. 이벤트 경로에서 디바운스 갱신 수행 여부.
3. 메타 diff 후 변경 파일만 재읽기 수행 여부.

#### 설계회피 리스크
- 단일 클라우드 동기화 백엔드로 완전 위임 시 회피 가능.
- 플랫폼 분기 없는 단순 폴링 방식은 회피 여지 큼.

#### 권리화 난이도
- 중간

#### 출원 우선순위
- A-

#### 청구항 스켈레톤
- 독립항(예시):  
  “복수 실행환경을 지원하는 폴더 동기화 방법에 있어서, 폴더 소스 유형을 판별하여 제1유형에 대해서는 파일시스템 이벤트 기반 감시 및 디바운스 갱신을 수행하고, 제2유형에 대해서는 파일 메타데이터 비교 기반 주기 스캔을 수행하며, 변경이 검출된 파일에 한하여 재로딩을 수행하는 단계를 포함하는 것을 특징으로 하는 방법.”
- 종속항 1: 메타데이터가 수정시각과 파일크기를 포함.
- 종속항 2: 이벤트 수신 후 사전 정의 지연시간 디바운스를 적용.
- 종속항 3: 추가/수정/삭제 건수를 사용자 알림으로 제공.
- 종속항 4: 소스 유형이 `files`인 경우 수동 갱신 인터페이스를 제공.

#### English claim gist
The synchronization method selects different update mechanisms based on folder source type across heterogeneous runtime environments.  
For desktop-backed sources, it uses event-driven watching with debounce.  
For browser-backed sources, it performs metadata-based periodic diff and reloads only changed files.  
The claim emphasizes hybrid strategy selection and selective reload for I/O-efficient consistency.

#### Prior-art quick check (2026-02-26)
- Query:
  - `"network folder synchronization metadata patent"`
  - `"cloud metadata indexing synchronization patent"`
  - `"KIPRIS folder synchronization patent search"`
- Top references:
  - US10148730B2 (network folder synchronization): https://patents.google.com/patent/US10148730
  - US8296338B2 (metadata-index virtual sync): https://patents.google.com/patent/US8296338B2/en
  - US20130124612A1 (conflict management during synchronization): https://patents.google.com/patent/US20130124612
- 차별 포인트:
  - compareX는 클라우드 동기화 자체보다 **런타임별 감시 전략 하이브리드 선택 + 변경분 로딩 최적화**를 구현.

---

## 5. Prior-art Quick Check Log

검색일: **2026-02-26**

| 아이템 | 검색 쿼리(요약) | 상위 유사 레퍼런스 (2~3) | 1차 판단 |
| --- | --- | --- | --- |
| #1 멀티모드 워크플로우 | multi-view synchronized state | US20160309087A1, MMVT(arXiv), KIPRIS API catalog | 선행기술 다수, 상태전이 규칙으로 차별화 필요 |
| #2 참조점 정합 변환 | landmark registration anchor transform | US6009212A, WO2023044071A1, KeyMorph | 구현 차별 명확, 우선권리화 유리 |
| #3 회전 안전 Rect-zoom | zoom window rotated viewer | WO2020131536A1, US10459621B2, US20070047101A1 | 일반 줌 선행 다수, 역변환 계산식으로 한정 필요 |
| #4 2점 레벨링 보정 | two-point alignment rotation correction | WO2023044071A1, US12165293B2, DistanceMap(arXiv) | 상호작용형 자동보정 흐름으로 차별 가능 |
| #5 sync-capture 전파 | synchronized multi-view settings | US20160309087A1, MMVT(arXiv), KIPRIS catalog | UX 개념보다 모드인지 전파 로직 중심 필요 |
| #6 TEMP 스필오버 | filename conflict spillover | US20130124612A1, US20030113038A1, KIPRIS citation data | 범용 파일충돌 선행 강함, 워크스페이스 특화 강조 |
| #7 필터체인 실행 인프라 | image chain + cache + estimate | EP3567544B1, US20030113038A1, CameraNet(arXiv) | 통합 파이프라인 구성에서 차별 여지 큼 |
| #8 하이브리드 폴더 동기화 | metadata diff + folder watch | US10148730B2, US8296338B2, US20130124612A1 | 침해판별 용이, 실무 도입가치 높음 |

참고: KIPRIS는 공개 포털/오픈API 구조상 인증·세부검색 제약이 있어 본 문서에서는 재현 가능한 카탈로그/서비스 진입점을 함께 기록함.

---

## 6. Portfolio Prioritization Matrix

평가축(각 5점): 신규성 잠재력 / 비자명성 잠재력 / 침해탐지 용이성 / 제품 핵심성 / 구현성숙도

| 순위 | 아이템 | 신규성 | 비자명성 | 침해탐지 | 제품핵심 | 성숙도 | 총점 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #2 Pinpoint 참조점 정합 변환 | 5 | 5 | 4 | 5 | 4 | **23** |
| 2 | #4 2점 레벨링 자동 보정 | 4 | 5 | 4 | 5 | 4 | **22** |
| 3 | #7 필터체인 실행/캐시/추정 결합 | 4 | 4 | 4 | 5 | 5 | **22** |
| 4 | #8 하이브리드 폴더 동기화 | 3 | 4 | 5 | 5 | 4 | **21** |
| 5 | #3 회전 안전 Rect-zoom | 4 | 4 | 4 | 4 | 4 | **20** |
| 6 | #5 sync-capture 전파 | 3 | 4 | 4 | 4 | 4 | **19** |
| 7 | #1 멀티모드 통합 워크플로우 | 3 | 3 | 4 | 4 | 4 | **18** |
| 8 | #6 TEMP 스필오버 배치 | 3 | 3 | 3 | 3 | 4 | **16** |

권고:
1. 1차 출원군: #2, #4, #7
2. 2차 출원군: #8, #3
3. 방어적 출원 검토군: #5, #1, #6

---

## 7. KR-first + PCT Filing Roadmap

### 0~2개월: KR 초안 고정
1. #2/#4/#7 중심으로 발명의 명칭, 배경기술, 실시예, 효과 정리.
2. 저장소 코드 기반 블록 다이어그램 작성.
3. 청구항 1차 세트(독립/종속)와 도면목록 초안 작성.

### 3~6개월: 보정/증빙 강화
1. 기능별 성능/정확도 실험로그(정합 오차, 처리시간, I/O 절감) 축적.
2. 회피설계 시나리오 반영하여 종속항 확장.
3. 국내 OA(의견제출통지) 대응용 대체 청구군 사전 준비.

### 12개월 이내: PCT 진입
1. KR 우선권 주장 기반 PCT 출원.
2. 청구군 분할 전략:
   - 정합군: #2/#4/#3
   - 필터군: #7/#5
   - 동기화군: #8/#6
3. 미국/유럽/일본 진입 여부를 시장성과 침해가능성 기준으로 결정.

필요 증빙 산출물(권장):
1. 기능별 동작 시퀀스 다이어그램
2. 테스트 로그(전/후 비교 스크린샷, 시간 지표)
3. 코드 커밋 히스토리 및 릴리즈 노트

---

## 8. Trade Secret vs Patent Boundary

| 기술요소 | 특허 권고 | 영업비밀 권고 | 판단 근거 |
| --- | --- | --- | --- |
| 참조점 정합 수식/역변환 절차 (#2/#3) | 높음 | 중간 | 제품 차별 핵심이며 외부 동작으로 추정 가능 |
| 레벨링 캡처 상태머신 (#4) | 높음 | 낮음 | 사용자 노출 기능, 침해판별 용이 |
| sync-capture 전파 로직 (#5) | 중간 | 중간 | UI 노출 강하지만 내부 키 변환 로직은 은닉 가능 |
| TEMP 스필오버 버킷 로직 (#6) | 중간 | 중간 | 일반 파일관리와 경계가 가까워 명세서 정교화 필요 |
| 필터체인 캐시 키/정리 정책 (#7) | 중간 | 높음 | 세부 파라미터/비용모델은 비밀화 가치 높음 |
| 하이브리드 동기화 분기전략 (#8) | 높음 | 중간 | 제품 운영 안정성 핵심, 기술효과 명확 |

권고 원칙:
1. 사용자에게 관찰 가능한 동작 흐름은 특허화.
2. 파라미터 테이블, 튜닝 임계치, 세부 휴리스틱은 영업비밀 유지.

---

## 9. Appendix: Evidence Links (Code/Docs) & Query Log

### 9.1 저장소 근거 링크

- `src/store.ts:949`
- `src/store.ts:1000`
- `src/store.ts:1106`
- `src/App.tsx:364`
- `src/App.tsx:1263`
- `src/components/ImageCanvas.tsx:1129`
- `src/components/ImageCanvas.tsx:1204`
- `src/components/ImageCanvas.tsx:1628`
- `src/components/Minimap.tsx:53`
- `src/utils/viewTransforms.ts:14`
- `src/utils/filterChain.ts:69`
- `src/utils/filterChain.ts:184`
- `src/utils/folderSync.ts:44`
- `src/hooks/useElectronFolderWatcher.ts:29`
- `src/hooks/useFolderSync.ts:13`
- `src/modes/CompareMode.tsx:120`
- `src/modes/PinpointMode.tsx:155`
- `src/modes/AnalysisMode.tsx:138`
- `electron.js:302`
- `docs/compareX_intro_kr.md:23`
- `docs/folder-change-sync-plan.md:12`
- `README_KR.md:7`

### 9.2 외부 레퍼런스 (Google Patents / arXiv / KIPRIS)

Google Patents:
- https://patents.google.com/patent/US6009212A/en
- https://patents.google.com/patent/WO2023044071A1/en
- https://patents.google.com/patent/WO2020131536A1/en
- https://patents.google.com/patent/US10459621B2/en
- https://patents.google.com/patent/US20160309087
- https://patents.google.com/patent/US20130124612
- https://patents.google.com/patent/US20030113038A1/en
- https://patents.google.com/patent/EP3567544B1/en
- https://patents.google.com/patent/US10148730
- https://patents.google.com/patent/US8296338B2/en
- https://patents.google.com/patent/US12165293B2/en

arXiv:
- https://arxiv.org/abs/2307.15615
- https://arxiv.org/abs/2304.09941
- https://arxiv.org/abs/2210.05738
- https://arxiv.org/abs/2105.05521
- https://arxiv.org/abs/1912.10079
- https://arxiv.org/abs/1908.01481

KIPRIS / KIPRIS Plus:
- https://plus.kipris.or.kr/eng/data/service/DBII_000000000000001/view.do?menuNo=300100&subTab=SC001
- https://plus.kipris.or.kr/eng/data/clasList/DBII_000000000000024/view.do?kppSCode=KPP010305&menuNo=310000
- https://plus.kipris.or.kr/eng/search/clasList/List.do?menuNo=310000&subTab=SC011
- https://plus.kipris.or.kr/eng/data/clasList/DBII_000000000000334/view.do%3Bjsessionid%3D0B41605BC2BD8B0A06AA15B95F5138C6.9f54eac2acae00402?clasKeyword=&entYn=&kppSCode=KPP010305&menuNo=310000&subTab=

### 9.3 Query Log (요약)

검색일: 2026-02-26

1. `landmark based image registration patent anchor point rotation scale`
2. `zoom window gesture patent rotated image viewer`
3. `method of creating image chain patent`
4. `network folder synchronization metadata patent`
5. `site:arxiv.org keypoint registration`
6. `site:arxiv.org image registration landmark localization`
7. `KIPRIS Plus patent API search catalog`

---

## 품질 게이트 체크리스트 (완료 기준)

- [x] 문서 생성 경로가 `STRATEGY/PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md`인지 확인
- [x] 특허 아이템이 정확히 8개인지 확인
- [x] 각 아이템에 고정 10개 섹션 + 청구항 스켈레톤 포함 확인
- [x] 각 아이템에 구현근거 2개 이상 포함 확인
- [x] 각 아이템에 선행기술 2~3개와 검색 쿼리/날짜 포함 확인
- [x] 한국어 본문 + English Abstract 포함 확인
- [x] 포트폴리오 우선순위 매트릭스(5개 평가축, 총점 정렬) 포함 확인

