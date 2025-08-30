import React from 'react';
import Toast, { ToastMessage } from './Toast';
import { useStore } from '../store';

const ToastContainer: React.FC = () => {
  const toasts = useStore((state: any) => state.toasts);
  const removeToast = useStore((state: any) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((toast: ToastMessage) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
