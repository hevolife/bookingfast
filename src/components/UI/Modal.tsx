import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
      <div className={`bg-white w-full ${sizeClasses[size]} max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content`}>
        <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-bold text-white drop-shadow-lg flex-1 pr-2">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="group relative p-1.5 sm:p-3 text-white hover:bg-white/20 rounded-lg sm:rounded-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 mobile-tap-target flex-shrink-0 backdrop-blur-sm"
                aria-label="Fermer"
              >
                <div className="absolute inset-0 bg-white/10 rounded-lg sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <X className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        </div>
        <div className="modal-body p-4 sm:p-6 modal-safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}
