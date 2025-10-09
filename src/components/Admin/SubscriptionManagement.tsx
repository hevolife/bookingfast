import React, { useState, useEffect } from 'react';
import { Crown, Calendar, AlertTriangle, Loader2, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';

interface SubscriptionData {
  subscription_tier: string;
  subscription_status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function SubscriptionManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status, stripe_subscription_id, stripe_customer_id, current_period_end, cancel_at_period_end')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id || cancelling) return;

    setCancelling(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          subscription_id: subscription.stripe_subscription_id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'annulation');
      }

      // Recharger les données
      await loadSubscription();
      setShowCancelModal(false);
      
      alert('Votre abonnement sera annulé à la fin de la période en cours. Vous conservez l\'accès jusqu\'à cette date.');
    } catch (error) {
      console.error('Erreur annulation:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'annulation');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'starter': return 'Starter';
      case 'pro': return 'Pro';
      default: return 'Gratuit';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!subscription || subscription.subscription_status !== 'active') {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-12 h-12" />
          <div>
            <h2 className="text-2xl font-bold">Abonnement actif</h2>
            <p className="text-white/80">Toutes les fonctionnalités sont disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  const isScheduledForCancellation = subscription.cancel_at_period_end;

  return (
    <>
      <div className="space-y-6">
        {/* Statut de l'abonnement */}
        <div className={`rounded-2xl p-6 text-white ${
          isScheduledForCancellation 
            ? 'bg-gradient-to-r from-orange-500 to-red-500' 
            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                {isScheduledForCancellation ? (
                  <AlertTriangle className="w-8 h-8" />
                ) : (
                  <Crown className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {isScheduledForCancellation ? 'Annulation programmée' : `Plan ${getTierName(subscription.subscription_tier)}`}
                </h2>
                <p className="text-white/80">
                  {isScheduledForCancellation 
                    ? 'Votre abonnement sera annulé à la fin de la période'
                    : 'Abonnement mensuel actif'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                {isScheduledForCancellation ? 'Accès jusqu\'au' : 'Prochaine facturation'}
              </div>
              <div className="text-lg font-bold">
                {formatDate(subscription.current_period_end)}
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="text-white/80 text-sm mb-1">Statut</div>
              <div className="text-lg font-bold">
                {isScheduledForCancellation ? 'Annulation en attente' : 'Actif'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isScheduledForCancellation && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Gérer l'abonnement</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 mb-1">Annuler l'abonnement</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Vous conserverez l'accès jusqu'au {formatDate(subscription.current_period_end)}
                  </p>
                  <Button
                    onClick={() => setShowCancelModal(true)}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler mon abonnement
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message si annulation programmée */}
        {isScheduledForCancellation && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Annulation confirmée</h3>
                <p className="text-gray-700">
                  Votre abonnement sera annulé le {formatDate(subscription.current_period_end)}. 
                  Vous conservez l'accès à toutes les fonctionnalités jusqu'à cette date.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmation d'annulation */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Confirmer l'annulation"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-orange-900 mb-1">Êtes-vous sûr ?</h4>
              <p className="text-sm text-orange-700">
                Votre abonnement sera annulé à la fin de la période en cours ({formatDate(subscription?.current_period_end)}).
                Vous conserverez l'accès jusqu'à cette date.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowCancelModal(false)}
              variant="outline"
              disabled={cancelling}
            >
              Garder mon abonnement
            </Button>
            <Button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Annulation...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Confirmer l'annulation
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
