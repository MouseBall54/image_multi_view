import React, { useState, useRef } from 'react';
import { useStore, FilterParams } from '../store';
import { ALL_FILTERS, FilterControls } from './FilterControls';
import type { FilterChainItem } from '../types';
import { importFilterChain, isValidFilterChainFile } from '../utils/filterExport';
import { getRelevantParams as getRelevantParamsForType } from '../utils/filterExport';
import { FilterPreviewModal } from './FilterPreviewModal';

interface DragItem {
  index: number;
  id: string;
}

export const FilterCart: React.FC = () => {
  const {
    filterCart,
    showFilterCart,
    filterPresets,
    activeFilterEditor,
    activeCanvasKey,
    current,
    folders,
    analysisFile,
    tempViewerFilter,
    tempViewerFilterParams,
    removeFromFilterCart,
    reorderFilterCart,
    clearFilterCart,
    toggleFilterCartItem,
    updateFilterCartItem,
    saveFilterPreset,
    loadFilterPreset,
    deleteFilterPreset,
    setShowFilterCart,
    applyFilterChain,
    openPreviewModal,
    updatePreviewModal,
    exportCurrentCart,
    previewModal,
    previewSize,
    closePreviewModal,
    addToast,
  } = useStore();

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [presetName, setPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportName, setExportName] = useState('');
  const [exportDescription, setExportDescription] = useState('');
  const [previewExiting, setPreviewExiting] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  
  // Drag and drop states for JSON file import
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverCounter, setDragOverCounter] = useState(0);
  const [draggedFileCount, setDraggedFileCount] = useState(0);
  
  // Use dragOverCounter to prevent linting error
  React.useEffect(() => {
    // Drag counter tracking for proper leave detection
  }, [dragOverCounter]);

  // Global drag end cleanup - handles cases where drag is cancelled
  React.useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedItem(null);
      setDragOverIndex(null);
    };

    const handleGlobalDrop = () => {
      // Small delay to ensure drop handlers run first
      setTimeout(() => {
        setDraggedItem(null);
        setDragOverIndex(null);
      }, 100);
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDrop);
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // Auto-enable preview when filter cart opens
  React.useEffect(() => {
    if (showFilterCart && !previewModal.isOpen) {
      const sourceFile = getCurrentImageFile();
      if (sourceFile) {
        // Small delay to allow cart to fully render
        const timer = setTimeout(() => {
          if (filterCart.length > 0) {
            // Preview the entire current chain
            const enabledFilters = filterCart.filter(f => f.enabled);
            if (enabledFilters.length > 0) {
              openPreviewModal({
                mode: 'chain',
                chainItems: enabledFilters,
                title: `Preview Chain (${enabledFilters.length} filters)`,
                sourceFile,
                position: 'sidebar',
                editMode: false
              });
            } else {
              // Show original image when no enabled filters
              openPreviewModal({
                mode: 'single',
                filterType: 'none',
                filterParams: {},
                title: 'Original Image',
                sourceFile,
                position: 'sidebar',
                editMode: false
              });
            }
          } else {
            // Empty cart - show original image
            openPreviewModal({
              mode: 'single',
              filterType: 'none',
              filterParams: {},
              title: 'Original Image',
              sourceFile,
              position: 'sidebar',
              editMode: false
            });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [showFilterCart, previewModal.isOpen, openPreviewModal]);

  // Drag handlers (drag by header)
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      if (!panelRef.current) return;
      const width = panelRef.current.offsetWidth || 320;
      const height = panelRef.current.offsetHeight || 480;
      const maxLeft = window.innerWidth - width;
      const maxTop = window.innerHeight - height;
      const left = Math.min(Math.max(0, ev.clientX - dragOffsetRef.current.x), Math.max(0, maxLeft));
      const top = Math.min(Math.max(0, ev.clientY - dragOffsetRef.current.y), Math.max(0, maxTop));
      setPanelPos({ left, top });
    };

    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Handle preview when editing starts
  React.useEffect(() => {
    if (editingItemId) {
      const editingItem = filterCart.find(item => item.id === editingItemId);
      const sourceFile = getCurrentImageFile();
      if (editingItem && sourceFile) {
        // Find the step index of the editing item
        const stepIndex = filterCart.findIndex(item => item.id === editingItemId);
        
        // Create a chain of steps up to (but not including) the current step for the base image
        const precedingSteps = filterCart.slice(0, stepIndex);
        
        // Small delay to allow for smooth transition
        setTimeout(() => {
          if (precedingSteps.length > 0) {
            // Show chain preview with preceding steps + current step being edited
            openPreviewModal({
              mode: 'chain',
              chainItems: [...precedingSteps, { ...editingItem, params: editingItem.params as FilterParams }],
              title: `Edit Step ${stepIndex + 1}: ${getFilterDisplayName(editingItem.filterType)}`,
              sourceFile,
              realTimeUpdate: true,
              position: 'sidebar',
              editMode: true,
              stepIndex: stepIndex,
              onParameterChange: (newParams: FilterParams) => {
                updateFilterCartItem(editingItemId, { params: newParams });
                // Update the chain with new parameters for real-time preview
                const updatedChain = [...precedingSteps, { ...editingItem, params: newParams }];
                updatePreviewModal({ chainItems: updatedChain });
              }
            });
          } else {
            // First step - show single filter preview
            openPreviewModal({
              mode: 'single',
              filterType: editingItem.filterType,
              filterParams: editingItem.params as FilterParams,
              title: `Edit Step 1: ${getFilterDisplayName(editingItem.filterType)}`,
              sourceFile,
              realTimeUpdate: true,
              position: 'sidebar',
              editMode: true,
              stepIndex: 0,
              onParameterChange: (newParams: FilterParams) => {
                updateFilterCartItem(editingItemId, { params: newParams });
                updatePreviewModal({ filterParams: newParams });
              }
            });
          }
        }, 100);
      }
    }
  }, [editingItemId]);

  // Handle smooth preview close
  const handlePreviewClose = React.useCallback(() => {
    setPreviewExiting(true);
    setPreviewClosing(true);
    // Exit edit mode when closing preview
    setEditingItemId(null);
    setTimeout(() => {
      closePreviewModal();
      setPreviewExiting(false);
      // Keep closing state for panel width transition duration
      setTimeout(() => {
        setPreviewClosing(false);
      }, 400); // Match panel width transition duration
    }, 300);
  }, [closePreviewModal, previewSize]);

  // Ensure preview sidebar is active by default when panel opens
  React.useEffect(() => {
    if (!showFilterCart) return;
    if (previewModal.isOpen && previewModal.position === 'sidebar') return;
    const sourceFile = getCurrentImageFile();
    if (!sourceFile) return;
    // Prefer chain preview if chain has items, otherwise single filter preview
    const enabledChain = filterCart.filter(f => f.enabled);
    if (enabledChain.length > 0) {
      openPreviewModal({
        mode: 'chain',
        chainItems: enabledChain,
        title: `Preview (Steps 1-${enabledChain.length})`,
        sourceFile,
        position: 'sidebar',
        editMode: true,
      });
    } else if (tempViewerFilter && tempViewerFilter !== 'none') {
      openPreviewModal({
        mode: 'single',
        filterType: tempViewerFilter,
        filterParams: tempViewerFilterParams as FilterParams,
        title: `Filter Preview`,
        sourceFile,
        position: 'sidebar',
        realTimeUpdate: true,
        editMode: true,
      });
    }
  }, [showFilterCart]);

  // Get preview width for CSS custom property
  const getPreviewWidth = () => {
    switch (previewSize) {
      case 'S': return '480px';
      case 'M': return '705px';
      case 'L': return '930px';
      default: return '480px';
    }
  };

  // Keep preview modal's source file in sync with current selection
  React.useEffect(() => {
    if (!previewModal.isOpen || previewModal.position !== 'sidebar') return;
    const newFile = (() => {
      // reuse the resolver below without moving hooks; simple inline resolver
      if (typeof activeFilterEditor === 'string') {
        if (!current) return undefined;
        const folder = folders[activeFilterEditor];
        if (!folder || !folder.data || !folder.data.files) return undefined;
        const files: Map<string, File> = folder.data.files;
        let f = files.get(current.filename);
        if (f) return f;
        const base = current.filename.replace(/\.[^/.]+$/, '');
        for (const [name, file] of files) {
          if (name === current.filename) return file;
          const nb = name.replace(/\.[^/.]+$/, '');
          if (nb === current.filename || nb === base) return file;
        }
        return undefined;
      }
      if (typeof activeFilterEditor === 'number') {
        return analysisFile || undefined;
      }
      if (analysisFile) return analysisFile;
      if (activeCanvasKey && typeof activeCanvasKey === 'string') {
        if (!current) return undefined;
        const folder = folders[activeCanvasKey];
        const has = current?.has?.[activeCanvasKey as any];
        if (has && folder?.data.files) {
          const files: Map<string, File> = folder.data.files;
          let f = files.get(current.filename);
          if (f) return f;
          const base = current.filename.replace(/\.[^/.]+$/, '');
          for (const [name, file] of files) {
            if (name === current.filename) return file;
            const nb = name.replace(/\.[^/.]+$/, '');
            if (nb === current.filename || nb === base) return file;
          }
          return undefined;
        }
      }
      if (current) {
        for (const k in current.has) {
          if ((current.has as any)[k]) {
            const folder = folders[k as any];
            if (folder && folder.data && folder.data.files) {
              const files: Map<string, File> = folder.data.files;
              let f = files.get(current.filename);
              if (f) return f;
              const base = current.filename.replace(/\.[^/.]+$/, '');
              for (const [name, file] of files) {
                if (name === current.filename) return file;
                const nb = name.replace(/\.[^/.]+$/, '');
                if (nb === current.filename || nb === base) return file;
              }
            }
          }
        }
      }
      return undefined;
    })();
    if (newFile && previewModal.sourceFile !== newFile) {
      updatePreviewModal({ sourceFile: newFile });
    }
  }, [previewModal.isOpen, previewModal.position, current?.filename, analysisFile, activeFilterEditor, activeCanvasKey, folders]);

  if (!showFilterCart) return null;

  // Helper to locate a file in a folder by exact name or base name (without extension)
  const findFileInFolder = (folder: any, filename: string | undefined): File | undefined => {
    if (!folder || !folder.data || !folder.data.files || !filename) return undefined;
    const files: Map<string, File> = folder.data.files;
    // Exact match
    const direct = files.get(filename);
    if (direct) return direct;
    // Base-name match
    const base = filename.replace(/\.[^/.]+$/, '');
    for (const [name, file] of files) {
      if (name === filename) return file;
      const nb = name.replace(/\.[^/.]+$/, '');
      if (nb === filename || nb === base) return file;
    }
    return undefined;
  };

  // Resolve a source file for preview irrespective of editor visibility
  const getCurrentImageFile = (): File | undefined => {
    // 1) If editor has a target (string key), use it
    if (typeof activeFilterEditor === 'string') {
      if (!current) return undefined;
      const folder = folders[activeFilterEditor];
      return findFileInFolder(folder, current.filename);
    }
    // 2) If editor targeted analysis index
    if (typeof activeFilterEditor === 'number') {
      return analysisFile || undefined;
    }
    // 3) If analysis file exists (analysis mode or not), prefer it
    if (analysisFile) return analysisFile;
    // 4) Fallback to active canvas folder key
    if (activeCanvasKey && typeof activeCanvasKey === 'string') {
      if (!current) return undefined;
      const folder = folders[activeCanvasKey];
      // Ensure this folder has the current filename
      const has = current?.has?.[activeCanvasKey as any];
      if (has && folder?.data.files) {
        return findFileInFolder(folder, current.filename);
      }
    }
    // 5) Last resort: find any folder that contains current filename
    if (current) {
      for (const k in current.has) {
        if ((current.has as any)[k]) {
          const folder = folders[k as any];
          const file = findFileInFolder(folder, current.filename);
          if (file) return file;
        }
      }
    }
    return undefined;
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number, item: FilterChainItem) => {
    console.log('Drag start:', index, item.id);
    setDraggedItem({ index, id: item.id });
    setDragOverIndex(null); // Clear any existing drag over state
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('Drag end');
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleFilterDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && draggedItem.index !== index) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      // Determine if we're in the top half (insert before) or bottom half (insert after)
      const insertIndex = y < height / 2 ? index : index + 1;
      setDragOverIndex(insertIndex);
    }
  };

  const handleFilterDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear drag over index if we're leaving the entire chain list
    const relatedTarget = e.relatedTarget as Element;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop at index:', dropIndex, 'Dragged item:', draggedItem, 'Drag over index:', dragOverIndex);
    
    try {
      if (draggedItem && dragOverIndex !== null && draggedItem.index !== dragOverIndex) {
        console.log('Reordering from', draggedItem.index, 'to', dragOverIndex);
        // Adjust drop index based on dragOverIndex calculation
        const finalDropIndex = dragOverIndex > draggedItem.index ? dragOverIndex - 1 : dragOverIndex;
        reorderFilterCart(draggedItem.index, finalDropIndex);
      }
    } catch (error) {
      console.error('Error during drop:', error);
    } finally {
      // Always clear drag state regardless of success/failure
      setDraggedItem(null);
      setDragOverIndex(null);
    }
  };

  const getFilterDisplayName = (filterType: string) => {
    const filter = ALL_FILTERS.find(f => f.type === filterType);
    return filter ? filter.name : filterType;
  };

  const formatParams = (filterType: string, params: Record<string, any>) => {
    // Only include adjustable params for this filter type
    const relevant = getRelevantParamsForType(filterType as any, params) as Record<string, any>;
    const entries = Object.entries(relevant);
    if (entries.length === 0) return '';

    const formatted = entries
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === 'number') {
          return `${key}: ${Number.isInteger(value) ? value : value.toFixed(2)}`;
        }
        return `${key}: ${value}`;
      })
      .slice(0, 3);

    return formatted.length > 0 ? `(${formatted.join(', ')})` : '';
  };

  // Helper function to update preview when parameters change

  const handleSavePreset = () => {
    if (presetName.trim() && filterCart.length > 0) {
      saveFilterPreset(presetName.trim());
      setPresetName('');
      setShowPresetDialog(false);
    }
  };

  const handleExportCart = () => {
    if (exportName.trim() && filterCart.length > 0) {
      exportCurrentCart(exportName.trim(), exportDescription.trim() || undefined);
      setExportName('');
      setExportDescription('');
      setShowExportDialog(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Shared import logic for both file input and drag & drop
  const processImportedFile = async (file: File) => {
    if (!isValidFilterChainFile(file)) {
      addToast({
        type: 'error',
        title: 'Invalid File Format',
        message: `Unable to process "${file.name}"`,
        details: ['This file does not appear to be a JSON file', 'Please select a valid JSON file containing filter chain data'],
        duration: 6000
      });
      return;
    }

    try {
      const importedChain = await importFilterChain(file);
      
      // Create a filter preset from the imported chain
      const newPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: importedChain.name,
        description: `Imported filter chain: ${importedChain.name}`,
        chain: importedChain.items,
        tags: ['imported'],
        createdAt: Date.now(),
        modifiedAt: Date.now()
      };
      
      // Add directly to filterPresets instead of filterChains
      const currentState = useStore.getState();
      useStore.setState({
        filterPresets: [...currentState.filterPresets, newPreset]
      });
      
      // Show detailed success message
      const itemCount = importedChain.items.length;
      const filterNames = importedChain.items.map(item => 
        ALL_FILTERS.find(f => f.type === item.filterType)?.name || item.filterType
      ).join(', ');
      
      addToast({
        type: 'success',
        title: 'Import Successful',
        message: `"${importedChain.name}" has been imported`,
        details: [
          `${itemCount} filter${itemCount > 1 ? 's' : ''}: ${filterNames}`,
          'Added to Saved Presets - you can now load it from the presets list',
          'Note: When exporting, files use the format: [name]-compareX-filter-[yyyy-mm-dd].json'
        ],
        duration: 8000
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Import Failed',
        message: `Failed to import "${file.name}"`,
        details: [errorMessage, 'Please verify that this JSON file contains valid filter chain data'],
        duration: 8000
      });
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length === 1) {
      await processImportedFile(files[0]);
    } else {
      await processMultipleImportedFiles(files);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process multiple imported files with batch processing
  const processMultipleImportedFiles = async (files: File[]) => {
    const results = {
      successful: [] as string[],
      failed: [] as { filename: string; error: string }[],
      total: files.length
    };

    // Process files sequentially to avoid overwhelming the UI
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (!isValidFilterChainFile(file)) {
          results.failed.push({
            filename: file.name,
            error: 'Not a JSON file'
          });
          continue;
        }

        const importedChain = await importFilterChain(file);
        
        // Create a filter preset from the imported chain
        const newPreset = {
          id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: importedChain.name,
          description: `Imported filter chain: ${importedChain.name}`,
          chain: importedChain.items,
          tags: ['imported'],
          createdAt: Date.now(),
          modifiedAt: Date.now()
        };
        
        // Add directly to filterPresets
        const currentState = useStore.getState();
        useStore.setState({
          filterPresets: [...currentState.filterPresets, newPreset]
        });
        
        results.successful.push(importedChain.name);
        
        // Small delay to prevent UI freezing
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        results.failed.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Show summary results
    showBatchImportResults(results);
  };

  const showBatchImportResults = (results: {
    successful: string[];
    failed: { filename: string; error: string }[];
    total: number;
  }) => {
    const { successful, failed, total } = results;
    
    const details: string[] = [];
    
    if (successful.length > 0) {
      details.push(`✅ Successfully imported ${successful.length} filter chain${successful.length > 1 ? 's' : ''}:`);
      successful.forEach(name => {
        details.push(`  • ${name}`);
      });
    }
    
    if (failed.length > 0) {
      if (successful.length > 0) details.push(''); // Add spacing
      details.push(`❌ Failed to import ${failed.length} file${failed.length > 1 ? 's' : ''}:`);
      failed.forEach(({ filename, error }) => {
        details.push(`  • ${filename}: ${error}`);
      });
    }
    
    if (successful.length > 0) {
      details.push('');
      details.push('All successful imports have been added to Saved Presets');
      details.push('Files are now saved with format: [name]-compareX-filter-[yyyy-mm-dd].json');
    }

    // Determine toast type based on results
    let toastType: 'success' | 'warning' | 'error' = 'success';
    if (failed.length > 0 && successful.length === 0) {
      toastType = 'error';
    } else if (failed.length > 0) {
      toastType = 'warning';
    }
    
    addToast({
      type: toastType,
      title: 'Batch Import Complete',
      message: `${total} files processed: ${successful.length} successful, ${failed.length} failed`,
      details,
      duration: 10000
    });
  };

  // Drag and drop handlers for JSON file import
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCounter(prev => prev + 1);
    
    // Count JSON files and show drag over state if we have any
    if (e.dataTransfer.items) {
      let jsonFileCount = 0;
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file' && (item.type === 'application/json' || item.type === '')) {
          jsonFileCount++;
        }
      }
      if (jsonFileCount > 0) {
        setIsDragOver(true);
        setDraggedFileCount(jsonFileCount);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCounter(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsDragOver(false);
        setDraggedFileCount(0);
        return 0;
      }
      return newCount;
    });
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set the drag effect to copy for JSON files
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file' && (item.type === 'application/json' || item.type === '')) {
          e.dataTransfer.dropEffect = 'copy';
          return;
        }
      }
    }
    e.dataTransfer.dropEffect = 'none';
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragOverCounter(0);
    setDraggedFileCount(0);

    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter(file => isValidFilterChainFile(file));

    if (jsonFiles.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Valid Files',
        message: 'No valid JSON files found in the dropped items',
        details: ['Please drop JSON files that may contain filter chain data'],
        duration: 5000
      });
      return;
    }

    // Process single or multiple files
    if (jsonFiles.length === 1) {
      await processImportedFile(jsonFiles[0]);
    } else {
      await processMultipleImportedFiles(jsonFiles);
    }
  };

  const panelStyle: React.CSSProperties = {
    ...(previewClosing ? ({ '--closing-preview-width': getPreviewWidth() } as React.CSSProperties) : {}),
    ...(panelPos ? { left: panelPos.left, top: panelPos.top, transform: 'none' } : {}),
    ...(panelPos ? { position: 'fixed' } : {}),
    cursor: isDragging ? 'grabbing' as const : undefined,
  };

  return (
    <div 
      ref={panelRef}
      className={`filter-cart-panel ${previewClosing ? 'preview-closing' : ''} ${isDragOver ? 'drag-over' : ''}`}
      data-preview-size={previewModal.isOpen && previewModal.position === 'sidebar' ? previewSize : undefined}
      style={panelStyle}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleFileDragOver}
      onDrop={handleFileDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <h3>
              {draggedFileCount > 1 
                ? `Drop ${draggedFileCount} JSON Filter Chains`
                : 'Drop JSON Filter Chain'
              }
            </h3>
            <p>
              {draggedFileCount > 1 
                ? `Release to import ${draggedFileCount} filter chain files`
                : 'Release to import filter chain file'
              }
            </p>
          </div>
        </div>
      )}

      <div className="filter-cart-header" onMouseDown={onHeaderMouseDown} style={{ cursor: 'grab' }}>
        <h3>Filters</h3>
        <button 
          className="close-btn"
          onClick={() => setShowFilterCart(false)}
        >
          ×
        </button>
      </div>

      <div className="filter-cart-body">
        {/* Embedded Preview Modal for sidebar mode */}
        {previewModal.isOpen && previewModal.position === 'sidebar' && (
          <div className={`embedded-preview ${previewExiting ? 'exiting' : ''}`}>
            <FilterPreviewModal
              isOpen={true}
              onClose={handlePreviewClose}
              sourceFile={previewModal.sourceFile}
              previewMode={previewModal.mode}
              filterType={previewModal.filterType}
              filterParams={previewModal.filterParams}
              chainItems={previewModal.chainItems}
              title={previewModal.title}
              realTimeUpdate={previewModal.realTimeUpdate}
              position="sidebar"
              editMode={previewModal.editMode}
              onParameterChange={previewModal.onParameterChange}
              stepIndex={previewModal.stepIndex}
            />
          </div>
        )}

        <div 
          className="filter-cart-content side-by-side"
          data-preview-size={previewModal.isOpen && previewModal.position === 'sidebar' ? previewSize : undefined}
        >
          <div className="embedded-editor-wrap">
            <FilterControls embedded />
            
            {/* Presets Section (moved to editor wrap bottom) */}
            {filterPresets.length > 0 && (
              <div className="filter-presets-section">
                <h4>Saved Presets</h4>
                <div className="presets-list">
                  {filterPresets.map((preset) => (
                    <div key={preset.id} className="preset-item">
                      <div className="preset-info">
                        <div className="preset-name">{preset.name}</div>
                        <div className="preset-filters">
                          <small>{preset.chain.length} filters</small>
                        </div>
                      </div>
                      <div className="preset-actions">
                        <button
                          className="btn btn-small"
                          onClick={() => loadFilterPreset(preset.id)}
                          title="Load preset to cart"
                        >
                          Load
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => deleteFilterPreset(preset.id)}
                          title="Delete preset"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="chain-column">
            <div className="panel-header">
              <h3>Filter Chain</h3>
            </div>
            <div 
              className="filter-chain-list"
              onDragLeave={handleFilterDragLeave}
            >
            {filterCart.map((item, index) => (
              <React.Fragment key={item.id}>
                {/* Drop indicator before item */}
                {dragOverIndex === index && (
                  <div className="drop-indicator" />
                )}
                <div
                  className={`filter-chain-item ${!item.enabled ? 'disabled' : ''} ${draggedItem?.id === item.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleFilterDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="chain-item-header">
                    <div className="chain-item-order">{index + 1}</div>
                    <div className="chain-item-name">
                      {getFilterDisplayName(item.filterType)}
                    </div>
                    <div className="chain-item-controls">
                      <button
                        className="preview-btn"
                        onClick={(e) => {
                          const sourceFile = getCurrentImageFile();
                          if (!sourceFile || !item.enabled) return;

                          // Exit edit mode when switching to preview mode
                          setEditingItemId(null);

                          if (e.shiftKey) {
                            // Shift+Click: Preview only this single filter
                            openPreviewModal({
                              mode: 'single',
                              filterType: item.filterType,
                              filterParams: item.params as FilterParams,
                              title: `Preview: ${getFilterDisplayName(item.filterType)}`,
                              sourceFile,
                              position: 'sidebar',
                              editMode: true,
                              onParameterChange: (newParams: FilterParams) => {
                                updateFilterCartItem(item.id, { params: newParams });
                                updatePreviewModal({ filterParams: newParams });
                              }
                            });
                          } else {
                            // Normal click: Preview chain up to this point
                            const filtersUpToThis = filterCart.slice(0, index + 1).filter(f => f.enabled);
                            if (filtersUpToThis.length > 0) {
                              openPreviewModal({
                                mode: 'chain',
                                chainItems: filtersUpToThis,
                                title: `Preview (Steps 1-${index + 1})`,
                                sourceFile,
                                position: 'sidebar',
                                editMode: true,
                                onParameterChange: (newParams: FilterParams) => {
                                  // Update the clicked item in the cart
                                  updateFilterCartItem(item.id, { params: newParams });
                                  // Recompute the preview chain up to this
                                  const updated = filterCart
                                    .slice(0, index + 1)
                                    .filter(f => f.enabled)
                                    .map((f) => (f.id === item.id ? { ...f, params: newParams } : f));
                                  updatePreviewModal({ chainItems: updated });
                                }
                              });
                            }
                          }
                        }}
                        disabled={!item.enabled || !getCurrentImageFile()}
                        title={`Preview chain up to step ${index + 1}\nShift+Click: Preview only this filter`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                        </svg>
                      </button>
                      
                      <button
                        className={`toggle-btn ${item.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => toggleFilterCartItem(item.id)}
                        title={item.enabled ? 'Disable filter' : 'Enable filter'}
                      >
                        {item.enabled ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        )}
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromFilterCart(item.id)}
                        title="Remove filter"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {(() => {
                    const summary = formatParams(item.filterType, item.params);
                    return summary ? (
                      <div className="chain-item-params">
                        <small>{summary}</small>
                      </div>
                    ) : null;
                  })()}
                </div>
              </React.Fragment>
              ))}
              {/* Drop indicator after last item */}
              {dragOverIndex === filterCart.length && (
                <div className="drop-indicator" />
              )}
            </div>

            {/* Filter Cart Actions - all buttons in single row */}
            <div className="filter-cart-actions">
              <button 
                className="btn btn-icon btn-theme-secondary"
                onClick={() => {
                  // Compute a target viewer key (editor target, active canvas, or analysis)
                  const targetKey = typeof activeFilterEditor !== 'undefined' && activeFilterEditor !== null
                    ? activeFilterEditor
                    : (activeCanvasKey ?? (analysisFile ? 0 : null));
                  if (targetKey !== null && targetKey !== undefined) {
                    // Apply no filter (reset to original)
                    const noFilterChain = {
                      id: 'reset',
                      name: 'Reset to Original',
                      items: [{
                        id: 'none',
                        filterType: 'none' as const,
                        params: {},
                        enabled: true
                      }],
                      createdAt: Date.now(),
                      modifiedAt: Date.now()
                    };
                    applyFilterChain(noFilterChain, targetKey as any);
                  }
                }}
                disabled={!getCurrentImageFile()}
                title="Reset to original image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,4 23,10 17,10"/>
                  <polyline points="1,20 1,14 7,14"/>
                  <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                  <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                </svg>
              </button>
              <button 
                className="btn btn-icon btn-theme-accent"
                onClick={() => {
                  const targetKey = typeof activeFilterEditor !== 'undefined' && activeFilterEditor !== null
                    ? activeFilterEditor
                    : (activeCanvasKey ?? (analysisFile ? 0 : null));
                  if (targetKey !== null && targetKey !== undefined && filterCart.length > 0) {
                    const tempChain = {
                      id: 'temp',
                      name: 'Current Chain',
                      items: filterCart,
                      createdAt: Date.now(),
                      modifiedAt: Date.now()
                    };
                    applyFilterChain(tempChain, targetKey as any);
                  }
                }}
                disabled={filterCart.length === 0 || !getCurrentImageFile()}
                title="Apply current chain to active viewer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </button>
              <button 
                className="btn btn-icon btn-theme-secondary"
                onClick={clearFilterCart}
                disabled={filterCart.length === 0}
                title="Clear all filters from chain"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
              <button 
                className="btn btn-icon btn-theme-success"
                onClick={() => setShowPresetDialog(true)}
                disabled={filterCart.length === 0}
                title="Save as preset"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </button>
              <button 
                className="btn btn-icon btn-theme-primary"
                onClick={() => setShowExportDialog(true)}
                disabled={filterCart.length === 0}
                title="Export filter chain as JSON file"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button 
                className="btn btn-icon btn-theme-accent"
                onClick={handleImportClick}
                title="Import filter chain(s) from JSON file(s) - supports multiple files (or drag & drop JSON files here)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </button>
            </div> {/* End of filter-cart-actions */}
          </div> {/* End of chain-column */}
        </div> {/* End of filter-cart-content */}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      </div> {/* End of filter-cart-body */}


      {/* Preset Dialog */}
      {showPresetDialog && (
        <div className="dialog-overlay" onClick={() => setShowPresetDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Save Filter Preset</h3>
            <input
              type="text"
              placeholder="Enter preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              autoFocus
            />
            <div className="dialog-actions">
              <button 
                className="btn btn-primary"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="dialog-overlay" onClick={() => setShowExportDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Export Filter Chain</h3>
            <div className="export-form">
              <div className="form-field">
                <label>Chain Name</label>
                <input
                  type="text"
                  placeholder="Enter chain name..."
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="Enter description..."
                  value={exportDescription}
                  onChange={(e) => setExportDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="export-info">
                <small>
                  <strong>Chain contains:</strong> {filterCart.length} filter{filterCart.length !== 1 ? 's' : ''}
                </small>
              </div>
            </div>
            <div className="dialog-actions">
              <button 
                className="btn btn-primary"
                onClick={handleExportCart}
                disabled={!exportName.trim()}
              >
                Export to File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
