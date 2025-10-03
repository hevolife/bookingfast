import React, { useState } from 'react';
import { Package, Sparkles, Check, X, Settings as SettingsIcon, Crown, Zap, AlertCircle, CreditCard } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { usePlugins } from '../../hooks/usePlugins';
import { Plugin, PluginFeature } from '../../types/plugin';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function PluginsPage() {
  const { plugins, userSubscriptions, loading, subscribeToPlugin, createPluginSubscription, refetch } = usePlugins();
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const isSubscribed = (pluginId: string) => {
    const subscribed = userSubscriptions.some(
      sub => sub.plugin_id === pluginId && (sub.status === 'active' || sub.status === 'trial')
    );
    return subscribed;
  };

  const getSubscription = (pluginId: string) => {
    return userSubscriptions.find(
      sub => sub.plugin_id === pluginId && (sub.status === 'active' || sub.status === 'trial')
    );
  };

  const isTrialExpired = (pluginId: string) => {
    const subscription = getSubscription(pluginId);
    if (!subscription || subscription.status !== 'trial') return false;
    
    if (!subscription.current_period_end) return false;
    
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    
    return now > endDate;
  };

  const handleSubscribe = async (plugin: Plugin) => {
    console.log('🎯 Clic sur souscription:', plugin.name, plugin.id);
    
    setSubscribing(true);
    setSubscriptionError(null);
    
    try {
      const includedFeatures = plugin.features
        .filter(f => f.included)
        .map(f => f.id);
      
      console.log('📋 Fonctionnalités incluses:', includedFeatures);
      
      const result = await subscribeToPlugin(plugin.id, includedFeatures);
      
      console.log('✅ Souscription réussie:', result);
      
      await refetch();
      setSelectedPlugin(null);
      
      console.log('🎉 Processus terminé avec succès');
    } catch (err) {
      console.error('❌ Erreur souscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la souscription';
      setSubscriptionError(errorMessage);
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleStartSubscription = async (plugin: Plugin) => {
    console.log('💳 Démarrage abonnement Stripe pour:', plugin.name);
    
    setSubscribing(true);
    setSubscriptionError(null);
    
    try {
      const subscription = getSubscription(plugin.id);
      if (!subscription) {
        throw new Error('Abonnement non trouvé');
      }

      console.log('🔄 Création session Stripe...', {
        pluginId: plugin.id,
        price: plugin.base_price,
        subscriptionId: subscription.id
      });

      const { url } = await createPluginSubscription(plugin.id, subscription.id);
      
      console.log('✅ Redirection vers Stripe:', url);
      window.location.href = url;
      
    } catch (err) {
      console.error('❌ Erreur création abonnement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de l\'abonnement';
      setSubscriptionError(errorMessage);
      alert(`Erreur: ${errorMessage}`);
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const featuredPlugins = plugins.filter(p => p.is_featured);
  const otherPlugins = plugins.filter(p => !p.is_featured);

  return (
    <div 
      className="space-y-8"
      style={{ paddingBottom: 'max(6rem, calc(6rem + env(safe-area-inset-bottom)))' }}
    >
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Marketplace de Plugins</h1>
            <p className="text-white/90 text-lg">Étendez les fonctionnalités de votre plateforme</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-bold">7 jours d'essai gratuit</span>
            </div>
            <p className="text-sm text-white/80">Testez chaque plugin gratuitement</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="font-bold">Activation instantanée</span>
            </div>
            <p className="text-sm text-white/80">Utilisez vos plugins immédiatement</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="font-bold">Support premium</span>
            </div>
            <p className="text-sm text-white/80">Assistance dédiée pour chaque plugin</p>
          </div>
        </div>
      </div>

      {featuredPlugins.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Plugins en vedette</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                isSubscribed={isSubscribed(plugin.id)}
                isTrialExpired={isTrialExpired(plugin.id)}
                subscription={getSubscription(plugin.id)}
                onSelect={() => setSelectedPlugin(plugin)}
              />
            ))}
          </div>
        </div>
      )}

      {otherPlugins.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tous les plugins</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                isSubscribed={isSubscribed(plugin.id)}
                isTrialExpired={isTrialExpired(plugin.id)}
                subscription={getSubscription(plugin.id)}
                onSelect={() => setSelectedPlugin(plugin)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedPlugin && (
        <PluginModal
          plugin={selectedPlugin}
          isSubscribed={isSubscribed(selectedPlugin.id)}
          isTrialExpired={isTrialExpired(selectedPlugin.id)}
          subscribing={subscribing}
          error={subscriptionError}
          onClose={() => {
            setSelectedPlugin(null);
            setSubscriptionError(null);
          }}
          onSubscribe={() => handleSubscribe(selectedPlugin)}
          onStartSubscription={() => handleStartSubscription(selectedPlugin)}
        />
      )}
    </div>
  );
}

interface PluginCardProps {
  plugin: Plugin;
  isSubscribed: boolean;
  isTrialExpired: boolean;
  subscription?: any;
  onSelect: () => void;
}

function PluginCard({ plugin, isSubscribed, isTrialExpired, subscription, onSelect }: PluginCardProps) {
  const IconComponent = (LucideIcons as any)[plugin.icon] || Package;
  const includedFeatures = plugin.features.filter(f => f.included);

  const getStatusBadge = () => {
    if (!isSubscribed) return null;
    
    if (isTrialExpired) {
      return (
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Essai expiré
        </span>
      );
    }
    
    if (subscription?.status === 'trial') {
      const daysLeft = Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return (
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Essai ({daysLeft}j)
        </span>
      );
    }
    
    return (
      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
        <Check className="w-3 h-3" />
        Actif
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-purple-200">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <IconComponent className="w-7 h-7 text-white" />
          </div>
          {getStatusBadge()}
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{plugin.name}</h3>
        <p className="text-gray-600 text-sm">{plugin.description}</p>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-y border-gray-100">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{plugin.base_price}€</span>
          <span className="text-gray-600">/mois</span>
        </div>
        {!isSubscribed && (
          <p className="text-sm text-purple-600 font-medium mt-1">
            + 7 jours d'essai gratuit
          </p>
        )}
      </div>

      <div className="p-6">
        <p className="text-sm font-bold text-gray-900 mb-3">Fonctionnalités incluses :</p>
        <ul className="space-y-2 mb-6">
          {includedFeatures.slice(0, 3).map(feature => (
            <li key={feature.id} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature.name}</span>
            </li>
          ))}
          {includedFeatures.length > 3 && (
            <li className="text-sm text-purple-600 font-medium">
              + {includedFeatures.length - 3} autres fonctionnalités
            </li>
          )}
        </ul>

        <button
          onClick={onSelect}
          className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
            isSubscribed
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isTrialExpired ? (
            <span className="flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5" />
              S'abonner
            </span>
          ) : isSubscribed ? (
            <span className="flex items-center justify-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Gérer
            </span>
          ) : (
            'Essayer gratuitement'
          )}
        </button>
      </div>
    </div>
  );
}

interface PluginModalProps {
  plugin: Plugin;
  isSubscribed: boolean;
  isTrialExpired: boolean;
  subscribing: boolean;
  error: string | null;
  onClose: () => void;
  onSubscribe: () => void;
  onStartSubscription: () => void;
}

function PluginModal({ plugin, isSubscribed, isTrialExpired, subscribing, error, onClose, onSubscribe, onStartSubscription }: PluginModalProps) {
  const IconComponent = (LucideIcons as any)[plugin.icon] || Package;
  const includedFeatures = plugin.features.filter(f => f.included);
  const additionalFeatures = plugin.features.filter(f => !f.included);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-8 text-white sticky top-0 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <IconComponent className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{plugin.name}</h2>
                <p className="text-white/90 text-lg mt-1">{plugin.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">{plugin.base_price}€</span>
            <span className="text-xl text-white/80">/mois</span>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Erreur de souscription</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {isTrialExpired && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-orange-900 mb-2">Période d'essai expirée</h3>
                  <p className="text-orange-800 mb-4">
                    Votre période d'essai gratuit de 7 jours est terminée. Pour continuer à utiliser ce plugin, 
                    veuillez souscrire à l'abonnement mensuel.
                  </p>
                  <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700 font-medium">Abonnement mensuel</span>
                      <span className="text-2xl font-bold text-orange-600">{plugin.base_price}€/mois</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Facturation mensuelle • Annulation à tout moment
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Check className="w-6 h-6 text-green-500" />
              Fonctionnalités incluses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {includedFeatures.map(feature => (
                <div key={feature.id} className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">{feature.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {additionalFeatures.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Fonctionnalités additionnelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {additionalFeatures.map(feature => (
                  <div key={feature.id} className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{feature.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      </div>
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap">
                        +{feature.price}€/mois
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={subscribing}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Fermer
            </button>
            {isTrialExpired ? (
              <button
                onClick={onStartSubscription}
                disabled={subscribing}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-xl font-bold hover:from-orange-700 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Redirection vers Stripe...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    S'abonner maintenant - {plugin.base_price}€/mois
                  </span>
                )}
              </button>
            ) : !isSubscribed && (
              <button
                onClick={onSubscribe}
                disabled={subscribing}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Activation en cours...
                  </span>
                ) : (
                  'Commencer l\'essai gratuit'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
