import React, { useState } from 'react';
import { useStore, FilterParams } from '../store';
import { ALL_FILTERS } from './FilterControls';
import type { FilterChainItem } from '../types';

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
  } = useStore();

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [chainName, setChainName] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showChainDialog, setShowChainDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);

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
                        👁️
                      </button>
                      <button
                        className={`toggle-btn ${item.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => toggleFilterCartItem(item.id)}
                        title={item.enabled ? 'Disable filter' : 'Enable filter'}
                      >
                        {item.enabled ? '✓' : '✗'}
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromFilterCart(item.id)}
                        title="Remove filter"
                      >
                        🗑️
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
                  className="btn btn-icon btn-secondary"
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
                  🔄
                </button>
                <button 
                  className="btn btn-primary"
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
                  Apply Chain
                </button>
              </div>
              
              <div className="cart-action-row">
                <button 
                  className="btn btn-icon btn-secondary"
                  onClick={clearFilterCart}
                  disabled={filterCart.length === 0}
                  title="Clear all filters from chain"
                >
                  🗑️
                </button>
                <button 
                  className="btn btn-icon btn-accent"
                  onClick={() => setShowChainDialog(true)}
                  disabled={filterCart.length === 0}
                  title="Save as chain"
                >
                  💾
                </button>
                <button 
                  className="btn btn-icon btn-success"
                  onClick={() => setShowPresetDialog(true)}
                  disabled={filterCart.length === 0}
                  title="Save as preset"
                >
                  ⭐
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
    </div>
  );
};