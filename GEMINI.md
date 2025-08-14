# ✅ 개요(요점 정리)

- **목표:** React + TypeScript로 *서버 없이* 로컬 폴더(전·후 2~3개)를 불러와 **동일 파일명** 이미지의 **동기화된 zoom/pan** 비교 뷰어 구현
- **핵심 포인트:** File System Access API(또는 `input[webkitdirectory]`)로 폴더 로드 → 파일명 매칭 → 각 뷰어의 **viewport**(scale, center)를 **sync**
- **우선 구현 기능:** 폴더 선택(2~3개), 파일 매칭 리스트, 이미지 전환, **wheel zoom(커서 기준)**, drag pan, **sync on/off**, zoom/position reset
- **테스트 편의:** 상단 `config.ts`에서 **배율/속도/성능 옵션** 즉시 조정
- **확장 아이디어:** difference/blend 모드, minimap, ruler/crosshair, blink, split slider
