# 특허 항목별 바탕 문서 인덱스

> 고지: 본 문서는 기술/전략 참고자료이며 법률 자문이 아닙니다.  
> 기준 문서: [PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md](../PATENT_PORTFOLIO_ANALYSIS_KR_PCT.md)

## 문서 목적
이 폴더는 특허 명세서 완성본이 아니라, 구현 기능을 설명 가능한 형태로 정리한 "작성 바탕 문서" 묶음입니다.  
각 파일은 `기능 정의`, `사용방법`, `결과`, `강점` 중심으로 구성되어 있어, 이후 특허 포맷으로 변환하기 쉽도록 설계했습니다.

## 항목 목록
| 번호 | 파일 | 한 줄 요약 |
| --- | --- | --- |
| 01 | [01_multi_mode_workflow_base.md](./01_multi_mode_workflow_base.md) | Compare/Pinpoint/Analysis를 단일 상태 모델로 전환하는 워크플로우 구조 |
| 02 | [02_pinpoint_anchor_transform_base.md](./02_pinpoint_anchor_transform_base.md) | 참조점 고정 기반 회전/배율 정합 및 역변환 좌표 처리 |
| 03 | [03_rotation_safe_rectzoom_base.md](./03_rotation_safe_rectzoom_base.md) | 회전 상태에서도 선택 영역 의미를 보존하는 Rect-zoom 계산 |
| 04 | [04_two_point_leveling_base.md](./04_two_point_leveling_base.md) | 2점 입력으로 수평/수직 각도 보정을 자동 반영하는 레벨링 |
| 05 | [05_sync_capture_propagation_base.md](./05_sync_capture_propagation_base.md) | 기준 뷰어 필터 상태를 모드별 활성 뷰어로 일괄 전파 |
| 06 | [06_temp_spillover_bucket_base.md](./06_temp_spillover_bucket_base.md) | 파일명 충돌 시 TEMP 계열 버킷으로 자동 스필오버 배치 |
| 07 | [07_filter_chain_cache_estimation_base.md](./07_filter_chain_cache_estimation_base.md) | 필터 체인 실행/캐시/진행률/비용추정 + JSON 교환 + Python 변환 예정까지 다루는 재현 파이프라인 |
| 08 | [08_hybrid_folder_sync_base.md](./08_hybrid_folder_sync_base.md) | Electron watch + Web 메타 diff를 결합한 하이브리드 동기화 |

## 권장 작성 순서
1. [02_pinpoint_anchor_transform_base.md](./02_pinpoint_anchor_transform_base.md)
2. [04_two_point_leveling_base.md](./04_two_point_leveling_base.md)
3. [07_filter_chain_cache_estimation_base.md](./07_filter_chain_cache_estimation_base.md)
4. [08_hybrid_folder_sync_base.md](./08_hybrid_folder_sync_base.md)
5. [03_rotation_safe_rectzoom_base.md](./03_rotation_safe_rectzoom_base.md)
6. [05_sync_capture_propagation_base.md](./05_sync_capture_propagation_base.md)
7. [01_multi_mode_workflow_base.md](./01_multi_mode_workflow_base.md)
8. [06_temp_spillover_bucket_base.md](./06_temp_spillover_bucket_base.md)

## 사용 가이드
1. 각 문서의 `기능 정의`와 `사용방법`을 먼저 읽어 기술 범위를 고정합니다.
2. `결과`와 `강점`에서 기술 효과를 추출해 발명의 효과 문안으로 변환합니다.
3. `특허 문서 전환을 위한 작성 포인트`를 활용해 청구항 핵심 구성요소를 도출합니다.
4. `작성 시 주의사항/한계`를 참고해 과도한 주장이나 구현 불일치를 피합니다.
