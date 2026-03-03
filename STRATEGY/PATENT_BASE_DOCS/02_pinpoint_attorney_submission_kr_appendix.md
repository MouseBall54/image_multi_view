# compareX Pinpoint 변리사 제출본 부록 (KR)
## 근거 분리본: 코드 매핑, 선행기술 로그, 실험 템플릿

> 본 부록은 [02_pinpoint_attorney_submission_kr.md](./02_pinpoint_attorney_submission_kr.md)의 근거자료 분리본이다.

## 1. 코드 근거 매핑표

| 본문 주장 | 코드 근거 | 확인 포인트 |
| --- | --- | --- |
| 최대 24 표시창 지원 | `src/components/LayoutGridSelector.tsx` | `MAX_VIEWERS = 24` 상수 정의 |
| Pinpoint 모드에서 레이아웃/입력모드/전역 제어 제공 | `src/App.tsx` | Mode=pinpoint, Layout selector, Mouse Pin/Pan, Global controls |
| 창별 기준 참조점 저장 + 공통 화면 기준좌표 갱신 | `src/modes/PinpointMode.tsx` | `handleSetRefPoint` 내 refPoint 저장 및 viewport 갱신 |
| 표시 슬롯 배치 및 동일 파일 다중 표시창 운용 | `src/modes/PinpointMode.tsx` | `loadFileToViewer`, `getFileViewerKeys` |
| 기준 참조점 입력 시 역방향 좌표 환산 수행 | `src/components/ImageCanvas.tsx` | 클릭 입력 시 역방향 계산 후 refPoint 설정 |
| 공통 화면 기준좌표 갱신 기반 동기 이동 | `src/components/ImageCanvas.tsx` | Pan 시 refScreenX/refScreenY 동시 갱신 |
| 정방향 배치 변환 함수 | `src/utils/viewTransforms.ts` | `computePinpointTransform` |
| 역방향 좌표 환산 함수 | `src/utils/viewTransforms.ts` | `screenToImage` |
| shift/swap 재배치 | `src/store.ts` | `reorderViewers` 분기 처리 |

## 2. 핵심 근거 라인 인덱스

| 파일 | 라인(참조) | 핵심 내용 |
| --- | --- | --- |
| `src/components/LayoutGridSelector.tsx` | 27-30 | 최대 표시창 24 제한 |
| `src/App.tsx` | 1200-1252 | Pinpoint 모드 제어 집합 |
| `src/modes/PinpointMode.tsx` | 451-461 | 동일 파일 다중 표시창 추적 |
| `src/modes/PinpointMode.tsx` | 478-488 | 기준 참조점 저장/공통 화면 기준좌표 갱신 |
| `src/modes/PinpointMode.tsx` | 507-543 | 표시 슬롯 배치 |
| `src/components/ImageCanvas.tsx` | 1044-1091 | 클릭 입력 역방향 좌표 환산 |
| `src/components/ImageCanvas.tsx` | 1459-1464 | 동기 이동 좌표 갱신 |
| `src/utils/viewTransforms.ts` | 14-45 | 정방향 배치 변환 |
| `src/utils/viewTransforms.ts` | 80-91 | 역방향 좌표 환산 |
| `src/store.ts` | 1058-1084 | shift/swap 재배치 |

## 3. 외부 선행기술 조사 로그

### 3.1 조사 개요
1. 조사일: 2026-03-03
2. 소스: Google Patents, Justia
3. 목적: 자동 정렬 중심 문헌과 사용자 주도 정합 운영 체계의 차별축 확인

### 3.2 채택 문헌 목록
1. US8890887B2 — Synchronized image browsing  
   URL: https://patents.google.com/patent/US8890887B2/en
2. US20090040186A1 — Displaying Multiple Synchronized Images  
   URL: https://patents.google.com/patent/US20090040186A1/en
3. US12266143B2 — Salient feature point based alignment  
   URL: https://patents.google.com/patent/US12266143B2/en
4. US10088658B2 — Referencing in multi-acquisition slide imaging  
   URL: https://patents.google.com/patent/US10088658B2/en
5. US11189023 — Anchor-point-enabled multi-scale subfield alignment  
   URL: https://patents.justia.com/patent/11189023
6. US20190139208A1 — Semiconductor reference/test alignment  
   URL: https://patents.justia.com/patent/20190139208

### 3.3 채택 이유(요약)
1. 동기 브라우징 계열(US8890887B2, US20090040186A1): 동기 이동 범주의 기준선 문헌으로 비교 가치가 높음.
2. 자동 정렬 계열(US12266143B2, US11189023, US20190139208A1): 알고리즘 중심 접근과 본 발명의 사용자 주도 운영 접근을 대비하기 적합함.
3. 슬라이드 참조 정렬 계열(US10088658B2): 다회 획득 참조 정렬과 실시간 운영 정합의 차이를 제시하기 적합함.

### 3.4 비교 포인트(요약)
1. 알고리즘 중심 정렬 vs 사용자 주도 정밀 정합 운영 체계
2. 단순 동기 이동 vs 기준 참조점-공통 화면 기준좌표 결합 운영
3. 백엔드 정렬 파이프라인 vs 다중 표시창 실시간 정합 문맥 유지

## 4. 실험 설계 템플릿

### 4.1 실험 목적
1. 기준 참조점 일관성 향상 여부 검증
2. 동기 이동 기반 비교 작업 효율 개선 여부 검증
3. 레이아웃 확장(1/4/12/24) 조건에서 성능 유지 여부 검증

### 4.2 비교군 구성
1. 비교군 A: 중심 고정 방식
2. 비교군 B: 단순 동기 이동 방식
3. 시험군: 기준 참조점 고정 + 공통 화면 기준좌표 기반 운영 방식

### 4.3 측정 지표
1. 기준 참조점 드리프트(px)
2. 역방향 좌표 환산 일치 오차(px)
3. 재이동 횟수(건/과업)
4. 목표 지점 재도달 시간(sec)
5. 창 간 비교 전환 시간(sec)
6. 과업 완료 시간(sec)

### 4.4 레이아웃 조건
1. 1 표시창
2. 4 표시창
3. 12 표시창
4. 24 표시창

### 4.5 기록 양식
| 레이아웃 | 방법 | 평균 완료시간(sec) | 표준편차 | 드리프트(px) | 재이동 횟수 |
| --- | --- | --- | --- | --- | --- |
| 1 | 비교군 A |  |  |  |  |
| 1 | 비교군 B |  |  |  |  |
| 1 | 시험군 |  |  |  |  |
| 24 | 비교군 A |  |  |  |  |
| 24 | 비교군 B |  |  |  |  |
| 24 | 시험군 |  |  |  |  |

### 4.6 분석 지침
1. 시간 지표와 정확도 지표를 반드시 동시 제시한다.
2. 레이아웃이 증가할수록 성능 저하율을 별도 산출한다.
3. 최소 10회 반복 실험 후 평균 및 분산을 제시한다.

## 5. 제출 전 체크리스트
1. 본문 청구항 14항(2독립+12종속) 구조 검증 완료 여부
2. 용어 통일 규칙 적용 여부
3. 본문 내 코드 경로/웹 URL 제거 여부
4. 부록 내 근거 링크 최신성 검증 여부
5. 선행기술 권리 상태 재확인 일정 수립 여부
