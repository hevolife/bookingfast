import React, { useState, useEffect } from 'react';
import { Crown, Clock, CreditCard, Gift, Zap, CheckCircle, Star, AlertTriangle, Calendar, User, Settings, Key, Sparkles, ExternalLink, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AccessCodeRedemption } from '../Auth/AccessCodeRedemption';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { SubscriptionPlansDisplay } from './SubscriptionPlansDisplay';
import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits';

export function SubscriptionStatus() {
  const { user } = useAuth();
  const [userStatus, setUserStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAccessCode, setActiveAccessCode] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [showCodeRedemption, setShowCodeRedemption] = useState(false);
  const [allRedemptions, setAllRedemptions] = useState<any[]>([]);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const { limits } = useSubscriptionLimits();

  useEffect(() => {
    loadUserStatus();
    loadSubscriptionPlans();
  }, [user]);

  const loadSubscriptionPlans = async () => {
    console.log('🔍 Chargement des plans d\'abonnement...');
    
    if (!supabase) {
      console.log('⚠️ Supabase non disponible, utilisation des plans par défaut');
      const defaultPlans = [
        {
          id: 'basic',
          name: 'Plan Basic',
          price_monthly: 29.99,
          features: ['Réservations en ligne', 'Gestion des clients', 'Paiements en ligne', 'Workflows email', 'Support email'],
          max_bookings_per_month: 150,
          team_members_allowed: false,
          custom_services_allowed: false
        },
        {
          id: 'premium',
          name: 'Plan Premium',
          price_monthly: 49.99,
          price_yearly: 499.99,
          features: ['Tout du plan Basic', 'Membres d\'équipe illimités', 'Services personnalisés', 'Réservations illimitées', 'Support prioritaire', 'Fonctionnalités avancées'],
          max_bookings_per_month: null,
          team_members_allowed: true,
          custom_services_allowed: true
        }
      ];
      setSubscriptionPlans(defaultPlans);
      return;
    }

    try {
      console.log('📊 Requête vers subscription_plans...');
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      console.log('📥 Réponse Supabase:', { data, error });

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        const defaultPlans = [
          {
            id: 'basic',
            name: 'Plan Basic',
            price_monthly: 29.99,
            features: ['Réservations en ligne', 'Gestion des clients', 'Paiements en ligne', 'Workflows email', 'Support email'],
            max_bookings_per_month: 150,
            team_members_allowed: false,
            custom_services_allowed: false
          },
          {
            id: 'premium',
            name: 'Plan Premium',
            price_monthly: 49.99,
            price_yearly: 499.99,
            features: ['Tout du plan Basic', 'Membres d\'équipe illimités', 'Services personnalisés', 'Réservations illimitées', 'Support prioritaire', 'Fonctionnalités avancées'],
            max_bookings_per_month: null,
            team_members_allowed: true,
            custom_services_allowed: true
          }
        ];
        setSubscriptionPlans(defaultPlans);
      } else if (data && data.length > 0) {
        console.log('✅ Plans chargés depuis la DB:', data.length);
        setSubscriptionPlans(data);
      } else {
        console.log('⚠️ Aucun plan trouvé dans la DB, utilisation des plans par défaut');
        const defaultPlans = [
          {
            id: 'basic',
            name: 'Plan Basic',
            price_monthly: 29.99,
            features: ['Réservations en ligne', 'Gestion des clients', 'Paiements en ligne', 'Workflows email', 'Support email'],
            max_bookings_per_month: 150,
            team_members_allowed: false,
            custom_services_allowed: false
          },
          {
            id: 'premium',
            name: 'Plan Premium',
            price_monthly: 49.99,
            price_yearly: 499.99,
            features: ['Tout du plan Basic', 'Membres d\'équipe illimités', 'Services personnalisés', 'Réservations illimitées', 'Support prioritaire', 'Fonctionnalités avancées'],
            max_bookings_per_month: null,
            team_members_allowed: true,
            custom_services_allowed: true
          }
        ];
        setSubscriptionPlans(defaultPlans);
      }
    } catch (error) {
      console.error('❌ Exception lors du chargement des plans:', error);
      const defaultPlans = [
        {
          id: 'basic',
          name: 'Plan Basic',
          price_monthly: 29.99,
          features: ['Réservations en ligne', 'Gestion des clients', 'Paiements en ligne', 'Workflows email', 'Support email'],
          max_bookings_per_month: 150,
          team_members_allowed: false,
          custom_services_allowed: false
        },
        {
          id: 'premium',
          name: 'Plan Premium',
          price_monthly: 49.99,
          price_yearly: 499.99,
          features: ['Tout du plan Basic', 'Membres d\'équipe illimités', 'Services personnalisés', 'Réservations illimitées', 'Support prioritaire', 'Fonctionnalités avancées'],
          max_bookings_per_month: null,
          team_members_allowed: true,
          custom_services_allowed: true
        }
      ];
      setSubscriptionPlans(defaultPlans);
    }
  };

  const loadUserStatus = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    try {
      console.log('👑 Chargement des données d\'abonnement pour:', user.email);
      
      const { data: ownedTeamData, error: ownedTeamError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .limit(1);

      const isOwner = !ownedTeamError && ownedTeamData && ownedTeamData.length > 0;

      const { data: membershipCheck, error: membershipError } = await supabase
        .from('team_members')
        .select('owner_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const isMember = !isOwner && !membershipError && membershipCheck?.owner_id;
      setIsTeamMember(isMember);
      
      let targetUserId = user.id;
      
      if (isMember && membershipCheck?.owner_id) {
        targetUserId = membershipCheck.owner_id;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (userError) {
        console.error('Erreur récupération données utilisateur:', userError);
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log('⚠️ Aucun profil utilisateur trouvé');
        setLoading(false);
        return;
      }

      setUserStatus(userData);

      const { data: redemptions, error: redemptionError } = await supabase
        .from('code_redemptions')
        .select('id, code_id, user_id, redeemed_at, access_granted_until, created_at, updated_at')
        .eq('user_id', targetUserId)
        .order('redeemed_at', { ascending: false });

      if (!redemptionError && redemptions) {
        const codeIds = [...new Set(redemptions.map(r => r.code_id))];
        const { data: codes, error: codesError } = await supabase
          .from('access_codes')
          .select('*')
          .in('id', codeIds);

        const enrichedRedemptions = redemptions.map(redemption => ({
          ...redemption,
          code: codes?.find(c => c.id === redemption.code_id) || null
        }));

        setAllRedemptions(enrichedRedemptions);

        const activeRedemption = enrichedRedemptions.find(redemption => {
          if (redemption.code?.access_type === 'lifetime' && redemption.code?.is_active) {
            return true;
          }
          return redemption.access_granted_until && 
                 new Date(redemption.access_granted_until) > new Date() &&
                 redemption.code?.is_active;
        });

        if (activeRedemption) {
          setActiveAccessCode(activeRedemption.code);
        }
      }
    } catch (error) {
      console.error('Erreur chargement statut:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, billingPeriod: 'monthly' | 'yearly') => {
    if (!user || !supabase) return;

    try {
      console.log('💳 Début processus abonnement:', { planId, billingPeriod, userId: user.id, email: user.email });
      
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan non trouvé');
      }

      console.log('📊 Détails plan:', { planId, planName: plan.name, billingPeriod });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
      const functionUrl = `${baseUrl}/functions/v1/stripe-subscription-checkout`;
      
      console.log('🔗 URL Edge Function:', functionUrl);

      const payload = {
        plan_id: planId,
        billing_period: billingPeriod,
        customer_email: user.email,
        success_url: `${window.location.origin}/subscription-success`,
        cancel_url: `${window.location.origin}/subscription-cancel`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_period: billingPeriod,
          subscription: 'true',
          subscription_tier: planId
        },
      };

      console.log('📤 Payload envoyé:', payload);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Réponse reçue:', { status: response.status, ok: response.ok });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Données réponse:', data);
        
        if (data.url) {
          console.log('🔗 Redirection vers Stripe:', data.url);
          window.location.href = data.url;
        } else {
          throw new Error('URL de checkout manquante dans la réponse');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur réponse:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
      }
    } catch (error) {
      console.error('❌ Erreur abonnement:', error);
      alert(`Erreur lors de la création de l'abonnement: ${error.message}`);
    }
  };

  const getRemainingTrialDays = () => {
    if (isTeamMember) return 0;
    if (!userStatus?.trial_ends_at) return 0;
    const now = new Date();
    const endDate = new Date(userStatus.trial_ends_at);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusColor = () => {
    if (isTeamMember) {
      return 'from-green-500 to-emerald-500';
    }
    if (activeAccessCode?.access_type === 'lifetime') {
      return 'from-green-500 to-emerald-500';
    }
    if (activeAccessCode || userStatus?.subscription_status === 'active') {
      return 'from-blue-500 to-cyan-500';
    }
    if (userStatus?.subscription_status === 'trial') {
      const remainingDays = getRemainingTrialDays();
      return remainingDays <= 2 ? 'from-red-500 to-pink-500' : 'from-orange-500 to-yellow-500';
    }
    return 'from-gray-500 to-gray-600';
  };

  const getStatusText = () => {
    if (isTeamMember) {
      return '👥 Membre d\'équipe - Accès complet';
    }
    if (activeAccessCode?.access_type === 'lifetime') {
      return '👑 Accès à vie';
    }
    if (activeAccessCode) {
      return `🎫 Code actif`;
    }
    if (userStatus?.subscription_status === 'active') {
      return '✅ Abonnement actif';
    }
    if (userStatus?.subscription_status === 'trial') {
      const remainingDays = getRemainingTrialDays();
      return `⏳ Essai gratuit (${remainingDays} jour(s) restant(s))`;
    }
    return '❌ Aucun accès actif';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Statut actuel */}
        <div className={`bg-gradient-to-r ${getStatusColor()} rounded-2xl p-6 text-white`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              {activeAccessCode?.access_type === 'lifetime' ? (
                <Crown className="w-8 h-8 text-white" />
              ) : activeAccessCode ? (
                <Gift className="w-8 h-8 text-white" />
              ) : userStatus?.subscription_status === 'active' ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Clock className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{getStatusText()}</h2>
              <p className="text-white/80">
                {userStatus?.subscription_tier === 'premium' ? 'Plan Premium' : 'Plan Basic'}
              </p>
            </div>
          </div>

          {/* Usage stats for basic tier */}
          {limits && limits.tier === 'basic' && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/90 text-sm font-medium">Réservations ce mois</span>
                <span className="text-white font-bold">
                  {limits.currentBookingCount} / {limits.maxBookingsPerMonth}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (limits.currentBookingCount / (limits.maxBookingsPerMonth || 150)) * 100)}%`
                  }}
                />
              </div>
              {!limits.canCreateBooking && (
                <div className="mt-2 text-yellow-200 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Limite atteinte - Passez au plan Premium pour des réservations illimitées
                </div>
              )}
            </div>
          )}
        </div>

        {/* Plans d'abonnement */}
        {(!activeAccessCode || activeAccessCode.access_type !== 'lifetime') && !isTeamMember && (
          <div id="subscription-plans" className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Choisissez votre plan</h3>
                <p className="text-gray-600 text-sm">Sélectionnez le plan qui correspond à vos besoins</p>
              </div>
            </div>

            {subscriptionPlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chargement des plans...</p>
              </div>
            ) : (
              <SubscriptionPlansDisplay
                plans={subscriptionPlans}
                currentTier={userStatus?.subscription_tier}
                onSubscribe={handleSubscribe}
              />
            )}
          </div>
        )}

        {/* Actions disponibles */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Settings className="w-6 h-6 text-purple-600" />
            Actions Disponibles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setShowCodeRedemption(true)}
              className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl hover:border-purple-400 transition-all duration-300 transform hover:scale-[1.02] text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-800">Code Secret</h4>
                  <p className="text-purple-600 text-sm">Débloquer avec un code</p>
                </div>
              </div>
              <p className="text-purple-700 text-sm">
                Utilisez un code secret pour étendre votre accès ou obtenir un accès à vie
              </p>
            </button>
          </div>
        </div>

        {/* Historique des codes */}
        {allRedemptions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Gift className="w-6 h-6 text-green-600" />
              Historique des Codes Utilisés ({allRedemptions.length})
            </h3>

            <div className="space-y-4">
              {allRedemptions.map((redemption, index) => {
                const isLifetime = redemption.code?.access_type === 'lifetime';
                const isActive = isLifetime || (
                  redemption.access_granted_until && 
                  new Date(redemption.access_granted_until) > new Date()
                );
                
                return (
                  <div
                    key={redemption.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      isActive 
                        ? isLifetime
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                          : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                          isActive 
                            ? isLifetime
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}>
                          {isLifetime ? <Crown className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                        </div>
                        
                        <div>
                          <div className="font-mono text-lg font-bold text-gray-900">
                            🎫 {redemption.code?.code}
                          </div>
                          <div className="text-sm text-gray-600">
                            {redemption.code?.description || 'Code d\'accès secret'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Utilisé le {formatDate(redemption.redeemed_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          isActive 
                            ? isLifetime
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isLifetime ? (
                            <>
                              <Crown className="w-4 h-4 inline mr-1" />
                              À vie
                            </>
                          ) : isActive ? (
                            <>
                              <Clock className="w-4 h-4 inline mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              Expiré
                            </>
                          )}
                        </div>
                        
                        {!isLifetime && redemption.access_granted_until && (
                          <div className="text-xs text-gray-500 mt-1">
                            Jusqu'au {formatDate(redemption.access_granted_until)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCodeRedemption && (
        <Modal
          isOpen={showCodeRedemption}
          onClose={() => setShowCodeRedemption(false)}
          title="Utiliser un Code Secret"
          size="md"
        >
          <AccessCodeRedemption 
            onSuccess={() => {
              setShowCodeRedemption(false);
              loadUserStatus();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
