import React from 'react';

interface FilterModeToggleProps {
  isAdvanced: boolean;
  onToggle: (isAdvanced: boolean) => void;
}

export const FilterModeToggle: React.FC<FilterModeToggleProps> = ({ isAdvanced, onToggle }) => {
  const handleBasicClick = () => {
    if (isAdvanced) {
      localStorage.setItem('filterModalAdvancedMode', 'false');
      onToggle(false);
    }
  };

  const handleAdvancedClick = () => {
    if (!isAdvanced) {
      localStorage.setItem('filterModalAdvancedMode', 'true');
      onToggle(true);
    }
  };

  return (
    <div className="filter-mode-toggle">
      <button 
        className={`controls-main-button ${!isAdvanced ? 'active' : ''}`}
        onClick={handleBasicClick}
      >
        Basic
      </button>
      <button 
        className={`controls-main-button ${isAdvanced ? 'active' : ''}`}
        onClick={handleAdvancedClick}
      >
        Advanced
      </button>
    </div>
  );
};