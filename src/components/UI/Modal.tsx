import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  showCloseButton = true
}: ModalProps) {
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[100vw] sm:max-w-[95vw]'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn overflow-hidden mobile-optimized modal-container">
      <div 
        className="fixed inset-0 touch-action-none" 
        onClick={onClose}
      />
      
      <div className={`bg-white w-full ${sizeClasses[size]} modal-height-safe sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp relative z-10 touch-action-pan-y overscroll-behavior-none modal-content`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 sm:p-6 sm:rounded-t-3xl relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-2xl font-bold text-white pr-2">{title}</h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 sm:p-3 text-white hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-110 mobile-tap-target flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 touch-action-pan-y modal-safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}