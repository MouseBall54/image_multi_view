// src/utils/colormaps.ts
// Colormap utilities based on CLAUDE.md colormap guide
// Implements scientifically accurate colormaps for data visualization

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

// Colormap lookup table type - maps 0-255 to RGB values
export type ColormapLUT = ColorRGB[];

/**
 * Convert RGB to grayscale using perceptual luminance weights
 */
export function rgbToGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Linear interpolation between two colors
 */
function lerpColor(color1: ColorRGB, color2: ColorRGB, t: number): ColorRGB {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * clampedT),
    g: Math.round(color1.g + (color2.g - color1.g) * clampedT),
    b: Math.round(color1.b + (color2.b - color1.b) * clampedT),
  };
}

/**
 * Create a colormap LUT from control points
 */
function createColormap(controlPoints: ColorRGB[]): ColormapLUT {
  const lut: ColormapLUT = [];
  const segments = controlPoints.length - 1;
  
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const segmentIndex = Math.min(Math.floor(t * segments), segments - 1);
    const segmentT = (t * segments) - segmentIndex;
    
    const color = lerpColor(
      controlPoints[segmentIndex],
      controlPoints[segmentIndex + 1],
      segmentT
    );
    
    lut.push(color);
  }
  
  return lut;
}

// ============================================================================
// PERCEPTUALLY UNIFORM COLORMAPS (RECOMMENDED)
// Based on matplotlib's scientifically accurate colormaps
// ============================================================================

/**
 * Viridis: Dark purple → teal → yellow
 * Most recommended for scientific visualization
 */
export const VIRIDIS: ColormapLUT = createColormap([
  { r: 68, g: 1, b: 84 },     // Dark purple
  { r: 59, g: 82, b: 139 },   // Purple-blue
  { r: 33, g: 144, b: 140 },  // Teal
  { r: 94, g: 201, b: 98 },   // Green
  { r: 253, g: 231, b: 37 }   // Yellow
]);

/**
 * Inferno: Black → purple → orange/yellow
 * High contrast, excellent for dark backgrounds
 */
export const INFERNO: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 4 },       // Black
  { r: 40, g: 11, b: 84 },    // Dark purple
  { r: 101, g: 21, b: 110 },  // Purple
  { r: 159, g: 42, b: 99 },   // Magenta
  { r: 212, g: 72, b: 66 },   // Red-orange
  { r: 245, g: 125, b: 21 },  // Orange
  { r: 252, g: 255, b: 164 }  // Light yellow
]);

/**
 * Plasma: Purple → pink/orange → yellow
 * Vivid and smooth, good for presentations
 */
export const PLASMA: ColormapLUT = createColormap([
  { r: 13, g: 8, b: 135 },    // Dark purple
  { r: 84, g: 2, b: 163 },    // Purple
  { r: 139, g: 10, b: 165 },  // Magenta
  { r: 185, g: 50, b: 137 },  // Pink-magenta
  { r: 219, g: 92, b: 104 },  // Pink-red
  { r: 244, g: 136, b: 73 },  // Orange
  { r: 254, g: 188, b: 43 },  // Yellow-orange
  { r: 240, g: 249, b: 33 }   // Yellow
]);

/**
 * Magma: Black → purple → orange
 * Smooth in dark tones, good for low-light imagery
 */
export const MAGMA: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 4 },       // Black
  { r: 28, g: 16, b: 68 },    // Dark purple
  { r: 79, g: 18, b: 123 },   // Purple
  { r: 129, g: 37, b: 129 },  // Magenta
  { r: 181, g: 54, b: 122 },  // Pink-purple
  { r: 229, g: 80, b: 100 },  // Red-pink
  { r: 251, g: 135, b: 97 },  // Orange-pink
  { r: 254, g: 194, b: 135 }, // Light orange
  { r: 252, g: 253, b: 191 }  // Light yellow
]);

/**
 * Parula: Dark blue → bright yellow
 * MATLAB's replacement for jet, perceptually uniform
 */
