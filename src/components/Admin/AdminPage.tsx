import React, { useState } from 'react';
import { Settings, Building2, Palette, Clock, Euro, Mail, CreditCard, Users, Shield, Crown, Key, Sparkles, BarChart3, ExternalLink, UserPlus } from 'lucide-react';
import { Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../hooks/useTeam';
import { BusinessSettingsForm } from './BusinessSettingsForm';
import { SubscriptionStatus } from './SubscriptionStatus';
import { AffiliateManagement } from './AffiliateManagement';
import { IframeSettings } from './IframeSettings';
import { TeamManagement } from './TeamManagement';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export function AdminPage() {
  const { user } = useAuth();
  const { isOwner } = useTeam();
  const [activeTab, setActiveTab] = useState<'settings' | 'subscription' | 'affiliate' | 'iframe' | 'team'>('settings');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Vérifier si l'utilisateur est super admin
  React.useEffect(() => {
    const checkSuperAdmin = async () => {
      setCheckingAdmin(true);
      if (!user || !isSupabaseConfigured()) {
        console.log('🔍 Pas d\'utilisateur ou Supabase non configuré - pas de super admin');
        setIsSuperAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      
      try {
        console.log('🔍 Vérification statut super admin pour:', user.email);
        const { data, error } = await supabase
          .from('users')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle();
        
        console.log('📊 Résultat requête super admin:', { data, error });
        
        if (!error && data) {
          const isAdmin = data.is_super_admin === true;
          console.log('✅ Statut super admin déterminé:', isAdmin);
          setIsSuperAdmin(isAdmin);
        } else {
          console.log('❌ Erreur ou pas de données:', error);
          setIsSuperAdmin(data?.is_super_admin === true);
        }
      } catch (error) {
        console.error('❌ Erreur vérification super admin:', error);
        setIsSuperAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    
    checkSuperAdmin();
  }, [user]);

  // Vérifier les permissions d'accès
  // Removed permission check - all authenticated users can access admin

  const tabs = [
    { 
      id: 'settings', 
      label: 'Paramètres', 
      icon: Settings, 
      description: 'Configuration générale'
    },
    { 
      id: 'subscription', 
      label: 'Abonnement', 
      icon: Crown, 
      description: 'Statut et codes secrets'
    },
    { 
      id: 'affiliate', 
      label: 'Affiliation', 
      icon: Share2, 
      description: 'Programme de parrainage'
    },
    { 
      id: 'iframe', 
      label: 'Iframe', 
      icon: ExternalLink, 
      description: 'Lien de réservation'
    },
  ];

  // Ajouter l'onglet Équipe seulement pour les propriétaires
  if (isOwner) {
    tabs.push({
      id: 'team', 
      label: 'Équipe', 
      icon: UserPlus, 
      description: 'Gestion des membres'
    });
  }

  // Ajouter l'onglet Super Admin si l'utilisateur est super admin
  if (isSuperAdmin && !checkingAdmin) {
    console.log('👑 Ajout de l\'onglet Super Admin');
    tabs.push({
      id: 'superadmin',
      label: 'Super Admin',
      icon: Crown,
      description: 'Administration globale'
    });
  }

  console.log('📋 Onglets disponibles:', tabs.map(t => t.label));
  console.log('👑 Super admin status:', { isSuperAdmin, checkingAdmin, userEmail: user?.email });

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <BusinessSettingsForm />;
      case 'subscription':
        return <SubscriptionStatus />;
      case 'affiliate':
        return <AffiliateManagement />;
      case 'iframe':
        return <IframeSettings />;
      case 'team':
        return <TeamManagement />;
      case 'superadmin':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-purple-800">Super Administration</h2>
                  <p className="text-purple-600">Accès aux fonctionnalités d'administration globale</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-purple-300">
                <p className="text-purple-700 mb-4">
                  En tant que Super Admin, vous avez accès à la gestion complète de la plateforme.
                </p>
                
                <button
                  onClick={() => window.open('/superadmin', '_blank')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-bold flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Ouvrir le Panel Super Admin
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-blue-800 mb-2">Gestion Utilisateurs</h3>
                <p className="text-blue-600 text-sm">Créer, modifier et supprimer des utilisateurs</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-green-800 mb-2">Codes d'Accès</h3>
                <p className="text-green-600 text-sm">Créer et gérer les codes secrets</p>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-orange-800 mb-2">Statistiques</h3>
                <p className="text-orange-600 text-sm">Analytics et métriques globales</p>
              </div>
            </div>
          </div>
        );
      default:
        return <BusinessSettingsForm />;
    }
  };



  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mobile-optimized">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Administration
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Gérez les paramètres de votre compte</p>
      {/* Navigation */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-lg w-full sm:w-fit overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="text-left hidden sm:block">
                <div className="font-bold">{tab.label}</div>
                <div className="text-xs opacity-75 hidden lg:block">{tab.description}</div>
              </div>
              <div className="sm:hidden font-bold text-xs">{tab.label}</div>
              {tab.id === 'superadmin' && (
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
              )}
            </button>
          ))}
        </div>
      </div>
      </div>
      {/* Content */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
        {renderContent()}
      </div>
    </div>
  );
}
