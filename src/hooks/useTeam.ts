import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, isNetworkError, retryRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TeamMember, AVAILABLE_PERMISSIONS, TEAM_ROLES, getUserRole, canPerformAction } from '../types/team';

export function useTeam() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userPluginPermissions, setUserPluginPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = async () => {
    if (!user) {
      setTeamMembers([]);
      setUserPermissions([]);
      setUserPluginPermissions([]);
      setUserRole('viewer');
      setIsOwner(false);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setTeamMembers([]);
      setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
      setUserPluginPermissions([]);
      setUserRole('owner');
      setIsOwner(true);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data: ownedTeamMembers, error: ownedError } = await retryRequest(
        () => supabase
          .from('team_members')
          .select('*')
          .eq('owner_id', user.id)
          .neq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        3,
        1000
      );

      if (!ownedError && ownedTeamMembers !== null) {
        if (ownedTeamMembers.length > 0) {
          setIsOwner(true);
          setTeamMembers(ownedTeamMembers);
          setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
          setUserPluginPermissions([]);
          setUserRole('owner');
        } else {
          await checkMembership();
        }
      } else {
        await checkMembership();
      }

      async function checkMembership() {
        const { data: membershipData, error: membershipError } = await retryRequest(
          () => supabase
            .from('team_members')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle(),
          3,
          1000
        );

        if (membershipData && !membershipError) {
          const memberPermissions = Array.isArray(membershipData.permissions) 
            ? membershipData.permissions 
            : [];

          const { data: pluginPerms } = await supabase
            .from('team_member_plugin_permissions')
            .select('plugin_id')
            .eq('team_member_id', membershipData.id);

          const pluginIds = pluginPerms?.map(p => p.plugin_id) || [];

          setIsOwner(false);
          setTeamMembers([]);
          setUserPermissions(memberPermissions);
          setUserPluginPermissions(pluginIds);
          setUserRole(membershipData.role_name || 'viewer');
        } else {
          setIsOwner(true);
          setTeamMembers([]);
          setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
          setUserPluginPermissions([]);
          setUserRole('owner');
        }
      }

    } catch (err) {
      console.error('❌ useTeam: Erreur chargement équipe:', err);
      
      if (isNetworkError(err)) {
        setError('Connexion réseau indisponible. Mode hors ligne activé.');
        setIsOwner(true);
        setTeamMembers([]);
        setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
        setUserPluginPermissions([]);
        setUserRole('owner');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
        setIsOwner(true);
        setTeamMembers([]);
        setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
        setUserPluginPermissions([]);
        setUserRole('owner');
      }
    } finally {
      setLoading(false);
    }
  };

  const inviteTeamMember = async (memberData: {
    email: string;
    password: string;
    full_name?: string;
    role_name: string;
    permissions: string[];
  }) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/invite-team-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          owner_id: user.id,
          email: memberData.email,
          password: memberData.password,
          full_name: memberData.full_name,
          role_name: memberData.role_name,
          permissions: memberData.permissions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'invitation');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'invitation');
      }

      await fetchTeamData();
      return result.member;

    } catch (error) {
      console.error('❌ useTeam: Erreur invitation membre:', error);
      throw error;
    }
  };

  const updateMemberPermissions = async (memberId: string, permissions: string[], role_name?: string) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      const updateData: any = {
        permissions,
        updated_at: new Date().toISOString()
      };
      
      if (role_name) {
        updateData.role_name = role_name;
      }
      
      const { error } = await supabase
        .from('team_members')
        .update(updateData)
        .eq('id', memberId)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      await fetchTeamData();
    } catch (error) {
      console.error('❌ useTeam: Erreur mise à jour permissions:', error);
      throw error;
    }
  };

  const updateMemberPluginPermissions = async (memberId: string, pluginIds: string[]) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      await supabase
        .from('team_member_plugin_permissions')
        .delete()
        .eq('team_member_id', memberId);

      if (pluginIds.length > 0) {
        const permissions = pluginIds.map(pluginId => ({
          team_member_id: memberId,
          plugin_id: pluginId,
          granted_by: user.id
        }));

        const { error } = await supabase
          .from('team_member_plugin_permissions')
          .insert(permissions);

        if (error) throw error;
      }

      await fetchTeamData();
    } catch (error) {
      console.error('❌ useTeam: Erreur mise à jour permissions plugins:', error);
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .eq('owner_id', user.id);

      if (error) {
        throw error;
      }

      await fetchTeamData();
    } catch (error) {
      console.error('❌ useTeam: Erreur suppression membre:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (isOwner) return true;
    return userPermissions.includes(permission);
  };

  const hasPluginAccess = (pluginId: string): boolean => {
    if (isOwner) return true;
    return userPluginPermissions.includes(pluginId);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (isOwner) return true;
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (isOwner) return true;
    return permissions.every(permission => userPermissions.includes(permission));
  };

  const canEditBooking = (booking: any): boolean => {
    if (isOwner) return true;
    if (hasPermission('edit_all_bookings')) return true;
    if (hasPermission('edit_own_bookings') && booking.assigned_user_id === user?.id) {
      return true;
    }
    return false;
  };

  const canDeleteBooking = (booking: any): boolean => {
    if (isOwner) return true;
    return hasPermission('delete_booking');
  };

  const canManageTeam = (): boolean => {
    return isOwner || hasPermission('manage_team');
  };

  const canViewFinancialData = (): boolean => {
    return isOwner || hasPermission('view_revenue') || hasPermission('view_financial_reports');
  };

  const getUserRoleInfo = () => {
    if (isOwner) return TEAM_ROLES.owner;
    if (userRole && TEAM_ROLES[userRole]) {
      return TEAM_ROLES[userRole];
    }
    const roleFromPermissions = getUserRole(userPermissions);
    return roleFromPermissions;
  };

  const getAccessLevel = (): number => {
    const roleInfo = getUserRoleInfo();
    return roleInfo.level;
  };

  const getUsageLimits = () => {
    const accessLevel = getAccessLevel();
    
    switch (accessLevel) {
      case 4:
        return {
          canCreateUnlimited: true,
          canEditAll: true,
          canDeleteAll: true,
          canManageTeam: true,
          canViewAllFinancials: true,
          maxBookingsPerDay: null,
          maxServicesCreated: null,
          maxClientsCreated: null
        };
      case 3:
        return {
          canCreateUnlimited: true,
          canEditAll: true,
          canDeleteAll: true,
          canManageTeam: false,
          canViewAllFinancials: true,
          maxBookingsPerDay: null,
          maxServicesCreated: null,
          maxClientsCreated: null
        };
      case 2:
        return {
          canCreateUnlimited: true,
          canEditAll: true,
          canDeleteAll: false,
          canManageTeam: false,
          canViewAllFinancials: false,
          maxBookingsPerDay: 50,
          maxServicesCreated: 20,
          maxClientsCreated: 100
        };
      case 1:
        return {
          canCreateUnlimited: false,
          canEditAll: false,
          canDeleteAll: false,
          canManageTeam: false,
          canViewAllFinancials: false,
          maxBookingsPerDay: 20,
          maxServicesCreated: 5,
          maxClientsCreated: 50
        };
      default:
        return {
          canCreateUnlimited: false,
          canEditAll: false,
          canDeleteAll: false,
          canManageTeam: false,
          canViewAllFinancials: false,
          maxBookingsPerDay: 0,
          maxServicesCreated: 0,
          maxClientsCreated: 0
        };
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user?.id]);

  return {
    teamMembers,
    userPermissions,
    userPluginPermissions,
    userRole,
    isOwner,
    loading,
    error,
    hasPermission,
    hasPluginAccess,
    hasAnyPermission,
    hasAllPermissions,
    canEditBooking,
    canDeleteBooking,
    canManageTeam,
    canViewFinancialData,
    getUserRoleInfo,
    getAccessLevel,
    getUsageLimits,
    inviteTeamMember,
    updateMemberPermissions,
    updateMemberPluginPermissions,
    removeMember,
    refetch: fetchTeamData
  };
}
