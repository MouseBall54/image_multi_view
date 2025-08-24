import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useFolderPickers } from '../hooks/useFolderPickers';
import { ImageCanvas, ImageCanvasHandle } from '../components/ImageCanvas';
import { FolderControl } from '../components/FolderControl';
import { ALL_FILTERS } from '../components/FilterControls';
import type { FolderKey, FilterType } from '../types';

type DrawableImage = ImageBitmap | HTMLImageElement;

export interface SingleModeHandle {
  capture: (options: { showLabels: boolean; showMinimap: boolean }) => Promise<string | null>;
}

interface SingleModeProps {
  bitmapCache: React.MutableRefObject<Map<string, DrawableImage>>;
  setPrimaryFile: (file: File | null) => void;
  showControls: boolean;
}

// Helper: basic image type guard
const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/svg+xml', 'image/tiff', 'image/tif'
  ];
  return validTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif)$/i.test(file.name);
};

export const SingleMode = forwardRef<SingleModeHandle, SingleModeProps>(({ bitmapCache, setPrimaryFile, showControls }, ref) => {
  const FOLDER_KEYS: FolderKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const { pick, inputRefs, onInput, updateAlias, allFolders } = useFolderPickers();
  const { openFilterEditor, viewerFilters, selectedViewers, setSelectedViewers, toggleModalOpen, openToggleModal, setFolder, addToast, clearFolder, setCurrent, showFilelist } = useStore();

  // Selected file state for Single mode
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSourceKey, setSelectedSourceKey] = useState<FolderKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderKey | 'all'>('all');

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverCounter, setDragOverCounter] = useState(0);
  const [draggedFileCount, setDraggedFileCount] = useState(0);
  React.useEffect(() => {}, [dragOverCounter]);

  const canvasRef = useRef<ImageCanvasHandle>(null);

  useEffect(() => {
    setPrimaryFile(selectedFile);
  }, [selectedFile, setPrimaryFile]);

  // Capture implementation (single viewer)
  React.useImperativeHandle(ref, () => ({
    capture: async ({ showLabels, showMinimap }) => {
      const handle = canvasRef.current;
      if (!handle) return null;
      const canvas = handle.getCanvas();
      if (!canvas) return null;
      const { width, height } = canvas;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      handle.drawToContext(tempCtx, false, showMinimap);

      if (showLabels) {
        const ctx = tempCtx;
        const lines: string[] = [];
        if (selectedSourceKey) {
          const alias = allFolders[selectedSourceKey]?.alias || selectedSourceKey;
          lines.push(alias);
        }
        if (selectedFile) {
          lines.push(selectedFile.name);
        }
        const filterName = getFilterName(selectedSourceKey ? viewerFilters[selectedSourceKey] : undefined);
        if (filterName) lines.push(`[${filterName}]`);
        ctx.font = '16px sans-serif';
        const lineHeight = 20;
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, maxWidth + 10, lines.length * lineHeight);
        ctx.fillStyle = 'white';
        lines.forEach((line, i) => ctx.fillText(line, 10, 22 + (i * (lineHeight - 4))));
      }
      return tempCanvas.toDataURL('image/png');
    }
  }));

  const findEmptyFolder = (): FolderKey | null => {
    for (const key of FOLDER_KEYS) {
      if (!allFolders[key]) return key;
    }
    return null;
  };

  const createTemporaryFolder = async (folderKey: FolderKey, imageFiles: File[]): Promise<void> => {
    try {
      const fileMap = new Map<string, File>();
      imageFiles.forEach(file => fileMap.set(file.name, file));
      const folderData = { name: `Temporary ${folderKey}` , files: fileMap, path: '' };
      const folderState = { data: folderData, alias: `Temp ${folderKey} (${imageFiles.length})` };
      setFolder(folderKey, folderState);
      // Auto-select first file
      const first = imageFiles[0];
      if (first) {
        handleFileSelect(first, folderKey);
      }
      addToast?.({ type: 'success', title: 'Images Added', message: `Created temporary folder ${folderKey}`, details: [`Added ${imageFiles.length} image(s)`], duration: 5000 });
    } catch (error) {
      addToast?.({ type: 'error', title: 'Failed to Create Temporary Folder', message: `Could not create folder ${folderKey}`, details: [error instanceof Error ? error.message : 'Unknown error'], duration: 5000 });
    }
  };

  // DnD handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverCounter(prev => prev + 1);
    if (e.dataTransfer.items) {
      let count = 0;
      for (let i = 0; i < e.dataTransfer.items.length; i++) if (e.dataTransfer.items[i].kind === 'file') count++;
      if (count > 0) { setIsDragOver(true); setDraggedFileCount(count); }
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverCounter(prev => { const v = prev - 1; if (v <= 0) { setIsDragOver(false); setDraggedFileCount(0); return 0; } return v; });
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false); setDragOverCounter(0); setDraggedFileCount(0);
    const files = Array.from(e.dataTransfer.files).filter(isValidImageFile);
    if (files.length === 0) { addToast?.({ type:'warning', title:'No Valid Images', message:'Drop image files (JPG, PNG, GIF, WebP, BMP, SVG, TIFF)', duration: 5000 }); return; }
    const emptyFolder = findEmptyFolder();
    if (emptyFolder) {
      await createTemporaryFolder(emptyFolder, files);
    } else {
      // If no folder available, just pick the first file for viewing
      handleFileSelect(files[0], FOLDER_KEYS[0]);
    }
  };

  // Build file list like analysis/pinpoint: aggregated files with folder filter
  const fileList = useMemo(() => {
    const items: { file: File, source: string, folderKey: FolderKey }[] = [];
    const add = (key: FolderKey) => {
      const folderState = allFolders[key];
      if (folderState?.data.files) {
        const alias = folderState.alias || key;
        folderState.data.files.forEach(file => items.push({ file, source: alias, folderKey: key }));
      }
    };
    if (folderFilter === 'all') { FOLDER_KEYS.forEach(k => allFolders[k] && add(k)); }
    else add(folderFilter);
    return items.sort((a, b) => a.file.name.localeCompare(b.file.name));
  }, [folderFilter, allFolders]);

  const filteredList = useMemo(() => {
    if (!searchQuery) return fileList;
    return fileList.filter(({ file }) => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [fileList, searchQuery]);

  const getFilterName = (type: FilterType | undefined) => {
    if (!type || type === 'none') return null;
    if (type === 'filterchain') return 'custom filter';
    return ALL_FILTERS.find(f => f.type === type)?.name || 'custom filter';
  };

  const handleFileSelect = (file: File, sourceKey: FolderKey) => {
    setSelectedFile(file);
    setSelectedSourceKey(sourceKey);

    // Populate global 'current' to enable preview/toggle compatibility
    try {
      const filename = file.name;
      const base = filename.replace(/\.[^/.]+$/, '');
      const has: Record<FolderKey, boolean> = {} as any;
      for (const k of Object.keys(allFolders) as FolderKey[]) {
        const folderState = allFolders[k];
        const files: Map<string, File> | undefined = folderState?.data?.files;
        let present = false;
        if (files) {
          present = files.has(filename);
          if (!present) {
            for (const name of files.keys()) {
              const nb = name.replace(/\.[^/.]+$/, '');
              if (nb === base) { present = true; break; }
            }
          }
        }
        has[k] = present;
      }
      setCurrent({ filename, has });
    } catch {
      setCurrent(null);
    }
  };

  // Toggle modal support (mostly inert for single viewer, but kept consistent)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !toggleModalOpen && selectedViewers.length > 0 && selectedFile) {
        e.preventDefault();
        openToggleModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleModalOpen, selectedViewers.length, selectedFile, openToggleModal]);

  const gridStyle = { '--cols': 1, '--rows': 1 } as React.CSSProperties;

  return (
    <>
      {showControls && (
        <div className="controls">
          {FOLDER_KEYS.slice(0, 1).map(key => (
            <FolderControl
              key={key}
              folderKey={key}
              folderState={allFolders[key]}
              onSelect={pick}
              onClear={clearFolder}
              onUpdateAlias={updateAlias}
            />
          ))}
          <div style={{ display: 'none' }}>
            {FOLDER_KEYS.map(key => (
              <input key={key} ref={inputRefs[key]} type="file" webkitdirectory="" multiple onChange={(e) => onInput(key, e)} />
            ))}
          </div>
        </div>
      )}
      <main className={`compare-mode-main ${showFilelist ? '' : 'filelist-hidden'}`}>
        {showFilelist && (
          <aside
            className={`filelist ${isDragOver ? 'drag-over' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
          {isDragOver && (
            <div className="drag-overlay">
              <div className="drag-overlay-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                <h3>{draggedFileCount > 1 ? `Drop ${draggedFileCount} Images` : 'Drop Image'}</h3>
                <p>{(() => { const empty = findEmptyFolder(); return empty ? `Create folder ${empty} with ${draggedFileCount} image(s)` : 'No empty folders available'; })()}</p>
              </div>
            </div>
          )}

          <div className="filelist-header">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={Object.keys(allFolders).length === 0}
            />
            <div className="filelist-options">
              <div className="count">Files: {filteredList.length}</div>
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value as FolderKey | 'all')}>
                <option value="all">All Folders</option>
                {FOLDER_KEYS.map(key => allFolders[key] && (
                  <option key={key} value={key}>Folder {allFolders[key]?.alias || key}</option>
                ))}
              </select>
            </div>
          </div>
          <ul>
            {filteredList.length === 0 && !isDragOver ? (
              <li className="empty-state">
                <div className="empty-state-content">
                  <p>No files</p>
                  <small>Drop images here or select a folder</small>
                </div>
              </li>
            ) : (
              filteredList.map(({ file, source, folderKey }) => (
                <li key={`${source}-${file.name}`}
                    className={selectedFile?.name === file.name ? 'active' : ''}
                    onClick={() => handleFileSelect(file, folderKey)}>
                  {file.name}
                </li>
              ))
            )}
          </ul>
          </aside>
        )}
        <section className="viewers" style={gridStyle}>
          {!selectedFile ? (
            <div className="analysis-mode-placeholder--inline">
              <p>Select a folder and choose an image to begin.</p>
            </div>
          ) : (
            <div className="viewer-container">
              <ImageCanvas
                ref={canvasRef}
                label={[selectedSourceKey ? (allFolders[selectedSourceKey]?.alias || selectedSourceKey) : '', selectedFile?.name || '', (() => { const n = getFilterName(selectedSourceKey ? viewerFilters[selectedSourceKey] : undefined); return n ? `[${n}]` : ''; })()].filter(Boolean).join('\n')}
                file={selectedFile || undefined}
                cache={bitmapCache.current}
                appMode="compare"
                folderKey={selectedSourceKey || 'A'}
              />
              <div className="viewer-controls">
                {selectedSourceKey && (
                  <button
                    className="viewer__filter-button"
                    title={`Filter Settings for ${allFolders[selectedSourceKey]?.alias || selectedSourceKey}`}
                    onClick={() => openFilterEditor(selectedSourceKey)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"></line>
                      <line x1="4" y1="10" x2="4" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12" y2="3"></line>
                      <line x1="20" y1="21" x2="20" y2="16"></line>
                      <line x1="20" y1="12" x2="20" y2="3"></line>
                      <line x1="1" y1="14" x2="7" y2="14"></line>
                      <line x1="9" y1="8" x2="15" y2="8"></line>
                      <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
});

SingleMode.displayName = 'SingleMode';
