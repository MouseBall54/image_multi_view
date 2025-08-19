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

