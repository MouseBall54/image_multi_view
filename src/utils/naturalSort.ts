// Natural numeric sorting utility for filenames
// Sorts files with numeric portions in natural order (e.g., file1, file2, file10)

/**
 * Extract numeric and non-numeric parts from a filename (without extension)
 * Returns an array of alternating string/number parts
 */
function parseFilename(filename: string): (string | number)[] {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  const parts: (string | number)[] = [];
  const regex = /(\d+|\D+)/g;
  let match;
  
  while ((match = regex.exec(nameWithoutExt)) !== null) {
    const part = match[0];
    // Convert to number if it's all digits, otherwise keep as string
    if (/^\d+$/.test(part)) {
      parts.push(parseInt(part, 10));
    } else {
      parts.push(part.toLowerCase()); // Case-insensitive comparison
    }
  }
  
  return parts;
}

/**
 * Compare two parsed filename arrays using natural sorting
 */
function compareFilenamesParts(aParts: (string | number)[], bParts: (string | number)[]): number {
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    
    // Handle cases where one array is shorter
    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;
    
    // Both are numbers
    if (typeof aPart === 'number' && typeof bPart === 'number') {
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    // Both are strings
    else if (typeof aPart === 'string' && typeof bPart === 'string') {
      const result = aPart.localeCompare(bPart);
      if (result !== 0) {
        return result;
      }
    }
    // Mixed types - numbers come before strings in each segment
    else if (typeof aPart === 'number' && typeof bPart === 'string') {
      return -1;
    }
    else if (typeof aPart === 'string' && typeof bPart === 'number') {
      return 1;
    }
  }
  
  return 0;
}

/**
 * Natural sort comparison function for filenames
 * Files with numbers are sorted numerically, then alphabetically
 * Files without numbers come after files with numbers
 */
export function naturalSort(a: string, b: string): number {
  const aParts = parseFilename(a);
  const bParts = parseFilename(b);
  
  // Check if files have numeric parts
  const aHasNumbers = aParts.some(part => typeof part === 'number');
  const bHasNumbers = bParts.some(part => typeof part === 'number');
  
  // Files with numbers come first, then files without numbers
  if (aHasNumbers && !bHasNumbers) {
    return -1;
  }
  if (!aHasNumbers && bHasNumbers) {
    return 1;
  }
  
  // Both have numbers or both don't have numbers - use natural comparison
  return compareFilenamesParts(aParts, bParts);
}

/**
 * Sort an array of filenames using natural sorting
 */
export function sortFilenames(filenames: string[]): string[] {
  return [...filenames].sort(naturalSort);
}

/**
 * Helper function to create a natural sort comparator for file objects
 */
export function createFileComparator<T>(getFilename: (item: T) => string) {
  return (a: T, b: T): number => {
    return naturalSort(getFilename(a), getFilename(b));
  };
}