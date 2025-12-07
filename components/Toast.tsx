import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Icons } from './Icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const iconMap = {
    success: <Icons.CheckCircle size={20} />,
    error: <Icons.X size={20} />,
    info: <Icons.Info size={20} />,
    warning: <Icons.AlertCircle size={20} />
  };

  const colorMap = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  const bgLightMap = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200'
  };

  const textMap = {
    success: 'text-emerald-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800'
  };

  return (
    <div 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${bgLightMap[toast.type]} animate-slide-in-right backdrop-blur-sm`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={`p-1 rounded-full ${colorMap[toast.type]} text-white flex-shrink-0 animate-scale-in`}>
        {iconMap[toast.type]}
      </div>
      <p className={`flex-1 text-sm font-medium ${textMap[toast.type]}`}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        aria-label="Fermer la notification"
      >
        <Icons.X size={16} />
      </button>
    </div>
  );
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts(prev => [...prev.slice(-4), { id, message, type }]); // Max 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error', 6000), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning', 5000), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          <div className="flex flex-col gap-2 pointer-events-auto">
            {toasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
