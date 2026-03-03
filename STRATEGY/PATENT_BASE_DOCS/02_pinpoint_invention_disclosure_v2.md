# compareX 직무발명서 v2 (심층본)
## Pinpoint 2축 분리형 발명: 좌표 정합 엔진 + 운영 시스템

> 본 문서는 내부 직무발명 검토용 기술 문서입니다.  
> 출원서에 기재되는 최종 발명 명칭/청구범위는 변리사 검토 단계에서 별도 확정합니다.  
> 작성일: 2026-03-03  
> 작성 기준: 현재 compareX 저장소 구현 + 외부 공개 특허 웹 조사

---

## 1. 문서 목적 및 독자 기준

### 쉬운 설명
이 문서는 compareX의 Pinpoint 기능을 "특허로 보호할 수 있는 발명" 형태로 정리한 문서다.  
중학생이 읽어도 이해할 수 있게 쉽게 설명하되, 특허 담당자가 바로 쓸 수 있도록 기술 근거도 함께 담았다.

### 기술 설명
본 문서는 Pinpoint를 하나로 뭉뚱그리지 않고 아래 2축으로 분리해 권리화하는 전략을 중심으로 작성한다.
1. 축 A: 좌표 정합 엔진
2. 축 B: Pinpoint 운영 시스템

핵심 목표는 다음 3가지다.
1. 신규성/진보성 방어력 강화
2. 경쟁사 회피설계 난이도 상승
3. 제품 실제 동작과 직접 연결되는 침해판별 포인트 확보

---

## 2. 발명의 명칭 (내부 검토용)

### 2.1 명칭 작성 원칙
1. 발명의 핵심 동작이 한 번에 보이도록 작성
2. 너무 넓거나 추상적인 단어는 지양
3. 출원용 최종 명칭은 별도 확정(본 문서 명칭은 내부 검토용)

### 2.2 내부 명칭 후보
1. 다중 뷰어 참조점 고정 정합 및 동시 탐색 시스템
2. 창별 기준점-공통 화면 기준점 결합형 정밀 이미지 정렬 장치 및 방법
3. Pinpoint 레이아웃 기반 사용자 주도 정합 워크플로 시스템
4. 정방향/역변환 폐루프 기반 다중 이미지 정합 엔진 및 운영 방법
5. 최대 24 뷰어 병렬 관찰을 지원하는 기준점 고정 정렬 시스템

### 2.3 본 문서 대표 명칭(임시)
**"Pinpoint 참조점 고정 기반 다중 뷰어 정합 엔진 및 운영 시스템"**

---

## 3. 발명 키워드 (선행기술 조사용)

아래 키워드는 검색 업체가 바로 사용할 수 있게 일반 기술 용어 중심으로 정리했다.  
약어는 Full Name을 병기했다.

| 번호 | 키워드 | 의미/검색 의도 |
| --- | --- | --- |
| 1 | Reference Point Anchored Alignment | 이미지 기준점 고정 정렬 |
| 2 | Shared Screen Reference Coordinate | 공통 화면 기준점 기반 동기 이동 |
| 3 | Forward Transform and Inverse Transform Loop | 정방향/역변환 폐루프 정합 |
| 4 | Global Local Hybrid Scale Rotation Control | 전역+개별 배율/회전 혼합 제어 |
| 5 | Multi-Viewer Synchronized Pan | 다중 창 동시 Pan |
| 6 | Interactive Image Registration GUI (Graphical User Interface) | 사용자 주도 정합 인터페이스 |
| 7 | WSI (Whole Slide Image) Comparative Navigation | 슬라이드 다중 비교 탐색 |
| 8 | ROI (Region of Interest) Persistent Alignment | 관심영역 지속 정렬 |
| 9 | KNN (K-Nearest Neighbors) Feature Matching Alignment | 특징점 매칭 기반 정렬 비교군 |
| 10 | NCC (Normalized Cross-Correlation) Registration | 상관 기반 정렬 비교군 |
| 11 | Coarse Fine Alignment Pipeline | 조정렬/미세정렬 파이프라인 비교군 |
| 12 | Anchor Point Multi-Scale Subfield Alignment | 앵커/서브필드 기반 정렬 비교군 |
| 13 | Human in the Loop Precision Alignment | 사용자 개입형 정밀 정렬 |
| 14 | Multi Slot Image Arrangement and Reordering | 슬롯 배치/재배치 운영 |
| 15 | 24-Viewer Parallel Observation Workflow | 대량 병렬 관찰 운영 축 |
| 16 | Display-Pixel Synchronized Browsing | 표시 픽셀 기준 동기 브라우징 |

