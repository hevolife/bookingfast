import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Plugin, PluginSubscription, PluginConfiguration, UserPlugin } from '../types/plugin';
import { useAuth } from '../contexts/AuthContext';

export function usePlugins() {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<PluginSubscription[]>([]);
  const [userPlugins, setUserPlugins] = useState<UserPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setPlugins([]);
        return;
      }

      const { data, error } = await supabase
        .from('plugins')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('name');

      if (error) throw error;
      console.log('📦 Plugins chargés:', data);
      setPlugins(data || []);
    } catch (err) {
      console.error('Erreur chargement plugins:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      if (!isSupabaseConfigured() || !user) {
        setUserSubscriptions([]);
        return;
      }

      console.log('🔍 Chargement abonnements pour user:', user.id);

      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .select(`
          *,
          plugin:plugins(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement abonnements:', error);
        throw error;
      }

      console.log('📦 Abonnements chargés:', data);
      console.log('📊 Abonnements actifs/trial:', data?.filter(s => s.status === 'active' || s.status === 'trial'));
      setUserSubscriptions(data || []);
    } catch (err) {
      console.error('Erreur chargement abonnements:', err);
    }
  };

  const fetchUserPlugins = async () => {
    try {
      if (!isSupabaseConfigured() || !user) {
        setUserPlugins([]);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_user_active_plugins', { p_user_id: user.id });

      if (error) throw error;
      console.log('🔌 Plugins actifs:', data);
      setUserPlugins(data || []);
    } catch (err) {
      console.error('Erreur chargement plugins actifs:', err);
    }
  };

  const hasPluginAccess = async (pluginSlug: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !user) return false;

    try {
      const { data, error } = await supabase
        .rpc('has_plugin_access', {
          p_user_id: user.id,
          p_plugin_slug: pluginSlug
        });

      if (error) throw error;
      return data === true;
    } catch (err) {
      console.error('Erreur vérification accès plugin:', err);
      return false;
    }
  };

  const subscribeToPlugin = async (
    pluginId: string,
    activatedFeatures: string[] = []
  ): Promise<PluginSubscription> => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Configuration invalide');
    }

    console.log('🚀 Début souscription plugin:', { pluginId, userId: user.id, activatedFeatures });

    try {
      // Vérifier si une souscription existe déjà
      const { data: existingSub, error: checkError } = await supabase
        .from('plugin_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plugin_id', pluginId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erreur vérification souscription existante:', checkError);
        throw checkError;
      }

      console.log('🔍 Souscription existante:', existingSub);

      if (existingSub) {
        console.log('⚠️ Souscription existante trouvée:', existingSub);
        
        // Si la souscription existe mais est expirée ou annulée, on la réactive
        if (existingSub.status === 'expired' || existingSub.status === 'cancelled') {
          console.log('🔄 Réactivation de la souscription...');
          
          const { data: updatedSub, error: updateError } = await supabase
            .from('plugin_subscriptions')
            .update({
              status: 'trial',
              activated_features: activatedFeatures,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id)
            .select(`
              *,
              plugin:plugins(*)
            `)
            .single();

          if (updateError) {
            console.error('❌ Erreur réactivation:', updateError);
            throw updateError;
          }

          console.log('✅ Souscription réactivée:', updatedSub);
          await fetchUserSubscriptions();
          await fetchUserPlugins();
          return updatedSub;
        }
        
        // Si la souscription est déjà active, on la retourne
        console.log('✅ Souscription déjà active');
        return existingSub as PluginSubscription;
      }

      // Créer une nouvelle souscription
      console.log('➕ Création nouvelle souscription...');
      
      const newSubscription = {
        user_id: user.id,
        plugin_id: pluginId,
        status: 'trial',
        activated_features: activatedFeatures,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      console.log('📝 Données souscription:', newSubscription);

      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .insert(newSubscription)
        .select(`
          *,
          plugin:plugins(*)
        `)
        .single();

      if (error) {
        console.error('❌ Erreur insertion:', error);
        throw error;
      }

      console.log('✅ Souscription créée avec succès:', data);

      // Recharger les données
      await fetchUserSubscriptions();
      await fetchUserPlugins();

      return data;
    } catch (err) {
      console.error('❌ Erreur souscription plugin:', err);
      throw err;
    }
  };

  const updatePluginFeatures = async (
    subscriptionId: string,
    activatedFeatures: string[]
  ) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    try {
      const { error } = await supabase
        .from('plugin_subscriptions')
        .update({
          activated_features: activatedFeatures,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await fetchUserSubscriptions();
      await fetchUserPlugins();
    } catch (err) {
      console.error('Erreur mise à jour fonctionnalités:', err);
      throw err;
    }
  };

  const updatePluginConfiguration = async (
    pluginId: string,
    settings: Record<string, any>
  ) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Configuration invalide');
    }

    try {
      const { error } = await supabase
        .from('plugin_configurations')
        .upsert({
          user_id: user.id,
          plugin_id: pluginId,
          settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchUserPlugins();
    } catch (err) {
      console.error('Erreur mise à jour configuration:', err);
      throw err;
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    try {
      const { error } = await supabase
        .from('plugin_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await fetchUserSubscriptions();
      await fetchUserPlugins();
    } catch (err) {
      console.error('Erreur annulation abonnement:', err);
      throw err;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 Chargement initial des données...');
      setLoading(true);
      await Promise.all([
        fetchPlugins(),
        fetchUserSubscriptions(),
        fetchUserPlugins()
      ]);
      setLoading(false);
      console.log('✅ Chargement terminé');
    };

    loadData();
  }, [user]);

  return {
    plugins,
    userSubscriptions,
    userPlugins,
    loading,
    error,
    hasPluginAccess,
    subscribeToPlugin,
    updatePluginFeatures,
    updatePluginConfiguration,
    cancelSubscription,
    refetch: async () => {
      console.log('🔄 Rechargement manuel des données...');
      await Promise.all([
        fetchPlugins(),
        fetchUserSubscriptions(),
        fetchUserPlugins()
      ]);
      console.log('✅ Rechargement terminé');
    }
  };
}
