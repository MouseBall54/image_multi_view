# Pinpoint Claim Support Map

## Anchored Reference Point
- Report sections: `6`, `7`, `8`, `9`, `10`
- Evidence IDs: `refPoint`, `refScreen`
- Factual support: 각 viewer가 이미지 기준 참조점을 독립 저장하고, 공통 화면 기준좌표를 별도 상태로 관리한다.
- Guardrail: 자동 추적이나 자동 등록으로 표현하지 않는다.

## Shared Screen Reference
- Report sections: `6`, `7`, `9`, `10`, `13`
- Evidence IDs: `refScreen`, `pin_pan_split`
- Factual support: Pinpoint는 공통 viewport 기준점을 공유해 같은 문맥으로 동시 Pan을 수행한다.
- Guardrail: 모든 상태가 항상 완전히 같다고 과장하지 않는다.

## Forward Transform
- Report sections: `6`, `8`, `9`
- Evidence IDs: `forward_transform`
- Factual support: 총 배율과 총 회전값을 반영해 기준 참조점이 화면 기준 위치에 오도록 `drawX/drawY`를 계산한다.
- Guardrail: 구현 수식을 청구항 수준의 유일 형태로 고정하지 않는다.

## Inverse Transform
- Report sections: `6`, `8`, `9`, `10`
- Evidence IDs: `inverse_transform`, `click_reprojection`
- Factual support: 화면 입력 좌표를 동일 파라미터 집합으로 이미지 좌표에 되돌려 표시와 입력 해석을 하나의 폐루프로 묶는다.
- Guardrail: 모든 회전/확대 조건에서 무오차라고 단정하지 않는다.

## State-Preserving Reorder
- Report sections: `3`, `6`, `7`, `8`, `10`, `13`
- Evidence IDs: `shift_only_reorder`, `state_preserving_reorder`
- Factual support: 슬롯을 고정한 채 이미지와 연관 상태를 shift 또는 swap 방식으로 재배치해 비교 문맥을 유지한다.
- Guardrail: viewer 자체가 자유 이동하는 구조로 오해되지 않게 기술한다.

## Pin/Pan Split
- Report sections: `6`, `8`, `10`
- Evidence IDs: `pin_pan_split`
- Factual support: 기준점 지정 단계와 탐색 단계를 명시적으로 분리해 사용자 조작 의도를 구분한다.
- Guardrail: 단순 UI 편의 기능으로 축소하지 말고 입력 모드 제어 구조로 설명한다.

## Rect-Zoom
- Report sections: `6`, `10`, `11`
- Evidence IDs: `rect_zoom`
- Factual support: 회전 상태에서도 선택 영역 중심을 역변환하여 다음 확대 상태를 계산한다.
- Guardrail: 정합성 유지와 예측 가능성 중심으로 서술하고 무오차 보장은 배제한다.

## Two-Point Leveling
- Report sections: `6`, `10`, `11`
- Evidence IDs: `two_point_leveling`
- Factual support: 2점 입력으로 기울기 각도를 계산하고 선택 축 기준 delta를 적용해 회전을 자동 보정한다.
- Guardrail: 입력 품질에 따라 결과가 달라질 수 있음을 전제로 한다.

## Minimap Reuse
- Report sections: `7`, `8`, `9`
- Evidence IDs: `minimap_reuse`
- Factual support: 보조 시각화도 같은 변환 엔진을 사용해 본 화면과 좌표 해석을 일치시킨다.
- Guardrail: invention core is still alignment/state preservation, not the minimap widget itself.

## Same-Image Multi-Point Use
- Report sections: `4`, `6`, `10`, `13`
- Evidence IDs: `same_image_multi_point`
- Factual support: 동일 이미지를 여러 slot에 배치해 창별로 다른 관심 부위를 병렬 관찰할 수 있다.
- Guardrail: 하나의 viewer 내 다중 핀 동시 운용으로 과장하지 않는다.

## Layout Ceiling Context
- Report sections: `4`, `8`, `11`, `13`
- Evidence IDs: `layout_ceiling_24`
- Factual support: 현행 구현은 최대 24 viewer 레이아웃 범위에서 동작한다.
- Guardrail: 24 viewer는 구현 상한일 뿐 발명의 핵심으로 쓰지 않는다.