---

## 4. 대표 선행기술과 본 발명 차이점

### 4.1 한 줄 요약
선행기술 다수는 자동 정합 알고리즘 또는 일반 동기 브라우징에 초점을 두고, 본 발명은 **사용자 주도 정밀 정합 워크플로**를 2축(A/B)으로 구조화한다.

### 4.2 웹 재조사 기준
- 검색일: 2026-03-03
- 소스: Google Patents, Justia
- 선정 기준: Pinpoint와 직접 비교 가능한 "동기 탐색", "특징점 정렬", "슬라이드 참조 정렬", "서브필드 정렬"

### 4.3 대표 선행기술 비교표 (웹 재조사 반영)

| 문헌 | 목적 | 핵심 구성 | 효과 | 본 발명과 차이 |
| --- | --- | --- | --- | --- |
| US8890887B2 (Synchronized image browsing) | 관련 이미지 동기 브라우징 | pan/zoom/flip/rotate 동기, Sync on/off, 임계치 기반 동기 해제 | 다중 영상 동시 탐색 편의 개선 | 본 발명은 단순 동기 이동이 아니라 창별 refPoint 고정 + 공통 refScreen + 정/역변환 폐루프를 결합한다. |
| US20090040186A1 (Displaying Multiple Synchronized Images) | 다중 동기 표시 UI | primary/secondary 구조, baseline 길이/방향으로 뷰 제어 | 지도/지리영상 탐색 개선 | 본 발명은 지도 baseline 제어가 아니라 이미지 정합 좌표모델과 다중 샘플 비교에 특화된다. |
| US12266143B2 / US20220327796A1 (Salient feature point alignment) | 반도체 영상 자동 정렬 | salient feature point 3개 이상 검출/매칭, 변환 계산 | 자동 정렬 정확도 향상 | 본 발명은 자동 특징점 검출이 중심이 아니라, 사용자가 지정한 핀을 유지하며 관찰을 안정화하는 인터랙션 중심 기술이다. |
| US10088658B2 (Multi-acquisition slide referencing) | 다회차 슬라이드 참조 정합 | baseline round, subset 정합, translation/rotation/scale 보정 | 재획득 이미지 정합 안정화 | 본 발명은 백엔드 참조정합보다 실시간 UI 조작(핀/배율/회전/동시Pan) 중심이다. |
| US11189023 (Anchor-point-enabled multi-scale subfield alignment) | 서브필드 자동 정렬 고도화 | alignability map, anchor/anchor-edge point, warping 재정렬 | 난이도 높은 패턴 정렬 개선 | 본 발명은 자동 anchor 선정보다 창별 핀과 운영 워크플로 결합(레이아웃/재배치/동시 Pan)을 핵심으로 한다. |
| US20190139208A1 (Semiconductor reference/test alignment) | 반도체 reference-test 정렬 | coarse + fine alignment, RTA block offset 보정 | 정렬 오차 및 defect 오검출 감소 | 본 발명은 공정 장비 정렬 파이프라인이 아니라 사용자가 관찰 과정에서 정합 문맥을 유지하는 인터페이스 기술이다. |

### 4.4 A축 관점 차이 / B축 관점 차이 (분리 표)

