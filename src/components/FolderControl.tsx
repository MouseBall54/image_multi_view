import React, { useState } from 'react';
import type { FolderKey } from '../types';
import { FolderState } from '../store';

interface FolderControlProps {
  folderKey: FolderKey;
  folderState: FolderState | undefined;
  onSelect: (key: FolderKey) => void;
  onClear: (key: FolderKey) => void;
  onUpdateAlias: (key: FolderKey, alias: string) => void;
  onRescan?: (key: FolderKey) => void;
}

export const FolderControl: React.FC<FolderControlProps> = ({ folderKey, folderState, onSelect, onClear, onUpdateAlias, onRescan }) => {
  const [isEditingAlias, setIsEditingAlias] = useState(false);

  const handleAliasUpdate = (newAlias: string) => {
    if (newAlias.trim() && newAlias.trim() !== folderState?.alias) {
      onUpdateAlias(folderKey, newAlias.trim());
    }
    setIsEditingAlias(false);
  };

  if (!folderState) {
    return (
      <div className="folder-control-card unloaded">
        <div className="folder-control-header">
          <span className="folder-key-label">{folderKey}</span>
        </div>
        <button className="folder-select-button" onClick={() => onSelect(folderKey)}>
          Select Folder
        </button>
      </div>
    );
  }

  return (
    <div className="folder-control-card loaded">
      <div className="folder-control-header">
        <span className="folder-key-label">{folderKey}</span>
        {isEditingAlias ? (
          <input
            type="text"
            defaultValue={folderState.alias}
            onBlur={(e) => handleAliasUpdate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAliasUpdate((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setIsEditingAlias(false);
            }}
            className="alias-input"
            autoFocus
          />
        ) : (
          <span className="folder-name" title={folderState.alias} onDoubleClick={() => setIsEditingAlias(true)}>
            {folderState.alias.length > 4 ? `${folderState.alias.slice(0, 4)}...` : folderState.alias}
          </span>
        )}
      </div>
      <div className="folder-path" title={folderState.data.name}>
        <span className="folder-path-text">{folderState.data.files.size} files</span>
        {folderState.data.source?.kind === 'picker' && onRescan && (
          <button className="folder-rescan-button" onClick={() => onRescan(folderKey)} title="Rescan Folder">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M21 12a9 9 0 0 0-15-6.7L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7L21 16"></path></svg>
          </button>
        )}
      </div>
      <div className="folder-actions">
        <button className="folder-change-button" onClick={() => onSelect(folderKey)} title="Change Folder">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="m15 14-3 3-3-3"></path></svg>
        </button>
        <button className="folder-clear-button" onClick={() => onClear(folderKey)} title="Clear Folder">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
};
