# Pinpoint Figure Manifest

## Figure 1
- target_section: `6. 발명의 필수 구성 요소`
- title: `기준 참조점 고정형 다중 표시창 정밀 정합 및 운영 시스템 구조도`
- source_evidence_ids: `refPoint`, `refScreen`, `forward_transform`, `state_preserving_reorder`
- proof_purpose: viewer 상태층, 공통 상태층, 좌표 엔진층, 운영층의 결합 구조를 시각화
- capture_note: 코드 구조도 또는 정리 도식으로 제작

## Figure 2
- target_section: `9. 발명 설명 3 : 시스템 관점`
- title: `기준 참조점-공통 화면 기준좌표 결합 좌표 모델`
- source_evidence_ids: `refPoint`, `refScreen`, `forward_transform`, `inverse_transform`
- proof_purpose: 이미지 기준점과 공유 화면 기준점이 어떻게 총배율/총회전과 결합되는지 설명
- capture_note: 수식 및 좌표 흐름 중심 개념도

## Figure 3
- target_section: `7. 발명 설명 1 : 구조 관점`
- title: `Pinpoint 상태 보존 구조와 코드상 상태 분리 개념도`
- source_evidence_ids: `refPoint`, `refScreen`, `state_preserving_reorder`, `layout_ceiling_24`
- proof_purpose: viewer별 상태와 공통 상태의 분리, 그리고 fixed-slot 운영 구조를 입증
- capture_note: store, PinpointMode, ImageCanvas 간 상태 흐름도

## Figure 4
- target_section: `10. 발명 설명 4 : 동작 관점`
- title: `사용자 입력-변환-표시-재입력의 폐루프 동작도`
- source_evidence_ids: `click_reprojection`, `forward_transform`, `inverse_transform`, `pin_pan_split`
- proof_purpose: Pin, Pan, zoom, rotate, reprojection이 하나의 루프로 연결됨을 시각화
- capture_note: 입력/상태/재표시/재입력 순환도

## Figure 5
- target_section: `4. 발명의 적용 계획`
- title: `반도체 공정 이미지 분석 및 리포트 작성 워크플로`
- source_evidence_ids: `report_capture_linkage`, `same_image_multi_point`, `pin_pan_split`
- proof_purpose: Pinpoint 정렬이 실무 분석과 문서화 흐름에 어떻게 연결되는지 보여줌
- capture_note: 업무 단계 기반 워크플로 다이어그램

## Figure 6
- target_section: `10. 발명 설명 4 : 동작 관점`
- title: `회전 안전 Rect-zoom 및 2점 레벨링 상호작용 개념도`
- source_evidence_ids: `rect_zoom`, `two_point_leveling`
- proof_purpose: 사각 확대와 축 기반 레벨링이 각각 어떤 입력과 계산 절차를 따르는지 설명
- capture_note: 선택 영역 중심 역변환과 2점 delta 계산을 나란히 제시

## Figure 7
- target_section: `10. 발명 설명 4 : 동작 관점`
- title: `compareX Pinpoint 실사용 UI 캡처 삽입 위치`
- source_evidence_ids: `pin_pan_split`, `state_preserving_reorder`, `minimap_reuse`
- proof_purpose: 실제 사용자 인터페이스에서 기준점, minimap, 다중 viewer, 마우스 모드가 어떻게 보이는지 제시
- capture_note: Pinpoint 모드 스크린샷, crosshair/minimap가 보이는 장면 권장

## Figure 8
- target_section: `13. 발명의 활용`
- title: `TEM/SEM 비교 보고서 결과 화면 삽입 위치`
- source_evidence_ids: `report_capture_linkage`, `state_preserving_reorder`
- proof_purpose: 정렬된 결과가 비교판과 보고서 작성으로 이어지는 사용 예를 시각화
- capture_note: 실제 보고서 예시 또는 캡처 배치 예시
