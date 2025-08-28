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

### 🎯 Four Specialized Viewing Modes
1. **Single Mode** - Focused single-view with unified file list
2. **Compare Mode** - Side-by-side comparison of multiple folders
3. **Pinpoint Mode** - Precision alignment with reference points and rotation
4. **Analysis Mode** - Advanced filter application and comparison

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

### ⚡ High-Performance Interface
- **Flexible Layouts**: Auto-grid and completely free positioning modes with drag & resize
- **Synchronized Navigation**: Pan and zoom across all viewers simultaneously
- **Smart UI Controls**: Toggle buttons for folders, files, and filter labels visibility
- **Keyboard Shortcuts**: Extensive hotkey support for rapid workflow
- **Responsive Design**: Optimized for both desktop and mobile devices

## 🔄 Recent Highlights

- Pinpoint reordering refined: viewer slots (A, B, C, …) stay fixed while you drag to reorder images. Image-follow transforms ensure per-image zoom, rotation, and filters move with the image.
- Shift vs Swap: choose how drag reordering behaves. Toggle lives in the header and shows active state (blue) like Minimap/Grid.
- Leveling tools: horizontal and vertical auto-level. Click the button, then click two points; a blue crosshair follows the cursor, the first click is fixed, and the second click computes the angle to align. Applies per-viewer in Pinpoint, and as global rotation in Compare/Analysis.
- Pinpoint Global Scale input: enter a % directly in the header. Arrow controls removed and input is compact; values are safely clamped to avoid over-zoom.
- Layout polish: viewer canvas fills the entire grid cell reliably in all layouts; removed old hover hints that could cause scrollbars and tiny size shifts.
- New filters: Brightness and Contrast (Tone & Basics). Integrated everywhere (preview, chains, export) with compact controls.
- Preview editor integration: the preview panel now embeds the same filter editor (type + params) used elsewhere. Changes reflect immediately in the preview and update the chain step you’re editing.

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

### 0. Single Mode 🎥
**Perfect for: Focused inspection, quick filtering, distraction-free viewing**

- **Unified File List**: Aggregated list across loaded folders (no filename matching or extension stripping)
- **One Viewer**: Clean 1×1 layout that fills the viewer area
- **Compare-Class Features**: Filters, minimap, grid, capture, and preview system
- **Drag & Drop**: Quickly create a temporary folder or load the first image if no slot is available

#### Key Features:
- Aggregated file list with folder filter and search
- Per-folder filter settings and preview
- Capture with label overlays

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

### Mode Switching ✅
- **1** - Switch to Single Mode
- **2** - Switch to Compare Mode
- **3** - Switch to Pinpoint Mode  
- **4** - Switch to Analysis Mode

### Navigation ✅
- **Arrow Keys** - Pan view (when image is loaded)
- **+/=** - Zoom in
- **-** - Zoom out
- **R** - Reset view to fit
- **I** - Toggle image information panel

### Pinpoint Mode Specific ✅
- **+/=** - Increase individual scale (when viewer is active)
- **-** - Decrease individual scale (when viewer is active)
- **Alt + Drag** - Local rotation (on individual viewers)

### UI Controls ✅
- **F** - Toggle folder controls visibility
- **L** - Toggle file list visibility
- **Ctrl+L** - Toggle filter labels visibility
- **M** - Toggle minimap
- **G** - Toggle grid overlay

### General ✅
- **Space** - Open toggle modal (when images are selected) *Note: Currently works via button only*
- **Escape** - Close modals and overlays
- **Ctrl+Shift+P** - Open filter preview modal
- **C** - Open capture modal

### Modal Navigation ✅
- **Escape** - Close active modals and overlays (implemented in individual modal components)

## 🔧 Technical Features

### Performance Optimizations
- **Bitmap Caching** - Intelligent caching system for loaded images
- **Memory Management** - Efficient handling of large image datasets
- **Lazy Loading** - Load images only when needed
- **Throttled Updates** - Smooth animations and interactions
- **Background Processing** - Non-blocking image operations

### Browser Compatibility
- **Modern Browser Support** - Chrome, Firefox, Safari, Edge
- **WebWorker Support** - For heavy processing tasks
- **Canvas API** - High-performance image rendering
- **File API** - Local file access without uploads
- **Clipboard API** - Copy/paste functionality

### Architecture
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Full type safety and developer experience
- **Zustand** - Lightweight state management
- **Vite** - Fast build tool and development server
- **OpenCV.js** - Advanced computer vision algorithms

### Libraries & Dependencies
- **UTIF** - TIFF image decoding
- **OpenCV-TS** - Computer vision operations
- **React** - UI framework
- **Zustand** - State management
- **Vite** - Build tool

## 🛠️ Development

### Project Structure
```
src/
├── components/          # UI components
│   ├── ImageCanvas.tsx     # Core image renderer
│   ├── FilterControls.tsx  # Filter system UI
│   ├── FilterPreviewModal.tsx # Filter preview system
│   ├── FolderControl.tsx   # File browser
│   ├── FlexibleLayout.tsx  # Free layout system
│   ├── ViewToggleControls.tsx # UI toggle buttons
│   └── ...
├── modes/              # Application modes
│   ├── SingleMode.tsx      # Focused single-view
│   ├── CompareMode.tsx     # Multi-folder comparison
│   ├── PinpointMode.tsx    # Reference-based alignment
│   └── AnalysisMode.tsx    # Single-image analysis
├── utils/              # Utility functions
│   ├── filters.ts          # Filter implementations
│   ├── filterChainLabel.ts # Filter chain labeling system
│   ├── opencv.ts           # OpenCV integration
│   └── ...
├── hooks/              # Custom React hooks
├── store.ts           # Zustand state management
├── types.ts           # TypeScript definitions
└── App.tsx            # Main application component
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
- **TypeScript** - Strict typing enabled
- **ESLint** - Code quality enforcement
- **Prettier** - Code formatting
- **Component Structure** - Functional components with hooks
- **State Management** - Zustand for global state

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

### Coming Soon
- **Complete Keyboard Shortcuts**: UI controls and additional general shortcuts
- **Enhanced Filter Export/Import**: Save and share filter configurations
- **Advanced Batch Processing**: Process multiple images with same settings
- **Custom Filter Presets**: Create and manage filter templates
- **Performance Monitoring**: Real-time performance analysis tools
- **Space Bar Toggle**: Direct keyboard activation of toggle modal

---

*CompareX - Where image analysis meets professional workflow*
