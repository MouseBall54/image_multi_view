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
}> = ({ 
  isLoading, 
  isProcessing, 
  loadingText = 'Loading image...', 
  processingText = 'Processing filter...' 
}) => {
  if (!isLoading && !isProcessing) return null;

  return (
    <div className="image-loading-overlay">
      <div className="loading-content">
        <LoadingSpinner size={48} color="#4A90E2" />
        <div className="loading-text">
          {isLoading ? loadingText : processingText}
        </div>
      </div>
    </div>
  );
};