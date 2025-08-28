// src/types.ts
export type FolderKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";
export type AppMode = "compare" | "pinpoint" | "analysis";
export type PinpointMouseMode = "pin" | "pan";
export type GridColor = 'white' | 'red' | 'yellow' | 'blue';

export interface PickedFolder {
  key: FolderKey;
  name: string;
  files: Map<string, File>; // filename -> File
}

export interface MatchedItem {
  filename: string;
  has: Record<FolderKey, boolean>;
}

export interface Pinpoint {
  x: number; // normalized image coordinate
  y: number; // normalized image coordinate
}

export interface Viewport {
  scale: number;
  cx?: number;        // center x (image coords)
  cy?: number;        // center y (image coords)
  refScreenX?: number; // For pinpoint mode: screen x of the common reference point
  refScreenY?: number; // For pinpoint mode: screen y of the common reference point
}


export type FilterType =
  | "none"
  | "grayscale"
  | "invert"
  | "sepia"
  | "brightness"
  | "contrast"
  | "sobel"
  // Smoothing
  | "gaussianblur"
  | "boxblur"
  | "median"
  | "weightedmedian"
  | "alphatrimmedmean"
  // Sharpening
  | "sharpen"
  | "laplacian"
  | "unsharpmask"
  | "highpass"
  // Edge Detection
  | "prewitt"
  | "scharr"
  | "canny"
  | "robertscross"
  | "log"
  | "dog"
  | "marrhildreth"
  // Contrast
  | "linearstretch"
  | "histogramequalization"
  | "clahe"
  | "gammacorrection"
  | "localhistogramequalization"
  | "adaptivehistogramequalization"
  // Advanced Denoising
  | "bilateral"
  | "nonlocalmeans"
  | "anisotropicdiffusion"
  // Texture Analysis
  | "gabor"
  | "lawstextureenergy"
  | "lbp"
  // Edge-preserving Filter
  | "guided"
  | "edgepreserving"
  // Frequency Domain
  | "dft"
  | "dct"
  | "wavelet"
  // Morphology & Distance
  | "morph_open"
  | "morph_close"
  | "morph_tophat"
  | "morph_blackhat"
  | "morph_gradient"
  | "distancetransform"
  // Colormap - Perceptually Uniform (Recommended)
  | "colormap_viridis"
  | "colormap_inferno"
  | "colormap_plasma"
  | "colormap_magma"
  | "colormap_parula"
  // Colormap - Rainbow/Legacy
  | "colormap_jet"
  | "colormap_hsv"
  | "colormap_hot"
  // Colormap - Aesthetic Gradients
  | "colormap_cool"
  | "colormap_warm"
  | "colormap_spring"
  | "colormap_summer"
  | "colormap_autumn"
  | "colormap_winter"
  // Colormap - Specialized
  | "colormap_bone"
  | "colormap_copper"
  | "colormap_pink"
  // Colormap - Diverging (Change-based)
  | "colormap_rdbu"
  | "colormap_rdylbu"
  | "colormap_bwr"
  | "colormap_seismic"
  | "colormap_coolwarm"
  | "colormap_spectral"
  // Colormap - Gradient-based
  | "colormap_gradient_magnitude"
  | "colormap_edge_intensity"
  | "colormap_difference"
  | "filterchain";

export type DrawableImage = ImageBitmap | HTMLImageElement;

// Filter Chain Types
export interface FilterChainItem {
  id: string;
  filterType: FilterType;
  params: Record<string, any>;
  enabled: boolean;
}

export interface FilterChain {
  id: string;
  name: string;
  items: FilterChainItem[];
  createdAt: number;
  modifiedAt: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  chain: FilterChainItem[];
  tags: string[];
  description?: string;
  createdAt: number;
}