| 구분 | 선행기술 경향 | 본 발명 |
| --- | --- | --- |
| A축(좌표 정합 엔진) | 자동 특징점/상관/워핑/전역변환 계산 중심 | `refPoint`(창별) + `refScreenX/refScreenY`(공통) 분리 모델, 정방향/역변환 폐루프를 동일 파라미터로 운용 |
| B축(Pinpoint 운영 시스템) | 동기 뷰 제공 또는 백엔드 정렬 결과 표시 중심 | 최대 24 레이아웃, slot 배치/재배치, Pin/Pan 단계 분리, 개별/전역 혼합 제어, 단일/다중 관찰 시나리오를 하나의 작업 파이프라인으로 운용 |

### 4.5 선행기술 핵심 요약 (문헌별 3~5문장)

#### [PT-1] US8890887B2
- 다중 영상을 같은 연산값으로 동기 이동하는 브라우징 아이디어를 제시한다.
- Sync 활성/비활성, 임계치 기반 동기 중단 등 운영 제어가 포함된다.
- 핵심은 "동기 브라우징"이며, 사용자 지정 기준점 고정 좌표모델 자체가 중심은 아니다.
- A축 차이: 본 발명은 단순 동기 연산이 아니라 refPoint/refScreen 분리와 역변환 폐루프를 필수로 결합한다.
- B축 차이: 본 발명은 최대 24 레이아웃, slot 재배치, 창별 핀 유지까지 운영 파이프라인을 확장한다.

#### [PT-2] US20090040186A1
- primary 이미지와 secondary 이미지를 baseline 길이/방향으로 연동하는 UI 구조다.
- 다중 터치 기반 시점/크기 제어가 중심이다.
- 지도/지리영상 탐색 같은 HCI 문제를 해결하는 방향이 강하다.
- A축 차이: 본 발명은 baseline 제스처가 아니라 참조점 고정 수식과 역변환 일치가 핵심이다.
- B축 차이: 본 발명은 이미지 검사/비교 작업 흐름(핀 지정, 재배치, 동시 Pan)을 더 깊게 다룬다.

#### [PT-3] US12266143B2 / US20220327796A1
- salient feature point를 3개 이상 선택/검출해 정렬 파라미터를 구한다.
- 반도체 검사 도메인에서 자동 정렬 정확도를 높이는 것이 목적이다.
- KNN/특징점 기반 정렬 및 후속 정렬 단계를 포함한다.
- A축 차이: 본 발명은 자동 특징점이 아니라 사용자가 지정한 기준점을 고정하는 인터랙션 중심 엔진이다.
- B축 차이: 본 발명은 정렬 알고리즘 결과가 아니라 사용자 운영 단계(레이아웃, 슬롯, Pin/Pan)의 재현성을 강조한다.

#### [PT-4] US10088658B2
- baseline round와 후속 라운드 사이 변환(translation/rotation/scale)을 추정한다.
- 부분 subset 정렬 후 전체에 적용하는 참조 방식이 핵심이다.
- 슬라이드 재배치/재취득 환경에서 정렬 안정화를 목표로 한다.
- A축 차이: 본 발명은 라운드 참조정렬보다 실시간 화면 기준점 공유와 정/역변환 루프에 초점이 있다.
- B축 차이: 본 발명은 다중 창 동시 Pan과 재배치 이후 정합 문맥 유지를 사용자 조작 관점으로 구현한다.

#### [PT-5] US11189023
- alignability map과 multi-scale subfield 정렬을 결합한다.
- anchor point, anchor-edge point, warping 재정렬 같은 자동화 절차가 핵심이다.
- 고난도 패턴에서 정렬 성능을 높이는 알고리즘 축이 강하다.
- A축 차이: 본 발명은 자동 anchor 추출보다 사용자가 지정한 핀을 기준으로 화면 정합을 일치시킨다.
- B축 차이: 본 발명은 운영 워크플로(24 레이아웃, 슬롯 배치, Pin/Pan 분리)를 독립 보호축으로 둔다.

#### [PT-6] US20190139208A1
- coarse alignment와 fine alignment를 분리해 reference/test 이미지를 정렬한다.
- RTA 블록 오프셋 보정, 센서 스와스 보정 등 공정 중심의 절차가 포함된다.
- 주목점은 공정/검사 장비 파이프라인의 정렬 정확도 향상이다.
- A축 차이: 본 발명은 공정 자동정렬이 아니라 사람이 관찰하는 화면 좌표 일관성을 직접 제어한다.
- B축 차이: 본 발명은 다중 창 운영/재배치/동시 탐색을 핵심 기능으로 명시한다.

