# Image Compare Viewer

A client-side web application for comparing images from multiple local folders. This tool is built with React and TypeScript and allows for detailed image comparison with synchronized zoom and pan controls, all without uploading any files to a server.

## Features

- **Multi-Folder Comparison:** Open and compare images from 2 to 4 different folders simultaneously.
- **Synchronized Viewports:** Pan and zoom on one image, and all other images will follow in sync.
- **Flexible File Matching:** Match corresponding images by full filename or by name only (ignoring extensions).
- **Fit-to-Screen:** Easily reset the view to make the entire image fit within the viewer.
- **Image Info Panel:** View detailed information about the current image, such as dimensions and file size.
- **Keyboard Shortcuts:** A comprehensive set of hotkeys for fast and efficient navigation and control.

## How to Use

1.  Click the **Pick Folder A**, **Pick Folder B**, etc., buttons to select the local directories you want to compare.
2.  The application will find all the images with matching filenames across the selected folders.
3.  Click on a filename in the list on the left to display the images.
4.  Use your mouse or the hotkeys below to zoom, pan, and compare the images.

## Keyboard Shortcuts

| Key(s)             | Action                               |
| ------------------ | ------------------------------------ |
| `A` / `D`          | Previous / Next Image                |
| `Arrow Keys`       | Pan the image (Up, Down, Left, Right)|
| `+` / `=` or `-`   | Zoom In / Zoom Out                   |
| `R`                | Reset View (fits image to screen)    |
| `L`                | Toggle Sync Lock                     |
| `I`                | Show / Hide Image Information Panel  |
