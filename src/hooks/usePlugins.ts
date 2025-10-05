import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plugin, PluginSubscription, UserPlugin } from '../types/plugin';
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
      if (!supabase) {
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
      console.error('❌ Erreur chargement plugins:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      if (!supabase || !user) {
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
      console.error('❌ Erreur chargement abonnements:', err);
    }
  };

  const fetchUserPlugins = async () => {
    try {
      if (!supabase || !user) {
        setUserPlugins([]);
        return;
      }

      const { data, error } = await supabase.rpc('get_member_accessible_plugins', {
        p_user_id: user.id
      });

      if (error) throw error;

      const formattedPlugins: UserPlugin[] = (data || [])
        .filter((p: any) => p.can_access)
        .map((p: any) => ({
          plugin_id: p.plugin_id,
          plugin_name: p.plugin_name,
          plugin_slug: p.plugin_slug,
          plugin_icon: p.plugin_icon,
          plugin_category: p.plugin_category,
          activated_features: [],
          settings: {}
        }));

      setUserPlugins(formattedPlugins);
    } catch (err) {
      console.error('❌ Erreur chargement plugins actifs:', err);
      setUserPlugins([]);
    }
  };

  const hasPluginAccess = async (pluginSlug: string): Promise<boolean> => {
    if (!supabase || !user) return false;

    try {
      const { data, error } = await supabase.rpc('check_plugin_access', {
        p_user_id: user.id,
        p_plugin_slug: pluginSlug
      });

      if (error) throw error;
      return data === true;
    } catch (err) {
      console.error('❌ Erreur vérification accès plugin:', err);
      return false;
    }
  };

  const subscribeToPlugin = async (
    pluginId: string,
    activatedFeatures: string[] = []
  ): Promise<PluginSubscription> => {
    if (!supabase || !user) {
      throw new Error('Configuration invalide');
    }

    try {
      const { data: existingSub, error: checkError } = await supabase
        .from('plugin_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plugin_id', pluginId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSub) {
        if (existingSub.status === 'expired' || existingSub.status === 'cancelled') {
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

          if (updateError) throw updateError;

          await fetchUserSubscriptions();
          await fetchUserPlugins();
          return updatedSub;
        }
        
        return existingSub as PluginSubscription;
      }

      const newSubscription = {
        user_id: user.id,
        plugin_id: pluginId,
        status: 'trial',
        activated_features: activatedFeatures,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .insert(newSubscription)
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
      console.error('❌ Erreur souscription plugin:', err);
      throw err;
    }
  };

  const createPluginSubscription = async (
    pluginId: string,
    subscriptionId: string
  ): Promise<{ url: string }> => {
    if (!supabase || !user) {
      throw new Error('Configuration invalide');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-plugin-subscription', {
        body: {
          plugin_id: pluginId,
          user_id: user.id,
          subscription_id: subscriptionId,
        },
      });

      if (error) throw error;

      if (!data || !data.url) {
        throw new Error('Pas d\'URL de checkout reçue');
      }

      return { url: data.url };
    } catch (err) {
      console.error('❌ Erreur création abonnement:', err);
      throw err;
    }
  };

  const updatePluginFeatures = async (
    subscriptionId: string,
    activatedFeatures: string[]
  ) => {
    if (!supabase) throw new Error('Supabase non configuré');

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
      console.error('❌ Erreur mise à jour fonctionnalités:', err);
      throw err;
    }
  };

  const updatePluginConfiguration = async (
    pluginId: string,
    settings: Record<string, any>
  ) => {
    if (!supabase || !user) {
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
      console.error('❌ Erreur mise à jour configuration:', err);
      throw err;
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!supabase) throw new Error('Supabase non configuré');

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
      console.error('❌ Erreur annulation abonnement:', err);
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
    createPluginSubscription,
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