export const PARULA: ColormapLUT = createColormap([
  { r: 53, g: 42, b: 135 },   // Dark blue
  { r: 15, g: 92, b: 221 },   // Blue
  { r: 18, g: 125, b: 216 },  // Light blue
  { r: 7, g: 156, b: 207 },   // Cyan-blue
  { r: 21, g: 177, b: 180 },  // Cyan
  { r: 89, g: 189, b: 140 },  // Green-cyan
  { r: 165, g: 190, b: 107 }, // Green
  { r: 225, g: 185, b: 82 },  // Yellow-green
  { r: 249, g: 251, b: 14 }   // Yellow
]);

// ============================================================================
// RAINBOW/LEGACY COLORMAPS
// ============================================================================

/**
 * Jet: Blue → cyan → green → yellow → red
 * Legacy colormap - perceptually non-uniform but familiar
 */
export const JET: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 143 },     // Dark blue
  { r: 0, g: 0, b: 255 },     // Blue
  { r: 0, g: 255, b: 255 },   // Cyan
  { r: 0, g: 255, b: 0 },     // Green
  { r: 255, g: 255, b: 0 },   // Yellow
  { r: 255, g: 0, b: 0 },     // Red
  { r: 128, g: 0, b: 0 }      // Dark red
]);

/**
 * HSV: Full HSV rainbow
 * Hue-based rainbow mapping
 */
export const HSV: ColormapLUT = (() => {
  const lut: ColormapLUT = [];
  for (let i = 0; i < 256; i++) {
    const h = (i / 255) * 360;
    const s = 1;
    const v = 1;
    
    // HSV to RGB conversion
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = 0; g = c; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = c;
    } else if (h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    lut.push({
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    });
  }
  return lut;
})();

/**
 * Hot: Black → red → yellow → white
 * Intuitive for heat/intensity visualization
 */
export const HOT: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 0 },       // Black
  { r: 85, g: 0, b: 0 },      // Dark red
  { r: 170, g: 0, b: 0 },     // Red
  { r: 255, g: 0, b: 0 },     // Bright red
  { r: 255, g: 85, b: 0 },    // Red-orange
  { r: 255, g: 170, b: 0 },   // Orange
  { r: 255, g: 255, b: 0 },   // Yellow
  { r: 255, g: 255, b: 85 },  // Light yellow
  { r: 255, g: 255, b: 170 }, // Lighter yellow
  { r: 255, g: 255, b: 255 }  // White
]);

// ============================================================================
// AESTHETIC GRADIENT COLORMAPS
// ============================================================================

/**
 * Cool: Cyan to magenta gradient
 */
export const COOL: ColormapLUT = createColormap([
  { r: 0, g: 255, b: 255 },   // Cyan
  { r: 255, g: 0, b: 255 }    // Magenta
]);

/**
 * Warm: Red to yellow gradient
 */
export const WARM: ColormapLUT = createColormap([
  { r: 255, g: 0, b: 0 },     // Red
  { r: 255, g: 255, b: 0 }    // Yellow
]);

/**
 * Spring: Magenta to yellow
 */
export const SPRING: ColormapLUT = createColormap([
  { r: 255, g: 0, b: 255 },   // Magenta
  { r: 255, g: 255, b: 0 }    // Yellow
]);

/**
 * Summer: Green to yellow
 */
export const SUMMER: ColormapLUT = createColormap([
  { r: 0, g: 128, b: 102 },   // Dark green
  { r: 255, g: 255, b: 102 }  // Light yellow
]);

/**
 * Autumn: Red to yellow
 */
export const AUTUMN: ColormapLUT = createColormap([
  { r: 255, g: 0, b: 0 },     // Red
  { r: 255, g: 255, b: 0 }    // Yellow
]);

/**
 * Winter: Blue to green
 */
export const WINTER: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 255 },     // Blue
  { r: 0, g: 255, b: 128 }    // Green
]);

// ============================================================================
// SPECIALIZED COLORMAPS
// ============================================================================

/**
 * Bone: Gray with blue tint
 */
export const BONE: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 0 },       // Black
  { r: 84, g: 84, b: 116 },   // Dark blue-gray
  { r: 167, g: 199, b: 199 }, // Light blue-gray
  { r: 255, g: 255, b: 255 }  // White
]);

/**
 * Copper: Black to copper gradient
 */
