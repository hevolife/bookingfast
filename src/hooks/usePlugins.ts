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

      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .select(`
          *,
          plugin:plugins(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

    try {
      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .insert({
          user_id: user.id,
          plugin_id: pluginId,
          status: 'trial',
          activated_features: activatedFeatures,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours d'essai
        })
        .select(`
          *,
          plugin:plugins(*)
        `)
        .single();

      if (error) throw error;

      await fetchUserSubscriptions();
      await fetchUserPlugins();

      return data;
    } catch (err) {
      console.error('Erreur souscription plugin:', err);
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
      setLoading(true);
      await Promise.all([
        fetchPlugins(),
        fetchUserSubscriptions(),
        fetchUserPlugins()
      ]);
      setLoading(false);
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
      await Promise.all([
        fetchPlugins(),
        fetchUserSubscriptions(),
        fetchUserPlugins()
      ]);
    }
  };
}
