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

      console.log('🔍 Chargement abonnements pour:', user.id);

      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .select(`
          *,
          plugin:plugins(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Abonnements chargés:', data?.length || 0);
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

      console.log('🔍 Chargement plugins actifs pour:', user.id);

      const { data, error } = await supabase
        .rpc('get_user_active_plugins', { p_user_id: user.id });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw error;
      }

      const formattedPlugins: UserPlugin[] = (data || []).map((plugin: any) => ({
        plugin_id: plugin.plugin_id,
        plugin_name: plugin.plugin_name,
        plugin_slug: plugin.plugin_slug,
        plugin_icon: plugin.plugin_icon,
        plugin_category: plugin.plugin_category,
        activated_features: plugin.activated_features || [],
        settings: plugin.settings || {}
      }));

      console.log('✅ Plugins actifs chargés:', formattedPlugins.length);
      setUserPlugins(formattedPlugins);

    } catch (err) {
      console.error('❌ Erreur chargement plugins actifs:', err);
      setUserPlugins([]);
    }
  };

  const hasPluginAccess = async (pluginSlug: string): Promise<boolean> => {
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return false;
    }

    if (!supabase) {
      console.log('✅ Mode démo - accès autorisé');
      return true;
    }

    try {
      console.log(`🔍 Vérification accès plugin: ${pluginSlug}`);

      const { data, error } = await supabase
        .rpc('has_plugin_access', {
          p_user_id: user.id,
          p_plugin_slug: pluginSlug
        });

      if (error) {
        console.error('❌ Erreur vérification accès:', error);
        return false;
      }

      console.log(`🔐 Accès plugin ${pluginSlug}:`, data);
      return data || false;
    } catch (error) {
      console.error('❌ Erreur vérification accès:', error);
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
      console.log('🎯 Début souscription plugin (trial):', pluginId);

      // Vérifier si une souscription existe déjà
      const { data: existingSub, error: checkError } = await supabase
        .from('plugin_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plugin_id', pluginId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingSub) {
        console.log('📋 Souscription existante trouvée:', existingSub.status);
        
        // Si la souscription est expirée ou annulée, on la réactive en trial
        if (existingSub.status === 'expired' || existingSub.status === 'cancelled') {
          console.log('🔄 Réactivation de la souscription en trial');
          
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);
          
          const { data: updatedSub, error: updateError } = await supabase
            .from('plugin_subscriptions')
            .update({
              status: 'trial',
              is_trial: true,
              trial_ends_at: trialEnd.toISOString(),
              current_period_start: new Date().toISOString(),
              current_period_end: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id)
            .select(`
              *,
              plugin:plugins(*)
            `)
            .single();

          if (updateError) throw updateError;

          console.log('✅ Souscription réactivée avec trial_ends_at:', trialEnd.toISOString());
          return updatedSub;
        }
        
        // Si la souscription existe mais n'a pas les champs trial, on les ajoute
        if (existingSub.status === 'trial' && (!existingSub.is_trial || !existingSub.trial_ends_at)) {
          console.log('🔧 Correction des champs trial manquants');
          
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 7);
          
          const { data: updatedSub, error: updateError } = await supabase
            .from('plugin_subscriptions')
            .update({
              is_trial: true,
              trial_ends_at: trialEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id)
            .select(`
              *,
              plugin:plugins(*)
            `)
            .single();

          if (updateError) throw updateError;

          console.log('✅ Champs trial corrigés, trial_ends_at:', trialEnd.toISOString());
          return updatedSub;
        }
        
        console.log('✅ Souscription déjà active');
        return existingSub as PluginSubscription;
      }

      // Créer une nouvelle souscription en trial (7 jours)
      console.log('➕ Création nouvelle souscription trial (7 jours)');
      
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      
      const newSubscription = {
        user_id: user.id,
        plugin_id: pluginId,
        status: 'trial',
        is_trial: true,
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: null
      };

      console.log('📝 Données de la nouvelle souscription:', newSubscription);

      const { data, error } = await supabase
        .from('plugin_subscriptions')
        .insert(newSubscription)
        .select(`
          *,
          plugin:plugins(*)
        `)
        .single();

      if (error) throw error;

      console.log('✅ Souscription trial créée avec trial_ends_at:', trialEnd.toISOString());

      return data;
    } catch (err) {
      console.error('❌ Erreur souscription plugin:', err);
      throw err;
    }
  };

  const getPluginPaymentLink = (plugin: Plugin): string | null => {
    // Vérifier si le plugin a un Payment Link configuré
    if (plugin.stripe_payment_link) {
      console.log('✅ Payment Link trouvé pour', plugin.name);
      return plugin.stripe_payment_link;
    }

    console.warn('⚠️ Pas de Payment Link configuré pour', plugin.name);
    return null;
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
    getPluginPaymentLink,
    cancelSubscription,
    refetch: async () => {
      console.log('🔄 Rechargement des données...');
      await Promise.all([
        fetchPlugins(),
        fetchUserSubscriptions(),
        fetchUserPlugins()
      ]);
      console.log('✅ Données rechargées');
    }
  };
}
