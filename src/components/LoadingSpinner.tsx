import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  color = '#ffffff', 
  className = '' 
}) => {
  return (
    <div 
      className={`loading-spinner ${className}`}
      style={{
        width: size,
        height: size,
        border: `3px solid rgba(255, 255, 255, 0.2)`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
  );
};

export const ImageLoadingOverlay: React.FC<{ 
  isLoading: boolean; 
  isProcessing: boolean;
  loadingText?: string;
  processingText?: string;
  currentFilterName?: string;
  filterProgress?: { current: number; total: number };
}> = ({ 
  isLoading, 
  isProcessing, 
  loadingText = 'Loading image...', 
  processingText = 'Processing filter...',
  currentFilterName = '',
  filterProgress = { current: 0, total: 0 }
}) => {
  if (!isLoading && !isProcessing) return null;

  const showProgress = isProcessing && filterProgress.total > 0;
  const progressText = showProgress && filterProgress.total > 1 
    ? `${filterProgress.current}/${filterProgress.total}` 
    : '';

  return (
    <div className="image-loading-overlay">
      <div className="loading-content">
        <LoadingSpinner size={48} color="#4A90E2" />
        <div className="loading-text">
          {isLoading ? loadingText : processingText}
        </div>
        {isProcessing && currentFilterName && (
          <div className="filter-name">
            {currentFilterName}
          </div>
        )}
        {showProgress && (
          <div className="filter-progress">
            {progressText}
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: filterProgress.total > 0 ? `${(filterProgress.current / filterProgress.total) * 100}%` : '0%' 
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};