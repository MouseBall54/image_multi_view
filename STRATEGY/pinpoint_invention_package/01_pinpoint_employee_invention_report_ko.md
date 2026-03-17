# compareX Pinpoint 직무발명 신고서 정식 작성본

본 문서는 compareX 프로젝트의 Pinpoint 기능을 중심으로, 현행 저장소 구현과 기존 전략 문서를 근거로 정리한 직무발명 신고서용 기준 본문이다. 문서의 중심은 자동 특징점 정렬이 아니라, viewer별 기준 참조점과 공통 화면 기준좌표를 결합하고 개별 및 전역 변환 파라미터를 함께 운용하며 표시와 입력을 동일한 좌표 모델로 묶는 사용자 주도형 정밀 정합 구조에 있다. 또한 본 문서는 과장 없이 현재 구현 범위, 실무 적용 가능성, 확장 가능 범주, 그리고 기재를 절제해야 하는 표현 통제 항목을 함께 제시한다.

## 1. 발명의 명칭
- 상태: implemented
- 근거 ID: `refPoint`, `refScreen`

발명의 명칭은 `기준 참조점 고정형 다중 표시창 정밀 정합 및 상태 보존형 이미지 비교 시스템`으로 정리한다. 사내 사용명은 `compareX Pinpoint`이지만, 신고서 본문에서는 프로젝트명보다 기술 개념이 더 직접적으로 드러나는 일반 기술어를 우선 사용한다. 이 명칭은 본 발명의 핵심이 개별 표시창이 보유한 기준 참조점을 유지하면서 전체 화면이 공유하는 기준좌표를 중심으로 정밀 비교를 수행하고, 그 상태를 재배치 이후에도 보존하는 데 있음을 드러낸다.

제목 구성의 취지는 다음과 같다. 첫째, `기준 참조점 고정형`은 자동 정렬이 아니라 사용자가 의미 있는 지점을 정하고 그 지점을 유지하는 구조를 나타낸다. 둘째, `다중 표시창 정밀 정합`은 단일 이미지 뷰어가 아니라 복수 viewer의 비교 문맥을 동기화하는 구조임을 나타낸다. 셋째, `상태 보존형 이미지 비교 시스템`은 이미지 자체만이 아니라 배율, 회전, 필터, 파라미터, 정렬 문맥이 재배치 이후에도 함께 보존된다는 운영 특성을 반영한다.

## 2. 발명 키워드
- 상태: controlled wording
- 근거 ID: `forward_transform`, `inverse_transform`

선행기술 조사와 내부 기술 정리에 사용할 키워드는 다음과 같이 일반 기술어 중심으로 제시한다.

1. Reference Point Anchored Alignment
2. Shared Screen Reference Coordinate
3. Forward Transform and Inverse Transform Loop
4. Global and Per-Viewer Scale Rotation Control
5. Human-in-the-Loop Precision Alignment
6. Multi-Viewer Synchronized Pan
7. Fixed-Slot Viewer Reordering with State Preservation
8. Single Image Multi-Point Parallel Inspection
9. Two-Point Leveling Rotation Adjustment
10. ROI Persistent Alignment

이 키워드들은 자동 registration 계열, 동기 브라우징 계열, 그리고 실무형 비교 워크플로 계열의 선행기술과 본 발명을 비교하는 데 유리하다. 특히 본 발명의 구현 사실과 직접 연결되는 핵심 키워드는 `Reference Point Anchored Alignment`, `Shared Screen Reference Coordinate`, `Forward Transform and Inverse Transform Loop`, `Fixed-Slot Viewer Reordering with State Preservation`이다.

## 3. 대표 선행기술과 본 발명 차이점
- 상태: controlled wording
- 근거 ID: `refPoint`, `refScreen`, `state_preserving_reorder`

대표 선행기술은 크게 두 갈래로 나눌 수 있다. 첫째는 여러 이미지를 함께 움직이는 동기 브라우징 계열이다. 둘째는 특징점 검출, 매칭, 워핑, 정렬 파라미터 추정에 초점을 둔 자동 정렬 계열이다. 이에 비해 본 발명은 사람이 의미 있다고 판단한 기준 부위를 지속적으로 유지하면서 비교 문맥과 작업 상태를 함께 보존하는 구조에 초점을 둔다.

