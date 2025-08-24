import type { FilterChainItem, FilterType } from '../types';

// Import filter info from the actual filters module
const FILTER_INFO: Array<{ type: FilterType; name: string }> = [
  { type: 'none', name: 'None' },
  { type: 'grayscale', name: 'Grayscale' },
  { type: 'invert', name: 'Invert' },
  { type: 'sepia', name: 'Sepia' },
  { type: 'gaussianblur', name: 'Gaussian Blur' },
  { type: 'boxblur', name: 'Box Blur' },
  { type: 'median', name: 'Median' },
  { type: 'sharpen', name: 'Sharpen' },
  { type: 'sobel', name: 'Sobel' },
  { type: 'canny', name: 'Canny' },
  { type: 'laplacian', name: 'Laplacian' },
  { type: 'histogramequalization', name: 'Histogram Equalization' },
  { type: 'clahe', name: 'CLAHE' },
  // Add more as needed
];

/**
 * Generate a descriptive label for a filter chain
 * @param chainItems Array of filter chain items
 * @param maxLength Maximum length of the label before truncation
 * @returns A descriptive string representing the filter chain
 */
export function generateFilterChainLabel(
  chainItems: FilterChainItem[], 
  maxLength: number = 80
): string {
  if (!chainItems || chainItems.length === 0) {
    return 'no filters';
  }
  
  // Filter out disabled items
  const enabledItems = chainItems.filter(item => item.enabled);
  
  if (enabledItems.length === 0) {
    return 'no filters';
  }
  
  // Generate names for each filter
  const filterNames = enabledItems.map(item => {
    const filterInfo = FILTER_INFO.find(f => f.type === item.filterType);
    return filterInfo?.name || item.filterType;
  });
  
  // Join with arrows to show sequence
  const fullLabel = filterNames.join(' → ');
  
  // If too long, truncate intelligently
  if (fullLabel.length <= maxLength) {
    return fullLabel;
  }
  
  // If still too long, show first few and count
  if (filterNames.length > 3) {
    const firstTwo = filterNames.slice(0, 2).join(' → ');
    const remaining = filterNames.length - 2;
    return `${firstTwo} → (+${remaining} more)`;
  }
  
  // For 3 or fewer filters, just truncate
  return fullLabel.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a compact label for a filter chain (for tight spaces)
 * @param chainItems Array of filter chain items
 * @returns A compact string representing the filter chain
 */
export function generateCompactFilterChainLabel(chainItems: FilterChainItem[]): string {
  if (!chainItems || chainItems.length === 0) {
    return 'none';
  }
  
  const enabledItems = chainItems.filter(item => item.enabled);
  
  if (enabledItems.length === 0) {
    return 'none';
  }
  
  if (enabledItems.length === 1) {
    const filterInfo = FILTER_INFO.find(f => f.type === enabledItems[0].filterType);
    return filterInfo?.name || enabledItems[0].filterType;
  }
  
  return `${enabledItems.length} filters`;
}