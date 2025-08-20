import React, { useState } from 'react';
import type { FolderKey } from '../types';
import { FolderState } from '../store';

interface FolderControlProps {
  folderKey: FolderKey;
  folderState: FolderState | undefined;
  onSelect: (key: FolderKey) => void;
  onClear: (key: FolderKey) => void;
  onUpdateAlias: (key: FolderKey, alias: string) => void;
}

export const FolderControl: React.FC<FolderControlProps> = ({ folderKey, folderState, onSelect, onClear, onUpdateAlias }) => {
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
        {folderState.data.files.size} files
      </div>
      <div className="folder-actions">
        <button onClick={() => onSelect(folderKey)} title="Change Folder">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M12 11v6"></path><path d="m15 14-3 3-3-3"></path></svg>
        </button>
        <button onClick={() => onClear(folderKey)} title="Clear Folder">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
};