차이점은 다음과 같이 정리할 수 있다. 동기 브라우징 계열은 다중 창을 함께 이동시키는 편의성을 제공하더라도, 창별 기준 참조점 저장과 공통 화면 기준좌표의 분리, 정방향 배치와 역방향 환산을 동일 파라미터 집합으로 묶는 폐루프를 발명의 중심으로 삼지 않는 경우가 많다. 자동 정렬 계열은 초기 정렬 정확도를 높이는 데 장점이 있지만, 최종 판독 단계에서 사람이 보고 있는 기준 부위의 화면 문맥을 안정적으로 유지하고 그 상태를 재배치와 문서화 단계까지 보존하는 구조와는 과제가 다르다.

본 발명의 차별점은 다음 세 가지 조합에 있다. 첫째, viewer별 `refPoint`와 공통 `refScreenX/refScreenY`를 분리 저장한다. 둘째, 개별/전역 배율과 회전을 합성한 동일 파라미터 집합으로 정방향 표시와 역방향 입력 해석을 연결한다. 셋째, 정렬 후에도 fixed-slot 재배치 방식으로 이미지와 관련 상태를 함께 이동시켜 비교 문맥을 유지한다. 결과적으로 본 발명은 `자동으로 잘 맞추는 기술`보다는 `사람이 잡은 기준 부위를 끝까지 흔들리지 않게 붙잡아 두는 기술`에 더 가깝다.

## 4. 발명의 적용 계획
- 상태: implemented
- 근거 ID: `same_image_multi_point`, `layout_ceiling_24`, `report_capture_linkage`

현행 구현 기준으로 본 발명은 이미 저장소의 Pinpoint 기능에서 핵심 로직이 구현되어 있다. viewer별 `refPoint`, 공통 화면 기준좌표, 개별 및 전역 scale/rotation 조합, Pin/Pan 분리, Shift/Swap 재배치, Rect-zoom, 2점 레벨링, 그리고 동일 이미지의 다중 slot 배치가 확인된다. 따라서 본 발명은 불확정 아이디어가 아니라, 이미 실무에 투입 가능한 상태의 기능을 직무발명 형식으로 정리하는 것이다.

현재 적용 가능 시나리오는 반도체 공정 중간 단계 구조 비교, 원본/처리본의 차이 판독, 동일 패턴의 위치 정합 확인, TEM·SEM 캡처의 비교판 정렬 및 후속 보고서 편집이다. 사용자는 Pinpoint 모드에서 기준점을 지정하고, 전역 제어로 큰 방향 차이를 줄인 뒤, 개별 제어로 viewer별 미세 차이를 보정할 수 있다. 이후 Pan과 재배치 동작을 이용해 비교 순서를 바꾸거나 넓은 영역을 함께 스캔해도 기준 문맥을 유지할 수 있다.

단기 계획은 실제 업무 과업을 기준으로 기준점 재도달 시간, 반복 정렬 오차, 보고서 편집 시간, reviewer 간 재현성을 관찰 지표로 누적하는 것이다. 중기 계획은 팀 단위 재현 사례를 모아 본 발명의 효과를 정량화하는 것이다. 장기 계획은 AI 기반 기준점 후보 제안, CAD 또는 stage 연동, 협업 로그, 자동 보고서 생성과의 결합이 가능하지만 이는 현재 구현이 아닌 미래 확장 계층으로만 다룬다.

## 5. 발명의 배경
- 상태: implemented
- 근거 ID: `pin_pan_split`, `refScreen`

반도체 공정 이미지 분석 업무에서는 동일 구조 부위를 여러 샘플이나 공정 단계에서 반복적으로 비교하는 일이 많다. 또한 하나의 이미지 안에서도 결함 후보, 계면 경계, 마커 포인트 등 서로 다른 관심 지점을 번갈아 확인해야 하는 경우가 많다. 이때 일반적인 중심 기반 확대와 회전 조작만으로는 사용자가 확인하려는 기준 부위가 쉽게 화면에서 밀려나며, 다시 그 지점을 찾기 위한 팬과 줌 조작이 반복된다.

문제는 비교 단계에서 끝나지 않는다. 분석자가 정렬한 결과는 종종 캡처와 문서 편집 단계로 이어지며, 같은 관심 부위를 반복해서 맞추고 crop과 배율을 조정하는 비용이 누적된다. 특히 여러 창을 동시에 사용하는 경우에는 창별 문맥이 쉽게 무너지고, 순서를 바꾸는 과정에서 정렬 상태가 깨지기 쉽다. 종래 방식의 비효율은 단순 시각화 문제가 아니라, 동일 부위 재탐색, 비교 신뢰도 저하, 문서화 반복 비용 증가라는 실무 문제로 이어진다.

