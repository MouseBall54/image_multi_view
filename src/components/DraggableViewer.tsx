import React, { useState, useRef, useCallback } from 'react';

interface DraggableViewerProps {
  position: number;
  children: React.ReactNode;
  onReorder: (fromPosition: number, toPosition: number) => void;
  className?: string;
}

// Global state to track which viewer is being dragged
let globalDragState: {
  isDragging: boolean;
  draggedPosition: number | null;
} = { isDragging: false, draggedPosition: null };

export const DraggableViewer: React.FC<DraggableViewerProps> = ({
  position,
  children,
  onReorder,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 8; // minimum pixels to start drag
  
  const updateGlobalDragState = useCallback((dragging: boolean, pos: number | null = null) => {
    globalDragState.isDragging = dragging;
    globalDragState.draggedPosition = pos;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if Shift is held and not already dragging
    if (!e.shiftKey || globalDragState.isDragging) return;
    
    // Prevent default to avoid text selection
    e.preventDefault();
    e.stopPropagation();
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return;
      
      const deltaX = moveEvent.clientX - dragStartPos.current.x;
      const deltaY = moveEvent.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > dragThreshold && !isDragging) {
        setIsDragging(true);
        updateGlobalDragState(true, position);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        // Add a class to body to indicate dragging state
        document.body.classList.add('viewer-dragging');
      }
    };
    
    const handleMouseUp = () => {
      dragStartPos.current = null;
      setIsDragging(false);
      setIsDropTarget(false);
      updateGlobalDragState(false, null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('viewer-dragging');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (globalDragState.isDragging && 
        globalDragState.draggedPosition !== position && 
        e.shiftKey) {
      setIsDropTarget(true);
    }
  };

  const handleMouseLeave = () => {
    setIsDropTarget(false);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (globalDragState.isDragging && 
        isDropTarget && 
        globalDragState.draggedPosition !== null && 
        globalDragState.draggedPosition !== position && 
        e.shiftKey) {
      onReorder(globalDragState.draggedPosition, position);
    }
  };

  return (
    <div
      className={`draggable-viewer ${className} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      style={{
        position: 'relative'
      }}
    >
      {children}
      
      {/* Visual feedback during drag */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-indicator">
            📦 Moving Viewer {position + 1}
          </div>
        </div>
      )}
      
      {/* Drop target indicator */}
      {isDropTarget && (
        <div className="drop-indicator">
          <div className="drop-zone">
            ⬇️ Insert Viewer {(globalDragState.draggedPosition ?? 0) + 1} here
          </div>
        </div>
      )}
    </div>
  );
};
