import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function GoogleCalendarCallback() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connexion à Google Calendar en cours...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (msg: string) => {
    console.log(msg);
    setDebugInfo(prev => [...prev, `[${new Date().toISOString()}] ${msg}`]);
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        addDebug('🔄 === DÉBUT DU CALLBACK OAUTH ===');

        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        addDebug(`📋 URL complète: ${window.location.href}`);
        addDebug(`📋 Code reçu: ${code ? code.substring(0, 30) + '...' : 'NULL'}`);
        addDebug(`📋 State reçu: ${state || 'NULL'}`);
        addDebug(`📋 User ID: ${user?.id || 'NULL'}`);
        addDebug(`📋 User email: ${user?.email || 'NULL'}`);

        if (!code || !state) {
          throw new Error('❌ Code ou state manquant dans l\'URL');
        }

        if (!user) {
          throw new Error('❌ Utilisateur non connecté');
        }

        if (state !== user.id) {
          throw new Error('❌ State invalide - possible attaque CSRF');
        }

        setMessage('Échange du code d\'autorisation...');

        // Configuration OAuth
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = `${window.location.origin}/auth/google/callback`;

        addDebug(`🔑 Client ID: ${clientId || 'NULL'}`);
        addDebug(`🔑 Client Secret: ${clientSecret ? 'PRÉSENT' : 'NULL'}`);
        addDebug(`🔑 Redirect URI: ${redirectUri}`);

        if (!clientId || !clientSecret) {
          throw new Error('❌ Configuration OAuth manquante');
        }

        // Échanger le code contre un access token
        addDebug('🔄 Envoi requête token à Google...');
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

        addDebug(`📡 Réponse Google status: ${tokenResponse.status}`);

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          addDebug(`❌ Erreur Google: ${JSON.stringify(errorData, null, 2)}`);
          throw new Error(`Erreur échange token: ${errorData.error_description || errorData.error}`);
        }

        const tokenData = await tokenResponse.json();
        addDebug(`✅ Token reçu de Google`);
        addDebug(`📊 Access token: ${tokenData.access_token?.substring(0, 30)}...`);
        addDebug(`📊 Refresh token: ${tokenData.refresh_token ? 'PRÉSENT' : 'NULL'}`);
        addDebug(`📊 Expires in: ${tokenData.expires_in} secondes`);
        addDebug(`📊 Scope: ${tokenData.scope || 'NULL'}`);

        setMessage('Sauvegarde des tokens...');

        // Calculer la date d'expiration
        const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
        addDebug(`⏰ Date expiration calculée: ${expiryDate.toISOString()}`);

        // Préparer les données à insérer
        const tokenRecord = {
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expiry: expiryDate.toISOString(),
          scope: tokenData.scope || 'https://www.googleapis.com/auth/calendar',
        };

        addDebug(`💾 === DONNÉES À INSÉRER ===`);
        addDebug(`💾 user_id: ${tokenRecord.user_id}`);
        addDebug(`💾 access_token length: ${tokenRecord.access_token?.length || 0}`);
        addDebug(`💾 refresh_token length: ${tokenRecord.refresh_token?.length || 0}`);
        addDebug(`💾 token_expiry: ${tokenRecord.token_expiry}`);
        addDebug(`💾 scope: ${tokenRecord.scope}`);

        // Vérifier si un token existe déjà
        addDebug('🔍 Vérification token existant...');
        const { data: existingToken, error: checkError } = await supabase
          .from('google_calendar_tokens')
          .select('id, user_id, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError) {
          addDebug(`❌ Erreur vérification: ${JSON.stringify(checkError, null, 2)}`);
          throw checkError;
        }

        addDebug(`🔍 Token existant: ${existingToken ? `OUI (id=${existingToken.id})` : 'NON'}`);

        if (existingToken) {
          addDebug(`🔄 Mise à jour du token existant...`);
          const { error: updateError, data: updateData } = await supabase
            .from('google_calendar_tokens')
            .update(tokenRecord)
            .eq('user_id', user.id)
            .select();

          if (updateError) {
            addDebug(`❌ === ERREUR UPDATE ===`);
            addDebug(`❌ Code: ${updateError.code}`);
            addDebug(`❌ Message: ${updateError.message}`);
            addDebug(`❌ Details: ${updateError.details}`);
            addDebug(`❌ Hint: ${updateError.hint}`);
            addDebug(`❌ JSON complet: ${JSON.stringify(updateError, null, 2)}`);
            throw updateError;
          }
          addDebug(`✅ Token mis à jour: ${JSON.stringify(updateData, null, 2)}`);
        } else {
          addDebug('➕ Création nouveau token...');
          
          // Test de la structure de la table
          addDebug('🔍 Test structure table...');
          const { data: tableInfo, error: tableError } = await supabase
            .from('google_calendar_tokens')
            .select('*')
            .limit(0);

          if (tableError) {
            addDebug(`❌ Erreur structure table: ${JSON.stringify(tableError, null, 2)}`);
          } else {
            addDebug(`✅ Table accessible`);
          }

          // Tentative d'insertion
          addDebug('💾 Tentative INSERT...');
          const { error: insertError, data: insertData } = await supabase
            .from('google_calendar_tokens')
            .insert(tokenRecord)
            .select();

          if (insertError) {
            addDebug(`❌ === ERREUR INSERT ===`);
            addDebug(`❌ Code: ${insertError.code}`);
            addDebug(`❌ Message: ${insertError.message}`);
            addDebug(`❌ Details: ${insertError.details}`);
            addDebug(`❌ Hint: ${insertError.hint}`);
            addDebug(`❌ JSON complet: ${JSON.stringify(insertError, null, 2)}`);
            
            // Vérifier les policies RLS
            addDebug('🔍 Vérification RLS...');
            const { data: policies } = await supabase.rpc('pg_policies', {
              table_name: 'google_calendar_tokens'
            }).catch(() => ({ data: null }));
            
            if (policies) {
              addDebug(`📋 Policies RLS: ${JSON.stringify(policies, null, 2)}`);
            }
            
            throw insertError;
          }
          addDebug(`✅ Token créé: ${JSON.stringify(insertData, null, 2)}`);
        }

        addDebug('✅ Tokens sauvegardés avec succès');

        setMessage('Mise à jour des paramètres...');

        // Mettre à jour les paramètres business
        addDebug('⚙️ Mise à jour business_settings...');
        const { error: settingsError } = await supabase
          .from('business_settings')
          .update({
            google_calendar_enabled: true,
            google_calendar_sync_status: 'connected',
          })
          .eq('user_id', user.id);

        if (settingsError) {
          addDebug(`❌ Erreur settings: ${JSON.stringify(settingsError, null, 2)}`);
          throw settingsError;
        }

        addDebug('✅ Paramètres mis à jour');
        addDebug('🎉 === CALLBACK TERMINÉ AVEC SUCCÈS ===');

        setStatus('success');
        setMessage('✅ Google Calendar connecté avec succès !');

        // Rediriger vers la page admin après 2 secondes
        setTimeout(() => {
          addDebug('🔄 Redirection vers admin...');
          window.location.href = '/';
        }, 2000);

      } catch (error) {
        addDebug(`❌ === ERREUR FATALE ===`);
        addDebug(`❌ Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        addDebug(`❌ Message: ${error instanceof Error ? error.message : String(error)}`);
        addDebug(`❌ Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
        console.error('❌ Erreur complète:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erreur lors de la connexion');

        // Rediriger vers admin après 10 secondes pour laisser le temps de lire les logs
        setTimeout(() => {
          window.location.href = '/';
        }, 10000);
      }
    };

    handleCallback();
  }, [user]);

  return (
    <div className="max-w-4xl w-full mx-auto p-6">
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

          {/* Logs de debug - TOUJOURS VISIBLES */}
          <div className="w-full mt-6">
            <details open={status === 'error'} className="bg-gray-50 rounded-xl p-4 text-left">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2 flex items-center gap-2">
                📋 Logs de debug ({debugInfo.length})
                <span className="text-xs text-gray-500">(Cliquez pour {status === 'error' ? 'masquer' : 'afficher'})</span>
              </summary>
              <div className="space-y-1 text-xs font-mono text-gray-600 max-h-96 overflow-y-auto bg-white p-3 rounded border border-gray-200">
                {debugInfo.map((log, i) => (
                  <div key={i} className={`border-b border-gray-100 pb-1 ${
                    log.includes('❌') ? 'text-red-600 font-bold' :
                    log.includes('✅') ? 'text-green-600' :
                    log.includes('🔄') ? 'text-blue-600' :
                    log.includes('📋') ? 'text-purple-600' :
                    'text-gray-600'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            </details>
          </div>

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