export const COPPER: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 0 },       // Black
  { r: 197, g: 125, b: 80 },  // Copper
  { r: 255, g: 160, b: 102 }  // Light copper
]);

/**
 * Pink: Sepia-like gradient
 */
export const PINK: ColormapLUT = createColormap([
  { r: 30, g: 0, b: 0 },      // Dark brown
  { r: 119, g: 40, b: 79 },   // Dark pink
  { r: 173, g: 129, b: 129 }, // Pink
  { r: 255, g: 181, b: 197 }, // Light pink
  { r: 255, g: 255, b: 255 }  // White
]);

// ============================================================================
// DIVERGING COLORMAPS (CHANGE-BASED)
// ============================================================================

/**
 * RdBu: Red-Blue diverging colormap for showing positive/negative changes
 */
export const RDBU: ColormapLUT = createColormap([
  { r: 103, g: 0, b: 31 },    // Dark red
  { r: 178, g: 24, b: 43 },   // Red
  { r: 214, g: 96, b: 77 },   // Light red
  { r: 244, g: 165, b: 130 }, // Pink
  { r: 253, g: 219, b: 199 }, // Very light pink
  { r: 247, g: 247, b: 247 }, // White (center)
  { r: 209, g: 229, b: 240 }, // Very light blue
  { r: 146, g: 197, b: 222 }, // Light blue
  { r: 67, g: 147, b: 195 },  // Blue
  { r: 33, g: 102, b: 172 },  // Dark blue
  { r: 5, g: 48, b: 97 }      // Very dark blue
]);

/**
 * RdYlBu: Red-Yellow-Blue diverging colormap
 */
export const RDYLBU: ColormapLUT = createColormap([
  { r: 165, g: 0, b: 38 },    // Dark red
  { r: 215, g: 48, b: 39 },   // Red
  { r: 244, g: 109, b: 67 },  // Orange-red
  { r: 253, g: 174, b: 97 },  // Orange
  { r: 254, g: 224, b: 144 }, // Yellow-orange
  { r: 255, g: 255, b: 191 }, // Light yellow
  { r: 224, g: 243, b: 248 }, // Very light blue
  { r: 171, g: 217, b: 233 }, // Light blue
  { r: 116, g: 173, b: 209 }, // Blue
  { r: 69, g: 117, b: 180 },  // Dark blue
  { r: 49, g: 54, b: 149 }    // Very dark blue
]);

/**
 * BWR: Blue-White-Red diverging colormap
 */
export const BWR: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 255 },     // Blue
  { r: 128, g: 128, b: 255 }, // Light blue
  { r: 255, g: 255, b: 255 }, // White (center)
  { r: 255, g: 128, b: 128 }, // Light red
  { r: 255, g: 0, b: 0 }      // Red
]);

/**
 * Seismic: Blue-White-Red seismic colormap
 */
export const SEISMIC: ColormapLUT = createColormap([
  { r: 0, g: 0, b: 75 },      // Dark blue
  { r: 0, g: 0, b: 255 },     // Blue
  { r: 255, g: 255, b: 255 }, // White (center)
  { r: 255, g: 0, b: 0 },     // Red
  { r: 127, g: 0, b: 0 }      // Dark red
]);

/**
 * CoolWarm: Cool-Warm diverging colormap (Paraview style)
 */
export const COOLWARM: ColormapLUT = createColormap([
  { r: 59, g: 76, b: 192 },   // Cool blue
  { r: 144, g: 178, b: 254 }, // Light blue
  { r: 220, g: 220, b: 220 }, // Light gray (center)
  { r: 245, g: 156, b: 125 }, // Light red
  { r: 180, g: 4, b: 38 }     // Warm red
]);

/**
 * Spectral: Spectral diverging colormap
 */
export const SPECTRAL: ColormapLUT = createColormap([
  { r: 158, g: 1, b: 66 },    // Dark red
  { r: 213, g: 62, b: 79 },   // Red
  { r: 244, g: 109, b: 67 },  // Orange
  { r: 253, g: 174, b: 97 },  // Light orange
  { r: 254, g: 224, b: 139 }, // Yellow
  { r: 255, g: 255, b: 191 }, // Light yellow
  { r: 230, g: 245, b: 152 }, // Light green
  { r: 171, g: 221, b: 164 }, // Green
  { r: 102, g: 194, b: 165 }, // Blue-green
  { r: 50, g: 136, b: 189 },  // Blue
  { r: 94, g: 79, b: 162 }    // Purple-blue
]);

