import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TeamMemberPluginAccess } from '../types/plugin';

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
              .eq('owner_id', user.id)
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
    if (!user) {
      return false;
    }

    if (!supabase) {
      return true;
    }

    try {
      // D'abord récupérer le plugin par son slug
      const { data: pluginData, error: pluginError } = await supabase
        .from('plugins')
        .select('id')
        .eq('slug', pluginSlug)
        .maybeSingle();

      if (pluginError || !pluginData) {
        return false;
      }

      // Vérifier si l'utilisateur a un abonnement actif pour ce plugin
      const { data: ownerSub } = await supabase
        .from('plugin_subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('plugin_id', pluginData.id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (ownerSub) {
        return true;
      }

      // Vérifier si membre d'équipe
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('owner_id, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teamMember || !teamMember.is_active) {
        return false;
      }

      // Vérifier si le propriétaire a le plugin
      const { data: ownerPlugin } = await supabase
        .from('plugin_subscriptions')
        .select('plugin_id, status')
        .eq('user_id', teamMember.owner_id)
        .eq('plugin_id', pluginData.id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (!ownerPlugin) {
        return false;
      }

      // Vérifier permission du membre
      const { data: permission } = await supabase
        .from('team_member_plugin_permissions')
        .select('can_access')
        .eq('owner_id', user.id)
        .eq('plugin_id', pluginData.id)
        .maybeSingle();

      return permission?.can_access || false;
    } catch (error) {
      console.error('❌ Erreur vérification accès:', error);
      return false;
    }
  }, [user]);

  const getTeamMemberPluginPermissions = useCallback(async (
    ownerId: string,
    teamMemberId: string
  ): Promise<TeamMemberPluginAccess[]> => {
    if (!supabase) {
      return [];
    }

    try {
      console.log('🔍 Chargement permissions pour team_member:', teamMemberId);
      console.log('👤 Propriétaire:', ownerId);

      // CORRECTION: Récupérer d'abord le user_id du team_member
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('id', teamMemberId)
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (memberError || !teamMember) {
        console.error('❌ Team member non trouvé:', memberError);
        return [];
      }

      const memberUserId = teamMember.user_id;
      console.log('👤 User ID du membre:', memberUserId);

      // Récupérer tous les plugins actifs du propriétaire
      const { data: ownerPlugins, error: pluginsError } = await supabase
        .from('plugin_subscriptions')
        .select(`
          plugin_id,
          plugins (
            id,
            name,
            slug,
            icon
          )
        `)
        .eq('user_id', ownerId)
        .in('status', ['active', 'trial']);

      if (pluginsError) throw pluginsError;

      if (!ownerPlugins || ownerPlugins.length === 0) {
        return [];
      }

      // Pour chaque plugin, vérifier la permission du membre
      const permissions: TeamMemberPluginAccess[] = [];

      for (const sub of ownerPlugins) {
        const plugin = sub.plugins as any;
        if (!plugin) continue;

        // Vérifier si une permission existe déjà
        const { data: existingPerm } = await supabase
          .from('team_member_plugin_permissions')
          .select('can_access')
          .eq('owner_id', memberUserId)
          .eq('plugin_id', sub.plugin_id)
          .maybeSingle();

        permissions.push({
          plugin_id: sub.plugin_id,
          plugin_name: plugin.name,
          plugin_slug: plugin.slug,
          plugin_icon: plugin.icon,
          can_access: existingPerm?.can_access || false
        });
      }

      console.log('✅ Permissions chargées:', permissions);
      return permissions;
    } catch (error) {
      console.error('❌ Erreur chargement permissions membre:', error);
      throw error;
    }
  }, []);

  const bulkUpdatePluginPermissions = useCallback(async (
    teamMemberId: string,
    updates: Array<{ pluginId: string; canAccess: boolean }>
  ): Promise<void> => {
    console.log('💾 === DÉBUT MISE À JOUR PERMISSIONS ===');
    console.log('👤 Team Member ID:', teamMemberId);
    console.log('👤 Owner ID (user connecté):', user?.id);
    console.log('📝 Updates:', updates);

    if (!supabase) {
      throw new Error('Supabase non configuré');
    }

    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      // CORRECTION: Chercher par ID de team_members, pas par user_id
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('id, user_id, owner_id, role_name, is_active')
        .eq('id', teamMemberId)
        .eq('owner_id', user.id)
        .maybeSingle();

      console.log('📊 Team member trouvé:', teamMember);

      if (teamMemberError) {
        console.error('❌ Erreur SQL:', teamMemberError);
        throw teamMemberError;
      }

      if (!teamMember) {
        throw new Error('Membre d\'équipe non trouvé');
      }

      const memberUserId = teamMember.user_id;
      console.log('✅ User ID du membre:', memberUserId);

      // ÉTAPE 2: Mise à jour des permissions
      for (const update of updates) {
        const { data: existing } = await supabase
          .from('team_member_plugin_permissions')
          .select('id')
          .eq('owner_id', memberUserId)
          .eq('plugin_id', update.pluginId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('team_member_plugin_permissions')
            .update({
              can_access: update.canAccess,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('team_member_plugin_permissions')
            .insert({
              team_member_id: teamMember.id,
              owner_id: memberUserId,
              plugin_id: update.pluginId,
              can_access: update.canAccess
            });
        }
      }

      console.log('✅ Permissions mises à jour avec succès');
    } catch (error) {
      console.error('❌ === ERREUR MISE À JOUR PERMISSIONS ===');
      console.error(error);
      throw error;
    }
  }, [user]);

  return {
    permissions,
    loading,
    checkPluginAccess,
    getTeamMemberPluginPermissions,
    bulkUpdatePluginPermissions,
    refreshPermissions: fetchPermissions
  };
}
