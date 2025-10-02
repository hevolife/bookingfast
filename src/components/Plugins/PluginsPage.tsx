import React, { useState } from 'react';
import { Package, Sparkles, Check, X, Settings as SettingsIcon, Crown, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { usePlugins } from '../../hooks/usePlugins';
import { Plugin, PluginFeature } from '../../types/plugin';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function PluginsPage() {
  const { plugins, userSubscriptions, loading, subscribeToPlugin } = usePlugins();
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const isSubscribed = (pluginId: string) => {
    return userSubscriptions.some(
      sub => sub.plugin_id === pluginId && sub.status === 'active'
    );
  };

  const getSubscription = (pluginId: string) => {
    return userSubscriptions.find(
      sub => sub.plugin_id === pluginId && sub.status === 'active'
    );
  };

  const handleSubscribe = async (plugin: Plugin) => {
    try {
      setSubscribing(true);
      const includedFeatures = plugin.features
        .filter(f => f.included)
        .map(f => f.id);
      
      await subscribeToPlugin(plugin.id, includedFeatures);
      setSelectedPlugin(null);
    } catch (err) {
      console.error('Erreur souscription:', err);
      alert('Erreur lors de la souscription au plugin');
    } finally {
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
    <div className="space-y-8">
      {/* Header */}
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

      {/* Plugins en vedette */}
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
                subscription={getSubscription(plugin.id)}
                onSelect={() => setSelectedPlugin(plugin)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Autres plugins */}
      {otherPlugins.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tous les plugins</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                isSubscribed={isSubscribed(plugin.id)}
                subscription={getSubscription(plugin.id)}
                onSelect={() => setSelectedPlugin(plugin)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal détails plugin */}
      {selectedPlugin && (
        <PluginModal
          plugin={selectedPlugin}
          isSubscribed={isSubscribed(selectedPlugin.id)}
          subscribing={subscribing}
          onClose={() => setSelectedPlugin(null)}
          onSubscribe={() => handleSubscribe(selectedPlugin)}
        />
      )}
    </div>
  );
}

interface PluginCardProps {
  plugin: Plugin;
  isSubscribed: boolean;
  subscription?: any;
  onSelect: () => void;
}

function PluginCard({ plugin, isSubscribed, subscription, onSelect }: PluginCardProps) {
  // Utiliser l'import ES6 au lieu de require
  const IconComponent = (LucideIcons as any)[plugin.icon] || Package;
  const includedFeatures = plugin.features.filter(f => f.included);

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-purple-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <IconComponent className="w-7 h-7 text-white" />
          </div>
          {isSubscribed && (
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Check className="w-3 h-3" />
              Actif
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{plugin.name}</h3>
        <p className="text-gray-600 text-sm">{plugin.description}</p>
      </div>

      {/* Prix */}
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

      {/* Fonctionnalités incluses */}
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
          {isSubscribed ? (
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
  subscribing: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

function PluginModal({ plugin, isSubscribed, subscribing, onClose, onSubscribe }: PluginModalProps) {
  // Utiliser l'import ES6 au lieu de require
  const IconComponent = (LucideIcons as any)[plugin.icon] || Package;
  const includedFeatures = plugin.features.filter(f => f.included);
  const additionalFeatures = plugin.features.filter(f => !f.included);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
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

        {/* Contenu */}
        <div className="p-8 space-y-8">
          {/* Fonctionnalités incluses */}
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

          {/* Fonctionnalités additionnelles */}
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

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
            {!isSubscribed && (
              <button
                onClick={onSubscribe}
                disabled={subscribing}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subscribing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Activation...
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
