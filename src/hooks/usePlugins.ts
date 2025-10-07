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

      console.log('🔍 Chargement plugins pour utilisateur:', user.id);

      // ÉTAPE 1 : Vérifier l'abonnement principal (trial ou actif)
      const { data: mainSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status, is_trial, trial_ends_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      // Si l'utilisateur a un abonnement trial ou actif, accès complet
      if (mainSubscription && (mainSubscription.status === 'trial' || mainSubscription.status === 'active')) {
        console.log('✅ Abonnement principal actif:', mainSubscription.status);
        
        // Récupérer TOUS les plugins actifs
        const { data: allPlugins, error: pluginsError } = await supabase
          .from('plugins')
          .select('id, name, slug, icon, category')
          .eq('is_active', true);

        if (pluginsError) throw pluginsError;

        const formattedPlugins: UserPlugin[] = (allPlugins || []).map((plugin: any) => ({
          plugin_id: plugin.id,
          plugin_name: plugin.name,
          plugin_slug: plugin.slug,
          plugin_icon: plugin.icon,
          plugin_category: plugin.category,
          activated_features: [],
          settings: {}
        }));

        console.log('✅ Accès complet à tous les plugins (trial/actif):', formattedPlugins.length);
        setUserPlugins(formattedPlugins);
        return;
      }

      // ÉTAPE 2 : Vérifier si l'utilisateur est membre d'équipe
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('id, owner_id, role_name, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (teamError && teamError.code !== 'PGRST116') {
        throw teamError;
      }

      // CAS 1 : Utilisateur est propriétaire (pas de team_member)
      if (!teamMember) {
        console.log('✅ Utilisateur propriétaire - vérification abonnements plugins');
        
        const { data, error } = await supabase
          .from('plugin_subscriptions')
          .select(`
            plugin_id,
            activated_features,
            plugin:plugins(
              id,
              name,
              slug,
              icon,
              category
            )
          `)
          .eq('user_id', user.id)
          .in('status', ['active', 'trial']);

        if (error) throw error;

        const formattedPlugins: UserPlugin[] = (data || [])
          .filter((sub: any) => sub.plugin)
          .map((sub: any) => ({
            plugin_id: sub.plugin.id,
            plugin_name: sub.plugin.name,
            plugin_slug: sub.plugin.slug,
            plugin_icon: sub.plugin.icon,
            plugin_category: sub.plugin.category,
            activated_features: sub.activated_features || [],
            settings: {}
          }));

        console.log('✅ Plugins propriétaire:', formattedPlugins);
        setUserPlugins(formattedPlugins);
        return;
      }

      // CAS 2 : Utilisateur est membre d'équipe
      console.log('👤 Utilisateur membre d\'équipe:', teamMember.id);
      console.log('👤 Propriétaire:', teamMember.owner_id);

      // Récupérer les plugins du propriétaire
      const { data: ownerPlugins, error: pluginsError } = await supabase
        .from('plugin_subscriptions')
        .select(`
          plugin_id,
          activated_features,
          plugin:plugins(
            id,
            name,
            slug,
            icon,
            category
          )
        `)
        .eq('user_id', teamMember.owner_id)
        .in('status', ['active', 'trial']);

      if (pluginsError) throw pluginsError;

      console.log('📦 Plugins du propriétaire:', ownerPlugins?.length || 0);

      if (!ownerPlugins || ownerPlugins.length === 0) {
        console.log('ℹ️ Aucun plugin actif pour le propriétaire');
        setUserPlugins([]);
        return;
      }

      // Récupérer les permissions du membre pour chaque plugin
      const { data: permissions, error: permError } = await supabase
        .from('team_member_plugin_permissions')
        .select('plugin_id, can_access')
        .eq('team_member_id', teamMember.id);

      if (permError && permError.code !== 'PGRST116') {
        throw permError;
      }

      console.log('🔐 Permissions trouvées:', permissions);

      // Créer un Map des permissions
      const permissionsMap = new Map(
        (permissions || []).map(p => [p.plugin_id, p.can_access])
      );

      // Filtrer les plugins selon les permissions
      const allowedPlugins: UserPlugin[] = ownerPlugins
        .filter((sub: any) => {
          const hasPermission = permissionsMap.get(sub.plugin_id);
          console.log(`🔍 Plugin ${sub.plugin?.slug}: permission =`, hasPermission);
          return hasPermission === true;
        })
        .filter((sub: any) => sub.plugin)
        .map((sub: any) => ({
          plugin_id: sub.plugin.id,
          plugin_name: sub.plugin.name,
          plugin_slug: sub.plugin.slug,
          plugin_icon: sub.plugin.icon,
          plugin_category: sub.plugin.category,
          activated_features: sub.activated_features || [],
          settings: {}
        }));

      console.log('✅ Plugins autorisés pour le membre:', allowedPlugins);
      setUserPlugins(allowedPlugins);

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

      // ÉTAPE 1 : Vérifier l'abonnement principal (trial ou actif)
      const { data: mainSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status, is_trial, trial_ends_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification abonnement:', subError);
      }

      // Si l'utilisateur a un abonnement trial ou actif, accès complet
      if (mainSubscription && (mainSubscription.status === 'trial' || mainSubscription.status === 'active')) {
        console.log('✅ Accès autorisé via abonnement principal:', mainSubscription.status);
        return true;
      }

      // Récupérer le plugin par son slug
      const { data: pluginData, error: pluginError } = await supabase
        .from('plugins')
        .select('id')
        .eq('slug', pluginSlug)
        .maybeSingle();

      if (pluginError || !pluginData) {
        console.log('❌ Plugin non trouvé:', pluginSlug);
        return false;
      }

      console.log('📦 Plugin trouvé:', pluginData.id);

      // Vérifier si l'utilisateur est propriétaire avec un abonnement actif
      const { data: ownerSub, error: ownerSubError } = await supabase
        .from('plugin_subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('plugin_id', pluginData.id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (ownerSubError && ownerSubError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification abonnement propriétaire:', ownerSubError);
      }

      if (ownerSub) {
        console.log('✅ Propriétaire avec abonnement actif');
        return true;
      }

      // Vérifier si membre d'équipe
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('id, owner_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (teamError && teamError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification membre équipe:', teamError);
        return false;
      }

      if (!teamMember) {
        console.log('❌ Pas membre d\'équipe et pas d\'abonnement');
        return false;
      }

      console.log('👤 Membre d\'équipe trouvé:', teamMember.id);

      // Vérifier si le propriétaire a le plugin
      const { data: ownerPlugin, error: ownerPluginError } = await supabase
        .from('plugin_subscriptions')
        .select('plugin_id, status')
        .eq('user_id', teamMember.owner_id)
        .eq('plugin_id', pluginData.id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (ownerPluginError && ownerPluginError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification plugin propriétaire:', ownerPluginError);
      }

      if (!ownerPlugin) {
        console.log('❌ Le propriétaire n\'a pas ce plugin');
        return false;
      }

      console.log('✅ Le propriétaire a le plugin');

      // Vérifier la permission du membre
      const { data: permission, error: permError } = await supabase
        .from('team_member_plugin_permissions')
        .select('can_access')
        .eq('team_member_id', teamMember.id)
        .eq('plugin_id', pluginData.id)
        .maybeSingle();

      if (permError && permError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification permission:', permError);
        return false;
      }

      const hasAccess = permission?.can_access || false;
      console.log(`🔐 Permission finale: ${hasAccess}`);
      
      return hasAccess;
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
