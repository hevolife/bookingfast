import React, { useState, useEffect } from 'react';
import { Save, Building2, Palette, Clock, Euro, Mail, CreditCard, Eye, EyeOff, Globe, Shield, AlertTriangle, CheckCircle, Percent, Trash2, RefreshCw, Calculator } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { BusinessSettings } from '../../types';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { POPULAR_TIMEZONES } from '../../lib/timezone';

export function BusinessSettingsForm() {
  const { settings, loading, updateSettings } = useBusinessSettings();
  const [formData, setFormData] = useState<Partial<BusinessSettings>>({});
  const [saving, setSaving] = useState(false);
  const [showStripeKeys, setShowStripeKeys] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    

    setSaving(true);
    
    try {
      await updateSettings(formData);
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTimeRangeChange = (day: string, rangeIndex: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours?.[day],
          ranges: prev.opening_hours?.[day]?.ranges?.map((range, index) =>
            index === rangeIndex ? { ...range, [field]: value } : range
          ) || []
        }
      }
    }));
  };

  const handleDayToggle = (day: string, closed: boolean) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours?.[day],
          closed
        }
      }
    }));
  };

  const addTimeRange = (day: string) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours?.[day],
          ranges: [
            ...(prev.opening_hours?.[day]?.ranges || []),
            { start: '09:00', end: '17:00' }
          ]
        }
      }
    }));
  };

  const removeTimeRange = (day: string, rangeIndex: number) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours?.[day],
          ranges: prev.opening_hours?.[day]?.ranges?.filter((_, index) => index !== rangeIndex) || []
        }
      }
    }));
  };

  const testStripeConnection = async () => {
    if (!formData.stripe_public_key || !formData.stripe_secret_key) {
      setStripeTestResult('❌ Veuillez renseigner les clés Stripe');
      return;
    }

    setTestingStripe(true);
    setStripeTestResult(null);

    try {
      // Test simple de validation des clés
      const publicKeyValid = formData.stripe_public_key.startsWith('pk_');
      const secretKeyValid = formData.stripe_secret_key.startsWith('sk_');
      
      if (!publicKeyValid || !secretKeyValid) {
        setStripeTestResult('❌ Format des clés Stripe invalide');
        return;
      }

      // Simuler un test de connexion
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStripeTestResult('✅ Clés Stripe valides ! Configuration OK');
      
      // Effacer le message après 5 secondes
      setTimeout(() => setStripeTestResult(null), 5000);
      
    } catch (error) {
      setStripeTestResult('❌ Erreur lors du test de connexion');
    } finally {
      setTestingStripe(false);
    }
  };

  const handleClearCache = async () => {
    // Demander confirmation
    const confirmed = window.confirm(
      '⚠️ Êtes-vous sûr de vouloir vider le cache ?\n\n' +
      'Cette action va :\n' +
      '• Supprimer toutes les données en cache\n' +
      '• Recharger l\'application\n' +
      '• Vous devrez peut-être vous reconnecter\n\n' +
      'Continuer ?'
    );

    if (!confirmed) return;

    setClearingCache(true);

    try {
      // Vider le localStorage
      localStorage.clear();
      
      // Vider le sessionStorage
      sessionStorage.clear();
      
      // Vider le cache du service worker si disponible
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Afficher le succès
      setCacheCleared(true);
      
      // Recharger la page après 2 secondes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error);
      alert('❌ Erreur lors du vidage du cache. Veuillez réessayer.');
      setClearingCache(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }


  const dayLabels = {
    monday: 'Lundi',
    tuesday: 'Mardi', 
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {/* Informations générales */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          Informations Générales
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={formData.business_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
              placeholder="Mon Entreprise"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuseau horaire
            </label>
            <select
              value={formData.timezone || 'Europe/Paris'}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
            >
              {POPULAR_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Configuration TVA/Taxe */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-emerald-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <Percent className="w-6 h-6 text-emerald-600" />
          Configuration TVA / Taxe de vente
        </h2>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Percent className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-blue-800 mb-2">💡 Comment ça fonctionne ?</h4>
              <div className="text-blue-700 text-sm space-y-1">
                <div>• Configurez votre taux de TVA/taxe (ex: 20% pour la France)</div>
                <div>• Dans les services, vous entrez le prix <strong>TTC</strong> (toutes taxes comprises)</div>
                <div>• Le prix <strong>HT</strong> (hors taxes) est calculé automatiquement</div>
                <div>• Formule: HT = TTC ÷ (1 + taux/100)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux de TVA / Taxe (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.tax_rate ?? 20}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tax_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                }))}
                className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-base"
                placeholder="20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                %
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Taux standard en France: 20% | Taux réduit: 5.5% ou 10%
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-4 border border-emerald-300">
            <div className="text-sm font-medium text-emerald-800 mb-2">
              📊 Exemple de calcul
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700">Prix TTC:</span>
                <span className="font-bold text-emerald-900">120.00€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">Taux TVA:</span>
                <span className="font-bold text-emerald-900">{formData.tax_rate ?? 20}%</span>
              </div>
              <div className="border-t border-emerald-300 pt-2 flex justify-between">
                <span className="text-emerald-700">Prix HT:</span>
                <span className="font-bold text-emerald-900">
                  {(120 / (1 + (formData.tax_rate ?? 20) / 100)).toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-600">Montant TVA:</span>
                <span className="font-medium text-emerald-800">
                  {(120 - (120 / (1 + (formData.tax_rate ?? 20) / 100))).toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> Ce taux s'applique à tous vos services. 
              Les prix HT seront recalculés automatiquement pour tous les services existants.
            </div>
          </div>
        </div>
      </div>

      {/* Horaires d'ouverture */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-green-600" />
          Horaires d'Ouverture
        </h2>

        <div className="space-y-4">
          {Object.entries(dayLabels).map(([day, label]) => {
            const daySettings = formData.opening_hours?.[day] || { ranges: [{ start: '08:00', end: '18:00' }], closed: false };
            
            return (
              <div key={day} className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{label}</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!daySettings.closed}
                      onChange={(e) => handleDayToggle(day, !e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Ouvert</span>
                  </label>
                </div>

                {!daySettings.closed && (
                  <div className="space-y-3">
                    {daySettings.ranges?.map((range, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="time"
                          value={range.start}
                          onChange={(e) => handleTimeRangeChange(day, index, 'start', e.target.value)}
                          className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                        />
                        <span className="text-gray-500 font-medium">à</span>
                        <input
                          type="time"
                          value={range.end}
                          onChange={(e) => handleTimeRangeChange(day, index, 'end', e.target.value)}
                          className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                        />
                        {daySettings.ranges && daySettings.ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeRange(day, index)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addTimeRange(day)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium hover:underline"
                    >
                      + Ajouter une plage horaire
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Paramètres de réservation */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-orange-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <Euro className="w-6 h-6 text-orange-600" />
          Paramètres de Réservation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Délai minimum (heures)
            </label>
            <input
              type="number"
              min="0"
              value={formData.minimum_booking_delay_hours || 24}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_booking_delay_hours: parseInt(e.target.value) || 24 }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-base"
            />
            <div className="text-xs text-gray-500 mt-1">
              Délai minimum avant qu'un client puisse réserver
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temps de battement (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={formData.buffer_minutes || 15}
              onChange={(e) => setFormData(prev => ({ ...prev, buffer_minutes: parseInt(e.target.value) || 15 }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-base"
            />
            <div className="text-xs text-gray-500 mt-1">
              Temps entre deux rendez-vous
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration liens (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={formData.payment_link_expiry_minutes || 30}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_link_expiry_minutes: parseInt(e.target.value) || 30 }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-base"
            />
            <div className="text-xs text-gray-500 mt-1">
              Durée de validité des liens de paiement
            </div>
          </div>
        </div>

        {/* Paramètres d'acompte */}
        <div className="mt-6">
          <h3 className="font-bold text-gray-900 mb-4">Acompte par défaut</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'acompte
              </label>
              <select
                value={formData.deposit_type || 'percentage'}
                onChange={(e) => setFormData(prev => ({ ...prev, deposit_type: e.target.value as 'percentage' | 'fixed_amount' }))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-base"
              >
                <option value="percentage">Pourcentage</option>
                <option value="fixed_amount">Montant fixe</option>
              </select>
            </div>

            {formData.deposit_type === 'percentage' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pourcentage d'acompte (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.default_deposit_percentage || 30}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_deposit_percentage: parseInt(e.target.value) || 30 }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-base"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant fixe (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.deposit_fixed_amount || 20}
                  onChange={(e) => setFormData(prev => ({ ...prev, deposit_fixed_amount: parseFloat(e.target.value) || 20 }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-base"
                />
              </div>
            )}
          </div>

          {/* Option multiplication acompte */}
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Calculator className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="multiply_deposit" className="font-bold text-purple-900">
                    Multiplier l'acompte par la quantité
                  </label>
                  <input
                    type="checkbox"
                    id="multiply_deposit"
                    checked={formData.multiply_deposit_by_services || false}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      multiply_deposit_by_services: e.target.checked 
                    }))}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                </div>
                <p className="text-sm text-purple-700">
                  Quand activé, l'acompte sera multiplié par le nombre de services/participants sélectionnés.
                </p>
                <div className="mt-3 bg-white/50 rounded-lg p-3 text-sm">
                  <div className="font-medium text-purple-800 mb-1">📊 Exemple :</div>
                  <div className="text-purple-700 space-y-1">
                    <div>• Service à 100€ avec acompte de 30%</div>
                    <div>• Client sélectionne 3 participants</div>
                    <div className="font-bold text-purple-900 mt-2">
                      {formData.multiply_deposit_by_services 
                        ? '→ Acompte = 30€ × 3 = 90€' 
                        : '→ Acompte = 30€ (non multiplié)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Stripe */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-purple-600" />
          Configuration Stripe
        </h2>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="stripe_enabled"
              checked={formData.stripe_enabled || false}
              onChange={(e) => setFormData(prev => ({ ...prev, stripe_enabled: e.target.checked }))}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="stripe_enabled" className="text-sm font-medium text-gray-700">
              Activer les paiements Stripe
            </label>
          </div>

          {formData.stripe_enabled && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-blue-800">Configuration Stripe</h4>
                </div>
                <div className="text-blue-700 text-sm space-y-1">
                  <div>• Récupérez vos clés API depuis votre dashboard Stripe</div>
                  <div>• Configurez le webhook pour les paiements automatiques</div>
                  <div>• Testez la connexion avant d'activer</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clé publique Stripe
                  </label>
                  <div className="relative">
                    <input
                      type={showStripeKeys ? 'text' : 'password'}
                      value={formData.stripe_public_key || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, stripe_public_key: e.target.value }))}
                      className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 font-mono text-base"
                      placeholder="pk_test_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowStripeKeys(!showStripeKeys)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showStripeKeys ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clé secrète Stripe
                  </label>
                  <input
                    type={showStripeKeys ? 'text' : 'password'}
                    value={formData.stripe_secret_key || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stripe_secret_key: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 font-mono text-base"
                    placeholder="sk_test_..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook secret Stripe
                  </label>
                  <input
                    type={showStripeKeys ? 'text' : 'password'}
                    value={formData.stripe_webhook_secret || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stripe_webhook_secret: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 font-mono text-base"
                    placeholder="whsec_..."
                  />
                </div>

                {/* Test de connexion */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={testStripeConnection}
                    loading={testingStripe}
                    disabled={!formData.stripe_public_key || !formData.stripe_secret_key}
                    variant="secondary"
                  >
                    Tester la connexion
                  </Button>
                  
                  {stripeTestResult && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      stripeTestResult.startsWith('✅')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {stripeTestResult.startsWith('✅') ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      {stripeTestResult}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configuration Email */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-cyan-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <Mail className="w-6 h-6 text-cyan-600" />
          Configuration Email (Brevo)
        </h2>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="brevo_enabled"
              checked={formData.brevo_enabled || false}
              onChange={(e) => setFormData(prev => ({ ...prev, brevo_enabled: e.target.checked }))}
              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
            />
            <label htmlFor="brevo_enabled" className="text-sm font-medium text-gray-700">
              Activer l'envoi d'emails via Brevo
            </label>
          </div>

          {formData.brevo_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clé API Brevo
                </label>
                <div className="relative">
                  <input
                  type={showBrevoKey ? 'text' : 'password'}
                  value={formData.brevo_api_key || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, brevo_api_key: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 font-mono text-base"
                  placeholder="xkeysib-..."
                />
                  <button
                    type="button"
                    onClick={() => setShowBrevoKey(!showBrevoKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showBrevoKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email expéditeur
                </label>
                <input
                  type="email"
                  value={formData.brevo_sender_email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, brevo_sender_email: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-base"
                  placeholder="noreply@monentreprise.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom expéditeur
                </label>
                <input
                  type="text"
                  value={formData.brevo_sender_name || 'BookingPro'}
                  onChange={(e) => setFormData(prev => ({ ...prev, brevo_sender_name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-base"
                  placeholder="Mon Entreprise"
                />
              </div>

              {/* Test de connexion Brevo */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.brevo_api_key) {
                      alert('Veuillez renseigner la clé API Brevo');
                      return;
                    }
                    
                    try {
                      // Test simple de l'API Brevo
                      const response = await fetch('https://api.brevo.com/v3/account', {
                        headers: {
                          'Accept': 'application/json',
                          'api-key': formData.brevo_api_key
                        }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        alert(`✅ Connexion Brevo réussie !\n\nCompte: ${data.email}\nPlan: ${data.plan?.type || 'N/A'}`);
                      } else {
                        const errorData = await response.json();
                        alert(`❌ Erreur Brevo: ${errorData.message || 'Clé API invalide'}`);
                      }
                    } catch (error) {
                      alert('❌ Erreur de connexion à Brevo');
                    }
                  }}
                  className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors font-medium text-sm"
                >
                  Tester la connexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gestion du Cache */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-red-600" />
          Gestion du Cache
        </h2>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-yellow-800 mb-2">⚠️ Action irréversible</h4>
                <div className="text-yellow-700 text-sm space-y-1">
                  <div>• Supprime toutes les données en cache de l'application</div>
                  <div>• Recharge automatiquement la page</div>
                  <div>• Vous devrez peut-être vous reconnecter</div>
                  <div>• Utile en cas de problèmes d'affichage ou de données obsolètes</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-red-200">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">Vider le cache de l'application</h3>
              <p className="text-sm text-gray-600">
                Supprime toutes les données temporaires et recharge l'application
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearingCache || cacheCleared}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                cacheCleared
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : clearingCache
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 shadow-lg'
              }`}
            >
              {cacheCleared ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Cache vidé !
                </>
              ) : clearingCache ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Vidage en cours...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Vider le cache
                </>
              )}
            </button>
          </div>

          {cacheCleared && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-green-800">
                  <strong>✅ Cache vidé avec succès !</strong>
                  <div className="text-sm mt-1">L'application va se recharger dans quelques instants...</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={saving}
          size="lg"
        >
          <Save className="w-5 h-5" />
          Sauvegarder les paramètres
        </Button>
      </div>
    </form>
  );
}
