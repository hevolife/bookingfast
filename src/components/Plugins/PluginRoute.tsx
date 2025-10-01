import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePlugins } from '../../hooks/usePlugins';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Lock, Sparkles } from 'lucide-react';

interface PluginRouteProps {
  pluginSlug: string;
  children: React.ReactNode;
}

export function PluginRoute({ pluginSlug, children }: PluginRouteProps) {
  const { hasPluginAccess, plugins, loading } = usePlugins();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true);
      const access = await hasPluginAccess(pluginSlug);
      setHasAccess(access);
      setChecking(false);
    };

    if (!loading) {
      checkAccess();
    }
  }, [pluginSlug, loading, hasPluginAccess]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Vérification de l'accès au plugin...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    const plugin = plugins.find(p => p.slug === pluginSlug);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Lock className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Accès restreint</h1>
              <p className="text-white/90 text-lg">Ce plugin n'est pas activé sur votre compte</p>
            </div>

            {/* Contenu */}
            <div className="p-8">
              {plugin && (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{plugin.name}</h2>
                    <p className="text-gray-600">{plugin.description}</p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                        <span className="font-bold text-gray-900">Essai gratuit de 7 jours</span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">{plugin.base_price}€</div>
                        <div className="text-sm text-gray-600">/mois</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Activez ce plugin maintenant et profitez de toutes ses fonctionnalités gratuitement pendant 7 jours !
                    </p>
                  </div>

                  <div className="space-y-3 mb-8">
                    <h3 className="font-bold text-gray-900">Fonctionnalités incluses :</h3>
                    {plugin.features.filter(f => f.included).map(feature => (
                      <div key={feature.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{feature.name}</div>
                          <div className="text-sm text-gray-600">{feature.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => window.location.href = '/admin?tab=plugins'}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Activer le plugin
                    </button>
                    <button
                      onClick={() => window.history.back()}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      Retour
                    </button>
                  </div>
                </>
              )}

              {!plugin && (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Ce plugin n'est pas disponible ou n'existe pas.
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Retour
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