// ============================================================================
// COLORMAP REGISTRY
// ============================================================================

export const COLORMAP_REGISTRY: Record<string, ColormapLUT> = {
  // Perceptually Uniform (Recommended)
  'colormap_viridis': VIRIDIS,
  'colormap_inferno': INFERNO,
  'colormap_plasma': PLASMA,
  'colormap_magma': MAGMA,
  'colormap_parula': PARULA,
  
  // Rainbow/Legacy
  'colormap_jet': JET,
  'colormap_hsv': HSV,
  'colormap_hot': HOT,
  
  // Aesthetic Gradients
  'colormap_cool': COOL,
  'colormap_warm': WARM,
  'colormap_spring': SPRING,
  'colormap_summer': SUMMER,
  'colormap_autumn': AUTUMN,
  'colormap_winter': WINTER,
  
  // Specialized
  'colormap_bone': BONE,
  'colormap_copper': COPPER,
  'colormap_pink': PINK,
  
  // Diverging (Change-based)
  'colormap_rdbu': RDBU,
  'colormap_rdylbu': RDYLBU,
  'colormap_bwr': BWR,
  'colormap_seismic': SEISMIC,
  'colormap_coolwarm': COOLWARM,
  'colormap_spectral': SPECTRAL,
};

/**
 * Apply a colormap to grayscale image data
 */
export function applyColormap(
  imageData: ImageData, 
  colormapName: string,
  intensity: number = 1.0
): ImageData {
  const colormap = COLORMAP_REGISTRY[colormapName];
  if (!colormap) {
    throw new Error(`Unknown colormap: ${colormapName}`);
  }
  
  const result = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const resultData = result.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const gray = rgbToGrayscale(data[i], data[i + 1], data[i + 2]);
    
    // Apply intensity scaling
    const scaledGray = Math.round(Math.min(255, gray * intensity));
    
    // Map to colormap
    const color = colormap[scaledGray];
    
    resultData[i] = color.r;     // Red
    resultData[i + 1] = color.g; // Green
    resultData[i + 2] = color.b; // Blue
    resultData[i + 3] = data[i + 3]; // Alpha (preserve)
  }
  
  return result;
}

/**
 * Get colormap metadata for UI display
 */
export interface ColormapMetadata {
  name: string;
  displayName: string;
  category: string;
  description: string;
  recommended: boolean;
}

