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

      // Vérifier si l'utilisateur est membre d'équipe
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('id, owner_id, role_name, permissions, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (teamError && teamError.code !== 'PGRST116') {
        throw teamError;
      }

      // Si pas de team_member, l'utilisateur est propriétaire = accès à tout
      if (!teamMember) {
        console.log('✅ Utilisateur propriétaire - accès complet');
        setPermissions({});
        setLoading(false);
        return;
      }

      console.log('👤 Membre d\'équipe détecté:', teamMember);

      // Récupérer les plugins du propriétaire
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
              .eq('team_member_id', teamMember.id)
              .eq('plugin_id', sub.plugin_id)
              .maybeSingle();

            if (permError && permError.code !== 'PGRST116') {
              console.error(`❌ Erreur permission ${pluginSlug}:`, permError);
            }

            // Par défaut, pas d'accès si pas de permission explicite
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
      console.log('❌ Pas d\'utilisateur connecté');
      return false;
    }

    if (!supabase) {
      console.log('✅ Mode démo - accès autorisé');
      return true;
    }

    try {
      console.log(`🔍 Vérification accès plugin: ${pluginSlug}`);

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

      // Récupérer le team_member
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('id, user_id')
        .eq('id', teamMemberId)
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (memberError || !teamMember) {
        console.error('❌ Team member non trouvé:', memberError);
        return [];
      }

      console.log('👤 Team member trouvé:', teamMember);

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
        console.log('📦 Aucun plugin actif pour le propriétaire');
        return [];
      }

      console.log('📦 Plugins du propriétaire:', ownerPlugins.length);

      // Pour chaque plugin, vérifier la permission du membre
      const permissions: TeamMemberPluginAccess[] = [];

      for (const sub of ownerPlugins) {
        const plugin = sub.plugins as any;
        if (!plugin) continue;

        // Vérifier si une permission existe déjà
        const { data: existingPerm, error: permError } = await supabase
          .from('team_member_plugin_permissions')
          .select('can_access')
          .eq('team_member_id', teamMember.id)
          .eq('plugin_id', sub.plugin_id)
          .maybeSingle();

        if (permError && permError.code !== 'PGRST116') {
          console.error('❌ Erreur lecture permission:', permError);
        }

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
      // Récupérer le team_member
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

      console.log('✅ Team member ID:', teamMember.id);

      // Mise à jour des permissions
      for (const update of updates) {
        console.log(`📝 Mise à jour permission pour plugin ${update.pluginId}: ${update.canAccess}`);

        const { data: existing, error: existingError } = await supabase
          .from('team_member_plugin_permissions')
          .select('id')
          .eq('team_member_id', teamMember.id)
          .eq('plugin_id', update.pluginId)
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('❌ Erreur recherche permission existante:', existingError);
          throw existingError;
        }

        if (existing) {
          console.log('🔄 Mise à jour permission existante:', existing.id);
          const { error: updateError } = await supabase
            .from('team_member_plugin_permissions')
            .update({
              can_access: update.canAccess,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour:', updateError);
            throw updateError;
          }
        } else {
          console.log('➕ Création nouvelle permission');
          const { error: insertError } = await supabase
            .from('team_member_plugin_permissions')
            .insert({
              team_member_id: teamMember.id,
              plugin_id: update.pluginId,
              can_access: update.canAccess
            });

          if (insertError) {
            console.error('❌ Erreur insertion:', insertError);
            throw insertError;
          }
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
