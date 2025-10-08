import React, { useState, useEffect } from 'react';
import { Crown, Clock, CreditCard, Gift, Zap, CheckCircle, Star, AlertTriangle, Calendar, User, Settings, Key, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AccessCodeRedemption } from '../Auth/AccessCodeRedemption';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';

export function SubscriptionStatus() {
  const { user } = useAuth();
  const [userStatus, setUserStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAccessCode, setActiveAccessCode] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [showCodeRedemption, setShowCodeRedemption] = useState(false);
  const [allRedemptions, setAllRedemptions] = useState<any[]>([]);
  const [isTeamMember, setIsTeamMember] = useState(false);

  useEffect(() => {
    loadUserStatus();
    loadSubscriptionPlans();
  }, [user]);

  const loadSubscriptionPlans = async () => {
    if (!supabase) {
      const defaultPlans = [
        {
          id: 'monthly',
          name: 'Plan Mensuel',
          price_monthly: 29.99,
          features: ['Réservations illimitées', 'Gestion des clients', 'Paiements en ligne', 'Workflows email', 'Support email']
        },
        {
          id: 'yearly',
          name: 'Plan Annuel',
          price_monthly: 24.99,
          price_yearly: 299.99,
          features: ['Tout du plan mensuel', '2 mois gratuits', 'Support prioritaire', 'Fonctionnalités avancées', 'Accès aux bêtas']
        }
      ];
      setSubscriptionPlans(defaultPlans);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (!error && data) {
        setSubscriptionPlans(data);
      } else {
        setSubscriptionPlans([]);
      }
    } catch (error) {
      console.error('Erreur chargement plans:', error);
      setSubscriptionPlans([]);
    }
  };

  const loadUserStatus = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }


    try {
      console.log('👑 Chargement des données d\'abonnement pour:', user.email);
      
      // Vérifier d'abord si l'utilisateur possède une équipe (= propriétaire)
      console.log('🔍 Vérification si propriétaire d\'équipe pour:', user.email);
      const { data: ownedTeamData, error: ownedTeamError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .limit(1);

      const isOwner = !ownedTeamError && ownedTeamData && ownedTeamData.length > 0;
      console.log('👑 Résultat propriétaire:', { isOwner, ownedMembers: ownedTeamData?.length || 0 });

      // Ensuite vérifier si l'utilisateur est membre d'une équipe (seulement s'il n'est pas propriétaire)
      const { data: membershipCheck, error: membershipError } = await supabase
        .from('team_members')
        .select('owner_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const isMember = !isOwner && !membershipError && membershipCheck?.owner_id;
      setIsTeamMember(isMember);
      
      console.log('📊 Statut final:', { 
        isOwner, 
        isMember, 
        userEmail: user.email,
        ownedMembers: ownedTeamData?.length || 0,
        memberOf: membershipCheck?.owner_id || 'aucun'
      });
      
      // Déterminer l'ID utilisateur pour lequel charger les données d'abonnement
      let targetUserId = user.id; // Par défaut, utiliser l'ID de l'utilisateur connecté
      
      if (isMember && membershipCheck?.owner_id) {
        // Si c'est un membre d'équipe, charger les données du propriétaire
        targetUserId = membershipCheck.owner_id;
        console.log('👥 MEMBRE D\'ÉQUIPE - Chargement données du propriétaire:', targetUserId);
      } else {
        console.log('👑 PROPRIÉTAIRE - Chargement données propres:', targetUserId);
      }
      // ÉTAPE 2: Récupérer les informations utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (userError) {
        console.error('Erreur récupération données utilisateur:', userError);
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log('⚠️ Aucun profil utilisateur trouvé pour:', isMember ? 'propriétaire' : 'utilisateur');
        setLoading(false);
        return;
      }

      setUserStatus(userData);

      // ÉTAPE 3: Récupérer tous les codes utilisés par l'utilisateur cible
      const { data: redemptions, error: redemptionError } = await supabase
        .from('code_redemptions')
        .select('id, code_id, user_id, redeemed_at, access_granted_until, created_at, updated_at')
        .eq('user_id', targetUserId)
        .order('redeemed_at', { ascending: false });

      if (!redemptionError && redemptions) {
        // Charger les codes séparément
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

        // Trouver le code actif le plus récent
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
          console.log('✅ Code actif trouvé pour', isMember ? 'propriétaire' : 'utilisateur', ':', activeRedemption.code.code);
        } else {
          console.log('❌ Aucun code actif trouvé pour', isMember ? 'propriétaire' : 'utilisateur');
        }
      } else {
        console.log('❌ Erreur ou aucune rédemption trouvée pour', isMember ? 'propriétaire' : 'utilisateur');
      }
    } catch (error) {
      console.error('Erreur chargement statut:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user || !supabase) return;

    try {
      console.log('💳 Début processus abonnement:', { planId, userId: user.id, email: user.email });
      
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan non trouvé');
      }

      const amount = planId === 'monthly' ? plan.price_monthly : plan.price_yearly || plan.price_monthly * 12;
      const planName = plan.name;

      console.log('📊 Détails plan:', { planId, planName, amount });

      // Créer une session de checkout Stripe
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // CORRECTION: Enlever le double slash
      const functionUrl = `${supabaseUrl}/functions/v1/stripe-subscription-checkout`;
      
      console.log('🔗 URL Edge Function:', functionUrl);

      const payload = {
        amount: amount,
        service_name: planName,
        customer_email: user.email,
        success_url: `${window.location.origin}/subscription-success`,
        cancel_url: `${window.location.origin}/subscription-cancel`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_type: planId,
          subscription: 'true'
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
    // Pour les membres d'équipe, ne pas afficher de jours restants
    if (isTeamMember) return 0;
    
    if (!userStatus?.trial_ends_at) return 0;
    const now = new Date();
    const endDate = new Date(userStatus.trial_ends_at);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusColor = () => {
    // Pour les membres d'équipe, toujours vert (accès complet)
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
    // Pour les membres d'équipe, affichage spécial
    if (isTeamMember) {
      return '👥 Membre d\'équipe - Accès complet';
    }
    
    if (activeAccessCode?.access_type === 'lifetime') {
      return '👑 Accès à vie';
    }
    if (activeAccessCode) {
      return `🎫 Code actif (${activeAccessCode.access_duration} ${
        activeAccessCode.access_type === 'days' ? 'jour(s)' :
        activeAccessCode.access_type === 'weeks' ? 'semaine(s)' :
        activeAccessCode.access_type === 'months' ? 'mois' : 
        activeAccessCode.access_type
      })`;
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
  }

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
                {activeAccessCode?.access_type === 'lifetime' 
                  ? 'Vous avez un accès illimité à toutes les fonctionnalités'
                  : isTeamMember
                  ? 'Vous êtes membre d\'une équipe avec accès complet aux fonctionnalités'
                  : activeAccessCode
                  ? `Code "${activeAccessCode.code}" - ${activeAccessCode.description || 'Code d\'accès secret'}`
                  : userStatus?.subscription_status === 'active'
                  ? 'Toutes les fonctionnalités sont disponibles'
                  : userStatus?.subscription_status === 'trial'
                  ? `Essai gratuit jusqu'au ${formatDate(userStatus.trial_ends_at)}`
                  : 'Abonnez-vous pour accéder aux fonctionnalités'
                }
              </p>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-white/80 text-sm">Compte créé</div>
              <div className="text-lg font-bold">{formatDate(userStatus?.created_at)}</div>
            </div>
            
            {userStatus?.subscription_status === 'trial' && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-white/80 text-sm">Essai expire</div>
                <div className="text-lg font-bold">{formatDate(userStatus?.trial_ends_at)}</div>
              </div>
            )}
            
            {activeAccessCode && activeAccessCode.access_type !== 'lifetime' && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-white/80 text-sm">Code expire</div>
                <div className="text-lg font-bold">
                  {allRedemptions.find(r => r.code?.id === activeAccessCode.id)?.access_granted_until 
                    ? formatDate(allRedemptions.find(r => r.code?.id === activeAccessCode.id)?.access_granted_until)
                    : 'N/A'
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions disponibles */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Settings className="w-6 h-6 text-purple-600" />
            Actions Disponibles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Utiliser un code secret */}
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

            {/* S'abonner */}
            {(!activeAccessCode || activeAccessCode.access_type !== 'lifetime') && userStatus?.subscription_status !== 'active' && !isTeamMember && (
              <button
                onClick={() => {
                  // Scroll vers les plans d'abonnement
                  document.getElementById('subscription-plans')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl hover:border-blue-400 transition-all duration-300 transform hover:scale-[1.02] text-left"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-800">S'abonner</h4>
                    <p className="text-blue-600 text-sm">Abonnement mensuel ou annuel</p>
                  </div>
                </div>
                <p className="text-blue-700 text-sm">
                  Choisissez un plan d'abonnement pour un accès permanent
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Historique des codes utilisés */}
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
                    className={`p-4 rounded-xl border-2 transition-all duration-300 animate-fadeIn ${
                      isActive 
                        ? isLifetime
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                          : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
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

        {/* Plans d'abonnement */}
        {(!activeAccessCode || activeAccessCode.access_type !== 'lifetime') && userStatus?.subscription_status !== 'active' && !isTeamMember && (
          <div id="subscription-plans" className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Plans d'Abonnement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subscriptionPlans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    plan.id === 'yearly' 
                      ? 'border-purple-400 hover:border-purple-600 relative' 
                      : 'border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {plan.id === 'yearly' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                        🎉 Économisez 17%
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                      plan.id === 'yearly'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    }`}>
                      {plan.id === 'yearly' ? <Star className="w-6 h-6 text-white" /> : <CreditCard className="w-6 h-6 text-white" />}
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                    <div className={`text-3xl font-bold mb-2 ${
                      plan.id === 'yearly' ? 'text-purple-600' : 'text-blue-600'
                    }`}>
                      {plan.price_monthly}€
                    </div>
                    <div className="text-gray-600">
                      {plan.id === 'yearly' ? 'par mois (facturé annuellement)' : 'par mois'}
                    </div>
                    {plan.id === 'yearly' && plan.price_yearly && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        Soit {plan.price_yearly}€/an
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.features.map((feature: string, featureIndex: number) => (
                      <div key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full ${
                      plan.id === 'yearly'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        : ''
                    }`}
                  >
                    {plan.id === 'yearly' ? <Star className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    S'abonner
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informations compte */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <User className="w-6 h-6 text-gray-600" />
            Informations du Compte
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Email</div>
              <div className="font-medium text-gray-900">{user?.email}</div>
            </div>
            
            <div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal pour utiliser un code secret */}
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