export const COLORMAP_METADATA: Record<string, ColormapMetadata> = {
  // Perceptually Uniform (Recommended)
  'colormap_viridis': {
    name: 'colormap_viridis',
    displayName: 'Viridis',
    category: 'Perceptually Uniform',
    description: 'Purple → teal → yellow. Scientific standard, colorblind-friendly.',
    recommended: true
  },
  'colormap_inferno': {
    name: 'colormap_inferno',
    displayName: 'Inferno',
    category: 'Perceptually Uniform',
    description: 'Black → purple → orange/yellow. High contrast for dark backgrounds.',
    recommended: true
  },
  'colormap_plasma': {
    name: 'colormap_plasma',
    displayName: 'Plasma',
    category: 'Perceptually Uniform', 
    description: 'Purple → pink/orange → yellow. Vivid and smooth.',
    recommended: true
  },
  'colormap_magma': {
    name: 'colormap_magma',
    displayName: 'Magma',
    category: 'Perceptually Uniform',
    description: 'Black → purple → orange. Smooth in dark tones.',
    recommended: true
  },
  'colormap_parula': {
    name: 'colormap_parula',
    displayName: 'Parula',
    category: 'Perceptually Uniform',
    description: 'Dark blue → bright yellow. MATLAB Jet replacement.',
    recommended: true
  },
  
  // Rainbow/Legacy
  'colormap_jet': {
    name: 'colormap_jet',
    displayName: 'Jet',
    category: 'Rainbow/Legacy',
    description: 'Blue → cyan → green → yellow → red. Familiar but non-uniform.',
    recommended: false
  },
  'colormap_hsv': {
    name: 'colormap_hsv',
    displayName: 'HSV',
    category: 'Rainbow/Legacy',
    description: 'Full HSV rainbow. Good for angular/periodic data.',
    recommended: false
  },
  'colormap_hot': {
    name: 'colormap_hot',
    displayName: 'Hot',
    category: 'Heat',
    description: 'Black → red → yellow → white. Intuitive for heat/intensity.',
    recommended: false
  },
  
  // Aesthetic Gradients
  'colormap_cool': {
    name: 'colormap_cool',
    displayName: 'Cool',
    category: 'Aesthetic',
    description: 'Cyan to magenta gradient.',
    recommended: false
  },
  'colormap_warm': {
    name: 'colormap_warm',
    displayName: 'Warm',
    category: 'Aesthetic',
    description: 'Red to yellow gradient.',
    recommended: false
  },
  'colormap_spring': {
    name: 'colormap_spring',
    displayName: 'Spring',
    category: 'Aesthetic',
    description: 'Magenta to yellow.',
    recommended: false
  },
  'colormap_summer': {
    name: 'colormap_summer',
    displayName: 'Summer',
    category: 'Aesthetic',
    description: 'Green to yellow.',
    recommended: false
  },
  'colormap_autumn': {
    name: 'colormap_autumn',
    displayName: 'Autumn',
    category: 'Aesthetic',
    description: 'Red to yellow.',
    recommended: false
  },
  'colormap_winter': {
    name: 'colormap_winter',
    displayName: 'Winter',
    category: 'Aesthetic',
    description: 'Blue to green.',
    recommended: false
  },
  
  // Specialized
  'colormap_bone': {
    name: 'colormap_bone',
    displayName: 'Bone',
    category: 'Specialized',
    description: 'Gray with blue tint.',
    recommended: false
  },
  'colormap_copper': {
    name: 'colormap_copper',
    displayName: 'Copper',
    category: 'Specialized',
    description: 'Black to copper gradient.',
    recommended: false
  },
  'colormap_pink': {
    name: 'colormap_pink',
    displayName: 'Pink',
    category: 'Specialized',
    description: 'Sepia-like gradient.',
    recommended: false
  },
  
  // Diverging (Change-based)
  'colormap_rdbu': {
    name: 'colormap_rdbu',
    displayName: 'Red-Blue Diverging',
    category: 'Diverging',
    description: 'Red ↔ Blue. Shows positive/negative changes. Center = white.',
    recommended: true
  },
  'colormap_rdylbu': {
    name: 'colormap_rdylbu',
    displayName: 'Red-Yellow-Blue',
    category: 'Diverging',
    description: 'Red ↔ Yellow ↔ Blue. Three-way diverging colormap.',
    recommended: true
  },
  'colormap_bwr': {
    name: 'colormap_bwr',
    displayName: 'Blue-White-Red',
    category: 'Diverging',
    description: 'Blue ↔ White ↔ Red. Simple diverging colormap.',
    recommended: false
  },
  'colormap_seismic': {
    name: 'colormap_seismic',
    displayName: 'Seismic',
    category: 'Diverging',
    description: 'Blue ↔ White ↔ Red. Used in seismology.',
    recommended: false
  },
  'colormap_coolwarm': {
    name: 'colormap_coolwarm',
    displayName: 'Cool-Warm',
    category: 'Diverging',
    description: 'Cool blue ↔ Warm red. ParaView style.',
    recommended: true
  },
  'colormap_spectral': {
    name: 'colormap_spectral',
    displayName: 'Spectral',
    category: 'Diverging',
    description: 'Rainbow diverging. Red → Yellow → Green → Blue.',
    recommended: false
  },
  
  // Gradient-based (computed)
  'colormap_gradient_magnitude': {
    name: 'colormap_gradient_magnitude',
    displayName: 'Gradient Magnitude',
    category: 'Gradient-based',
    description: 'Visualizes gradient magnitude with viridis colormap.',
    recommended: true
  },
  'colormap_edge_intensity': {
    name: 'colormap_edge_intensity',
    displayName: 'Edge Intensity',
    category: 'Gradient-based', 
    description: 'Shows edge strength with hot colormap.',
    recommended: true
  },
  'colormap_difference': {
    name: 'colormap_difference',
    displayName: 'Difference Map',
    category: 'Gradient-based',
    description: 'Shows differences with RdBu diverging colormap.',
    recommended: true
  },
};

