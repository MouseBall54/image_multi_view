# Pinpoint Docx Population Guide

## Purpose
이 문서는 `STRATEGY/main_docs/06_compareX_Pinpoint_employee_invention_report_submittable_final_v2.docx`를 최종 형식 참조로 사용할 때, 텍스트 우선(package-first) 방식으로 작성된 자료를 사람이 해석 없이 안정적으로 이식할 수 있도록 돕는 가이드다.

## Source of Truth
- Canonical report text: `01_pinpoint_employee_invention_report_ko.md`
- Evidence registry: `02_pinpoint_evidence_matrix.csv`
- Claim support bridge: `03_pinpoint_claim_support_map.md`
- Scope boundaries: `04_pinpoint_scope_guardrails.md`
- Figure pack plan: `05_pinpoint_figure_manifest.md`

## Population Rules
1. 본문 문장은 `01_pinpoint_employee_invention_report_ko.md`를 우선 기준으로 옮긴다.
2. figure caption과 삽입 위치는 `05_pinpoint_figure_manifest.md`를 기준으로 한다.
3. 과장 여부가 애매한 문장은 `04_pinpoint_scope_guardrails.md`의 `Controlled Wording`에 맞춰 축약 또는 수정한다.
4. 새로운 주장이나 수치는 docx 편집 단계에서 추가하지 않는다.
5. 필요 시 Appendix A/B의 일부는 사내 시스템 입력 길이에 맞게 편집하되 의미를 넓히지 않는다.

## Section Mapping
- `1. 발명의 명칭` -> v2 docx section 1 title block
- `2. 발명 키워드` -> v2 docx keyword table
- `3. 대표 선행기술과 본 발명 차이점` -> v2 comparison table
- `4. 발명의 적용 계획` -> v2 implementation/application plan table
- `5. 발명의 배경` -> v2 background narrative section
- `6. 발명의 필수 구성 요소` -> v2 essential components table
- `7. 발명 설명 1 : 구조 관점` -> v2 structural explanation section
- `8. 발명 설명 2 : 프로그램 구성 관점` -> v2 program architecture section
- `9. 발명 설명 3 : 시스템 관점` -> v2 system/formula section
- `10. 발명 설명 4 : 동작 관점` -> v2 operation/workflow section
- `11. 발명 설명 5 : 발명 시스템 관점에서 확장 가능한 범주` -> v2 expansion scope section
- `12. 발명 설명 6 : 미래 기술과의 결합` -> v2 future coupling section
- `13. 발명의 활용` -> v2 use/observability section
- `Appendix A` -> v2 factcheck appendix
- `Appendix B` -> v2 short-form entry appendix

## Manual Transfer Workflow
1. v2 docx 사본을 만들어 제출용 작업본으로 사용한다.
2. markdown 본문의 section 순서를 유지한 채 각 section을 대응 위치에 붙여 넣는다.
3. 표 형식이 필요한 section은 markdown bullet을 docx 표 셀에 재배치하되 의미를 변경하지 않는다.
4. `Figure Manifest`를 보며 도 1~도 8 자리에 적합한 이미지 또는 개념도를 삽입한다.
5. 최종 검토 시 `Scope Guardrails`를 대조해 금지 표현이 docx 편집 과정에서 추가되지 않았는지 확인한다.

## Final Manual Checks
1. `Pinpoint core only` 범위를 벗어나는 compareX-wide 문장이 없는지 확인
2. `automatic registration`, `100% client-only`, `network-free by design` 같은 금지 표현이 없는지 확인
3. Appendix A가 사실관계 점검 문서로 유지되는지 확인
4. Appendix B가 축약 입력용 문안으로 유지되는지 확인
5. figure caption이 evidence 목적과 일치하는지 확인
