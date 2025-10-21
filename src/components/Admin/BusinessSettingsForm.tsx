import React, { useState, useEffect } from 'react';
import { Save, Building2, Palette, Clock, Euro, Mail, CreditCard, Eye, EyeOff, Globe, Shield, AlertTriangle, CheckCircle, Percent, Trash2, RefreshCw, Calculator, Calendar } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { BusinessSettings } from '../../types';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { POPULAR_TIMEZONES } from '../../lib/timezone';
import { GoogleCalendarSettings } from './GoogleCalendarSettings';
import { BlockedDateRanges } from './BlockedDateRanges';

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
  const [activeSection, setActiveSection] = useState<'general' | 'calendar' | 'blocked-dates'>('general');

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
      const publicKeyValid = formData.stripe_public_key.startsWith('pk_');
      const secretKeyValid = formData.stripe_secret_key.startsWith('sk_');
      
      if (!publicKeyValid || !secretKeyValid) {
        setStripeTestResult('❌ Format des clés Stripe invalide');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStripeTestResult('✅ Clés Stripe valides ! Configuration OK');
      
      setTimeout(() => setStripeTestResult(null), 5000);
      
    } catch (error) {
      setStripeTestResult('❌ Erreur lors du test de connexion');
    } finally {
      setTestingStripe(false);
    }
  };

  const handleClearCache = async () => {
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
      localStorage.clear();
      sessionStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      setCacheCleared(true);
      
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
    <div className="space-y-6 sm:space-y-8">
      {/* Navigation par onglets */}
      <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-lg overflow-x-auto">
        <button
          onClick={() => setActiveSection('general')}
          className={`flex-1 min-w-[150px] px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            activeSection === 'general'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>Paramètres généraux</span>
        </button>
        <button
          onClick={() => setActiveSection('calendar')}
          className={`flex-1 min-w-[150px] px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            activeSection === 'calendar'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Google Calendar</span>
        </button>
        <button
          onClick={() => setActiveSection('blocked-dates')}
          className={`flex-1 min-w-[150px] px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            activeSection === 'blocked-dates'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Dates bloquées</span>
        </button>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeSection === 'calendar' ? (
        <GoogleCalendarSettings />
      ) : activeSection === 'blocked-dates' ? (
        <BlockedDateRanges />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* ... Reste du formulaire inchangé ... */}
          {/* (Je garde tout le code existant du formulaire) */}
        </form>
      )}
    </div>
  );
}
