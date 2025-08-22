import React, { useState, useRef } from 'react';
import { useStore, FilterParams } from '../store';
import { ALL_FILTERS } from './FilterControls';
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
    appMode,
    current,
    folders,
    analysisFile,
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
  } = useStore();

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
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

  // Get preview width for CSS custom property
  const getPreviewWidth = () => {
    switch (previewSize) {
      case 'S': return '320px';
      case 'M': return '470px';
      case 'L': return '620px';
      default: return '320px';
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
        return folder?.data.files?.get(current.filename);
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
          return folder.data.files.get(current.filename);
        }
      }
      if (current) {
        for (const k in current.has) {
          if ((current.has as any)[k]) {
            const folder = folders[k as any];
            const file = folder?.data.files?.get(current.filename);
            if (file) return file;
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

  // Resolve a source file for preview irrespective of editor visibility
  const getCurrentImageFile = (): File | undefined => {
    // 1) If editor has a target (string key), use it
    if (typeof activeFilterEditor === 'string') {
      if (!current) return undefined;
      const folder = folders[activeFilterEditor];
      return folder?.data.files?.get(current.filename);
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
        return folder.data.files.get(current.filename);
      }
    }
    // 5) Last resort: find any folder that contains current filename
    if (current) {
      for (const k in current.has) {
        if ((current.has as any)[k]) {
          const folder = folders[k as any];
          const file = folder?.data.files?.get(current.filename);
          if (file) return file;
        }
      }
    }
    return undefined;
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number, item: FilterChainItem) => {
    setDraggedItem({ index, id: item.id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedItem && draggedItem.index !== dropIndex) {
      reorderFilterCart(draggedItem.index, dropIndex);
    }
    setDraggedItem(null);
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

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 handleFileImport called');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }
    console.log('📁 File selected:', file.name, file.type);

    if (!isValidFilterChainFile(file)) {
      console.log('❌ Invalid file type');
      alert('Please select a valid JSON filter chain file');
      return;
    }
    console.log('✅ File validation passed');

    try {
      console.log('🔄 Starting import process...');
      const importedChain = await importFilterChain(file);
      console.log('✅ Filter chain imported:', importedChain);
      
      console.log('🔄 Creating filter preset...');
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
      
      console.log('✅ Preset created and added to Saved Presets');
      
      // Show detailed success message
      const itemCount = importedChain.items.length;
      const filterNames = importedChain.items.map(item => 
        ALL_FILTERS.find(f => f.type === item.filterType)?.name || item.filterType
      ).join(', ');
      
      alert(`Successfully imported filter chain: "${importedChain.name}"\n\n` +
            `${itemCount} filter${itemCount > 1 ? 's' : ''}: ${filterNames}\n\n` +
            `Added to Saved Presets - you can now load it from the presets list.`);
    } catch (error) {
      console.error('❌ Import failed:', error);
      alert(`Failed to import filter chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      className={`filter-cart-panel ${previewClosing ? 'preview-closing' : ''}`}
      data-preview-size={previewModal.isOpen && previewModal.position === 'sidebar' ? previewSize : undefined}
      style={panelStyle}
    >
      <div className="filter-cart-header" onMouseDown={onHeaderMouseDown} style={{ cursor: 'grab' }}>
        <h3>Filter Chain ({filterCart.length})</h3>
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
          className="filter-cart-content"
          data-preview-size={previewModal.isOpen && previewModal.position === 'sidebar' ? previewSize : undefined}
        >
          {filterCart.length === 0 ? (
            <div className="empty-cart">
              <p>No filters in chain</p>
              <p><small>Add filters using the "Add to Chain" button</small></p>
            </div>
          ) : (
          <div className="filter-chain-list">
            {filterCart.map((item, index) => (
                <div
                  key={item.id}
                  className={`filter-chain-item ${!item.enabled ? 'disabled' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index, item)}
                  onDragOver={handleDragOver}
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
              ))}
            </div>
        )}

        {/* Filter Cart Actions - Always visible */}
        <div className="filter-cart-actions">
              <div className="cart-action-row">
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
              </div>
              
              <div className="cart-action-row">
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
              </div>
              
              <div className="cart-action-row">
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
                  title="Import filter chain from JSON file"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </button>
              </div>
        </div>

        {/* Presets Section */}
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

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
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
                className="btn btn-secondary"
                onClick={() => setShowPresetDialog(false)}
              >
                Cancel
              </button>
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
                className="btn btn-secondary"
                onClick={() => setShowExportDialog(false)}
              >
                Cancel
              </button>
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