본 발명이 해결하려는 과제는 다음과 같다. 첫째, 사용자가 한 번 지정한 기준 참조점이 확대, 회전, 이동 이후에도 같은 화면 문맥에서 유지되도록 할 것. 둘째, 화면 표시와 입력 해석이 동일한 좌표 모델을 공유해 반복 조작 중 좌표 불일치를 줄일 것. 셋째, 재배치 이후에도 정렬 상태와 비교 맥락을 함께 유지할 것. 넷째, 비교와 문서화 사이의 전환 비용을 줄여 실무 효율을 높일 것.

## 6. 발명의 필수 구성 요소
- 상태: implemented
- 근거 ID: `refPoint`, `refScreen`, `forward_transform`, `inverse_transform`, `pin_pan_split`, `state_preserving_reorder`, `rect_zoom`, `two_point_leveling`

본 발명은 단일 기능이 아니라 여러 구성요소의 결합으로 완성된다.

1. 표시 슬롯별 기준 참조점 저장부: 각 viewer가 무엇을 기준으로 비교하는지 이미지 좌표 기준으로 보존한다.
2. 공통 화면 기준좌표 관리부: 모든 viewer가 공유하는 `refScreenX`, `refScreenY`를 저장하고 갱신한다.
3. 개별 변환 파라미터 저장부: slot별 local scale 및 local rotation을 저장한다.
4. 전역 변환 파라미터 저장부: global scale 및 global rotation을 저장한다.
5. 정방향 배치 변환부: 기준 참조점이 화면 기준 위치에 오도록 `drawX`, `drawY`를 계산한다.
6. 역방향 좌표 환산부: 화면 클릭 좌표를 동일 파라미터 집합으로 원본 이미지 좌표에 복원한다.
7. 입력 모드 제어부: Pin, Pan, Alt-rotate, rect-zoom, leveling 등 상호작용을 의도별로 분리한다.
8. 상태 보존형 재배치 제어부: fixed-slot 상태에서 이미지와 관련 상태를 shift 또는 swap 정책으로 이동시킨다.

이 구성요소들은 서로 분리된 편의 기능이 아니라 하나의 연속된 비교 시스템을 이룬다. 예를 들어 기준 참조점 저장만으로는 반복 조작의 좌표 일관성이 확보되지 않으며, 역방향 좌표 환산이 빠지면 입력과 표시가 어긋난다. 재배치 제어가 빠지면 사용자는 정렬 이후 순서를 바꾸는 순간 비교 문맥을 잃게 된다. 따라서 본 발명의 효과는 각 구성요소의 결합에서 나온다.

## 7. 발명 설명 1 : 구조 관점
- 상태: implemented
- 근거 ID: `refPoint`, `refScreen`, `state_preserving_reorder`, `minimap_reuse`

구조 관점에서 본 발명은 네 개의 층으로 이해할 수 있다. 첫째는 viewer별 상태층이다. 이 층에는 각 slot이 어떤 파일을 보고 있는지, 그 slot의 기준 참조점이 무엇인지, 개별 배율과 개별 회전이 무엇인지가 포함된다. 둘째는 공통 상태층이다. 이 층에는 공통 화면 기준좌표, 전역 배율과 전역 회전, 현재 레이아웃, 재배치 정책이 포함된다.

셋째는 좌표 엔진층이다. 이 층은 viewer별 상태와 공통 상태를 동시에 참조해 정방향 배치 좌표를 계산하고, 사용자가 입력한 화면 좌표를 역변환으로 이미지 좌표에 복원한다. 넷째는 운영층이다. 이 층은 Layout 선택, Pin/Pan 전환, rect-zoom, leveling, Shift/Swap 재배치, capture 연계 등 실제 업무 절차를 담당한다.

이 구조의 핵심은 viewer별 상태와 공통 상태가 섞이지 않는다는 점이다. 기준 참조점은 slot별로 독립 유지되고, 공통 화면 기준좌표는 전체 화면이 공유한다. 이 분리 덕분에 사용자는 한 창에서는 결함 후보를, 다른 창에서는 경계 부위를 기준으로 삼으면서도, Pan 시에는 같은 문맥으로 함께 이동하는 비교를 수행할 수 있다. 또한 재배치는 viewer 프레임 자체를 움직이는 방식이 아니라 고정 슬롯 위에 올라간 이미지와 그 관련 상태를 이동시키는 방식이므로, 정렬된 배치와 문서화 순서 정리를 동시에 만족시킨다.

