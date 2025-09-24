// src/utils/dragDrop.ts
// Common drag and drop utilities for folder handling across all modes

// Helper function to check if a file is a valid image
export const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/svg+xml', 'image/tiff', 'image/tif'
  ];
  return validTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif)$/i.test(file.name);
};

// Helper function to detect if dropped items contain folders
export const getDroppedFolders = (items: DataTransferItemList): FileSystemDirectoryEntry[] => {
  const folders: FileSystemDirectoryEntry[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.kind === 'file') {
      try {
        // Try both webkitGetAsEntry and getAsEntry for compatibility
        const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();

        if (entry && entry.isDirectory) {
          folders.push(entry as FileSystemDirectoryEntry);
        }
      } catch (error) {
        // Silently fail - browser doesn't support this method
      }
    }
  }

  return folders;
};

// Alternative folder detection for browsers that don't support webkitGetAsEntry
export const detectFoldersFromFiles = (files: FileList): boolean => {
  // If files is empty but we had dataTransfer items, likely folders
  if (files.length === 0) {
    return true;
  }

  // Check if any file has webkitRelativePath indicating folder structure
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
      return true;
    }
  }

  return false;
};

// Helper function to scan folder for images (non-recursive)
export const scanFolderForImages = async (folderEntry: FileSystemDirectoryEntry): Promise<{ name: string; files: File[] }> => {
  return new Promise((resolve, reject) => {
    const files: File[] = [];
    const reader = folderEntry.createReader();

    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          // Done reading
          resolve({ name: folderEntry.name, files });
          return;
        }

        // Process entries (files only, no subdirectories)
        for (const entry of entries) {
          if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            try {
              const file = await new Promise<File>((resolve, reject) => {
                fileEntry.file(resolve, reject);
              });

              if (isValidImageFile(file)) {
                files.push(file);
              }
            } catch (error) {
              console.warn(`Could not read file ${entry.name}:`, error);
            }
          }
        }

        // Continue reading (there might be more entries)
        readEntries();
      }, reject);
    };

    readEntries();
  });
};

// Enhanced folder drag-drop handler that works for all modes
export const handleFolderDrop = async (
  e: React.DragEvent,
  onAddFolder: (folderName: string, files: File[]) => Promise<void>,
  onAddFiles: (files: File[]) => Promise<void>,
  addToast?: (toast: { type: 'success' | 'error' | 'warning'; title: string; message: string; details?: string[]; duration: number }) => void
) => {
  e.preventDefault();
  e.stopPropagation();

  // Method 1: Try to detect folders using webkitGetAsEntry
  const folders = getDroppedFolders(e.dataTransfer.items);

  if (folders.length > 0) {
    // Handle folder drops - process each folder separately
    for (const folderEntry of folders) {
      try {
        const { name, files } = await scanFolderForImages(folderEntry);
        await onAddFolder(name, files);
      } catch (error) {
        console.error(`Failed to process folder ${folderEntry.name}:`, error);
        addToast?.({
          type: 'error',
          title: 'Folder Processing Failed',
          message: `Could not process folder "${folderEntry.name}"`,
          details: [error instanceof Error ? error.message : 'Unknown error'],
          duration: 5000
        });
      }
    }
    return true; // Handled as folders
  }

  // Method 2: Check for folder indicators in files
  const hasItemsButNoFiles = e.dataTransfer.items.length > 0 && e.dataTransfer.files.length === 0;
  const maybeFolder = detectFoldersFromFiles(e.dataTransfer.files);

  if (hasItemsButNoFiles || maybeFolder) {
    addToast?.({
      type: 'error',
      title: 'Folder Access Limitation',
      message: 'Cannot access folder contents directly',
      details: [
        'Your browser/system may not support direct folder access.',
        'Try using the folder picker buttons instead, or drag individual files.'
      ],
      duration: 7000
    });
    return true; // Handled (even if failed)
  }

  // Method 3: Handle regular file drops
  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter(file => isValidImageFile(file));

  if (imageFiles.length === 0) {
    if (addToast) {
      addToast({
        type: 'warning',
        title: 'No Valid Images',
        message: 'No valid image files found in the dropped items',
        details: ['Please drop image files (JPG, PNG, GIF, WebP, BMP, SVG, TIFF) or use folder picker buttons'],
        duration: 5000
      });
    }
    return false; // Not handled
  }

  // Process regular files
  await onAddFiles(imageFiles);
  return true; // Handled as files
};