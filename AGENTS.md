# Repository Guidelines

## Project Structure & Module Organization
- src/: React + TypeScript source.
  - src/components/: UI components (PascalCase, .tsx).
  - src/modes/: Feature modes (Compare, Pinpoint, Analysis).
  - src/hooks/: Reusable hooks.
  - src/utils/: Pure utilities (e.g., TIFF/UTIF helpers, filters).
  - src/store.ts: Global state (Zustand).
  - src/types.ts, src/config.ts: Shared types and config.
- index.html: App entry; src/main.tsx bootstraps React.
- dist/: Production build output.
- .github/workflows/gh-pages.yml: GitHub Pages deploy.

## Build, Test, and Development Commands
- npm run dev: Start Vite dev server with HMR.
- npm run build: Build to dist/.
- npm run preview: Serve the built app locally.
- npm run lint: Type-check with tsc (strict mode).
- npm run deploy: Publish dist/ to gh-pages (via predeploy + build).

## Coding Style & Naming Conventions
- Language: TypeScript, React 18, Vite.
- Indentation: 2 spaces; include semicolons; prefer double quotes.
- Components: PascalCase filenames and exported identifiers.
- Functions/variables: camelCase. Types/interfaces/enums: PascalCase.
- Files: .tsx for components; .ts for utils/types. Prefer named exports for modules; default export only for root App.
- Linting/formatting: No ESLint/Prettier configured; keep code consistent with existing style and pass npm run lint.

## Testing Guidelines
- Framework: None configured. Type safety enforced via tsc.
- If adding tests, prefer Vitest + React Testing Library.
  - Location: alongside source as *.test.ts(x) under src/.
  - Focus: store logic, utilities, and component behavior.

## Commit & Pull Request Guidelines
- Commit style observed in history: short, categorized subjects like (Add), (Fix), (Mod) plus a brief imperative description. Mixed EN/KR accepted.
  - Example: (Fix) prevent NaN viewport scale on blur
- Branches: feature/<short-name>, fix/<short-name>, chore/<short-name>.
- Pull requests must include:
  - Summary of changes and rationale; linked issues (e.g., #123).
  - How to test (commands, steps) and impact on modes (Compare/Pinpoint/Analysis).
  - Screenshots or short GIFs for UI changes.

## Architecture Notes
- State: Centralized in src/store.ts (Zustand) with typed actions/selectors.
- Modes: Compare/Pinpoint/Analysis encapsulated in src/modes/ with shared components.
- Imaging: TIFF support via UTIF utilities; heavy work isolated in src/utils/.


📋 남은 작업들 (우선순위별)

  🎯 단기 작업 (바로 진행 가능)

  🧪 1. 테스트 & 검증
  - 현재 구현된 19개 OpenCV 필터 동작 테스트
  - 성능 비교 및 품질 검증
  - 버그 발견 및 수정

  🔧 2. TypeScript 오류 수정
  - 코드 안정성 및 타입 안전성 향상
  - 개발 환경 개선

  🚀 중기 작업 (새로운 필터 구현)

  📊 3. Phase 5: Histogram Operations
  - Histogram Equalization OpenCV 구현
  - CLAHE (Contrast Limited Adaptive Histogram Equalization)
  - Local Histogram Equalization
  - 예상 성능 향상: 4-7배

  🎨 4. Phase 6: Color Space & Enhancement
  - Gamma Correction OpenCV 구현
  - Linear Stretch OpenCV 구현
  - Unsharp Mask OpenCV 구현
  - 색상 공간 변환 최적화

  🔍 5. Phase 7: Texture Analysis
  - Gabor Filter OpenCV 구현
  - Laws Texture Energy OpenCV 구현
  - Local Binary Patterns OpenCV 구현
  - 텍스처 분석 성능 대폭 향상

  📈 장기 작업 (최적화 & 완성도)

  ⚡ 6. 성능 벤치마크 & 최적화
  - 전체 필터 성능 비교 테스트
  - 메모리 사용량 최적화
  - 대용량 이미지 처리 최적화

  🔧 7. 추가 기능
  - 필터 체인 (여러 필터 연속 적용)
  - 필터 프리셋 저장/불러오기
  - 실시간 미리보기 최적화

  ---

  ---
  📊 현재 상황 요약:

  ✅ 완료된 것:

  - 19개 OpenCV 가속 필터 구현 완료
  - 4개 Phase 모두 완료
  - 성능 추정 시스템 구현
  - UI 통합 및 카테고리 분류

  🚧 진행 중인 것:

  - 없음 (모든 Phase 완료)

  ⏳ 대기 중인 것:

  - 5개 추가 Phase (Histogram, Color, Texture 등)
  - 테스트 & 검증
  - 코드 품질 개선