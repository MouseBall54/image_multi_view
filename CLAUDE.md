# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Create production build  
- `npm run lint` - Run TypeScript compiler to check for type errors
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages (runs build first)

## Architecture Overview

This is a React-based image comparison web application built with TypeScript and Vite. The app provides specialized viewing modes for analyzing and comparing images from local folders.

### State Management
- **Zustand store** (`src/store.ts`) - Central state management for all app modes, viewport, filters, and UI state
- **Types** (`src/types.ts`) - Core TypeScript definitions including `AppMode`, `FolderKey`, `FilterType`, and `Viewport`

### Core Application Structure
- **Main App** (`src/App.tsx`) - Root component handling mode switching, keyboard shortcuts, and UI orchestration
- **Mode Components** (`src/modes/`) - Three specialized view modes:
  - `CompareMode.tsx` - Side-by-side comparison of 2-9 folders
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

## Toggle Mode Redesign

The standalone toggle mode has been eliminated and replaced with integrated toggle functionality within each mode. The toggle feature allows cycling through a pre-selected set of images for detailed comparison and difference analysis.

### Toggle Functionality Concept
**Core Purpose:**
- Cycle through a pre-selected collection of images in the same viewport
- Enable detailed difference analysis by rapidly switching between selected images
- Maintain viewport state (zoom, pan, rotation) while switching images
- Preserve mode-specific settings during image transitions

### Image Selection and Toggle Workflow
1. **Image Selection Phase**: User selects specific images they want to compare
2. **Toggle Activation**: Space bar or Toggle button activates cycling mode
3. **Image Cycling**: Navigate through selected images while preserving view state
4. **Difference Analysis**: Compare images by rapid switching to spot differences

### Implementation Strategy
1. **Eliminated ToggleMode.tsx** - Removed standalone toggle mode
2. **Updated AppMode type** - Removed "toggle" from union type in `src/types.ts`
3. **Integrated selection + toggle per mode** - Each mode handles image selection and cycling
4. **Mode-specific toggle behavior**:
   - **Compare Mode**: Select from matched file list, cycle through selected images
   - **Pinpoint Mode**: Select loaded images, cycle while preserving alignment settings
   - **Analysis Mode**: Select different processed versions, cycle through filter comparisons

### Toggle Behavior Per Mode

#### Compare Mode Toggle
- **Selection**: Checkbox/multi-select from matched file list
- **Trigger**: Space bar or Toggle button after selection
- **Action**: Cycle through selected images across all viewers simultaneously
- **State Preservation**: Viewport zoom/pan maintained across image switches
- **Use Case**: Compare same scenes across different folders or different images

#### Pinpoint Mode Toggle  
- **Selection**: Choose specific images loaded in viewers for comparison
- **Trigger**: Space bar (when not in other modal states)
- **Action**: Cycle through selected images in the active viewer
- **State Preservation**: 
  - Individual viewer rotations maintained
  - Reference points preserved
  - Scale settings kept
  - Global rotation applied consistently
- **Use Case**: Compare aligned images with different rotation/scale adjustments

#### Analysis Mode Toggle
- **Selection**: Choose different images or filter variations to compare
- **Trigger**: Space bar 
- **Action**: Cycle through selected images/filter combinations
- **State Preservation**: 
  - Applied filters maintained (or cycle through different filter presets)
  - Filter parameters preserved
  - Rotation settings kept
- **Use Case**: Compare same image with different processing or different source images

### Technical Implementation
- **Selection State**: Track selected images per mode in Zustand store
- **Selection UI**: Checkbox interfaces or multi-select controls in each mode
- **Keyboard Handling**: Space bar for cycling, Shift+Space for reverse
- **Cycle Logic**: Wrap-around cycling through selected image collection
- **Mode Integration**: Selection and toggle integrated into existing mode workflows
- **Visual Feedback**: Clear indication of current position in toggle sequence

### Key Benefits
- **Focused Comparison**: Only cycle through images user specifically wants to compare
- **Flexible Selection**: Different selection criteria per mode (files, filters, alignments)
- **State Preservation**: Mode-specific settings maintained during image transitions
- **Rapid Analysis**: Quick image switching enables effective difference detection
- **Contextual Workflow**: Toggle behavior adapted to each mode's specific use case

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

## Mode-Specific Architecture

### Compare Mode
- **Multi-folder comparison**: 2-9 folders side-by-side
- **Synchronized navigation**: Pan/zoom propagates across all viewers
- **File matching**: Automatic filename matching with extension stripping option
- **Layout flexibility**: Auto and free layout modes with resizable panels

### Pinpoint Mode  
- **Reference-based alignment**: Set common reference points across images
- **Individual scaling**: Per-viewer scale with global scale multiplier
- **Rotation support**: Local rotation (Alt+drag) + global rotation controls
- **Flexible loading**: Load any image from any folder into any viewer

### Analysis Mode
- **Single image focus**: Apply multiple filters to one source image
- **Filter comparison**: Side-by-side filter effect analysis
- **Rotation controls**: Global rotation for consistent orientation
- **Parameter adjustment**: Real-time filter parameter tuning

## Important Development Notes

### Coordinate System Accuracy
- **ImageCanvas coordinate calculation**: The indicator dot positioning uses precise image-to-screen coordinate transformation
- **Account for transformations**: Scale, pan, and rotation must be considered in coordinate calculations
- **Reference points**: Pinpoint mode requires careful handling of reference point coordinates vs. screen positions

### Filter System
- **40+ filter types**: Comprehensive image processing pipeline with adjustable parameters
- **Real-time application**: Filters applied via canvas operations with caching
- **Parameter validation**: Ensure filter parameters stay within valid ranges
- **Performance considerations**: Large images may require debounced parameter updates

### State Management Patterns
- **Mode isolation**: Each mode maintains its own state without interfering with others
- **Viewport synchronization**: Shared viewport state for synchronized navigation
- **Cache management**: Efficient bitmap caching for performance with large image sets
- **Filter caching**: Separate cache for filtered images to avoid recomputation

### Keyboard Shortcuts
- **Space**: Primary navigation (currently toggle mode, will become modal trigger)
- **Mode switching**: Number keys for quick mode changes
- **Viewer selection**: Click to activate viewers for keyboard operations
- **Global shortcuts**: Capture, layout switching, filter controls