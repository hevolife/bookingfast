import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function GoogleCalendarCallback() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connexion à Google Calendar en cours...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Traitement du callback OAuth...');

        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        console.log('📋 Paramètres reçus:', { 
          code: code?.substring(0, 20) + '...', 
          state,
          userId: user?.id 
        });

        if (!code || !state) {
          throw new Error('Code ou state manquant dans l\'URL');
        }

        if (!user) {
          throw new Error('Utilisateur non connecté');
        }

        // Vérifier que le state correspond à l'user_id
        if (state !== user.id) {
          throw new Error('State invalide - possible attaque CSRF');
        }

        setMessage('Échange du code d\'autorisation...');

        // Configuration OAuth
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = `${window.location.origin}/auth/google/callback`;

        console.log('🔑 Configuration OAuth:', { clientId, redirectUri });

        if (!clientId || !clientSecret) {
          throw new Error('Configuration OAuth manquante');
        }

        // Échanger le code contre un access token
        console.log('🔄 Échange du code...');
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('❌ Erreur échange token:', errorData);
          throw new Error(`Erreur échange token: ${errorData.error_description || errorData.error}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('✅ Token reçu:', { 
          access_token: tokenData.access_token?.substring(0, 20) + '...',
          expires_in: tokenData.expires_in 
        });

        setMessage('Sauvegarde des tokens...');

        // Calculer la date d'expiration
        const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

        // Sauvegarder les tokens dans Supabase
        console.log('💾 Sauvegarde dans Supabase...');
        const { error: insertError } = await supabase
          .from('google_calendar_tokens')
          .insert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expiry: expiryDate.toISOString(),
            scope: tokenData.scope,
          })
          .select()
          .single();

        if (insertError) {
          // Si l'erreur est un conflit (token existe déjà), faire un UPDATE
          if (insertError.code === '23505') {
            console.log('ℹ️ Token existe déjà, mise à jour...');
            const { error: updateError } = await supabase
              .from('google_calendar_tokens')
              .update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                token_expiry: expiryDate.toISOString(),
                scope: tokenData.scope,
              })
              .eq('user_id', user.id);

            if (updateError) {
              console.error('❌ Erreur mise à jour tokens:', updateError);
              throw updateError;
            }
          } else {
            console.error('❌ Erreur sauvegarde tokens:', insertError);
            throw insertError;
          }
        }

        console.log('✅ Tokens sauvegardés');

        setMessage('Mise à jour des paramètres...');

        // Mettre à jour les paramètres business
        console.log('⚙️ Mise à jour business_settings...');
        const { error: settingsError } = await supabase
          .from('business_settings')
          .update({
            google_calendar_enabled: true,
            google_calendar_sync_status: 'connected',
          })
          .eq('user_id', user.id);

        if (settingsError) {
          console.error('❌ Erreur mise à jour settings:', settingsError);
          throw settingsError;
        }

        console.log('✅ Paramètres mis à jour');

        setStatus('success');
        setMessage('✅ Google Calendar connecté avec succès !');

        // Rediriger vers la page admin après 2 secondes
        setTimeout(() => {
          console.log('🔄 Redirection vers admin...');
          window.location.href = '/';
        }, 2000);

      } catch (error) {
        console.error('❌ Erreur callback OAuth:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erreur lors de la connexion');

        // Rediriger vers admin après 3 secondes même en cas d'erreur
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    handleCallback();
  }, [user]);

  return (
    <div className="max-w-md w-full mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icône */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            status === 'processing' ? 'bg-blue-100' :
            status === 'success' ? 'bg-green-100' :
            'bg-red-100'
          }`}>
            {status === 'processing' && (
              <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-10 h-10 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>

          {/* Titre */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'processing' && 'Connexion en cours...'}
              {status === 'success' && 'Connexion réussie !'}
              {status === 'error' && 'Erreur de connexion'}
            </h2>
            <p className="text-gray-600">{message}</p>
          </div>

          {/* Barre de progression */}
          {status === 'processing' && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full animate-pulse" 
                   style={{ width: '70%' }} />
            </div>
          )}

          {/* Message de redirection */}
          {(status === 'success' || status === 'error') && (
            <p className="text-sm text-gray-500">
              Redirection automatique dans quelques secondes...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
