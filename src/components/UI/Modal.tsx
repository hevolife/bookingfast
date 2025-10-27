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
    xl: 'max-w-6xl'
  };

  return (
    <>
      {/* Desktop: Modal centré avec overlay */}
      <div className="hidden sm:block fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />
          
          <div className={`relative bg-white rounded-2xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto animate-slideUp`}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Modal plein écran SOUS la navbar - CONTRAINTE GLOBALE */}
      <div className="sm:hidden fixed inset-0 z-40 modal-container-mobile">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
          style={{ zIndex: 40 }}
        />
        
        {/* Modal content - COMMENCE À 80px (SOUS LA NAVBAR) */}
        <div 
          className="fixed left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl animate-slideUp modal-content-mobile"
          style={{ 
            top: '80px',
            zIndex: 45
          }}
        >
          {/* Header sticky */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-4 flex items-center justify-between rounded-t-2xl z-10 modal-header-mobile">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Body scrollable avec padding bottom pour les boutons */}
          <div className="overflow-y-auto modal-body" style={{ 
            height: 'calc(100% - 60px)',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '120px'
          }}>
            <div className="p-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
