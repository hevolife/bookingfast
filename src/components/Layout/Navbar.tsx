import React, { useState } from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Briefcase,
  Mail,
  BarChart3,
  Package
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlugins } from '../../hooks/usePlugins';

type Page = 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'reports';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const { signOut, user } = useAuth();
  const { userPlugins } = usePlugins();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Vérifier si le plugin de rapports est activé
  const hasReportsPlugin = userPlugins.some(p => p.slug === 'advanced-reports');

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar' as Page, label: 'Planning', icon: Calendar },
    { id: 'services' as Page, label: 'Services', icon: Briefcase },
    { id: 'emails' as Page, label: 'Emails', icon: Mail },
    ...(hasReportsPlugin ? [{ id: 'reports' as Page, label: 'Rapports', icon: BarChart3 }] : []),
    { id: 'admin' as Page, label: 'Paramètres', icon: Settings }
  ];

  return (
    <>
      {/* Navbar Desktop */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  BookingFast
                </span>
              </div>
            </div>

            {/* Navigation Desktop */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.id === 'reports' && (
                      <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-bold rounded-full">
                        PLUGIN
                      </span>
                    )}
                  </button>
                );
              })}
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all duration-300"
              >
                <LogOut className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            </div>

            {/* Bouton menu mobile */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors mobile-tap-target"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl safe-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    BookingFast
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors mobile-tap-target"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 mobile-tap-target ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.id === 'reports' && (
                      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-bold rounded-full">
                        PLUGIN
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all duration-300 mobile-tap-target"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
