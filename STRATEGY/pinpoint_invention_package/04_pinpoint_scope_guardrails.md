# Pinpoint Scope Guardrails

## In Scope
- Pinpoint mode's per-viewer `refPoint` model
- Shared `refScreenX` and `refScreenY` viewport coordinates
- Combined local and global scale/rotation control for aligned comparison
- Forward render transform and inverse coordinate reprojection loop
- Explicit Pin/Pan mode separation
- Fixed-slot reorder with state preservation
- Rotation-safe rect-zoom behavior
- Two-point leveling rotation correction
- Minimap reuse of the same coordinate model

## Context Only
- Compare and Analysis modes as surrounding application architecture
- Current `MAX_VIEWERS = 24` ceiling as implementation context
- Capture/report assembly workflow as a practical downstream use case
- Local-first marketing language from README or intro docs when narrowly qualified

## Future Only
- AI-based reference point suggestions
- Defect candidate recommendation
- CAD or stage coordinate coupling
- Collaboration logs and automatic report generation
- Group sync variants and multi-reference-point extensions not currently implemented as the main flow

## Do Not Claim
- Automatic registration
- Automatic feature matching
- Fully automatic alignment without user-selected reference points
- `100% client-only`
- `network-free by design`
- Unsupported numeric performance gains
- CompareX-wide invention scope beyond the Pinpoint core package
- Universal persistence of all state across all mode switches

## Controlled Wording
- Prefer `사용자 주도형 정밀 정합` over `자동 정합`
- Prefer `기준 참조점 유지 구조` over `완전 자동 기준점 추적`
- Prefer `공통 화면 기준좌표를 공유` over `모든 창이 항상 동일 상태를 완전 유지`
- Prefer `현행 구현 기준` over `일반적으로 보장됨`
- Prefer `측정 계획` or `관찰 지표` over hard productivity or performance numbers
- Prefer `문서화 연계가 용이함` over `자동 보고서 생성이 구현됨`

## Current-Code Cautions
- Pinpoint is not a feature-point registration pipeline in the current codebase.
- The app contains broader product context, but this package must stay Pinpoint-core only.
- Mode changes reset multiple state buckets in `src/store.ts`, so persistence claims must be scoped carefully.
- Rect-zoom and leveling should be described with user-input quality and geometry limits in mind.