## 8. 발명 설명 2 : 프로그램 구성 관점
- 상태: implemented
- 근거 ID: `pin_pan_split`, `layout_ceiling_24`, `state_preserving_reorder`, `minimap_reuse`

프로그램 구성 관점에서 본 발명은 상위 쉘, 공통 상태 저장부, Pinpoint 모드 제어부, 렌더링 및 입력 엔진, 레이아웃 제어부, 재배치 컴포넌트로 구성된다. `App.tsx`는 Pinpoint/Compare/Analysis 모드 전환, Layout 선택, Mouse 모드 전환, 전역 scale/rotation 제어의 진입점을 제공한다. `store.ts`는 viewport, global rotation, global scale, leveling state, reorder mode 등 공통 상태를 보존한다.

`PinpointMode.tsx`는 viewer별 이미지와 `refPoint`를 관리하고, 동일 파일의 다중 slot 배치, custom reorder 정책, file-to-slot mapping을 담당한다. `ImageCanvas.tsx`는 실질적인 좌표 정합 루프의 중심이다. 이 컴포넌트는 drawX/drawY 계산, screen-to-image 역환산, wheel zoom, Pan, Alt-rotate, rect-zoom, crosshair 및 minimap 표시를 수행한다. `LayoutGridSelector.tsx`는 현재 구현 기준 최대 24 viewer 상한을 가지는 레이아웃 선택 UI를 담당하며, `DraggableViewer.tsx`는 Shift가 눌린 경우에만 reorder drag를 시작해 의도치 않은 배열 변경을 줄인다.

이 프로그램 구성은 자동 registration 엔진이 전면에 있는 구조가 아니다. 오히려 사용자의 입력이 상태를 갱신하고, 캔버스가 그 상태를 같은 좌표 모델로 재해석하며, 그 결과가 다시 다음 입력의 기준이 되는 형태의 구조다. 따라서 본 발명의 본문은 `사용자 주도형 정밀 정합`, `참조점-공통 화면 기준좌표 분리`, `상태 보존형 재배치`를 중심에 두어야 하며, broader product 문맥은 주변 설명으로 제한해야 한다.

## 9. 발명 설명 3 : 시스템 관점
- 상태: implemented
- 근거 ID: `forward_transform`, `inverse_transform`, `click_reprojection`, `minimap_reuse`

시스템 관점의 핵심은 사용자 입력과 화면 표시가 동일한 좌표 모델을 공유한다는 점이다. Pinpoint에서 viewer `i`의 기준 참조점을 `a_i`, 공통 화면 기준좌표를 `r`, 총배율을 `s_i`, 총회전각을 `θ_i`라고 하면, 총배율과 총회전각은 각각 다음과 같이 이해할 수 있다.

1. `s_i = localScale_i × globalScale`
2. `θ_i = localRotation_i + globalRotation`

정방향 배치식은 기준 참조점이 공통 화면 기준좌표에 오도록 이미지를 배치하는 계산이다. 실제 구현은 `computePinpointTransform`에서 `drawX`, `drawY`를 구하는 형태로 나타난다. 역방향 환산식은 `screenToImage`에서 화면 좌표를 회전 역적용과 스케일 역적용을 거쳐 이미지 좌표에 복원하는 구조로 나타난다. 이 두 과정은 서로 독립된 편의 함수가 아니라, 같은 파라미터 집합을 공유하는 하나의 폐루프다.

시스템적 효과는 다음과 같다. 첫째, 동일 지점 유지: 기준 참조점이 화면 기준 위치에 매핑되므로 확대/회전 중에도 기준 부위를 잃지 않는다. 둘째, 좌표 일관성 확보: 표시 좌표와 입력 좌표 해석이 같은 수학적 모델을 공유하므로 클릭 위치와 원본 이미지 좌표의 대응이 안정적이다. 셋째, 계층적 정렬: 전역 보정으로 큰 차이를 줄이고 개별 보정으로 viewer별 오차를 다듬을 수 있다. 넷째, 문맥 기반 탐색: Pan 시 공통 화면 기준좌표만 이동하므로 동일 문맥의 넓은 영역을 함께 훑을 수 있다.

## 10. 발명 설명 4 : 동작 관점
- 상태: implemented
- 근거 ID: `pin_pan_split`, `click_reprojection`, `rect_zoom`, `two_point_leveling`, `state_preserving_reorder`

