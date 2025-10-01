import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, Settings, Package, Building2, Menu, X, Mail, LogOut, User, Crown, Clock, Home, Bell } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../hooks/useTeam';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

type Page = 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'superadmin';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();
  const { hasPermission, getUserRoleInfo, getUsageLimits } = useTeam();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [userStatus, setUserStatus] = useState<string>('trial');
  const [isTeamMember, setIsTeamMember] = useState(false);

  const userRole = getUserRoleInfo();
  const usageLimits = getUsageLimits();

  // Vérifier si l'utilisateur est super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }
      
      // Vérifier si Supabase est configuré
      if (!isSupabaseConfigured()) {
        setIsSuperAdmin(false);
        setUserStatus('trial');
        setTrialDaysLeft(null);
        return;
      }
      

      try {
        console.log('🔍 Vérification statut utilisateur navbar pour:', user.email);
        
        // Vérifier d'abord si l'utilisateur est membre d'une équipe
        const { data: membershipData, error: membershipError } = await supabase
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        const isMember = !membershipError && membershipData?.owner_id;
        setIsTeamMember(isMember);
        
        if (isMember) {
          console.log('👥 Utilisateur est membre d\'équipe - pas d\'affichage des jours restants');
          setIsSuperAdmin(false);
          setUserStatus('active'); // Considérer comme actif
          setTrialDaysLeft(null);
          return;
        }
        
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin, subscription_status, trial_ends_at')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error || !data) {
          setIsSuperAdmin(false);
          setUserStatus('trial');
          setTrialDaysLeft(7); // Valeur par défaut
          return;
        }
        
        console.log('📊 Données utilisateur navbar:', data);
        
        setIsSuperAdmin(data?.is_super_admin === true);
        setUserStatus(data?.subscription_status || 'trial');
        




        if (data?.trial_ends_at && (data.subscription_status === 'trial' || data.subscription_status === 'active')) {
          const now = new Date();
          const endDate = new Date(data.trial_ends_at);
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, diffDays));
        } else {
          setTrialDaysLeft(null);
        }
      } catch (error) {
        setIsSuperAdmin(false);
        setTrialDaysLeft(null);
        setUserStatus('trial');
      }
    };
    
    checkSuperAdmin();
  }, [user]);

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: BarChart3, description: 'Vue d\'ensemble', color: 'from-blue-500 to-cyan-500' },
    { id: 'calendar' as Page, label: 'Planning', icon: Calendar, description: 'Réservations', color: 'from-purple-500 to-pink-500' },
    { id: 'services' as Page, label: 'Services', icon: Package, description: 'Gestion services', color: 'from-green-500 to-emerald-500' },
    { id: 'emails' as Page, label: 'Emails', icon: Mail, description: 'Workflows emails', color: 'from-orange-500 to-red-500' },
    { id: 'admin' as Page, label: 'Réglages', icon: Settings, description: 'Configuration', color: 'from-indigo-500 to-purple-500' },
  ];

  const handlePageChange = (page: Page) => {
    onPageChange(page);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  };

  // Fermer le menu mobile avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Empêcher le scroll du body quand le menu est ouvert
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Desktop & Mobile Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg safe-top mobile-optimized">
        <div className="safe-left safe-right">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    BookingFast
                  </h1>
                  <p className="text-xs text-gray-500">Gestion de réservations</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-base font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    BookingFast
                  </h1>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-2 xl:gap-3">
                {/* Trial Status */}
                {isSupabaseConfigured() && trialDaysLeft !== null && userStatus === 'trial' && (
                  <div className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md border ${
                    trialDaysLeft <= 2 
                      ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' 
                      : trialDaysLeft <= 5
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>
                      {trialDaysLeft === 0 ? 'Essai expiré' : 
                       trialDaysLeft === 1 ? '1 jour restant' : 
                       `${trialDaysLeft} jours restants`}
                    </span>
                  </div>
                )}

                {/* Navigation Items */}
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  const isAdminPage = item.id === 'admin';
                  
                  // Vérifier les permissions pour chaque onglet
                  const requiredPermission = {
                    dashboard: 'view_dashboard',
                    calendar: 'view_calendar', 
                    services: 'view_services',
                    emails: 'view_emails',
                    admin: 'view_admin'
                  }[item.id];
                  
                  if (requiredPermission && !hasPermission(requiredPermission)) {
                    return null; // Masquer l'onglet si pas de permission
                  }
                  
                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => {
                          handlePageChange(item.id);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 relative text-sm ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                        }`}
                      >
                        {isAdminPage && isSuperAdmin ? (
                          <div className="relative">
                            <Icon className="w-5 h-5" />
                            {/* Couronne dorée animée */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse">
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full animate-ping opacity-75"></div>
                            </div>
                          </div>
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                        <span>{item.label}</span>
                      </button>
                      
                    </div>
                  );
                })}

                {/* Notifications */}
                <NotificationCenter />
                
                {/* User Menu */}
                {isAuthenticated && user && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors group">
                      <div className={`w-8 h-8 bg-gradient-to-r ${userRole.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="max-w-32">
                        <div className="text-sm font-medium text-gray-700 truncate">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {userRole.name}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSignOut}
                      className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-red-200"
                      title="Se déconnecter"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile: Notifications + Menu Button */}
              <div className="lg:hidden flex items-center gap-2">
                <NotificationCenter />
                
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 sm:p-3 rounded-xl sm:rounded-2xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-300 transform hover:scale-110 shadow-md mobile-tap-target"
                  aria-label="Menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Slide from top */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
        isMobileMenuOpen ? 'visible' : 'invisible'
      }`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Menu Panel - Slide from top */}
        <div className={`absolute top-0 left-0 right-0 bg-white shadow-2xl transition-transform duration-300 ease-out safe-top safe-left safe-right ${
          isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}>
          {/* Header avec Safe Area */}
          <div className="gradient-primary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
            
            <div className="relative z-10 p-4 sm:p-6 pt-6 sm:pt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-white">BookingFast</h1>
                    <p className="text-white/80 text-xs sm:text-sm">Menu principal</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 sm:p-3 text-white hover:bg-white/20 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-lg mobile-tap-target"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* User Info */}
          {isAuthenticated && user && (
            <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${userRole.color} rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg`}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                    {userRole.name}
                    <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                      Niveau {userRole.level}
                    </span>
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm truncate">{user.email}</div>
                  {isSuperAdmin && (
                    <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold mt-1 shadow-md">
                      <Crown className="w-3 h-3" />
                      SUPER ADMIN
                    </div>
                  )}
                </div>
              </div>

              {/* Limites d'utilisation */}
              {!usageLimits.canCreateUnlimited && (
                <div className="bg-white border border-blue-300 rounded-xl p-3">
                  <div className="text-blue-800 text-sm font-medium mb-2">Vos limites:</div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-blue-700">
                    {usageLimits.maxBookingsPerDay && (
                      <div>📅 {usageLimits.maxBookingsPerDay} réservations/jour max</div>
                    )}
                    {usageLimits.maxServicesCreated && (
                      <div>🛍️ {usageLimits.maxServicesCreated} services max</div>
                    )}
                    {usageLimits.maxClientsCreated && (
                      <div>👥 {usageLimits.maxClientsCreated} clients max</div>
                    )}
                  </div>
                </div>
              )}

              {/* Trial Status Mobile */}
              {isSupabaseConfigured() && trialDaysLeft !== null && userStatus === 'trial' && !isTeamMember && (
                <div className={`px-3 sm:px-4 py-3 rounded-xl sm:rounded-2xl text-center shadow-lg ${
                  trialDaysLeft <= 2 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse'
                    : trialDaysLeft <= 5
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'gradient-primary text-white'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-bold text-base sm:text-lg">
                      {trialDaysLeft === 0 ? 'Essai expiré' : 
                       trialDaysLeft === 1 ? '1 jour restant' : 
                       `${trialDaysLeft} jours restants`}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm opacity-90">
                    Essai gratuit de 7 jours
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <div className="p-4 sm:p-6 space-y-2 sm:space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide">
            {/* Navigation principale */}
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const isAdminPage = item.id === 'admin';
              
              // Vérifier les permissions pour chaque onglet
              const requiredPermission = {
                dashboard: 'view_dashboard',
                calendar: 'view_calendar', 
                services: 'view_services',
                emails: 'view_emails',
                admin: 'view_admin'
              }[item.id];
              
              if (requiredPermission && !hasPermission(requiredPermission)) {
                return null; // Masquer l'onglet si pas de permission
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handlePageChange(item.id);
                  }}
                  className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg animate-slideDown relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-xl`
                      : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-blue-600 border border-gray-200'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg relative ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : `bg-gradient-to-r ${item.color} text-white`
                  }`}>
                    {isAdminPage && isSuperAdmin ? (
                      <div className="relative">
                        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                        {/* Couronne dorée pour Super Admin */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center animate-bounce">
                          <div className="w-1 h-1 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    ) : (
                      <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-base sm:text-lg">{item.label}</div>
                    {isAdminPage && isSuperAdmin && (
                      <div className="text-xs opacity-75 flex items-center gap-1">
                        <span>👑</span>
                        <span>Administration</span>
                      </div>
                    )}
                    <div className={`text-sm ${
                      isActive 
                        ? 'text-white/80' 
                        : 'text-gray-500'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse shadow-lg bg-white"></div>
                  )}
                </button>
              );
            })}


          </div>

          {/* Logout Button */}
          {isAuthenticated && (
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
