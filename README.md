# compareX

Advanced multi-view image comparison and analysis workspace for desktop (Electron) and web. compareX keeps every pixel on the client while giving experts precise control over alignment, filtering, and capture workflows.

## Overview
- **Unified tri-mode workspace** – Switch between Compare, Pinpoint, and Analysis modes without reloading data. Shared viewport state, drag-and-drop import, and a consistent toolbar make it easy to pivot between review tasks.
- **Local-first processing** – Images stay on the device. OpenCV.js, UTIF-based TIFF decoding, and filter chains run entirely in the browser or Electron runtime so sensitive datasets never leave your machine.
- **Production-ready interface** – Minimap navigation, rect-zoom, rotation leveling, capture exports, and performance feedback are built into the default UI.

## Feature Highlights
### Compare mode
- Load up to 24 synchronized viewers (6×4 layout) with automatic filename matching across folder slots.
- Toggle matched images, swap sources, or reorder folders while keeping per-image filters and transforms intact.
- Shared pan/zoom controls with numeric inputs, synchronized minimaps, and grid overlays for quantitative inspection.

### Pinpoint mode
- Precision alignment workspace with reference pins, per-viewer scale/rotation, and leveling tools for horizontal or vertical baselines.
- Shift vs. swap reorder modes let you restack imagery without losing annotations or transforms.
- Optional crosshair overlays and scale readouts help document measurement steps during reviews.

### Analysis mode
- Compare multiple filter outputs from a single source image side-by-side, each with independent rotation and zoom.
- Bring in filter chains from the cart or build per-slot filter stacks with live parameter control and performance estimation.
- Capture annotated results directly to clipboard or disk with optional labels, grids, and minimaps.

### Filter system
- 60+ OpenCV-powered filters spanning tone, histogram operations, thresholding, denoising, edge detection, morphology, texture, frequency transforms, and scientific colormaps.
- Filter cart panel supports drag-to-reorder chains, preset save/load, JSON import/export, and modal previews before applying effects to viewers.
- Performance gauge surfaces estimated processing cost so heavy pipelines can be tuned before committing to a full-resolution run.

### Image ingest & organization
- Folder pickers and drag-and-drop ingest accept JPEG, PNG, TIFF (UTIF decoded), WebP, GIF, BMP, and SVG assets. Nested folder drops are handled with friendly error toasts when the browser blocks direct access.
- Intelligent matching pairs files by name (optionally stripping extensions) and surfaces mismatches for quick cleanup.
- Cached ImageBitmap pipeline keeps large TIFFs responsive while storing size metadata for later performance projections.

### Navigation, overlays, and capture
- Viewport toolbar exposes rect-zoom, numeric scale and coordinate inputs, and global toggles for minimap, grid color, and filter labels.
- Capture modal exports PNGs with per-layer toggles (labels, crosshair, minimap, grid) and clipboard or filesystem destinations in Electron builds.
- Minimap widget offers click-to-jump navigation with customizable size and screen position.

### Desktop niceties
- Electron builds include auto-update checks with environment-aware feeds, progress toasts, and manual retry controls.
- Update feed selection honors dev/prod channels so QA teams can stage builds safely.

## Typical Workflow
1. **Launch compareX** using the Electron app or the Vite dev server. Choose Compare, Pinpoint, or Analysis from the top-mode switcher; the UI will load relevant panels instantly.
2. **Import imagery** by assigning folders (A–Z) or dropping directories/files straight into the workspace. The matcher synchronizes filenames across slots and lists any gaps.
3. **Review in Compare mode** with synchronized pan/zoom, layout grid selector, toggle modal for quick A/B, and optional minimap/grid overlays.
4. **Refine alignment in Pinpoint mode** by adding reference pins, adjusting per-viewer scale/rotation, or using leveling capture to align horizons before export.
5. **Experiment with filters** via the filter cart: queue operations, tweak parameters, preview results, then apply to selected viewers or hand off chains to Analysis mode slots.
6. **Capture and share** with the capture modal—copy to clipboard for quick messaging or save to disk (Electron) while choosing which overlays to include.

## Keyboard Shortcuts
| Category | Keys | Action |
| --- | --- | --- |
| Mode switching | `Ctrl + 1` / `Ctrl + 2` / `Ctrl + 3` | Pinpoint / Analysis / Compare mode |
| Panels & overlays | `Ctrl + F` toggle controls, `Alt + L` file list, `Alt + M` minimap, `Alt + G` grid, `Alt + I` info panel, `Alt + R` reset view | Quickly show/hide UI helpers |
| Navigation | `+`, `=`, `-` zoom; `Shift` + arrow keys pan | Fast viewport adjustments |
| Filter labels | `Ctrl + L` | Toggle filter badges in viewers |
| Clipboard | `Ctrl + C` | Copy selected text (preserves standard OS behavior) |

Full cheat sheet: [`SHORTCUTS_GUIDE.md`](./SHORTCUTS_GUIDE.md).

## Setup & Development
### Prerequisites
- Node.js 20.19+ and npm 10+ (Vite + Electron builder toolchain)
- macOS, Windows, or Linux with system OpenGL for WebGL canvas acceleration

### Install & run
```bash
# Install dependencies
npm install

# Start Vite dev server (development channel)
npm run dev

# Start dev server with production flags (closer to Electron builds)
npm run dev:prod
```

### Install notes
- Run install commands as a regular user. Do not use `sudo npm install` in this repo.
- If files were previously created by `sudo`, restore ownership before installing:
```bash
sudo chown -R "$USER":"$USER" .
```
- Depending on npm resolution and platform, a small number of deprecated transitive warnings may still appear from Electron packaging dependencies. These are upstream-chain issues.

### Electron workflows
```bash
# Launch Electron against the dev server (hot reload)
npm run electron:dev

# Package desktop builds (production channel)
npm run electron:pack

# Windows-only installer
npm run electron:pack:win
```
Auto-updates pull from the feed configured in `deployTargets` and respect the channel selected in the app’s Update panel.

### Quality gates
```bash
# Type-check the project
npm run lint

# Production bundle
npm run build

# Preview built bundle locally
npm run preview
```

## Project Structure
| Path | Description |
| --- | --- |
| `src/App.tsx` | Root workspace shell: mode switcher, global toolbars, capture modal, and updater integration. |
| `src/modes/` | Mode-specific canvases and logic for Compare, Pinpoint, and Analysis views. |
| `src/components/` | Shared UI widgets (image canvas, filter cart, toasts, layout picker, rotation controls). |
| `src/utils/` | Image processing helpers (OpenCV adapters, UTIF decoding, drag-drop, filter chain management). |
| `src/store.ts` | Zustand state container coordinating viewer layout, filters, selections, and toasts. |
| `docs/` | Supplemental guides (tutorial roadmap, filter parameter references, UX polish notes). |

## Additional Resources
- Korean program overview: [`docs/compareX_intro_kr.md`](./docs/compareX_intro_kr.md)
- Filter parameter limits: [`docs/filter-parameter-limits.md`](./docs/filter-parameter-limits.md)
- Tutorial roadmap: [`docs/tutorial-roadmap.md`](./docs/tutorial-roadmap.md)

compareX ships under the repository’s default license. Reach out to the compareX team for deployment questions or feature requests.