동작 관점에서 본 발명은 다음 절차로 설명할 수 있다.

1. 레이아웃 선택: 상단 `Layout`에서 rows x cols를 고른다.
2. 이미지 배치: 비교 대상 이미지를 slot에 배치하거나 동일 이미지를 여러 slot에 올린다.
3. 기준점 지정: `Mouse = Pin` 상태에서 창별 기준 참조점을 선택한다.
4. 전역 정렬: global scale 및 global rotation으로 전체 이미지군의 큰 차이를 줄인다.
5. 개별 미세 조정: viewer별 scale/rotation으로 slot 단위 오차를 다듬는다.
6. 동시 탐색: `Mouse = Pan` 상태에서 공통 화면 기준좌표를 이동시켜 전체 창을 같은 문맥으로 훑는다.
7. 세부 확대: rect-zoom으로 특정 영역의 중심을 역변환해 빠르게 확대 진입한다.
8. 레벨링: 두 점을 찍어 기준선 각도를 계산하고 수평 또는 수직 기준으로 회전을 보정한다.
9. 재배치: Shift 또는 Swap 방식으로 설명 순서에 맞게 슬롯 순서를 정리한다.
10. 캡처 및 문서화 연계: 정렬이 완료된 화면을 비교판이나 보고서 작성 단계로 이어간다.

여기서 중요한 점은 각 단계가 독립적인 UI 버튼 모음이 아니라 하나의 조작 루프로 이어진다는 점이다. 기준점을 지정한 뒤, 배율과 회전을 조정하고, 같은 좌표 모델로 다시 클릭을 해석하며, 필요할 때 순서를 바꾸더라도 정렬 상태가 함께 이동한다. 즉 본 발명은 정렬 엔진과 운영 시스템이 결합된 절차적 발명으로 설명하는 것이 가장 정확하다.

## 11. 발명 설명 5 : 발명 시스템 관점에서 확장 가능한 범주
- 상태: future extension
- 근거 ID: `layout_ceiling_24`, `same_image_multi_point`

본 발명의 상위 개념은 `사용자가 지정한 기준점을 지속적으로 유지하는 다중 표시창 비교 시스템`으로 일반화할 수 있다. 현재 구현은 compareX Pinpoint에 구체화되어 있으나, 그 적용 범주는 반도체 공정 이미지 비교, TEM·SEM 결과판 정리, 단일 이미지 다중 포인트 병렬 검토 등으로 확장될 수 있다.

가능한 변형 범주는 다음과 같다. 특정 viewer 그룹만 공통 기준좌표를 공유하는 그룹 동기화 방식, 하나의 viewer 또는 그룹 내에서 여러 기준점을 저장하고 전환하는 방식, 기준점을 stage 좌표나 설계 좌표와 연결하는 방식, 필터와 측정 상태까지 재배치와 함께 묶는 방식 등이 있다. 다만 이들은 현재 구현의 핵심 문구가 아니라 확장 가능한 범주 또는 향후 분리 출원 후보로 다루어야 한다.

## 12. 발명 설명 6 : 미래 기술과의 결합
- 상태: future extension
- 근거 ID: `report_capture_linkage`

향후 본 발명은 여러 기술과 결합될 수 있으나, 그 출발점은 어디까지나 사람 중심의 기준점 유지 구조다. 예를 들어 AI 기반 기준점 후보 추천은 기준점 탐색 시작 비용을 줄일 수 있고, 결함 후보 제안은 분석자의 최초 탐색 시간을 단축할 수 있다. CAD 또는 layout overlay 연동은 설계 문맥과 이미지 문맥을 함께 볼 수 있게 만들 수 있으며, stage 좌표 연동은 상위 검사 시스템과의 연결 가능성을 높인다.

또한 협업 리뷰 로그, 자동 보고서 생성, 멀티모달 설명 보조와의 결합도 가능하다. 그러나 이러한 요소들은 현재 구현의 핵심을 대체하는 것이 아니라, 이미 존재하는 기준점 고정 구조 위에 추가되는 확장 계층이다. 따라서 본 문서에서는 이를 미래 기술과의 결합 가능성으로만 서술한다.

## 13. 발명의 활용
- 상태: controlled wording
- 근거 ID: `state_preserving_reorder`, `same_image_multi_point`, `report_capture_linkage`

