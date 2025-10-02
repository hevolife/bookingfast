import React, { useState, useEffect } from 'react';
import { Calendar, Settings, LayoutDashboard, Package, Mail, BarChart3, Users, ShoppingCart, LogOut, Menu, X, ChevronDown, ChevronRight, Puzzle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlugins } from '../../hooks/usePlugins';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: any) => void;
}

export function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const { signOut } = useAuth();
  const { userPlugins, loading } = usePlugins();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pluginsMenuOpen, setPluginsMenuOpen] = useState(false);

  useEffect(() => {
    console.log('🔍 Navbar - Plugins utilisateur:', userPlugins);
    console.log('🔍 Navbar - Loading:', loading);
  }, [userPlugins, loading]);

  const hasReportsAccess = userPlugins.some(p => p.plugin_slug === 'reports');
  const hasMultiUserAccess = userPlugins.some(p => p.plugin_slug === 'multi-user');
  const hasPOSAccess = userPlugins.some(p => p.plugin_slug === 'pos');

  const coreNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-purple-500 to-pink-500' },
    { id: 'calendar', label: 'Calendrier', icon: Calendar, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'services', label: 'Services', icon: Package, gradient: 'from-green-500 to-emerald-500' },
    { id: 'emails', label: 'Emails', icon: Mail, gradient: 'from-orange-500 to-red-500' }
  ];

  const pluginNavItems = [
    ...(hasReportsAccess ? [{ id: 'reports', label: 'Rapports', icon: BarChart3, gradient: 'from-indigo-500 to-purple-500' }] : []),
    ...(hasMultiUserAccess ? [{ id: 'multi-user', label: 'Multi-Utilisateurs', icon: Users, gradient: 'from-pink-500 to-rose-500' }] : []),
    ...(hasPOSAccess ? [{ id: 'pos', label: 'POS', icon: ShoppingCart, gradient: 'from-cyan-500 to-blue-500' }] : [])
  ];

  const hasPlugins = pluginNavItems.length > 0;
  const isPluginPageActive = pluginNavItems.some(item => item.id === currentPage);

  const handlePluginsToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPluginsMenuOpen(!pluginsMenuOpen);
  };

  const handleNavigation = (pageId: string) => {
    onPageChange(pageId);
    setMobileMenuOpen(false);
    setPluginsMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm navbar-safe">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                BookingFast
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              {coreNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {hasPlugins && (
                <div className="relative">
                  <button
                    onClick={handlePluginsToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      isPluginPageActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Puzzle className="w-5 h-5" />
                    <span>Plugins</span>
                    {pluginsMenuOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {pluginsMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                      {pluginNavItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onPageChange(item.id);
                              setPluginsMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 font-medium transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => onPageChange('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  currentPage === 'admin'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Paramètres</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={signOut}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-blue-900/95 backdrop-blur-md animate-fadeIn safe-all">
          <div className="h-full overflow-y-auto p-6 pt-20">
            <div className="max-w-md mx-auto space-y-3">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">BookingFast</h2>
                <p className="text-purple-200 text-sm">Gestion de réservations</p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-purple-200 uppercase tracking-wider px-4 mb-3">
                  Menu Principal
                </div>
                {coreNavItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium transition-all transform hover:scale-105 animate-slideUp ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-2xl'
                          : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive
                          ? `bg-gradient-to-r ${item.gradient}`
                          : 'bg-white/20'
                      }`}>
                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold">{item.label}</div>
                        <div className={`text-xs ${isActive ? 'text-gray-500' : 'text-purple-200'}`}>
                          {item.id === 'dashboard' && 'Vue d\'ensemble'}
                          {item.id === 'calendar' && 'Gérer les RDV'}
                          {item.id === 'services' && 'Vos prestations'}
                          {item.id === 'emails' && 'Communication'}
                        </div>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {hasPlugins && (
                <div className="space-y-2 mt-6">
                  <div className="text-xs font-bold text-purple-200 uppercase tracking-wider px-4 mb-3 flex items-center gap-2">
                    <Puzzle className="w-4 h-4" />
                    Extensions
                  </div>
                  <button
                    onClick={handlePluginsToggle}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium transition-all transform hover:scale-105 ${
                      isPluginPageActive
                        ? 'bg-white text-gray-900 shadow-2xl'
                        : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isPluginPageActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                        : 'bg-white/20'
                    }`}>
                      <Puzzle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold">Plugins</div>
                      <div className={`text-xs ${isPluginPageActive ? 'text-gray-500' : 'text-purple-200'}`}>
                        {pluginNavItems.length} extension(s)
                      </div>
                    </div>
                    <div className="transition-transform duration-300" style={{ transform: pluginsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>

                  {pluginsMenuOpen && (
                    <div className="ml-4 space-y-2 animate-slideDown">
                      {pluginNavItems.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium transition-all transform hover:scale-105 animate-slideUp ${
                              isActive
                                ? 'bg-white text-gray-900 shadow-2xl'
                                : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isActive
                                ? `bg-gradient-to-r ${item.gradient}`
                                : 'bg-white/20'
                            }`}>
                              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white'}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-bold text-sm">{item.label}</div>
                            </div>
                            {isActive && (
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 animate-pulse"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 mt-6">
                <div className="text-xs font-bold text-purple-200 uppercase tracking-wider px-4 mb-3">
                  Paramètres
                </div>
                <button
                  onClick={() => handleNavigation('admin')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium transition-all transform hover:scale-105 ${
                    currentPage === 'admin'
                      ? 'bg-white text-gray-900 shadow-2xl'
                      : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    currentPage === 'admin'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                      : 'bg-white/20'
                  }`}>
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold">Paramètres</div>
                    <div className={`text-xs ${currentPage === 'admin' ? 'text-gray-500' : 'text-purple-200'}`}>
                      Configuration
                    </div>
                  </div>
                  {currentPage === 'admin' && (
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse"></div>
                  )}
                </button>
              </div>

              <div className="pt-6 mt-6 border-t border-white/20">
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl font-medium bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-2xl"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <LogOut className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold">Déconnexion</div>
                    <div className="text-xs text-red-100">Quitter l'application</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
