# CompareX

Compare, Pinpoint and Analyze images from multiple local folders in your browser. Built with React + TypeScript + Vite, everything runs client‑side — no file uploads.

## Install & Run

```bash
npm install
npm run dev
```

## Top Controls (controls‑main)

- Mode: Compare / Pinpoint / Analysis
- Layout: choose rows×cols (viewer count updates automatically)
- Toggle: open selected viewers in the Toggle modal
- Capture: capture composite (labels/crosshair/minimap options)
- Minimap: toggle + gear button opens an options modal (position/size)
- Grid: toggle + color indicator opens a color modal
- Viewport (non‑Pinpoint): enter Scale/X/Y to set zoom/center precisely
- Title (CompareX): click to hard‑reset (page refresh)

## Modes

### Compare
- Load folders into slots A…Z and match by filename (ignore extension optional)
- Select viewers (○/✓) and open the Toggle modal to cycle them
- Global rotation: control UI or Alt+drag (left/right) — minimap rotates too

### Pinpoint
- Load different images into viewers and align via a shared reference point (pin)
- Per‑viewer scale + global scale, per‑viewer rotation + global rotation
- Mouse mode: Pin (set reference) / Pan (drag) — right click toggles
- = / -: adjust per‑viewer scale by 1% on the active viewer
- Alt+drag (left/right): per‑viewer rotation
- Crosshair/rotation badge/minimap (rotation‑aware)

### Analysis
- Apply different filters to the same image across viewers
- Global rotation: control UI or Alt+drag — minimap rotates accordingly

## Toggle Modal

- Cycles only the selected viewers (Next/Prev)
- Compare/Analysis: enter zoom % and X/Y (px) — confirm with Enter; adds a highlight indicator
- Hotkeys: Space / Shift+Space / ← / → / Esc
- Filter state/labels/minimap preserved; caching for fast switching

## Capture

- Composite current layout into a single image
- Options: show labels, crosshair (Pinpoint/Analysis), minimap
- Output: copy to clipboard and/or save as file

## Minimap

- Options modal (gear button):
  - Position: Top‑Left / Top‑Right / Bottom‑Left / Bottom‑Right
  - Size: Small(120) / Medium(150) / Large(200) / XL(240)
- Minimap rotates with the image in Pinpoint/Analysis/Compare
- Included in capture with the same settings

## Grid

- 3×3 rule‑of‑thirds guide toggle
- Colors: white / red / yellow / blue (via the color indicator)

## Folder Control Cards

- Unloaded: clean “Select Folder” card with icon
- Loaded: folder key label, alias (edit via pencil or double‑click), file count chip, change/clear buttons

## Keyboard Shortcuts

- 1 / 2 / 3: switch to Compare / Pinpoint / Analysis
- R: reset view (fit to screen)
- I: toggle info panel
- + / -: zoom in/out
- Arrow keys: pan (non‑Pinpoint)
- Space: open Toggle or next (if viewers selected)
- Shift+Space: previous in Toggle
- Esc: close Toggle
- Pinpoint only
  - = / -: per‑viewer scale ±1% on the active viewer
  - Right click: toggle Pin ↔ Pan
  - Alt+drag (left/right): per‑viewer rotation
- Compare/Analysis
  - Alt+drag (left/right): global rotation

## Filters (Summary)

- General: None, Grayscale, Invert, Sepia
- Contrast: Linear Stretch, Histogram Eq, Local/Adaptive HE, CLAHE, Gamma
- Blurring: Box, Gaussian(σ), Median, Weighted Median, Alpha‑trimmed Mean(α)
- Sharpening: Sharpen, Unsharp Mask, High‑pass, Laplacian
- Edge: Sobel, Prewitt, Scharr, Canny(low/high), Roberts, LoG(ksize, σ), DoG(σ1, σ2), Marr‑Hildreth(ksize, σ, threshold)
- Advanced Denoising: Bilateral(ksize, sigmaColor/Space), Non‑local Means(patchSize, searchWindow, h), Anisotropic Diffusion(iterations, kappa)
- Texture: Gabor(theta, sigma, lambda, psi), Laws Texture Energy, LBP
- Edge‑preserving: Guided Filter

Per‑viewer filter settings are available via the “filter” button on each viewer.

## Build & Deploy

```bash
npm run build
npm run preview
npm run deploy
```

## Stack & Structure

- React 18 + TypeScript + Vite
- State: Zustand (`src/store.ts`)
- Modes: `src/modes/` (Compare/Pinpoint/Analysis)
- Components: `src/components/`
- Utils/Filters: `src/utils/`
- Hooks: `src/hooks/`

## Recent Changes (Highlights)

- Toggle modal: global button, fast cache, zoom/X/Y input (Compare/Analysis)
- Rotation: global rotation (Compare/Analysis) + Alt+drag; per‑viewer/global rotation (Pinpoint) + Alt+drag
- Minimap: options modal (position/size), rotated minimap, reflected in capture
- Grid: color picker modal
- Folder cards: cleaner loaded/unloaded UI, inline alias edit button
- Title click: full reset (refresh)