---

## 5. 발명의 적용 계획 (compareX 프로젝트 적용)

### 5.1 현재 적용 상태 (적용중)
본 발명은 compareX Pinpoint 모드에 **이미 적용되어 사용 중**이다.

| 적용 항목 | 구현 사실 | 코드 근거 |
| --- | --- | --- |
| 레이아웃 상한 | rows x cols 선택 시 최대 24 뷰어 제한 | `src/components/LayoutGridSelector.tsx` (`MAX_VIEWERS=24`) |
| 모드/조작 제어 | Mode, Layout, Mouse(Pin/Pan), 전역 회전/배율 제어 | `src/App.tsx` |
| 창별 핀 + 공통 기준점 | 핀 클릭 시 refPoint 저장 + refScreenX/refScreenY 동시 갱신 | `src/modes/PinpointMode.tsx` |
| 동시 Pan | shared viewport(refScreenX/refScreenY) 이동으로 다중 창 동시 이동 | `src/components/ImageCanvas.tsx` |
| 정방향/역변환 엔진 | computePinpointTransform + screenToImage | `src/utils/viewTransforms.ts` |
| 슬롯 운영 | slot 배치/재배치, 동일 이미지 다중 뷰어 추적 | `src/modes/PinpointMode.tsx`, `src/store.ts` |

### 5.2 적용 목적
1. 같은 위치 비교에서 재팬 반복을 줄인다.
2. 확대/회전 중에도 기준점을 잃지 않게 한다.
3. 단일 이미지 안의 여러 관심점을 병렬 관찰해 리뷰 속도를 높인다.

### 5.3 확대 적용 계획
1. 온보딩 가이드에 "단일 이미지 다중 포인트 관찰" 시나리오 추가
2. A축/B축 정량 지표 자동 측정 로그 추가(드리프트, 재도달 시간, 전환 시간)
3. 의료/반도체/검사 공통 템플릿 워크플로 패키지화

---

## 6. 발명의 배경

### 6.1 발명 계기
### 쉬운 설명
실제 비교 작업에서 가장 힘든 순간은 "보고 있던 지점을 다시 찾는 시간"이다.  
확대/회전을 조금만 해도 보고 있던 결함 위치가 화면에서 사라져서 다시 찾게 된다.

### 기술 설명
기존 중심 고정 방식은 관찰 대상 중심이 아닌 화면 중심을 기준으로 이동한다.  
이 때문에 다중 창 비교에서 기준 위치 일관성이 깨지고, 재정렬 비용이 커진다.

### 6.2 해결하려는 문제
1. 중심 고정 방식에서 관심 지점이 쉽게 이탈하는 문제
2. 다중 창 비교 시 창마다 기준이 달라지는 문제
3. 단일 이미지 다중 포인트 분석에서 문맥이 끊기는 문제
4. 레이아웃 확장 시 비교 효율이 급격히 떨어지는 문제

### 6.3 핵심 해결 아이디어
1. 창별 기준점(`refPoint`)과 공통 화면 기준점(`refScreenX/refScreenY`)을 분리 관리
2. 정방향/역변환을 같은 파라미터로 묶어 폐루프 유지
3. 개별/전역 배율·회전 혼합 제어
4. 최대 24 뷰어와 slot 재배치 환경에서도 정합 문맥 유지

---

## 7. A축 심층: 좌표 정합 엔진 (핵심 엔진 발명)

## 7.1 A축 핵심 정의
### 쉬운 설명
A축은 "핀으로 잡은 점을 화면에서 안 놓치게 하는 계산기"다.

### 기술 설명
A축은 다음을 결합한 좌표 정합 엔진이다.
1. 창별 이미지 기준점(`refPoint`) 저장
2. 공통 화면 기준점(`refScreenX/refScreenY`) 운용
3. 총배율(`individualScale * globalScale`) 및 총회전(`theta`) 계산
4. 정방향 배치(`drawX/drawY`) + 역변환(`screenToImage`) 폐루프

