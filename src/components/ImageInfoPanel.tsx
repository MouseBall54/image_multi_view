import React from 'react';

type Props = {
  file: File | undefined;
  dimensions: { width: number; height: number } | null;
  onClose: () => void;
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const ImageInfoPanel: React.FC<Props> = ({ file, dimensions, onClose }) => {
  if (!file || !dimensions) {
    return (
        <div className="info-panel">
            <button onClick={onClose} className="close-btn">&times;</button>
            <h3>Image Information</h3>
            <p>No image selected or data available.</p>
        </div>
    );
  }

  return (
    <div className="info-panel">
      <button onClick={onClose} className="close-btn">&times;</button>
      <h3>Image Information</h3>
      <ul>
        <li><strong>Filename:</strong> {file.name}</li>
        <li><strong>Dimensions:</strong> {dimensions.width}px &times; {dimensions.height}px</li>
        <li><strong>File Size:</strong> {formatBytes(file.size)}</li>
      </ul>
    </div>
  );
};
