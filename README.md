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

## Windows Desktop App Build

CompareX can be built as a native Windows desktop application using Electron.

### Prerequisites

- Node.js (v18 or later)
- Windows operating system (for proper ICO icon generation)
- Git (for cloning the repository)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd image_multi_view_win
   npm install
   ```

2. **Verify icon assets:**
   Ensure the following icon files exist in the `assets/` folder:
   - `icon.png` - Main source icon (any size, preferably 512x512 or larger)
   - `icon-16.png` through `icon-256.png` - Generated icon sizes
   - `icon.ico` - Windows ICO file containing multiple sizes

### Build Commands

- **Development mode:**
  ```bash
  npm run electron:dev
  ```
  Runs the Electron app in development mode with hot reload.

- **Build Windows installer:**
  ```bash
  npm run electron:pack:win
  ```
  Creates a Windows installer (.exe) in the `dist-electron/` folder.

- **Build all platforms:**
  ```bash
  npm run electron:pack
  ```
  Builds for all configured platforms.

### Build Output

After running `npm run electron:pack:win`, you'll find:

- `CompareX Setup 1.0.0.exe` - Windows installer
- `win-unpacked/CompareX.exe` - Standalone executable
- `latest.yml` - Auto-updater metadata

### Icon Configuration

The Windows build uses a custom icon system with multiple sizes:

- **Source**: `assets/icon.png` (X_4.png design with 4 different X styles)
- **Sizes**: 16×16, 32×32, 48×48, 64×64, 128×128, 256×256 pixels
- **Format**: ICO file containing all sizes for optimal Windows compatibility
- **Usage**: App icon, taskbar, desktop shortcut, installer

### Build Configuration

The Windows build is configured in `package.json`:

```json
"build": {
  "win": {
    "target": "nsis",
    "icon": "assets/icon.ico",
    "requestedExecutionLevel": "asInvoker",
    "artifactName": "${productName}-${version}-setup.${ext}"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "installerIcon": "assets/icon.ico",
    "uninstallerIcon": "assets/icon.ico"
  }
}
```

### Troubleshooting

**ICO file errors:**
- Ensure `assets/icon.ico` contains proper Windows ICO format with multiple sizes
- The ICO must include at least a 256×256 pixel image
- Use proper ICO generation tools if regeneration is needed

**Build failures:**
- Verify Node.js version (v18+)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check that all required PNG sizes exist in `assets/` folder

**Missing dependencies:**
- Run `npm install` to ensure all dev dependencies are installed
- Sharp and electron-builder packages are required for the build process

### Distribution

The generated installer (`CompareX Setup 1.0.0.exe`) can be distributed to users. It includes:
- NSIS-based installer with custom CompareX icon
- Desktop and Start Menu shortcuts
- Uninstaller with proper cleanup
- No admin privileges required for installation

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
