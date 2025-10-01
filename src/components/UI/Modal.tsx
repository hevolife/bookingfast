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
        {/* Header avec design amélioré */}
        <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top">
          {/* Fond dégradé principal */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>
          
          {/* Effet de brillance animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
          
          {/* Motif de points décoratifs */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          
          {/* Contenu du header */}
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              {/* Titre avec icône décorative */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1 pr-2">
                <div className="hidden sm:flex w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl items-center justify-center shadow-lg">
                  <div className="w-6 h-6 bg-white rounded-lg"></div>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white drop-shadow-lg">
                    {title}
                  </h2>
                  <div className="h-1 w-16 bg-white/40 rounded-full mt-2 hidden sm:block"></div>
                </div>
              </div>
              
              {/* Bouton de fermeture amélioré */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="group relative p-2 sm:p-3 text-white hover:bg-white/20 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 mobile-tap-target flex-shrink-0 backdrop-blur-sm"
                  aria-label="Fermer"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <X className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                </button>
              )}
            </div>
          </div>
          
          {/* Bordure inférieure décorative */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 touch-action-pan-y modal-safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}