본 발명의 활용은 두 방향에서 설명할 수 있다. 첫째는 내부 업무 효율 향상이다. 사용자는 동일 부위를 다시 찾는 반복 비용을 줄이고, 다중 창 비교와 보고서 정리에 필요한 화면 재조정 비용을 함께 절감할 수 있다. 둘째는 외부 관찰 가능성이다. viewer별 독립 기준점 저장, 공통 기준점 기반 동시 Pan, 개별/전역 정렬 분리, 상태 보존형 fixed-slot 재배치, 동일 이미지 다중 포인트 관찰 여부는 코드가 공개되지 않아도 데모 화면이나 체험판 조작을 통해 상당 부분 추정 가능하다.

경쟁사나 타사 툴과 비교할 때의 핵심 매칭 포인트는 다음과 같다. 각 패널에서 다른 지점을 기준점으로 찍고 확대/회전 후에도 유지되는지, Pan 시 같은 문맥으로 함께 움직이는지, 전체 방향 보정과 특정 창 미세 보정이 분리되어 있는지, 재배치 후에도 이미지와 상태가 함께 이동하는지, 같은 파일을 여러 슬롯에 넣고 서로 다른 관심 부위를 병렬로 유지할 수 있는지 등이다. 본 발명의 강점은 분석, 탐색, 재배치, 캡처, 문서화가 하나의 연속된 실무 흐름으로 이어진다는 데 있다.

## Appendix A
- 상태: implemented
- 근거 ID: `refPoint`, `forward_transform`, `inverse_transform`, `rect_zoom`, `two_point_leveling`, `layout_ceiling_24`

### GitHub 구현 팩트체크 요약
1. `src/modes/PinpointMode.tsx`는 viewer별 `refPoint`와 shared `refScreenX/refScreenY`의 결합 구조를 직접 보여준다.
2. `src/utils/viewTransforms.ts`는 정방향 배치와 역방향 환산의 핵심 수식을 직접 구현한다.
3. `src/components/ImageCanvas.tsx`는 실제 사용자 상호작용에서 같은 좌표 모델을 재사용한다.
4. `src/components/Minimap.tsx`는 동일 변환 엔진의 재사용을 보여준다.
5. `src/components/DraggableViewer.tsx`와 `src/modes/PinpointMode.tsx`는 상태 보존형 재배치를 뒷받침한다.
6. `src/store.ts`는 leveling state machine과 모드별 회전 반영 구조를 보여준다.
7. `src/components/LayoutGridSelector.tsx`는 현재 구현 상한인 24 viewer 제약을 명시한다.

### 중심 문구에서 절제해야 하는 표현
1. 자동 특징점 registration
2. 완전한 client-only 처리
3. 모든 모드 전환에서 상태가 완전 유지된다는 표현
4. 계량 근거 없는 성능 향상 수치

## Appendix B
- 상태: controlled wording
- 근거 ID: `refPoint`, `refScreen`, `state_preserving_reorder`

### 사내 시스템 입력 칸용 축약 문안
1. 발명의 명칭: 기준 참조점 고정형 다중 표시창 정밀 정합 및 상태 보존형 이미지 비교 시스템
2. 발명 키워드: Reference Point Anchored Alignment, Shared Screen Reference Coordinate, Forward Transform and Inverse Transform Loop, Fixed-Slot Viewer Reordering with State Preservation, Human-in-the-Loop Precision Alignment
3. 대표 선행기술과 차이점: 종래기술이 동기 브라우징 또는 자동 정렬 정확도 향상에 초점을 두는 반면, 본 발명은 viewer별 기준 참조점과 공통 화면 기준좌표를 결합하고 정방향 배치와 역방향 환산을 동일 파라미터로 연결하며 재배치 이후에도 상태를 보존하는 사용자 주도형 정밀 정합 구조라는 점에서 차별된다.
4. 발명의 적용 계획: 본 발명은 compareX Pinpoint 기능으로 구현 완료되었으며 반도체 공정 이미지 비교, 원본/처리본 판독, TEM·SEM 결과 정리에 즉시 적용 가능하다.
5. 발명의 배경: 중심 기준 확대/이동/회전 방식은 사용자가 확인하려는 부위를 유지하지 못해 반복 재탐색과 재정렬 비용을 발생시킨다.
6. 발명의 필수 구성 요소: 표시 슬롯별 기준 참조점 저장부, 공통 화면 기준좌표 관리부, 개별/전역 변환 파라미터 저장부, 정방향 배치 변환부, 역방향 좌표 환산부, 입력 모드 제어부, 상태 보존형 재배치 제어부를 포함한다.
