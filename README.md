# CompareX - Advanced Image Comparison & Analysis Tool

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://mouseball54.github.io/image_multi_view/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](#)
[![React](https://img.shields.io/badge/React-18-blue)](#)

**CompareX** is a powerful, browser-based image comparison and analysis application designed for professionals who need to compare, analyze, and process multiple images simultaneously. Built with React and TypeScript, it offers four specialized viewing modes with advanced filtering capabilities and complete privacy through client-side processing.

## 🌐 Live Demo

Experience CompareX directly in your browser: **[https://mouseball54.github.io/image_multi_view/](https://mouseball54.github.io/image_multi_view/)**

No installation required - all processing happens locally in your browser!

## ✨ Key Features

### 🔒 Privacy-First Design
- **100% Client-Side Processing** - No file uploads, all processing happens locally
- **Complete Privacy** - Your images never leave your device
- **No Server Required** - Pure web application with offline capability

### 🎯 Three Specialized Viewing Modes
1. **Compare Mode** - Multi-folder side-by-side comparison with intelligent file matching
2. **Pinpoint Mode** - Precision alignment with reference points, individual scaling, and rotation controls
3. **Analysis Mode** - Single-image analysis with advanced filter chains and real-time comparison

### 🖼️ Advanced Image Support
- **Standard Formats**: JPEG, PNG, WebP, GIF, BMP
- **TIFF Support**: Full TIFF decoding with UTIF library
- **Large Image Handling**: Efficient bitmap caching and memory management
- **Real-time Processing**: Instant preview of all operations

### 🎨 Professional Filter System
- **60+ Advanced Filters**: From basic adjustments to complex OpenCV operations
- **Filter Chains**: Combine multiple filters in custom sequences with sequential labeling
- **Real-time Preview**: See changes instantly as you adjust parameters
- **Filter Preview System**: Preview filters before applying with side-by-side comparison
- **Smart Filter Labels**: Dynamic filter chain display (e.g., "Gaussian Blur → Sharpen → Canny")
- **Export Capabilities**: Save filter settings and apply to multiple images

### ⚡ High-Performance Interface & Controls
- **Advanced Layout System**: Interactive grid selector with 1×1 to 6×4 configurations and live preview
- **Synchronized Navigation**: Pan, zoom, and viewport controls across all viewers with precision coordinate input
- **Smart UI Controls**: Independent toggle controls for folders, files, filter labels, minimap, and grid overlay
- **Professional Capture System**: Screenshot functionality with granular control over UI elements
- **Extensive Keyboard Shortcuts**: 20+ keyboard shortcuts for rapid workflow and professional efficiency
- **Responsive Design**: Optimized for both desktop and mobile with touch gesture support

### 🎛️ Advanced Control Features
- **Rect Zoom Tool**: Click two points to define zoom regions with pixel-perfect accuracy
- **Global Scale Control**: Direct percentage input for precise scaling across all viewers
- **Rotation Controls**: Individual and global rotation with visual leveling tools (horizontal/vertical alignment)
- **Reorder Modes**: Shift and Swap modes for image reordering with visual feedback
- **Minimap Navigation**: Customizable position and size with click-to-navigate functionality
- **Grid Overlay**: Color-customizable grid with multiple color options (white, red, yellow, blue)

## 🔄 Recent Highlights (Condensed)

- Pinpoint reordering refined: fixed slots (A, B, C, …), image-follow transforms
- Shift vs Swap reorder modes with header toggle and active state
- Leveling tools (horizontal/vertical): two-point alignment (per-viewer/global)
- Pinpoint Global Scale: direct % input with safe clamping
- Layout polish: canvases reliably fill grid cells, reduced layout jitter

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Viewing Modes](#viewing-modes)
- [Filter System](#filter-system)
- [Interface Features](#interface-features)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Technical Features](#technical-features)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Getting Started

### Quick Start
1. Visit the [live demo](https://mouseball54.github.io/image_multi_view/)
2. Select your desired viewing mode (Single/Compare/Pinpoint/Analysis)
3. Click folder buttons to load your images
4. Start comparing and analyzing!

### Local Development
```bash
# Clone the repository
git clone https://github.com/MouseBall54/image_multi_view.git

# Navigate to project directory
cd image_multi_view

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## 🎛️ Viewing Modes

### 1. Compare Mode 🔍
**Perfect for: Multi-folder comparisons, file matching, side-by-side analysis**

- **Multi-Folder Support**: Compare 2-9 folders simultaneously
- **Intelligent File Matching**: Automatic filename matching with extension stripping
- **Synchronized Navigation**: Pan and zoom propagate across all viewers
- **Flexible Layouts**: Choose from 20+ layout configurations (1×2 to 6×4)
- **Toggle Functionality**: Cycle through selected images for detailed comparison

#### Key Features:
- Automatic file matching across folders
- Extension stripping option for better matching
- Real-time folder synchronization
- Search and filter capabilities
- Batch operations support

### 2. Pinpoint Mode 🎯
**Perfect for: Precision alignment, reference-based comparison, detailed measurement**

- **Fixed Slots, Image Reorder**: Viewer slots (A, B, C, …) remain fixed; Shift+drag reorders images across those slots.
- **Reorder Modes**: Header toggle for Shift (insert/shift) and Swap (pairwise swap) with active state indicator.
- **Image-Follow Transform**: Per-image zoom, rotation, and filter assignments move with the image when reordering.
- **Reference Point System**: Set common reference points across different images.
- **Individual Scaling**: Per-viewer scale with a Global Scale multiplier (editable % input in header).
- **Dual Rotation Support**:
  - Local rotation per viewer
  - Global rotation control for all viewers
- **Leveling Tools**: Horizontal and Vertical leveling. Click button → blue crosshair follows cursor → click two points → angle is computed and applied (per-viewer here).
- **Flexible Image Loading**: Load any image from any folder into any viewer.
- **Mouse Mode Toggle**: Switch between Pin (set references) and Pan (navigate).

#### Key Features:
- Precision coordinate system for accurate alignment
- Crosshair overlay for reference point visualization
- Independent scaling per viewer
- Rotation preservation during image switching
- Advanced measurement capabilities

### 3. Analysis Mode 🔬
**Perfect for: Filter comparison, single-image analysis, processing workflows**

- **Single Image Focus**: Apply multiple filters to one source image
- **Side-by-Side Filter Comparison**: View different filter effects simultaneously
- **Real-time Parameter Adjustment**: Instant filter parameter updates
- **Global Rotation Controls**: Maintain consistent orientation
- **Leveling Tools**: Horizontal/Vertical leveling with two-point click (applies to global rotation in this mode)
- **Filter Chain Management**: Create and save complex filter sequences

#### Key Features:
- 40+ professional-grade filters
- Filter parameter fine-tuning
- Real-time preview updates
- Filter chain creation and management
- Export processed results

## 🔍 Filter Preview System

### Advanced Preview Capabilities
CompareX features a comprehensive filter preview system that allows you to see filter effects before applying them:

- **Side-by-Side Comparison**: Preview original vs filtered images simultaneously
- **Real-Time Parameter Adjustment**: See changes instantly as you modify filter parameters
- **Filter Chain Preview**: Preview entire filter chains before applying
- **Embedded Editor in Preview**: The preview panel now embeds the same filter editor (type selector + compact parameter controls). Changes update the chain step or single filter in real-time.
- **Zoom and Pan**: Navigate preview images to examine details
- **Quick Apply**: Apply previewed filters with one click

### Preview Workflow
1. **Select Filter**: Choose from 40+ available filters
2. **Adjust Parameters**: Fine-tune filter settings in real-time
3. **Preview Results**: See immediate side-by-side comparison
4. **Examine Details**: Zoom and pan to inspect specific areas
5. **Apply or Discard**: Choose to apply the filter or try another

## 🎨 Filter System

### Filter Categories

#### Basic Adjustments
- **Grayscale** - Convert to grayscale
- **Invert** - Color inversion
- **Sepia** - Sepia tone effect
- **Brightness** - Linear brightness offset (−100..100)
- **Contrast** - Contrast scaling (0..200%)

#### Smoothing Filters
- **Gaussian Blur** - Smooth Gaussian blur with adjustable sigma
- **Box Blur** - Simple box filter blur
- **Median Filter** - Noise reduction with edge preservation
- **Weighted Median** - Advanced median filtering
- **Alpha Trimmed Mean** - Statistical smoothing filter

#### Edge Detection
- **Sobel** - Classic edge detection
- **Prewitt** - Prewitt edge operator
- **Scharr** - Improved Sobel operator
- **Canny** - Multi-stage edge detection
- **Roberts Cross** - Simple edge detection
- **Laplacian of Gaussian (LoG)** - Blob detection
- **Difference of Gaussians (DoG)** - Multi-scale edge detection
- **Marr-Hildreth** - Zero-crossing edge detection

#### Sharpening
- **Sharpen** - Basic sharpening filter
- **Laplacian** - Laplacian sharpening
- **Unsharp Mask** - Professional unsharp masking
- **High Pass** - High-frequency enhancement

#### Contrast Enhancement
- **Linear Stretch** - Dynamic range stretching
- **Histogram Equalization** - Global contrast enhancement
- **CLAHE** - Adaptive histogram equalization
- **Gamma Correction** - Non-linear contrast adjustment
- **Local Histogram Equalization** - Localized contrast enhancement

#### Advanced Processing
- **Bilateral Filter** - Edge-preserving denoising
- **Non-Local Means** - Advanced denoising algorithm
- **Anisotropic Diffusion** - Edge-preserving smoothing
- **Gabor Filter** - Texture analysis
- **Laws Texture Energy** - Texture feature extraction
- **Local Binary Pattern (LBP)** - Texture description

#### Morphological Operations
- **Opening** - Remove small objects
- **Closing** - Fill small holes
- **Top Hat** - Extract small elements
- **Black Hat** - Extract dark features
- **Gradient** - Extract edges
- **Distance Transform** - Distance map computation

#### Frequency Domain
- **DFT** - Discrete Fourier Transform
- **DCT** - Discrete Cosine Transform
- **Wavelet** - Wavelet transform analysis

#### Colormap Filters
- Perceptually uniform, legacy, aesthetic, and diverging colormaps for scientific visualization and change highlighting
- Adjustable intensity blending to mix colormap with original luminance
- Works in both Compare and Analysis modes with real-time preview

- Perceptually Uniform (Recommended): `Viridis`, `Inferno`, `Plasma`, `Magma`, `Parula`
- Rainbow/Legacy: `Jet`, `HSV`, `Hot`
- Aesthetic Gradients: `Cool`, `Warm`, `Spring`, `Summer`, `Autumn`, `Winter`
- Specialized: `Bone`, `Copper`, `Pink`
- Diverging (Change-based): `RdBu`, `RdYlBu`, `BWR`, `Seismic`, `CoolWarm`, `Spectral`
- Gradient-based Overlays: `Gradient Magnitude`, `Edge Intensity`, `Difference`

### Filter Chain System
- **Chain Creation**: Combine multiple filters in sequence with drag-and-drop interface
- **Sequential Labeling**: Smart display showing filter progression (e.g., "Gaussian Blur → Sharpen → Canny")
- **Filter Preview System**: Side-by-side preview before applying filters
  - Preview filters individually or as chains
  - Compare original vs filtered versions
  - Real-time parameter adjustment
- **Parameter Preservation**: Save and load filter configurations
- **Export/Import**: Share filter configurations
- **Preset Management**: Create and manage filter presets

## 🎮 Interface Features

### Layout System
- **Grid Layout Selector**: Interactive grid selector for arranging 1×1 up to 24 viewers
- **Flexible Grid Configurations**: Support for various row/column combinations (1×2, 2×2, 3×3, 4×6, etc.)
- **Live Preview**: Real-time preview overlay while selecting layout configurations
- **Dynamic Grid Expansion**: Grid selection area automatically expands on mouse hover
- **Viewer Limit**: Support up to 24 viewers maximum (performance and usability considerations)
- **Optimal Arrangement**: Automatic row/column calculation based on selected viewer count

### Navigation & Viewport
- **Synchronized Zoom**: All viewers zoom together (Compare/Analysis modes)
- **Independent Scaling**: Individual viewer scaling (Pinpoint mode)
- **Precision Controls**: Manual coordinate and scale input
- **Minimap**: Overview navigation with position indicator
- **Grid Overlay**: Customizable grid with color options

### Visual Enhancements
- **Smart Label System**: Configurable display of folder names, file names, and filter labels
  - Toggle folder/file labels independently
  - Dynamic filter chain display with sequential naming
  - Customizable label visibility in capture mode
- **Crosshair Overlay**: Reference point visualization (Pinpoint mode)
- **Image Information Panel**: Detailed file and dimension info
- **Progress Indicators**: Loading and processing feedback
- **Advanced Capture System**: Screenshot functionality with comprehensive options
  - Show/hide labels independently
  - Show/hide crosshairs (Pinpoint mode)
  - Show/hide minimap
  - Show/hide filter labels
- **Toggle Modal**: Cycle through selected images for detailed comparison

### File Management
- **Multi-Format Support**: JPEG, PNG, TIFF, WebP, GIF, BMP
- **Folder Organization**: Alphabetical folder assignment (A–Z)
- **Search & Filter**: Find files quickly across all folders
- **Batch Operations**: Process multiple files simultaneously

#### Drag & Drop Details
- **Single**: Drop images to create a temporary folder in the first empty slot. If none available, the first image is selected for viewing.
- **Compare**: Drop images to create a temporary folder in the first empty slot; compare via matched filenames across folders.
- **Pinpoint**: Drop images to create a temporary folder in the first empty slot; select any image into any viewer.
- **Analysis**: Drop images to create a temporary folder and auto-load the first image for analysis (others are available in the list).

## ⌨️ Keyboard Shortcuts

### Mode Switching
- **1** - Switch to Pinpoint Mode
- **2** - Switch to Analysis Mode  
- **3** - Switch to Compare Mode
> Note: Mode switching is disabled when modals/overlays are active

### Navigation & Viewport
- **Shift + Arrow Keys** - Pan view in any direction (when image is loaded)
- **+/=** - Zoom in (global zoom in Compare/Analysis modes)
- **-** - Zoom out (global zoom in Compare/Analysis modes)
- **R** - Reset view to fit image
- **Mouse Wheel** - Zoom in/out (cursor-centered zoom)
- **Left Click + Drag** - Pan around the image

### Pinpoint Mode Specific
- **+/=** - Increase individual viewer scale (when specific viewer is active)
- **-** - Decrease individual viewer scale (when specific viewer is active)
- **Alt + Drag** - Apply local rotation to individual viewers
- **Shift + Drag** - Reorder images between viewers (based on reorder mode: Shift/Swap)

### UI Controls & Visibility
- **F** - Toggle folder controls visibility (show/hide folder selection panel)
- **L** - Toggle file list visibility (show/hide file browser)
- **Ctrl+L** - Toggle filter labels visibility (show/hide filter chain names on images)
- **M** - Toggle minimap (overview navigator)
- **G** - Toggle grid overlay (with customizable colors)
- **I** - Toggle image information panel (file details, dimensions, metadata)

### Advanced Operations
- **C** - Open capture modal (screenshot with customizable options)
- **Ctrl+Shift+P** - Open filter preview modal (side-by-side filter comparison)
- **Space** - Open toggle modal (cycle through selected images for detailed comparison)
- **Escape** - Universal close for all modals and overlays

### Filter System Shortcuts
- **Drag & Drop** - Reorder filters in filter chains
- **Double Click** - Edit filter parameters
- **Delete Key** - Remove selected filter from chain (when filter is focused)

### Layout & Grid Controls
- **Click Grid Selector** - Choose viewer layout (1×1 to 6×4 configurations)
- **Drag Grid Edges** - Adjust grid size dynamically
- **Hover Grid** - Preview layout before selection

## 🔧 Technical Features & System Requirements

### System Requirements

#### Minimum Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 4GB system memory (2GB available for browser)
- **Storage**: 100MB free space for cached images
- **CPU**: Dual-core processor (2.0 GHz+)
- **GPU**: Hardware acceleration supported (WebGL compatible)

#### Recommended Specifications
- **Browser**: Latest stable versions of modern browsers
- **RAM**: 8GB+ system memory (4GB+ available for browser)
- **Storage**: 1GB+ free space for large image workflows
- **CPU**: Quad-core processor (3.0 GHz+)
- **GPU**: Dedicated graphics card with WebGL 2.0 support
- **Display**: 1920×1080 or higher resolution

#### Supported Image Formats
- **Standard Formats**: JPEG, PNG, WebP, GIF, BMP
- **Advanced Formats**: TIFF (8/16/32-bit), Multi-page TIFF
- **Maximum Image Size**: 50MP per image (8000×6250 pixels)
- **Memory Limit**: 2GB total for all loaded images

### Performance Optimizations

#### Core Performance Features
- **Intelligent Bitmap Caching** - LRU cache with automatic memory management
- **Progressive Loading** - Lazy loading with priority-based queue
- **Efficient Memory Management** - Automatic garbage collection and cleanup
- **Hardware Acceleration** - WebGL-based rendering when available
- **Background Processing** - Web Workers for non-blocking operations
- **Throttled Updates** - 60fps smooth animations and interactions

#### Advanced Optimizations
- **Image Pyramid Caching** - Multi-resolution tiles for large images
- **Viewport Culling** - Only render visible image regions
- **Canvas Pool Management** - Reuse canvas elements to reduce GC pressure
- **Filter Pipeline Optimization** - Cached intermediate results
- **Batch Processing** - Group operations for better performance

### Browser Compatibility & APIs

#### Core Web Technologies
- **Canvas API** - 2D rendering and image manipulation
- **WebGL** - Hardware-accelerated graphics (when available)
- **File API** - Local file access without uploads
- **Clipboard API** - Copy/paste images to/from system clipboard
- **Drag & Drop API** - Intuitive file loading interface

#### Advanced Browser Features
- **Web Workers** - Heavy processing in background threads
- **Shared Array Buffer** - Efficient memory sharing (where supported)
- **Offscreen Canvas** - Background rendering optimization
- **Image Bitmap API** - Efficient image decoding
- **Pointer Events** - Enhanced touch and mouse interaction

#### Browser-Specific Optimizations
- **Chrome**: Full WebGL 2.0, SharedArrayBuffer, OffscreenCanvas
- **Firefox**: WebGL 1.0/2.0, Web Workers, efficient TIFF decoding
- **Safari**: Hardware acceleration, Core Image integration
- **Edge**: Chromium-based optimizations, Windows integration

### Architecture & Technology Stack

#### Frontend Framework
- **React 18** - Modern React with concurrent features and Suspense
- **TypeScript 5.2+** - Full type safety and enhanced developer experience
- **Vite 5.0** - Lightning-fast build tool and hot module replacement
- **Modern ESM** - Native ES modules for optimal bundling

#### State Management & Data Flow
- **Zustand 4.5** - Lightweight, performant state management
- **Immer Integration** - Immutable state updates for predictability
- **Persistent State** - Local storage integration for user preferences
- **Real-time Sync** - Cross-component state synchronization

#### Image Processing Pipeline
- **OpenCV.js 4.8** - Advanced computer vision algorithms
- **UTIF 3.1** - Comprehensive TIFF decoding with multi-page support
- **Canvas API** - Direct pixel manipulation and rendering
- **WebAssembly** - High-performance processing modules

#### Development & Build Tools
- **TypeScript Compiler** - Strict type checking and advanced language features
- **Vite Plugin System** - React refresh, TypeScript integration
- **ESLint Configuration** - Code quality and consistency
- **Modern Bundling** - Tree shaking, code splitting, dynamic imports

### Desktop Application Features (Electron)

#### Native Integration
- **Cross-Platform Support** - Windows, macOS, Linux
- **Native File Dialogs** - OS-integrated file selection
- **Window Management** - Resizable, minimizable application window
- **Menu Integration** - Native application menus and shortcuts

#### Electron Specifications
- **Electron Version**: 37.3.1+
- **Node.js Integration**: Disabled for security
- **Context Isolation**: Enabled for sandboxing
- **Minimum Window Size**: 800×600 pixels
- **Default Window Size**: 1200×800 pixels

#### Security Features
- **Content Security Policy** - Strict CSP for XSS protection
- **Sandboxed Renderer** - Isolated execution environment
- **Secure File Access** - Local file system access without Node.js exposure
- **No Remote Code Execution** - All code bundled at build time

### Libraries & Dependencies

#### Core Dependencies
- **react**: ^18.2.0 - UI framework and component system
- **react-dom**: ^18.2.0 - DOM rendering for React components
- **zustand**: ^4.5.2 - State management and data flow
- **opencv-ts**: ^1.3.6 - TypeScript bindings for OpenCV.js
- **utif**: ^3.1.0 - TIFF image format decoding library
- **tiff**: ^7.1.0 - Additional TIFF processing utilities

#### Development Dependencies
- **typescript**: ^5.2.2 - Type checking and compilation
- **vite**: ^5.2.0 - Build tool and development server
- **electron**: ^37.3.1 - Desktop application framework
- **electron-builder**: ^26.0.12 - Application packaging and distribution

#### Optional Dependencies
- **sharp**: ^0.34.3 - Image processing (build-time optimization)
- **svg2img**: ^1.0.0 - SVG to raster conversion (development)

### Performance Benchmarks

#### Typical Performance Metrics
- **Image Loading**: <500ms for 10MP JPEG images
- **Filter Application**: <100ms for basic filters, <1s for complex OpenCV operations
- **UI Responsiveness**: 60fps interactions, <16ms frame times
- **Memory Usage**: ~50MB baseline, +5-10MB per loaded image
- **Startup Time**: <2s web application, <5s Electron application

## 🛠️ Development

### Project Structure
```
src/
├── components/             # UI components
│   ├── ImageCanvas.tsx         # Core image renderer
│   ├── FilterControls.tsx      # Filter system UI
│   ├── FilterPreviewModal.tsx  # Filter preview system (modal/sidebar)
│   ├── FilterCart.tsx          # Filter chain editor + presets/import/export
│   ├── LayoutGridSelector.tsx  # Grid layout picker
│   ├── FolderControl.tsx       # Folder picker control
│   ├── Toast*.tsx              # Toast notifications
│   └── ...
├── modes/                 # Application modes
│   ├── CompareMode.tsx
│   ├── PinpointMode.tsx
│   └── AnalysisMode.tsx
├── utils/                 # Utilities
│   ├── filters.ts             # Filter implementations
│   ├── filterChain.ts         # Sequential chain processor
│   ├── filterChainLabel.ts    # Chain labeling
│   ├── opencv.ts              # OpenCV integration
│   └── utif.ts                # TIFF decoding helpers
├── hooks/                 # Custom hooks
├── store.ts               # Zustand store
├── types.ts               # Shared types
└── App.tsx                # Main app component
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Type checking with TypeScript
npm run preview  # Preview production build
npm run deploy   # Deploy to GitHub Pages
```

### Contributing Guidelines
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style
- **TypeScript** - Strict typing enabled (tsc as linter)
- **No ESLint/Prettier** - Keep consistent formatting; pass `npm run lint`
- **Components** - Functional components with hooks
- **State** - Centralized in Zustand store

## 🏗️ Architecture Deep Dive

### State Management
The application uses Zustand for lightweight, efficient state management:
- **Viewport State** - Zoom, pan, and coordinate tracking
- **Mode State** - Current mode and mode-specific settings
- **Filter State** - Applied filters and parameters
- **UI State** - Modal visibility, active components

### Image Processing Pipeline
1. **File Loading** - Browser File API for local file access
2. **Format Detection** - Automatic format detection and appropriate decoder
3. **Bitmap Creation** - Convert to ImageBitmap for efficient rendering
4. **Caching** - Smart caching to prevent duplicate processing
5. **Filter Application** - Canvas-based or OpenCV-based processing
6. **Rendering** - High-performance Canvas rendering

### Filter System Architecture
- **Modular Design** - Each filter is a separate, testable module
- **Parameter System** - Flexible parameter definition and validation
- **Preview Pipeline** - Efficient real-time preview generation
- **Chain Management** - Sequential filter application system
- **Export System** - Save/load filter configurations

## 📱 Usage Scenarios

### Professional Photography
- Compare RAW processing results
- Analyze exposure differences
- Check focus accuracy across shots
- Compare different lens characteristics

### Quality Control
- Product image comparison
- Defect detection workflows
- Batch processing verification
- Consistency analysis

### Research & Analysis
- Scientific image comparison
- Medical image analysis
- Microscopy image processing
- Time-series image analysis

### Educational Use
- Teaching image processing concepts
- Demonstrating filter effects
- Comparative analysis exercises
- Technical photography training

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Types of Contributions
- **Bug Reports** - Help us identify and fix issues
- **Feature Requests** - Suggest new functionality
- **Code Contributions** - Submit improvements and new features
- **Documentation** - Help improve our documentation
- **Testing** - Help test new features and report issues

### Development Setup
1. Fork the repository
2. Clone your fork locally
3. Install dependencies with `npm install`
4. Start development server with `npm run dev`
5. Make your changes and test thoroughly
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenCV.js** - Computer vision library
- **UTIF** - TIFF decoding library
- **React Community** - Framework and ecosystem
- **TypeScript Team** - Type safety and developer experience
- **Vite Team** - Build tool and development experience

## 📞 Support

- **Issues** - [GitHub Issues](https://github.com/MouseBall54/image_multi_view/issues)
- **Discussions** - [GitHub Discussions](https://github.com/MouseBall54/image_multi_view/discussions)
- **Wiki** - [Project Wiki](https://github.com/MouseBall54/image_multi_view/wiki)

---

## 🆕 Latest Features

### Recently Added
- New: Comprehensive Colormap Filters (Viridis/Inferno/Plasma/Magma/Parula, Jet/HSV/Hot, Cool/Warm/Spring/Summer/Autumn/Winter, Bone/Copper/Pink, RdBu/RdYlBu/BWR/Seismic/CoolWarm/Spectral, Gradient Magnitude/Edge Intensity/Difference)
- Updated: Filter count bumped to 60+ with real-time intensity blending
- **Smart Filter Labels**: Dynamic display of filter chains with sequential naming (e.g., "Gaussian Blur → Sharpen → Canny")
- **Filter Preview System**: Side-by-side preview of filters before applying
- **Enhanced Grid Layout System**: Interactive grid selector with live preview and dynamic expansion
- **Enhanced UI Toggle System**: Independent control of folders, files, and filter labels
- **Improved Capture System**: Granular control over what elements appear in screenshots
- **Filter Chain Management**: Enhanced interface for creating and managing complex filter sequences

#### Workflow & UX
- Keyboard shortcuts updated: 1 → Pinpoint, 2 → Analysis, 3 → Compare (blocked while modals/overlays are active)
- Navigation: pan with Shift + Arrow keys; zoom with +/−; fit with R
- Filter preview/editor: chain-step editing previews the chain up to the edited step with real-time updates

#### Filter Cart
- Batch import: drag & drop multiple JSON filter chains with detailed toast summary
- Export current cart; manage presets directly in the cart

#### Stability & Compatibility
- Filter-chain cache reworked to use canvases (fixes detached ImageBitmap drawImage errors)
- OpenCV gamma correction uses float power (`cv.pow`) instead of `cv.LUT`
- UTIF typing added; TIFF preview pipeline reliability improved

#### Developer Experience
- TypeScript strict errors resolved across components/store; safer typing for viewer arrangement, presets, and cart operations

### Coming Soon
- **Complete Keyboard Shortcuts**: UI controls and additional general shortcuts
- **Advanced Batch Processing**: Process multiple images with same settings
- **Performance Monitoring**: Real-time performance analysis tools

---

*CompareX - Where image analysis meets professional workflow*