## 7.2 데이터 모델

| 요소 | 타입/의미 | 역할 |
| --- | --- | --- |
| `refPoint` | 뷰어별 정규화 이미지 좌표 (0~1) | 각 창의 기준점 고정 |
| `refScreenX/refScreenY` | 화면 기준 좌표 | 모든 창에서 기준점이 보일 목표 위치 |
| `individualScale` | 뷰어별 확대 배율 | 로컬 미세조정 |
| `globalScale` | Pinpoint 전역 배율 | 전체 동기 조정 |
| `theta` | 총 회전각(라디안) | 회전 상태 반영 |
| `drawX/drawY` | 이미지 배치 시작 좌표 | 기준점 고정 배치 결과 |

## 7.3 정방향 변환(이미지 -> 화면)

수식:

```text
scale = individualScale * globalScale
theta = (totalAngleDeg * π) / 180

drawX = refScreenX - Sx - (cos(theta)*(ux-Sx) - sin(theta)*(uy-Sy))
drawY = refScreenY - Sy - (sin(theta)*(ux-Sx) + cos(theta)*(uy-Sy))
```

한 줄 해석:  
"확대/회전된 이미지를 어디에 놓아야 refPoint가 화면 목표점(refScreen)에 정확히 오느냐"를 계산한다.

## 7.4 역변환(화면 -> 이미지)

수식:

```text
dx = screenX - centerX
dy = screenY - centerY

unrotX = centerX + dx*cos(-theta) - dy*sin(-theta)
unrotY = centerY + dx*sin(-theta) + dy*cos(-theta)

imgX = (unrotX - drawX) / scale
imgY = (unrotY - drawY) / scale
```

한 줄 해석:  
"사용자가 화면에서 찍은 점을 원본 이미지 좌표로 되돌려서 다음 정렬에도 같은 기준으로 쓸 수 있게" 한다.

## 7.5 폐루프 정합 구조
### 쉬운 설명
화면에 보이는 것과 사용자가 클릭한 값이 서로 따로 놀지 않게 묶어두는 구조다.

### 기술 설명
1. 정방향 계산으로 렌더링 위치 산출
2. 사용자 클릭을 역변환으로 이미지 좌표 환산
3. 환산 결과를 다시 핀/줌/회전 조작에 사용
4. 같은 파라미터 집합으로 반복 운용해 좌표 불일치 축소

## 7.6 A축 기술효과
1. 기준점 드리프트 감소
2. 클릭 좌표 기록 일관성 향상
3. 회전+확대 동시 조작에서도 정합 안정성 유지

## 7.7 A축 실패/한계
1. 자동 특징점 정합 엔진이 아니다(사용자 입력 필요)
2. 좌표계(정규화/픽셀) 혼용 시 오해 가능
3. 핀만으로 배율/회전을 자동 추정하지 않는다

## 7.8 A축 정량 검증 지표
1. 기준점 위치 편차(px)
2. 동일 지점 반복 클릭 좌표 편차(px)
3. 배율/회전 조건별 역변환 오차율

---

## 8. B축 심층: Pinpoint 운영 시스템 (워크플로 발명)

## 8.1 B축 핵심 정의
### 쉬운 설명
B축은 "실제로 사람이 일할 때 쓰는 순서와 조작법"을 기술로 정리한 것이다.

### 기술 설명
B축은 아래 운영 요소를 결합한다.
1. 레이아웃 선택(최대 24)
2. slot 배치/재배치(Shift/Swap)
3. Pin/Pan 단계 분리
4. 창별 제어(개별 배율/회전) + 전역 제어(전체 배율/회전)
5. shared viewport 동시 Pan
6. 단일 이미지 다중 포인트 / 다중 이미지 비교 분기

## 8.2 B축 구성요소 상세

