# Image Compare Viewer

Our app is a client-side web tool for analyzing and comparing images from multiple local folders. Built with React and TypeScript, it works entirely in your browser with no file uploads. The tool is ideal for quality inspection, training data review or any workflow where you need to align and inspect many images quickly.

## Purpose
Image Compare Viewer helps researchers, artists and QA teams inspect large batches of images rapidly. It was created for scenarios where you must check whether different versions of an image line up, evaluate algorithmic outputs or validate training datasets without exposing the files to a server.

## Features
- **Privacy-friendly:** All processing happens locally; files never leave your machine.
- **Flexible Viewers:** Load up to nine folders and view any combination side by side.
- **Advanced Analysis Tools:** Apply a wide range of filters and capture composite views.
- **Keyboard Driven:** Numerous hotkeys for rapid navigation and mode switching.
- **Synchronized Viewports:** Pan and zoom on one image and all others follow.
- **Flexible File Matching:** Match by full filename or ignore extensions.
- **Per-Viewer Filters:** Apply contrast, blur, edge detection, texture, and noise-reduction filters with adjustable parameters.
- **Capture Tool:** Export the current view to the clipboard or as an image file.
- **Minimap & Grid:** Optional minimap overview and adjustable grid overlay.
- **Image Info Panel:** Shows filename, dimensions and file size of the active image.

## Modes and Usage

The app provides four modes suited for different workflows.

### Compare Mode
- View images from 2–9 folders side by side in a synchronized grid.
- Ideal for verifying alignment across datasets or model outputs.
- Pan and zoom once and all viewers follow.
- Rename folder aliases and optionally ignore file extensions when matching files.

### Toggle Mode
- Display one folder at a time while maintaining the current viewport.
- Useful for spot-the-difference reviews.
- Press `Space` to cycle through loaded folders.

### Pinpoint Mode
- Load any image into any viewer and align them using a shared reference point.
- Great for studying geometric differences or overlaying parts.
- Each viewer has independent scale and rotation with a global scale multiplier.
- Click to set the reference crosshair; `Alt` + drag rotates the active image.

### Analysis Mode
- Apply different filters to the same image for side-by-side comparison.
- Experiment with filters, rotations and capture outputs on a single source image.

## Available Filters

A selection of built-in filters can be applied to each viewer:

- Box blur, Gaussian blur
- Sharpen, Unsharp mask, Highpass, Gabor
- Prewitt, Scharr, Sobel, Roberts Cross
- Laplacian, Laplacian of Gaussian (LoG), Difference of Gaussians (DoG), Marr–Hildreth, Canny
- Linear contrast stretch, Histogram equalization, CLAHE, Gamma correction
- Local histogram equalization, Adaptive histogram equalization
- Median, Weighted median, Alpha-trimmed mean
- Bilateral filter, Non-local means, Anisotropic diffusion, Guided filter
- Local binary patterns (LBP), Laws' texture energy

## Getting Started

```bash
npm install
npm run dev
```

Open the printed URL in your browser. Use the **Mode** dropdown or hotkeys (`1`: Compare, `2`: Toggle, `3`: Pinpoint, `4`: Analysis) to switch modes.

1. Pick folders (Folder A, B, etc.) to load images.
2. Select a filename from the list on the left.
3. Use mouse or keyboard shortcuts to pan, zoom and analyze.
   - In **Toggle** mode press `Space` to switch folders.
   - In **Pinpoint** mode click to set the reference point and use `Alt` + drag to rotate.

## Keyboard Shortcuts

| Key(s)                         | Action                                        |
| ------------------------------ | --------------------------------------------- |
| `1` / `2` / `3` / `4`          | Switch to Compare / Toggle / Pinpoint / Analysis mode |
| `Space` (Toggle mode)          | Cycle source folder                           |
| `=` or `+` / `-`               | Zoom In / Zoom Out                            |
| `Arrow Keys`                   | Pan the image (Up, Down, Left, Right)         |
| `R`                            | Reset View                                    |
| `I`                            | Show / Hide Image Information Panel           |
| `Alt` + drag (Pinpoint mode)   | Rotate active image                           |

## Expected Benefits

- Speeds up quality checks by allowing many images to be reviewed in parallel.
- Simplifies dataset curation and algorithm comparison workflows.
- Enhances privacy because images never leave your computer.
- Offers flexible analysis tools for research and education.

## Build

To create a production build run:

```bash
npm run build
```

The app can be deployed to GitHub Pages with `npm run deploy`.
