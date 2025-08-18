# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Create production build  
- `npm run lint` - Run TypeScript compiler to check for type errors
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages (runs build first)

## Architecture Overview

This is a React-based image comparison web application built with TypeScript and Vite. The app provides four distinct viewing modes for analyzing and comparing images from local folders.

### State Management
- **Zustand store** (`src/store.ts`) - Central state management for all app modes, viewport, filters, and UI state
- **Types** (`src/types.ts`) - Core TypeScript definitions including `AppMode`, `FolderKey`, `FilterType`, and `Viewport`

### Core Application Structure
- **Main App** (`src/App.tsx`) - Root component handling mode switching, keyboard shortcuts, and UI orchestration
- **Mode Components** (`src/modes/`) - Four specialized view modes:
  - `CompareMode.tsx` - Side-by-side comparison of 2-9 folders
  - `ToggleMode.tsx` - Cycle through folders in the same viewport  
  - `PinpointMode.tsx` - Manual alignment with reference points and rotation
  - `AnalysisMode.tsx` - Apply different filters to the same image

### Key Components
- **ImageCanvas** (`src/components/ImageCanvas.tsx`) - Core canvas-based image renderer with zoom, pan, and filter support
- **FilterControls** (`src/components/FilterControls.tsx`) - Comprehensive image filter system with 40+ filter types
- **FolderControl** (`src/components/FolderControl.tsx`) - File browser and folder selection interface

### Utilities
- **Image Processing** (`src/utils/utif.ts`) - TIFF image decoding using UTIF library
- **File Matching** (`src/utils/match.ts`) - Logic for matching files across folders
- **Filter Implementation** (`src/utils/filters.ts`) - Canvas-based image filter algorithms

### Configuration
- **Base Path**: `/image_multi_view/` for GitHub Pages deployment
- **Browser-only**: No server required - all image processing happens client-side
- **TIFF Support**: Uses `utif` library for TIFF decoding, `tiff` library as fallback

### Key Features
- **Privacy-focused**: All processing local, no file uploads
- **Flexible Layout System**: Auto and custom layout modes with resizable panels
- **Synchronized viewports**: Pan/zoom actions sync across all viewers  
- **Advanced filtering**: 40+ image filters with adjustable parameters
- **Keyboard-driven**: Extensive hotkey support for rapid navigation
- **Multiple file formats**: Standard web images plus TIFF support

### Layout System
The application features a flexible layout system with two modes:

**Auto Layout (Default)**
- Automatically arranges viewers in an optimal grid based on viewer count
- Uses square root calculation for balanced rows/columns

**Free Layout**
- Complete freedom to position and size panels anywhere
- Drag panels by their header to move them around the container
- Resize panels by dragging edge handles without grid constraints
- Minimum panel size of 50px for usability
- Panels can overlap and be positioned freely
- No automatic alignment or grid snapping

**Layout Components**
- **FlexibleLayout** (`src/components/FlexibleLayout.tsx`) - Core layout container with dynamic panel management
- **ResizeHandle** (`src/components/ResizeHandle.tsx`) - Interactive resize controls with throttled updates (60fps)
- **DragHandle** (`src/components/DragHandle.tsx`) - Panel drag functionality for free positioning
- **LayoutControls** (`src/components/LayoutControls.tsx`) - Mode switching and reset functionality