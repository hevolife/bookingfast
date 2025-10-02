import React, { useState } from 'react';
import { Calendar, LayoutDashboard, Settings, Briefcase, Mail, BarChart3, Users, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlugins } from '../../hooks/usePlugins';

interface NavbarProps {
  currentPage: 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'reports' | 'multi-user';
  onPageChange: (page: 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'reports' | 'multi-user') => void;
}

export function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const { signOut } = useAuth();
  const { userPlugins } = usePlugins();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavClick = (page: typeof currentPage) => {
    onPageChange(page);
    setIsMobileMenuOpen(false);
  };

  const hasReportsPlugin = userPlugins.some(p => p.plugin_slug === 'reports');
  const hasMultiUserPlugin = userPlugins.some(p => p.plugin_slug === 'multi-user');

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar' as const, label: 'Planning', icon: Calendar },
    { id: 'services' as const, label: 'Services', icon: Briefcase },
    { id: 'emails' as const, label: 'Emails', icon: Mail },
    ...(hasReportsPlugin ? [{ id: 'reports' as const, label: 'Rapports', icon: BarChart3 }] : []),
    ...(hasMultiUserPlugin ? [{ id: 'multi-user' as const, label: 'Multi-Utilisateurs', icon: Users }] : []),
    { id: 'admin' as const, label: 'Paramètres', icon: Settings }
  ];

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">BookingFast</span>
            </div>
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors ml-2"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Déconnexion
              </button>
            </div>
            <div className="flex items-center md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
