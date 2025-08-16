# Image Compare Viewer

A client-side web application for comparing images from multiple local folders. Built with React and TypeScript, it works entirely in your browser with no file uploads.

## Modes

The app provides three modes suited for different workflows:

### Compare Mode
- View images from 2–9 folders side by side in a grid.
- All viewers pan and zoom together and file lists can be searched.
- Rename folder aliases and optionally ignore file extensions when matching.

### Toggle Mode
- Display one folder at a time while keeping the same viewport.
- Press `Space` to cycle through loaded folders.

### Pinpoint Mode
- Load any image into any viewer and align them using a reference point.
- Each viewer has independent scale and rotation with a global scale multiplier.
- Click to set the reference crosshair; `Alt` + drag rotates the active image.

## Major Features

- **Synchronized Viewports:** Pan and zoom on one image and all others follow.
- **Flexible File Matching:** Match by full filename or ignore extensions.
- **Per-Viewer Filters:** Apply contrast, blur, edge-detection and other filters with adjustable parameters.
- **Capture Tool:** Export the current view to the clipboard or as an image file.
- **Minimap:** Optional overview of the full image and current viewport.
- **Image Info Panel:** Shows filename, dimensions and file size of the active image.
- **Keyboard Shortcuts:** Hotkeys for rapid navigation and mode control.

## Getting Started

```bash
npm install
npm run dev
```

Open the printed URL in your browser. Use the **Mode** dropdown or hotkeys (`1`: Compare, `2`: Toggle, `3`: Pinpoint) to switch modes.

1. Pick folders (Folder A, B, etc.) to load images.
2. Select a filename from the list on the left.
3. Use mouse or keyboard shortcuts to pan, zoom and analyze.
   - In **Toggle** mode press `Space` to switch folders.
   - In **Pinpoint** mode click to set the reference point and use `Alt` + drag to rotate.

## Keyboard Shortcuts

| Key(s)                | Action                                       |
| --------------------- | -------------------------------------------- |
| `1` / `2` / `3`       | Switch to Compare / Toggle / Pinpoint mode   |
| `A` / `D`             | Previous / Next Image                        |
| `Space` (Toggle mode) | Cycle source folder                          |
| `Arrow Keys`          | Pan the image (Up, Down, Left, Right)        |
| `+` / `=` or `-`      | Zoom In / Zoom Out                           |
| `R`                   | Reset View                                   |
| `L`                   | Toggle Sync Lock                             |
| `I`                   | Show / Hide Image Information Panel          |

## Build

To create a production build run:

```bash
npm run build
```

The app can be deployed to GitHub Pages with `npm run deploy`.
