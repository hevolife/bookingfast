import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MemberAccessiblePlugin, TeamMemberPluginAccess } from '../types/plugin';

export function usePluginPermissions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPluginAccess = useCallback(async (pluginSlug: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !user) {
      console.log('❌ Pas de config Supabase ou pas d\'utilisateur');
      return false;
    }

    try {
      console.log('🔍 Vérification accès plugin:', { userId: user.id, pluginSlug });

      const { data, error } = await supabase.rpc('check_plugin_access', {
        p_user_id: user.id,
        p_plugin_slug: pluginSlug
      });

      if (error) {
        console.error('❌ Erreur RPC check_plugin_access:', error);
        throw error;
      }

      console.log('✅ Résultat check_plugin_access:', data);
      return data === true;
    } catch (err) {
      console.error('❌ Erreur vérification accès plugin:', err);
      return false;
    }
  }, [user]);

  const getMemberAccessiblePlugins = useCallback(async (): Promise<MemberAccessiblePlugin[]> => {
    if (!isSupabaseConfigured() || !user) return [];

    try {
      const { data, error } = await supabase.rpc('get_member_accessible_plugins', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('❌ Erreur récupération plugins accessibles:', err);
      return [];
    }
  }, [user]);

  const getTeamMemberPluginPermissions = useCallback(async (
    ownerId: string,
    memberId: string
  ): Promise<TeamMemberPluginAccess[]> => {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase.rpc('get_team_member_plugin_permissions', {
        p_owner_id: ownerId,
        p_member_id: memberId
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('❌ Erreur récupération permissions membre:', err);
      return [];
    }
  }, []);

  const updatePluginPermission = useCallback(async (
    memberId: string,
    pluginId: string,
    canAccess: boolean
  ): Promise<void> => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Configuration invalide');
    }

    try {
      const { error } = await supabase
        .from('team_member_plugin_permissions')
        .upsert({
          team_member_id: memberId,
          owner_id: user.id,
          plugin_id: pluginId,
          can_access: canAccess,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_member_id,owner_id,plugin_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    } catch (err) {
      console.error('❌ Erreur mise à jour permission:', err);
      throw err;
    }
  }, [user]);

  const bulkUpdatePluginPermissions = useCallback(async (
    memberId: string,
    permissions: { pluginId: string; canAccess: boolean }[]
  ): Promise<void> => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Configuration invalide');
    }

    try {
      const updates = permissions.map(p => ({
        team_member_id: memberId,
        owner_id: user.id,
        plugin_id: p.pluginId,
        can_access: p.canAccess,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('team_member_plugin_permissions')
        .upsert(updates, {
          onConflict: 'team_member_id,owner_id,plugin_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    } catch (err) {
      console.error('❌ Erreur mise à jour permissions en masse:', err);
      throw err;
    }
  }, [user]);

  return {
    loading,
    error,
    checkPluginAccess,
    getMemberAccessiblePlugins,
    getTeamMemberPluginPermissions,
    updatePluginPermission,
    bulkUpdatePluginPermissions
  };
}
