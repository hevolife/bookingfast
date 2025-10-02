import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { usePlugins } from '../../hooks/usePlugins';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface PluginRouteProps {
  pluginSlug: string;
  children: React.ReactNode;
}

export function PluginRoute({ pluginSlug, children }: PluginRouteProps) {
  const navigate = useNavigate();
  const { userPlugins, loading } = usePlugins();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    console.log('🔐 Vérification accès plugin:', {
      pluginSlug,
      userPlugins,
      pluginsActifs: userPlugins.map(p => p.plugin_slug)
    });

    const access = userPlugins.some(p => p.plugin_slug === pluginSlug);

    console.log('✅ Accès plugin:', access);
    setHasAccess(access);
  }, [pluginSlug, userPlugins]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Lock className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Plugin Non Activé</h1>
            <p className="text-white/90 text-lg">
              Cette fonctionnalité nécessite un plugin premium
            </p>
          </div>

          {/* Contenu */}
          <div className="p-8 space-y-6">
            <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Débloquez cette fonctionnalité
                  </h3>
                  <p className="text-gray-600">
                    Activez le plugin correspondant pour accéder à cette page et profiter de toutes ses fonctionnalités avancées.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <span>7 jours d'essai gratuit</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <span>Activation instantanée</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <span>Annulation à tout moment</span>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>Voir les plugins</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
