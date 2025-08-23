import type { FilterChain, FilterChainItem, FilterType } from '../types';

export interface ExportedFilterChain {
  version: string;
  exportedAt: number;
  chain: FilterChain;
  metadata?: {
    appVersion?: string;
    description?: string;
    tags?: string[];
  };
}

export interface ExportedFilterPreset {
  version: string;
  exportedAt: number;
  preset: {
    id: string;
    name: string;
    description?: string;
    chain: FilterChainItem[];
    tags?: string[];
    createdAt: number;
    modifiedAt: number;
  };
  metadata?: {
    appVersion?: string;
    description?: string;
  };
}

// Define which parameters each filter type actually uses
const FILTER_PARAMETER_MAP: Record<FilterType, string[]> = {
  'none': [],
  'grayscale': [],
  'invert': [],
  'sepia': [],
  'linearstretch': [],
  'gammacorrection': ['gamma'],
  'histogramequalization': [],
  'clahe': ['clipLimit', 'gridSize'],
  'localhistogramequalization': ['kernelSize'],
  'bilateral': ['kernelSize', 'sigmaColor', 'sigmaSpace'],
  'nonlocalmeans': ['patchSize', 'searchWindowSize', 'h'],
  'edgepreserving': ['kernelSize', 'sigmaColor', 'sigmaSpace'],
  'boxblur': ['kernelSize'],
  'gaussianblur': ['kernelSize', 'sigma'],
  'median': ['kernelSize'],
  'weightedmedian': ['kernelSize'],
  'alphatrimmedmean': ['kernelSize', 'alpha'],
  'sharpen': ['sharpenAmount'],
  'unsharp': ['kernelSize', 'sigma', 'sharpenAmount'],
  'sobel': [],
  'scharr': [],
  'prewitt': [],
  'robertscross': [],
  'canny': ['lowThreshold', 'highThreshold'],
  'laplacian': [],
  'log': ['kernelSize', 'sigma'],
  'dog': ['kernelSize', 'sigma', 'sigma2'],
  'marrhildreth': ['kernelSize', 'sigma', 'lowThreshold', 'highThreshold'],
  'gabor': ['kernelSize', 'sigma', 'theta', 'lambda', 'gamma', 'psi'],
  'laws': ['lawsKernelType'],
  'morph_open': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_close': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_tophat': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_blackhat': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_gradient': ['kernelSize', 'morphShape', 'morphIterations'],
  'distancetransform': ['threshold'],
  'fft': [],
  'hpf': ['cutoff'],
  'lpf': ['cutoff'],
  'watershed': ['iterations', 'kappa', 'epsilon']
};

// Function to get only relevant parameters for a filter type
export function getRelevantParams(filterType: FilterType, allParams: any): any {
  const relevantParamKeys = FILTER_PARAMETER_MAP[filterType] || [];
  if (relevantParamKeys.length === 0) {
    return {};
  }
  
  const relevantParams: any = {};
  relevantParamKeys.forEach(key => {
    if (allParams[key] !== undefined) {
      relevantParams[key] = allParams[key];
    }
  });
  
  return relevantParams;
}

// Export filter chain to JSON file
export const exportFilterChain = (chain: FilterChain, description?: string): void => {
  // Optimize the chain by only including relevant parameters
  const optimizedChain: FilterChain = {
    ...chain,
    items: chain.items.map(item => ({
      ...item,
      params: getRelevantParams(item.filterType, item.params)
    }))
  };

  const exportData: ExportedFilterChain = {
    version: '1.0.0',
    exportedAt: Date.now(),
    chain: optimizedChain,
    metadata: {
      appVersion: '1.0.0',
      description: description || `Filter chain: ${chain.name}`,
    }
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `filter-chain-${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export current filter cart as JSON file
export const exportFilterCart = (filterCart: FilterChainItem[], name: string, description?: string): void => {
  const chain: FilterChain = {
    id: `exported-${Date.now()}`,
    name,
    items: filterCart,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };

  exportFilterChain(chain, description);
};

// Import filter chain from JSON file
export const importFilterChain = (file: File): Promise<FilterChain> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const importData = JSON.parse(jsonString) as ExportedFilterChain;
        
        // Validate file format
        if (!importData.version || !importData.chain) {
          throw new Error('Invalid filter chain file format');
        }
        
        // Validate chain structure
        if (!importData.chain.name || !Array.isArray(importData.chain.items)) {
          throw new Error('Invalid filter chain structure');
        }
        
        // Validate filter items
        for (const item of importData.chain.items) {
          if (!item.id || !item.filterType || !item.params || typeof item.enabled !== 'boolean') {
            throw new Error('Invalid filter item structure');
          }
        }
        
        // Create new chain with updated timestamps and ID
        const importedChain: FilterChain = {
          ...importData.chain,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };
        
        resolve(importedChain);
      } catch (error) {
        reject(new Error(`Failed to parse filter chain file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Validate file extension
export const isValidFilterChainFile = (file: File): boolean => {
  return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
};

// Get file size in human readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