// ============================================================================
// GRADIENT-BASED COLORMAP FUNCTIONS
// ============================================================================

/**
 * Compute gradient magnitude from image data
 */
function computeGradientMagnitude(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const result = new ImageData(width, height);
  const resultData = result.data;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Get surrounding pixels (grayscale)
      const centerGray = rgbToGrayscale(data[idx], data[idx + 1], data[idx + 2]);
      const leftGray = rgbToGrayscale(data[idx - 4], data[idx - 3], data[idx - 2]);
      const rightGray = rgbToGrayscale(data[idx + 4], data[idx + 5], data[idx + 6]);
      const topGray = rgbToGrayscale(data[idx - width * 4], data[idx - width * 4 + 1], data[idx - width * 4 + 2]);
      const bottomGray = rgbToGrayscale(data[idx + width * 4], data[idx + width * 4 + 1], data[idx + width * 4 + 2]);
      
      // Compute gradients (Sobel-like)
      const gradX = (rightGray - leftGray) / 2;
      const gradY = (bottomGray - topGray) / 2;
      
      // Compute magnitude
      const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
      const normalizedMagnitude = Math.min(255, Math.round(magnitude));
      
      resultData[idx] = normalizedMagnitude;
      resultData[idx + 1] = normalizedMagnitude;
      resultData[idx + 2] = normalizedMagnitude;
      resultData[idx + 3] = data[idx + 3]; // Preserve alpha
    }
  }
  
  return result;
}

/**
 * Apply gradient magnitude colormap
 */
export function applyGradientMagnitudeColormap(
  imageData: ImageData,
  intensity: number = 1.0,
  sensitivity: number = 1.0
): ImageData {
  // First compute gradient magnitude
  const gradientData = computeGradientMagnitude(imageData);
  
  // Apply sensitivity scaling
  if (sensitivity !== 1.0) {
    const data = gradientData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const scaledGray = Math.min(255, Math.round(gray * sensitivity));
      data[i] = scaledGray;
      data[i + 1] = scaledGray;
      data[i + 2] = scaledGray;
    }
  }
  
  // Apply viridis colormap
  return applyColormap(gradientData, 'colormap_viridis', intensity);
}

/**
 * Apply edge intensity colormap
 */
export function applyEdgeIntensityColormap(
  imageData: ImageData,
  intensity: number = 1.0,
  threshold: number = 0.1
): ImageData {
  // Compute gradient magnitude
  const gradientData = computeGradientMagnitude(imageData);
  
  // Apply threshold to enhance edges
  const data = gradientData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] / 255;
    const enhancedGray = gray < threshold ? 0 : Math.min(255, Math.round((gray - threshold) / (1 - threshold) * 255));
    data[i] = enhancedGray;
    data[i + 1] = enhancedGray;
    data[i + 2] = enhancedGray;
  }
  
  // Apply hot colormap
  return applyColormap(gradientData, 'colormap_hot', intensity);
}

/**
 * Apply difference colormap (requires center point for diverging)
 */
export function applyDifferenceColormap(
  imageData: ImageData,
  intensity: number = 1.0,
  centerValue: number = 128
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const resultData = result.data;
  const colormap = RDBU; // Use Red-Blue diverging colormap
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const gray = rgbToGrayscale(data[i], data[i + 1], data[i + 2]);
    
    // Calculate difference from center
    const difference = gray - centerValue;
    
    // Map to 0-255 range with center at 128
    let mappedValue = 128 + difference;
    mappedValue = Math.max(0, Math.min(255, Math.round(mappedValue * intensity)));
    
    // Apply colormap
    const color = colormap[mappedValue];
    
    resultData[i] = color.r;
    resultData[i + 1] = color.g;  
    resultData[i + 2] = color.b;
    resultData[i + 3] = data[i + 3];
  }
  
  return result;
}