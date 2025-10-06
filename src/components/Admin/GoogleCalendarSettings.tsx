import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, RefreshCw, ExternalLink, AlertTriangle, Loader } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../UI/Button';

export function GoogleCalendarSettings() {
  const { settings, updateSettings } = useBusinessSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [calendars, setCalendars] = useState<Array<{ id: string; summary: string }>>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (settings) {
      setSyncStatus(settings.google_calendar_sync_status || 'disconnected');
      setSelectedCalendarId(settings.google_calendar_id || '');
    }
  }, [settings]);

  const handleConnect = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Configuration OAuth Google Calendar
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      
      if (!clientId) {
        alert('❌ Configuration Google Calendar manquante. Veuillez configurer VITE_GOOGLE_CLIENT_ID dans les variables d\'environnement.');
        return;
      }

      const scope = 'https://www.googleapis.com/auth/calendar';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`;

      // Ouvrir la fenêtre d'authentification Google
      window.location.href = authUrl;
    } catch (error) {
      console.error('Erreur lors de la connexion Google Calendar:', error);
      alert('❌ Erreur lors de la connexion à Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !window.confirm('⚠️ Êtes-vous sûr de vouloir déconnecter Google Calendar ?')) {
      return;
    }

    setLoading(true);
    try {
      // Supprimer les tokens
      await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      // Mettre à jour les paramètres
      await updateSettings({
        google_calendar_enabled: false,
        google_calendar_sync_status: 'disconnected',
        google_calendar_id: null
      });

      setSyncStatus('disconnected');
      setCalendars([]);
      setSelectedCalendarId('');
      
      alert('✅ Google Calendar déconnecté avec succès');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      alert('❌ Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendars = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Récupérer le token d'accès
      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('access_token, token_expiry')
        .eq('user_id', user.id)
        .single();

      if (!tokenData) {
        throw new Error('Token non trouvé');
      }

      // Vérifier si le token est expiré
      if (new Date(tokenData.token_expiry) < new Date()) {
        throw new Error('Token expiré');
      }

      // Récupérer la liste des calendriers
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des calendriers');
      }

      const data = await response.json();
      setCalendars(data.items || []);
    } catch (error) {
      console.error('Erreur lors du chargement des calendriers:', error);
      alert('❌ Erreur lors du chargement des calendriers. Veuillez vous reconnecter.');
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalendar = async () => {
    if (!selectedCalendarId) {
      alert('⚠️ Veuillez sélectionner un calendrier');
      return;
    }

    setLoading(true);
    try {
      await updateSettings({
        google_calendar_enabled: true,
        google_calendar_id: selectedCalendarId,
        google_calendar_sync_status: 'connected'
      });

      setSyncStatus('connected');
      alert('✅ Calendrier configuré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!user) return;

    setTestingConnection(true);
    try {
      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      if (!tokenData) {
        throw new Error('Token non trouvé');
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (response.ok) {
        alert('✅ Connexion Google Calendar active !');
      } else {
        throw new Error('Connexion échouée');
      }
    } catch (error) {
      console.error('Erreur test connexion:', error);
      alert('❌ Erreur de connexion. Veuillez vous reconnecter.');
      setSyncStatus('error');
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    if (syncStatus === 'connected' && calendars.length === 0) {
      loadCalendars();
    }
  }, [syncStatus]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Google Calendar</h2>
            <p className="text-sm text-gray-600">Synchronisez automatiquement vos réservations</p>
          </div>
        </div>

        {/* Statut de connexion */}
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border">
          {syncStatus === 'connected' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-green-700">Connecté</div>
                <div className="text-sm text-gray-600">Synchronisation active</div>
              </div>
            </>
          ) : syncStatus === 'error' ? (
            <>
              <XCircle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <div className="font-medium text-red-700">Erreur de connexion</div>
                <div className="text-sm text-gray-600">Veuillez vous reconnecter</div>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-700">Non connecté</div>
                <div className="text-sm text-gray-600">Connectez votre compte Google</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-800 mb-2">💡 Comment ça fonctionne ?</h4>
            <div className="text-blue-700 text-sm space-y-1">
              <div>• Connectez votre compte Google Calendar</div>
              <div>• Sélectionnez le calendrier à synchroniser</div>
              <div>• Les réservations seront automatiquement ajoutées</div>
              <div>• Les modifications seront synchronisées en temps réel</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions selon le statut */}
      {syncStatus === 'disconnected' || syncStatus === 'error' ? (
        <div className="space-y-4">
          <Button
            onClick={handleConnect}
            loading={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
          >
            <Calendar className="w-5 h-5" />
            Connecter Google Calendar
          </Button>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Configuration requise:</strong> Assurez-vous d'avoir configuré les identifiants OAuth Google dans les variables d'environnement (VITE_GOOGLE_CLIENT_ID et VITE_GOOGLE_CLIENT_SECRET).
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sélection du calendrier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendrier à synchroniser
            </label>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : calendars.length > 0 ? (
              <div className="space-y-3">
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                >
                  <option value="">Sélectionnez un calendrier</option>
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </option>
                  ))}
                </select>

                {selectedCalendarId && selectedCalendarId !== settings?.google_calendar_id && (
                  <Button
                    onClick={handleSaveCalendar}
                    loading={loading}
                    className="w-full"
                  >
                    Enregistrer le calendrier
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-xl">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Aucun calendrier trouvé</p>
                <Button
                  onClick={loadCalendars}
                  loading={loading}
                  variant="secondary"
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recharger
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={testConnection}
              loading={testingConnection}
              variant="secondary"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              Tester la connexion
            </Button>
            <Button
              onClick={handleDisconnect}
              loading={loading}
              variant="danger"
              className="flex-1"
            >
              <XCircle className="w-4 h-4" />
              Déconnecter
            </Button>
          </div>

          {/* Informations de synchronisation */}
          {settings?.google_calendar_enabled && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-green-800 mb-2">✅ Synchronisation active</h4>
                  <div className="text-green-700 text-sm space-y-1">
                    <div>• Nouvelles réservations → Ajoutées automatiquement</div>
                    <div>• Modifications → Mises à jour en temps réel</div>
                    <div>• Annulations → Événements supprimés</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lien vers la documentation */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <ExternalLink className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Besoin d'aide ?</div>
            <a
              href="https://developers.google.com/calendar/api/guides/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Consulter la documentation Google Calendar API
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
