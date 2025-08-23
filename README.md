# CompareX - Advanced Image Comparison & Analysis Tool

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://mouseball54.github.io/image_multi_view/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](#)
[![React](https://img.shields.io/badge/React-18-blue)](#)

**CompareX** is a powerful, browser-based image comparison and analysis application designed for professionals who need to compare, analyze, and process multiple images simultaneously. Built with React and TypeScript, it offers three specialized viewing modes with advanced filtering capabilities and complete privacy through client-side processing.

## 🌐 Live Demo

Experience CompareX directly in your browser: **[https://mouseball54.github.io/image_multi_view/](https://mouseball54.github.io/image_multi_view/)**

No installation required - all processing happens locally in your browser!

## ✨ Key Features

### 🔒 Privacy-First Design
- **100% Client-Side Processing** - No file uploads, all processing happens locally
- **Complete Privacy** - Your images never leave your device
- **No Server Required** - Pure web application with offline capability

### 🎯 Three Specialized Viewing Modes
1. **Compare Mode** - Side-by-side comparison of multiple folders
2. **Pinpoint Mode** - Precision alignment with reference points and rotation
3. **Analysis Mode** - Advanced filter application and comparison

### 🖼️ Advanced Image Support
- **Standard Formats**: JPEG, PNG, WebP, GIF, BMP
- **TIFF Support**: Full TIFF decoding with UTIF library
- **Large Image Handling**: Efficient bitmap caching and memory management
- **Real-time Processing**: Instant preview of all operations

### 🎨 Professional Filter System
- **40+ Advanced Filters**: From basic adjustments to complex OpenCV operations
- **Filter Chains**: Combine multiple filters in custom sequences
- **Real-time Preview**: See changes instantly as you adjust parameters
- **Export Capabilities**: Save filter settings and apply to multiple images

### ⚡ High-Performance Interface
- **Flexible Layouts**: Auto-grid and free positioning modes
- **Synchronized Navigation**: Pan and zoom across all viewers simultaneously
- **Keyboard Shortcuts**: Extensive hotkey support for rapid workflow
- **Responsive Design**: Optimized for both desktop and mobile devices

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
2. Select your desired viewing mode (Compare/Pinpoint/Analysis)
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

- **Reference Point System**: Set common reference points across different images
- **Individual Scaling**: Per-viewer scale control with global multiplier
- **Dual Rotation Support**: 
  - Local rotation (Alt+drag on individual viewers)
  - Global rotation control for all viewers
- **Flexible Image Loading**: Load any image from any folder into any viewer
- **Mouse Mode Toggle**: Switch between Pin mode (set references) and Pan mode (navigate)

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
- **Filter Chain Management**: Create and save complex filter sequences

#### Key Features:
- 40+ professional-grade filters
- Filter parameter fine-tuning
- Real-time preview updates
- Filter chain creation and management
- Export processed results

## 🎨 Filter System

### Filter Categories

#### Basic Adjustments
- **Grayscale** - Convert to grayscale
- **Invert** - Color inversion
- **Sepia** - Sepia tone effect

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

### Filter Chain System
- **Chain Creation**: Combine multiple filters in sequence
- **Parameter Preservation**: Save and load filter configurations
- **Preview System**: Real-time preview of entire chain
- **Export/Import**: Share filter configurations
- **Preset Management**: Create and manage filter presets

## 🎮 Interface Features

### Layout System
- **Auto Layout**: Automatically arrange viewers in optimal grid
- **Free Layout**: Complete freedom to position and resize panels
- **Flexible Resizing**: Drag edge handles to resize individual viewers
- **Panel Management**: Move panels by dragging headers

### Navigation & Viewport
- **Synchronized Zoom**: All viewers zoom together (Compare/Analysis modes)
- **Independent Scaling**: Individual viewer scaling (Pinpoint mode)
- **Precision Controls**: Manual coordinate and scale input
- **Minimap**: Overview navigation with position indicator
- **Grid Overlay**: Customizable grid with color options

### Visual Enhancements
- **Crosshair Overlay**: Reference point visualization (Pinpoint mode)
- **Image Information Panel**: Detailed file and dimension info
- **Progress Indicators**: Loading and processing feedback
- **Capture System**: Screenshot functionality with options
- **Toggle Modal**: Cycle through selected images for comparison

### File Management
- **Multi-Format Support**: JPEG, PNG, TIFF, WebP, GIF, BMP
- **Drag & Drop**: Easy file loading
- **Folder Organization**: Alphabetical folder assignment (A-Z)
- **Search & Filter**: Find files quickly across all folders
- **Batch Operations**: Process multiple files simultaneously

## ⌨️ Keyboard Shortcuts

### Mode Switching
- **1** - Switch to Compare Mode
- **2** - Switch to Pinpoint Mode  
- **3** - Switch to Analysis Mode

### Navigation
- **Arrow Keys** - Pan view (when image is loaded)
- **+/=** - Zoom in
- **-** - Zoom out
- **R** - Reset view to fit
- **I** - Toggle image information panel

### Pinpoint Mode Specific
- **+/=** - Increase individual scale (when viewer is active)
- **-** - Decrease individual scale (when viewer is active)
- **Alt + Drag** - Local rotation (on individual viewers)

### General
- **Space** - Open toggle modal (when images are selected)
- **Escape** - Close modals and overlays

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
│   ├── FolderControl.tsx   # File browser
│   └── ...
├── modes/              # Application modes
│   ├── CompareMode.tsx     # Multi-folder comparison
│   ├── PinpointMode.tsx    # Reference-based alignment
│   └── AnalysisMode.tsx    # Single-image analysis
├── utils/              # Utility functions
│   ├── filters.ts          # Filter implementations
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

**Made with ❤️ by [MouseBall54](https://github.com/MouseBall54)**

*CompareX - Where image analysis meets professional workflow*