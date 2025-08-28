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
  'brightness': ['brightness'],
  'contrast': ['contrast'],
  'linearstretch': [],
  'gammacorrection': ['gamma'],
  'histogramequalization': [],
  'clahe': ['clipLimit', 'gridSize'],
  'localhistogramequalization': ['kernelSize'],
  'adaptivehistogramequalization': ['clipLimit', 'gridSize'],
  'bilateral': ['kernelSize', 'sigmaColor', 'sigmaSpace'],
  'nonlocalmeans': ['patchSize', 'searchWindowSize', 'h'],
  'boxblur': ['kernelSize'],
  'gaussianblur': ['kernelSize', 'sigma'],
  'median': ['kernelSize'],
  'weightedmedian': ['kernelSize'],
  'alphatrimmedmean': ['kernelSize', 'alpha'],
  'sharpen': ['sharpenAmount'],
  'unsharpmask': ['kernelSize', 'sigma', 'sharpenAmount'],
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
  'lawstextureenergy': ['lawsKernelType'],
  'morph_open': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_close': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_tophat': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_blackhat': ['kernelSize', 'morphShape', 'morphIterations'],
  'morph_gradient': ['kernelSize', 'morphShape', 'morphIterations'],
  'distancetransform': ['threshold'],
  'dft': [],
  'dct': [],
  'wavelet': [],
  'highpass': ['cutoff'],
  'guided': ['kernelSize', 'epsilon'],
  'edgepreserving': ['kernelSize', 'sigmaColor', 'sigmaSpace'],
  'anisotropicdiffusion': ['iterations', 'kappa', 'epsilon'],
  'lbp': ['radius', 'neighbors'],
  'filterchain': []
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
  link.download = `${chain.name.replace(/[^a-zA-Z0-9]/g, '_')}-compareX-filter-${new Date().toISOString().split('T')[0]}.json`;
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
        const data = JSON.parse(jsonString);
        
        // Try to extract filter chain from different possible formats
        let chainData = null;
        
        // Format 1: Exported filter chain format (with version and chain wrapper)
        if (data.version && data.chain) {
          chainData = data.chain;
        }
        // Format 2: Direct filter chain format
        else if (data.name && Array.isArray(data.items)) {
          chainData = data;
        }
        // Format 3: Filter preset format
        else if (data.preset && data.preset.name && Array.isArray(data.preset.chain)) {
          chainData = {
            name: data.preset.name,
            items: data.preset.chain,
            id: data.preset.id || `preset-${Date.now()}`,
            createdAt: data.preset.createdAt || Date.now(),
            modifiedAt: data.preset.modifiedAt || Date.now()
          };
        }
        
        if (!chainData) {
          throw new Error('This JSON file does not appear to be a filter chain. Please check if the file contains valid filter chain data with "name" and "items" properties.');
        }
        
        // Validate chain structure
        if (!chainData.name || typeof chainData.name !== 'string') {
          throw new Error('Invalid filter chain: missing or invalid "name" property. Please verify this is a valid filter chain file.');
        }
        
        if (!Array.isArray(chainData.items)) {
          throw new Error('Invalid filter chain: "items" property must be an array of filters. Please check if this is a valid filter chain file.');
        }
        
        // Validate filter items
        for (let i = 0; i < chainData.items.length; i++) {
          const item = chainData.items[i];
          if (!item || typeof item !== 'object') {
            throw new Error(`Invalid filter item at position ${i + 1}. Each filter must be an object with id, filterType, params, and enabled properties.`);
          }
          
          if (!item.id || typeof item.id !== 'string') {
            throw new Error(`Filter item at position ${i + 1} is missing a valid "id" property.`);
          }
          
          if (!item.filterType || typeof item.filterType !== 'string') {
            throw new Error(`Filter item at position ${i + 1} is missing a valid "filterType" property.`);
          }
          
          if (!item.hasOwnProperty('params') || typeof item.params !== 'object') {
            throw new Error(`Filter item at position ${i + 1} is missing valid "params" property.`);
          }
          
          if (typeof item.enabled !== 'boolean') {
            throw new Error(`Filter item at position ${i + 1} is missing valid "enabled" property (must be true or false).`);
          }
        }
        
        // Create new chain with updated timestamps and ID
        const importedChain: FilterChain = {
          name: chainData.name,
          items: chainData.items,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };
        
        resolve(importedChain);
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('Invalid JSON file format. Please ensure the file contains valid JSON data.'));
        } else {
          reject(error);
        }
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Validate file extension - accepts any JSON file
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
