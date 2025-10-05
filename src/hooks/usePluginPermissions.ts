import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PluginPermission {
  plugin_slug: string;
  has_access: boolean;
}

export function usePluginPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }

    if (!supabase) {
      // Mode démo - tous les plugins accessibles
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Vérifier si l'utilisateur est propriétaire (pas dans team_members)
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('owner_id, role_name, permissions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      // Si pas de team_member, l'utilisateur est propriétaire = accès à tout
      if (!teamMember) {
        console.log('✅ Utilisateur propriétaire - accès complet');
        setPermissions({});
        setLoading(false);
        return;
      }

      console.log('👤 Membre d\'équipe détecté:', teamMember);

      // Si membre d'équipe, vérifier les permissions des plugins du propriétaire
      const { data: ownerPlugins, error: pluginsError } = await supabase
        .from('plugin_subscriptions')
        .select('plugin_id, plugins(slug)')
        .eq('user_id', teamMember.owner_id)
        .in('status', ['active', 'trial']);

      if (pluginsError) throw pluginsError;

      console.log('📦 Plugins du propriétaire:', ownerPlugins);

      // Vérifier les permissions pour chaque plugin
      const permsMap: Record<string, boolean> = {};
      
      if (ownerPlugins) {
        for (const sub of ownerPlugins) {
          const pluginSlug = (sub.plugins as any)?.slug;
          if (pluginSlug) {
            // Vérifier si le membre a accès à ce plugin
            const { data: permission, error: permError } = await supabase
              .from('team_member_plugin_permissions')
              .select('can_access')
              .eq('user_id', user.id)
              .eq('owner_id', teamMember.owner_id)
              .eq('plugin_id', sub.plugin_id)
              .maybeSingle();

            permsMap[pluginSlug] = permission?.can_access || false;
            console.log(`🔐 Permission ${pluginSlug}:`, permission?.can_access || false);
          }
        }
      }

      setPermissions(permsMap);
    } catch (error) {
      console.error('❌ Erreur chargement permissions:', error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const checkPluginAccess = useCallback(async (pluginSlug: string): Promise<boolean> => {
    console.log('🔍 === DÉBUT VÉRIFICATION ===');
    console.log('🔍 Plugin slug:', pluginSlug);
    console.log('🔍 User:', user?.id);
    console.log('🔍 Supabase configuré:', !!supabase);

    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return false;
    }

    if (!supabase) {
      console.log('✅ Mode démo - accès autorisé');
      return true;
    }

    try {
      // ÉTAPE 1: Vérifier si propriétaire
      console.log('📍 ÉTAPE 1: Vérification propriétaire');
      const { data: ownerSub, error: ownerError } = await supabase
        .from('plugin_subscriptions')
        .select('id, status, plugins(slug)')
        .eq('user_id', user.id);

      console.log('📊 Tous les abonnements utilisateur:', ownerSub);
      console.log('📊 Erreur requête:', ownerError);

      if (ownerSub && ownerSub.length > 0) {
        console.log('📍 Abonnements trouvés, vérification du plugin...');
        // CORRECTION: Accepter active ET trial
        const validPlugins = ownerSub.filter(sub => 
          sub.status === 'active' || sub.status === 'trial'
        );
        console.log('📊 Abonnements valides (active + trial):', validPlugins);
        
        const hasPlugin = validPlugins.some(sub => {
          const slug = (sub.plugins as any)?.slug;
          console.log(`  - Comparaison: ${slug} === ${pluginSlug} ?`, slug === pluginSlug);
          return slug === pluginSlug;
        });
        
        if (hasPlugin) {
          console.log('✅ PROPRIÉTAIRE AVEC PLUGIN ACTIF/TRIAL');
          return true;
        } else {
          console.log('⚠️ Propriétaire mais plugin non trouvé');
        }
      } else {
        console.log('⚠️ Aucun abonnement trouvé pour cet utilisateur');
      }

      // ÉTAPE 2: Vérifier si membre d'équipe
      console.log('📍 ÉTAPE 2: Vérification membre d\'équipe');
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('owner_id, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('👥 Résultat team_member:', teamMember);
      console.log('👥 Erreur:', teamError);

      if (!teamMember) {
        console.log('❌ NI PROPRIÉTAIRE NI MEMBRE D\'ÉQUIPE');
        return false;
      }

      if (!teamMember.is_active) {
        console.log('❌ Membre d\'équipe inactif');
        return false;
      }

      // ÉTAPE 3: Vérifier plugins du propriétaire
      console.log('📍 ÉTAPE 3: Vérification plugins du propriétaire');
      console.log('👤 Owner ID:', teamMember.owner_id);
      
      const { data: ownerPlugin, error: pluginError } = await supabase
        .from('plugin_subscriptions')
        .select('plugin_id, status, plugins(slug)')
        .eq('user_id', teamMember.owner_id);

      console.log('📦 Tous les plugins du propriétaire:', ownerPlugin);
      console.log('📦 Erreur:', pluginError);

      // CORRECTION: Accepter active ET trial
      const validOwnerPlugins = ownerPlugin?.filter(p => 
        p.status === 'active' || p.status === 'trial'
      );
      console.log('📦 Plugins valides du propriétaire (active + trial):', validOwnerPlugins);

      const ownerHasPlugin = validOwnerPlugins?.find(p => {
        const slug = (p.plugins as any)?.slug;
        console.log(`  - Comparaison owner: ${slug} === ${pluginSlug} ?`, slug === pluginSlug);
        return slug === pluginSlug;
      });
      
      if (!ownerHasPlugin) {
        console.log('❌ PROPRIÉTAIRE N\'A PAS CE PLUGIN');
        return false;
      }

      console.log('✅ Propriétaire a le plugin, plugin_id:', ownerHasPlugin.plugin_id);

      // ÉTAPE 4: Vérifier permission du membre
      console.log('📍 ÉTAPE 4: Vérification permission membre');
      const { data: permission, error: permError } = await supabase
        .from('team_member_plugin_permissions')
        .select('can_access')
        .eq('user_id', user.id)
        .eq('owner_id', teamMember.owner_id)
        .eq('plugin_id', ownerHasPlugin.plugin_id)
        .maybeSingle();

      console.log('🔐 Permission trouvée:', permission);
      console.log('🔐 Erreur:', permError);
      console.log('🔐 can_access:', permission?.can_access);

      const finalResult = permission?.can_access || false;
      console.log('🎯 RÉSULTAT FINAL:', finalResult);
      console.log('🔍 === FIN VÉRIFICATION ===');

      return finalResult;
    } catch (error) {
      console.error('❌ ERREUR CRITIQUE:', error);
      return false;
    }
  }, [user]);

  return {
    permissions,
    loading,
    checkPluginAccess,
    refreshPermissions: fetchPermissions
  };
}
