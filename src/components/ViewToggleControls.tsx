import React from 'react';
import { useStore } from '../store';

interface ViewToggleControlsProps {
  showControls: boolean;
  onToggleControls: () => void;
  className?: string;
}

export const ViewToggleControls: React.FC<ViewToggleControlsProps> = ({ 
  showControls, 
  onToggleControls, 
  className = '' 
}) => {
  const { showFilelist, setShowFilelist } = useStore();

  return (
    <div className={`view-toggle-controls ${className}`}>
      {/* Folder Controls Toggle */}
      <button
        onClick={onToggleControls}
        className={`toggle-btn folder-toggle ${!showControls ? 'active' : ''}`}
        title={`${showControls ? 'Hide' : 'Show'} folder controls`}
        aria-label={`${showControls ? 'Hide' : 'Show'} folder controls`}
      >
        <div className="toggle-icon">
          {showControls ? (
            // Folder open icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          ) : (
            // Folder closed icon  
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
            </svg>
          )}
        </div>
        <span className="toggle-label">
          {showControls ? 'Folders' : 'Folders'}
        </span>
      </button>

      {/* File List Toggle */}
      <button
        onClick={() => setShowFilelist(!showFilelist)}
        className={`toggle-btn file-toggle ${!showFilelist ? 'active' : ''}`}
        title={`${showFilelist ? 'Hide' : 'Show'} file list`}
        aria-label={`${showFilelist ? 'Hide' : 'Show'} file list`}
      >
        <div className="toggle-icon">
          {showFilelist ? (
            // File list visible icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="15" y2="17"/>
            </svg>
          ) : (
            // File list hidden icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="9" y1="13" x2="15" y2="13" opacity="0.3"/>
              <line x1="9" y1="17" x2="15" y2="17" opacity="0.3"/>
            </svg>
          )}
        </div>
        <span className="toggle-label">
          {showFilelist ? 'Files' : 'Files'}
        </span>
      </button>
      
      {/* Connection indicator */}
      <div className="toggle-connector" />
    </div>
  );
};