| 구성요소 | 쉬운 설명 | 기술 설명 |
| --- | --- | --- |
| Layout 선택 | 창 개수를 작업에 맞게 고른다 | `rows x cols` 선택, `MAX_VIEWERS=24` 제약 |
| slot 배치 | 이미지를 원하는 창에 올린다 | 파일 드롭/자동배치, slot key 기반 상태 유지 |
| Pin 모드 | 기준점을 찍는다 | 클릭 -> `refPoint` 저장 + `refScreen` 갱신 |
| Pan 모드 | 여러 창을 같이 움직인다 | shared viewport 이동으로 동기 탐색 |
| 개별 제어 | 특정 창만 미세 조정 | `pinpointScales`, `pinpointRotations` |
| 전역 제어 | 전체 창을 크게 맞춘다 | `pinpointGlobalScale`, `pinpointGlobalRotation` |
| 재배치 | 창 순서를 바꾼다 | Shift/Swap 로직으로 상태 재할당 |

## 8.3 작업 흐름 (운영 관점)
1. Mode를 Pinpoint로 전환
2. Layout 선택
3. slot별 이미지 배치
4. 각 창에서 Pin으로 refPoint 지정
5. 개별/전역 배율·회전 + 필요 시 레벨링
6. Pan으로 동시 이동하며 비교
7. Shift/Swap 재배치 후 정렬 맥락 유지 확인

## 8.4 관찰 시나리오 2종

### 시나리오 A: 다중 이미지 비교
- 같은 공정/샘플군 이미지를 여러 창에 배치
- 같은 유형 결함 위치에 창별 핀 지정
- 동시 Pan으로 넓은 영역을 일관 비교

### 시나리오 B: 단일 이미지 다중 포인트 관찰
- 동일 파일을 여러 slot에 배치
- 창마다 다른 관심점을 핀으로 지정
- 한 화면에서 여러 결함 후보를 병렬 검토

## 8.5 B축 기술효과
1. 재팬 횟수 감소
2. 목표 지점 재도달 시간 단축
3. 창 간 비교 전환 시간 단축
4. 24 뷰어 조건에서도 정렬 문맥 유지

## 8.6 B축 실패/한계
1. B축 단독으로 자동 정합 정확도 보장 기능은 아니다
2. 창 수가 많아질수록 사용자 숙련도 영향이 존재
3. 운영 절차를 단순 UI 나열로만 쓰면 자명성 리스크가 커진다

## 8.7 B축 정량 검증 지표
1. 재팬 횟수(건/과업)
2. 목표 지점 재도달 시간(sec)
3. 창 간 비교 전환 시간(sec)
4. 1/4/12/24 뷰어 조건별 완료 시간

---

## 9. A/B 결합 전략 (권리화 구조)

## 9.1 독립항 후보 구조
1. A1(좌표 정합 엔진): 기준점 분리 모델 + 정방향/역변환 폐루프 + 혼합 배율/회전
2. B1(Pinpoint 운영 시스템): 24 레이아웃 + slot 운영 + Pin/Pan 분리 + 동시 Pan 워크플로

## 9.2 종속항 결합 원칙
1. B 종속항에서 A 엔진 호출/참조를 명시
2. 운영 단계의 좌표 일관성 근거를 A의 변환부로 연결
3. 엔진 회피와 운영 회피를 동시에 어렵게 설계

## 9.3 리스크와 대응

| 리스크 | 발생 이유 | 대응 문장 |
| --- | --- | --- |
| 단순 수식으로 축소 해석 | A축을 수학식 하나로 오해 | "분리좌표 모델+정/역변환+입력해석 폐루프" 결합으로 기술 |
| 단순 UI로 축소 해석 | B축을 버튼 집합으로 오해 | "레이아웃-배치-핀-조정-동시Pan-재배치" 단계형 시스템으로 기술 |
| 자동정합 과장 | 구현 범위 불일치 | "사용자 주도 정밀 정렬"로 고정 표현 |

---

## 10. 발명의 활용 및 경쟁사 매칭 포인트

## 10.1 경쟁사 적용 확인 가능성
높음. 이유는 핵심 동작이 사용자 화면에서 직접 관찰 가능하기 때문이다.

