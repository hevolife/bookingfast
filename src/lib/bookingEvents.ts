import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppVersion {
  id: string;
  version: string;
  build: string;
  release_notes?: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export function useAppVersion() {
  const [currentVersion, setCurrentVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentVersion = async () => {
    if (!isSupabaseConfigured()) {
      // Version par défaut en mode démo
      const defaultVersion: AppVersion = {
        id: 'demo',
        version: '1.2.3',
        build: '2025.01.28',
        release_notes: 'Version de démonstration',
        is_current: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCurrentVersion(defaultVersion);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.warn('⚠️ Erreur chargement version, utilisation version par défaut:', fetchError);
        // Version par défaut en cas d'erreur
        setCurrentVersion({
          id: 'fallback',
          version: '1.2.3',
          build: '2025.01.28',
          release_notes: '',
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else if (data && data.length > 0) {
        // Prendre la première version (la plus récente)
        setCurrentVersion(data[0]);
        // t.method === 'stripe' && t.status === 'pending'
      // );
      
      // console.log('🔍 Transactions en attente détectées:', hasPendingStripeTransaction);
      // console.log('📋 Transactions:', data.transactions?.map(t => ({
      //   method: t.method,
      //   status: t.status,
      //   amount: t.amount
      // })));
      
      // if (!hasPendingStripeTransaction) {
      //   // Pas de lien de paiement en attente → déclencher le workflow immédiatement
      //   console.log('✅ Réservation sans lien de paiement - déclenchement workflow immédiat');
      //   try {
      //     await triggerWorkflow('booking_created', data, this.userId);
      //     console.log('✅ Workflow booking_created déclenché avec succès');
      //   } catch (workflowError) {
      //     console.error('❌ Erreur déclenchement workflow:', workflowError);
      //   }
      // } else {
      //   // Lien de paiement en attente → attendre le paiement
      //   console.log('⏳ Réservation avec lien de paiement - workflow en attente du paiement');
      //   console.log('💳 Le workflow sera déclenché par le webhook Stripe après paiement');
      // }
    // }
    
    // Émettre l'événement normal pour les listeners
        console.log('✅ Version actuelle chargée:', data[0].version, 'Build:', data[0].build);
      } else {
        // Aucune version trouvée, utiliser la version par défaut
        setCurrentVersion({
          id: 'default',
          version: '1.2.3',
          build: '2025.01.28',
          release_notes: '',
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('❌ Erreur chargement version:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      
      // Version par défaut en cas d'erreur
      setCurrentVersion({
        id: 'error',
        version: '1.2.3',
        build: '2025.01.28',
        release_notes: '',
        is_current: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentVersion();
  }, []);

  return {
    currentVersion,
    loading,
    error,
    refetch: fetchCurrentVersion
  };
}