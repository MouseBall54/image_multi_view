import React, { useState, useRef } from 'react';
import { useStore, FilterParams } from '../store';
import { ALL_FILTERS } from './FilterControls';
import type { FilterChainItem } from '../types';
import { importFilterChain, isValidFilterChainFile } from '../utils/filterExport';

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
    current,
    folders,
    analysisFile,
    removeFromFilterCart,
    reorderFilterCart,
    clearFilterCart,
    toggleFilterCartItem,
    createFilterChain,
    saveFilterPreset,
    loadFilterPreset,
    deleteFilterPreset,
    setShowFilterCart,
    applyFilterChain,
    openPreviewModal,
    exportCurrentCart,
    importFilterChain: importChain,
  } = useStore();

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [chainName, setChainName] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showChainDialog, setShowChainDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportName, setExportName] = useState('');
  const [exportDescription, setExportDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showFilterCart) return null;

  // Get current image file for preview
  const getCurrentImageFile = (): File | undefined => {
    if (typeof activeFilterEditor === 'string') {
      // Viewer mode - get from folder
      if (!current) return undefined;
      const folder = folders[activeFilterEditor];
      if (folder && folder.data.files) {
        return folder.data.files.get(current.filename);
      }
    } else if (typeof activeFilterEditor === 'number') {
      // Analysis mode - get from analysisFile
      return analysisFile || undefined;
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

  const formatParams = (params: Record<string, any>) => {
    const entries = Object.entries(params);
    if (entries.length === 0) return '';
    
    const formatted = entries
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === 'number') {
          return `${key}: ${Number.isInteger(value) ? value : value.toFixed(2)}`;
        }
        return `${key}: ${value}`;
      })
      .slice(0, 3); // Show only first 3 params to keep it compact
    
    return formatted.length > 0 ? `(${formatted.join(', ')})` : '';
  };

  const handleCreateChain = () => {
    if (chainName.trim() && filterCart.length > 0) {
      createFilterChain(chainName.trim());
      setChainName('');
      setShowChainDialog(false);
    }
  };

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
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidFilterChainFile(file)) {
      alert('Please select a valid JSON filter chain file');
      return;
    }

    try {
      const importedChain = await importFilterChain(file);
      importChain(importedChain);
      alert(`Successfully imported filter chain: ${importedChain.name}`);
    } catch (error) {
      alert(`Failed to import filter chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="filter-cart-panel">
      <div className="filter-cart-header">
        <h3>Filter Chain ({filterCart.length})</h3>
        <button 
          className="close-btn"
          onClick={() => setShowFilterCart(false)}
        >
          ×
        </button>
      </div>

      <div className="filter-cart-content">
        {filterCart.length === 0 ? (
          <div className="empty-cart">
            <p>No filters in chain</p>
            <p><small>Add filters using the "Add to Chain" button</small></p>
          </div>
        ) : (
          <>
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

                          if (e.shiftKey) {
                            // Shift+Click: Preview only this single filter
                            openPreviewModal({
                              mode: 'single',
                              filterType: item.filterType,
                              filterParams: item.params as FilterParams,
                              title: `Single Filter: ${getFilterDisplayName(item.filterType)}`,
                              sourceFile,
                            });
                          } else {
                            // Normal click: Preview chain up to this point
                            const filtersUpToThis = filterCart.slice(0, index + 1).filter(f => f.enabled);
                            if (filtersUpToThis.length > 0) {
                              openPreviewModal({
                                mode: 'chain',
                                chainItems: filtersUpToThis,
                                title: `Filter Chain (Steps 1-${index + 1})`,
                                sourceFile,
                              });
                            }
                          }
                        }}
                        disabled={activeFilterEditor === null || !item.enabled || !getCurrentImageFile()}
                        title={`Preview chain up to step ${index + 1}\nShift+Click: Preview only this filter`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="chain-item-params">
                    <small>{formatParams(item.params)}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="filter-cart-actions">
              <div className="cart-action-row">
                <button 
                  className="btn btn-icon btn-theme-secondary"
                  onClick={() => {
                    if (activeFilterEditor !== null) {
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
                      applyFilterChain(noFilterChain, activeFilterEditor);
                    }
                  }}
                  disabled={activeFilterEditor === null}
                  title="Reset to original image"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23,4 23,10 17,10"/>
                    <polyline points="1,20 1,14 7,14"/>
                    <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                    <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                  </svg>
                </button>
                <button 
                  className="btn btn-icon btn-theme-accent"
                  onClick={() => {
                    if (activeFilterEditor !== null && filterCart.length > 0) {
                      const tempChain = {
                        id: 'temp',
                        name: 'Current Chain',
                        items: filterCart,
                        createdAt: Date.now(),
                        modifiedAt: Date.now()
                      };
                      applyFilterChain(tempChain, activeFilterEditor);
                    }
                  }}
                  disabled={filterCart.length === 0 || activeFilterEditor === null}
                  title="Apply current chain to active viewer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
                <button 
                  className="btn btn-icon btn-theme-primary"
                  onClick={() => setShowChainDialog(true)}
                  disabled={filterCart.length === 0}
                  title="Save as chain"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19,21H5a2,2,0,0,1-2-2V5a2,2,0,0,1,2-2H12l7,7v9A2,2,0,0,1,19,21Z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                </button>
                <button 
                  className="btn btn-icon btn-theme-success"
                  onClick={() => setShowPresetDialog(true)}
                  disabled={filterCart.length === 0}
                  title="Save as preset"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

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

      {/* Chain Dialog */}
      {showChainDialog && (
        <div className="dialog-overlay" onClick={() => setShowChainDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Save Filter Chain</h3>
            <input
              type="text"
              placeholder="Enter chain name..."
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChain()}
              autoFocus
            />
            <div className="dialog-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowChainDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateChain}
                disabled={!chainName.trim()}
              >
                Save Chain
              </button>
            </div>
          </div>
        </div>
      )}

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