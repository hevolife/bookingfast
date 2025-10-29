import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { isPWA } from '../../utils/pwaDetection';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  headerGradient?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'lg', headerGradient }: ModalProps) {
  const [isPWAMode, setIsPWAMode] = React.useState(false);
  const [navbarHeight, setNavbarHeight] = React.useState(64);

  useEffect(() => {
    setIsPWAMode(isPWA());
    
    // Calculer la hauteur réelle de la navbar
    const navbar = document.querySelector('nav');
    if (navbar) {
      const height = navbar.offsetHeight;
      setNavbarHeight(height);
      console.log('📏 Navbar height:', height);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };
  
  // Gradient par défaut si non spécifié
  const defaultGradient = 'from-purple-600 via-pink-600 to-indigo-600';
  const gradient = headerGradient || defaultGradient;

  return (
    <>
      {/* Desktop Modal - CENTRÉ */}
      <div className="hidden sm:flex fixed inset-0 bg-black/60 backdrop-blur-sm items-center justify-center z-50 animate-fadeIn p-4">
        <div className={`bg-white w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl transform animate-slideUp`}>
          {/* Header avec gradient personnalisable */}
          <div className={`bg-gradient-to-r ${gradient} p-6 rounded-t-3xl relative overflow-hidden sticky top-0 z-10`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-white hover:bg-white/20 rounded-xl transition-all duration-300 transform hover:scale-110"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Modal - COLLÉ SOUS LA NAVBAR */}
      <div className="sm:hidden fixed inset-0 z-50">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          style={{ zIndex: 40 }}
        />
        
        <div 
          className="fixed left-0 right-0 bottom-0 bg-white shadow-2xl animate-slideUp flex flex-col"
          style={{ 
            top: `${navbarHeight}px`,
            zIndex: 45,
            maxHeight: `calc(100vh - ${navbarHeight}px)`,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0
          }}
        >
          {/* Header sticky avec gradient personnalisable - SANS RADIUS sur mobile */}
          <div 
            className={`flex-shrink-0 bg-gradient-to-r ${gradient} p-4 relative overflow-hidden sticky top-0 z-10`}
            style={{
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-all duration-300 transform hover:scale-110 mobile-tap-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content scrollable */}
          <div className="flex-1 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
