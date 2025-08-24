import React from 'react';
import { useStore } from '../store';

interface FilelistToggleProps {
  className?: string;
}

export const FilelistToggle: React.FC<FilelistToggleProps> = ({ className = '' }) => {
  const { showFilelist, setShowFilelist } = useStore();

  return (
    <button
      className={`filelist-toggle ${className}`}
      onClick={() => setShowFilelist(!showFilelist)}
      title={showFilelist ? 'Hide file list' : 'Show file list'}
      aria-label={showFilelist ? 'Hide file list' : 'Show file list'}
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {showFilelist ? (
          // Eye slash icon (hide)
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </>
        ) : (
          // Eye icon (show)
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </>
        )}
      </svg>
      <span className="filelist-toggle-text">
        {showFilelist ? 'Hide' : 'Show'} Files
      </span>
    </button>
  );
};