## 10.2 분석 체크리스트
1. 창별 핀 저장이 되는가
2. 공통 화면 기준점 기반 동시 Pan이 되는가
3. 전역+개별 배율/회전을 함께 제공하는가
4. 레이아웃 재배치 후 정렬 맥락이 유지되는가
5. 동일 이미지 다중 slot 병렬 관찰이 가능한가

## 10.3 도입 가능성 및 우수점
1. 자동정합 전용 솔루션 대비: 사람이 판단하는 관찰 과정 효율을 직접 개선
2. 일반 동기뷰어 대비: 기준점 고정 정합으로 "같은 위치 비교" 신뢰도 향상
3. 단일 뷰어 도구 대비: 다중 포인트 병렬 관찰로 문맥 전환 비용 절감
4. 소수 창 도구 대비: 최대 24 뷰어 운영으로 대량 비교 시나리오 확장

---

## 11. 코드 근거 인덱스 (주장-근거 1:1 매핑)

| 주장 | 코드 근거 |
| --- | --- |
| 레이아웃 최대 24 제한 | `src/components/LayoutGridSelector.tsx:27-31` |
| Pinpoint 모드 툴바 및 Pin/Pan/전역 제어 | `src/App.tsx:1200-1252` |
| 창별 refPoint + 공통 refScreen 동시 갱신 | `src/modes/PinpointMode.tsx:478-488` |
| slot 배치 및 refPoint 유지 | `src/modes/PinpointMode.tsx:507-543` |
| 동일 파일 다중 뷰어 추적 | `src/modes/PinpointMode.tsx:451-461` |
| 동시 Pan(shared viewport) | `src/components/ImageCanvas.tsx:1459-1464` |
| Pin 클릭 역변환 후 refPoint 저장 | `src/components/ImageCanvas.tsx:1044-1091` |
| 정방향 변환 엔진 | `src/utils/viewTransforms.ts:14-45` |
| 역변환 엔진 | `src/utils/viewTransforms.ts:80-91` |
| Shift/Swap 재배치 | `src/store.ts:1058-1084`, `src/modes/PinpointMode.tsx:935-1016` |

---

## 12. 법적 한계 고지
1. 본 문서는 기술/전략 참고자료이며 법률 자문이 아니다.
2. 선행기술 조사는 공개 웹 기반의 실무 스캔이며, FTO/무효성 최종 감정은 범위 밖이다.
3. 본 문서의 명칭/표현은 내부 검토용이며, 최종 청구항 문안은 변리사 검토 후 확정한다.

---

## 부록 A. 선행기술 웹 조사 로그 (2026-03-03)

### A.1 조사 쿼리 예시
1. `US8890887B2 synchronized image browsing`
2. `US20090040186A1 displaying multiple synchronized images`
3. `US12266143B2 salient feature point based image alignment`
4. `US10088658B2 multi acquisition slide referencing`
5. `US11189023 anchor point enabled multi scale subfield alignment`
6. `US20190139208 semiconductor reference test image alignment`

### A.2 참고 URL
1. US8890887B2: https://patents.google.com/patent/US8890887B2/en
2. US20090040186A1: https://patents.google.com/patent/US20090040186A1/en
3. US12266143B2: https://patents.google.com/patent/US12266143B2/en
4. US20220327796A1: https://patents.google.com/patent/US20220327796A1/en
5. US10088658B2: https://patents.google.com/patent/US10088658B2/en
6. US11189023: https://patents.justia.com/patent/11189023
7. US20190139208A1: https://patents.justia.com/patent/20190139208

### A.3 주의사항
- 본 문헌 요약은 공개 페이지의 핵심 내용 정리다.
- 법적 상태(Active/Abandoned 등)는 각 국가별 최신 상태를 출원 직전 재확인해야 한다.

---

## 부록 B. 중학생 3문장 요약
1. Pinpoint는 내가 찍은 기준점을 화면에서 계속 붙잡아 주는 기술이다.
2. 여러 창을 동시에 움직여도 같은 위치를 비교할 수 있어서 덜 헤맨다.
3. 이 기술은 계산 엔진(A축)과 실제 작업 방법(B축)으로 나눠 보호하면 더 강한 특허 전략이 된다.
