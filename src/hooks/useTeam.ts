import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, isNetworkError, retryRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TeamMember, AVAILABLE_PERMISSIONS, TEAM_ROLES, getUserRole, canPerformAction } from '../types/team';

export function useTeam() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = async () => {
    console.log('🚀 useTeam: DÉBUT fetchTeamData');
    console.log('🚀 useTeam: User connecté:', !!user);
    console.log('🚀 useTeam: User email:', user?.email);
    console.log('🚀 useTeam: User ID:', user?.id);

    if (!user) {
      console.log('❌ useTeam: Pas d\'utilisateur connecté');
      setTeamMembers([]);
      setUserPermissions([]);
      setUserRole('viewer');
      setIsOwner(false);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      console.log('🎭 useTeam: Mode démo - utilisateur propriétaire avec toutes les permissions');
      setTeamMembers([]);
      setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
      setUserRole('owner');
      setIsOwner(true);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 useTeam: Début chargement données équipe pour:', user.email);
      console.log('🔍 useTeam: User ID:', user.id);
      console.log('🔍 useTeam: Supabase configuré:', isSupabaseConfigured());
      
      setError(null);

      // ÉTAPE 1: Vérifier si l'utilisateur possède une équipe (= propriétaire)
      console.log('👑 useTeam: Vérification si propriétaire d\'équipe...');
      
      const { data: ownedTeamMembers, error: ownedError } = await retryRequest(
        () => supabase
          .from('team_members')
          .select('*')
          .eq('owner_id', user.id)
          .neq('user_id', user.id) // Exclure l'utilisateur lui-même
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        3,
        1000
      );

      console.log('📊 useTeam: Requête propriétaire terminée');
      console.log('🔍 useTeam: Erreur propriétaire:', ownedError);
      console.log('🔍 useTeam: Membres possédés:', ownedTeamMembers?.length || 0);

      if (!ownedError && ownedTeamMembers !== null) {
        // L'utilisateur est propriétaire seulement s'il a des membres (autres que lui-même)
        console.log('👑 useTeam: Utilisateur est PROPRIÉTAIRE');
        console.log('👑 useTeam: Nombre de membres dans son équipe:', ownedTeamMembers.length);
        
        if (ownedTeamMembers.length > 0) {
          setIsOwner(true);
          setTeamMembers(ownedTeamMembers);
          setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id)); // Toutes les permissions
          setUserRole('owner');
          
          console.log('👑 useTeam: États mis à jour - isOwner: true, permissions: toutes');
        } else {
          // Pas de membres = pas propriétaire, vérifier si membre
          console.log('👥 useTeam: Pas de membres trouvés, vérification membership...');
          await checkMembership();
        }
      } else {
        // Vérifier si membre d'une équipe
        await checkMembership();
      }

      // Fonction pour vérifier le membership
      async function checkMembership() {
        console.log('👥 useTeam: Vérification si membre d\'équipe...');
        console.log('🔍 useTeam: Vérification si membre d\'équipe pour user_id:', user.id);
        
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

        console.log('📊 useTeam: Requête membership terminée');
        console.log('🔍 useTeam: Erreur membership:', membershipError);
        console.log('🔍 useTeam: Données membership:', membershipData);

        if (membershipData && !membershipError) {
          // L'utilisateur est membre d'une équipe
          console.log('👥 useTeam: Utilisateur est MEMBRE d\'équipe');
          console.log('👥 useTeam: Owner ID:', membershipData.owner_id);
          console.log('👥 useTeam: User ID:', user.id);
          console.log('👥 useTeam: Rôle:', membershipData.role_name);
          console.log('👥 useTeam: Permissions stockées:', membershipData.permissions);
          
          const memberPermissions = Array.isArray(membershipData.permissions) 
            ? membershipData.permissions 
            : [];
          
          console.log('👥 useTeam: Permissions finales du membre:', memberPermissions);
          console.log('👥 useTeam: Nombre de permissions:', memberPermissions.length);
          console.log('👥 useTeam: Rôle stocké en base:', membershipData.role_name);
          
          setIsOwner(false);
          setTeamMembers([]);
          setUserPermissions(memberPermissions);
          setUserRole(membershipData.role_name || 'viewer');
          
          console.log('👥 useTeam: Rôle final assigné:', membershipData.role_name || 'viewer');
        } else {
          // Utilisateur autonome (ni propriétaire ni membre)
          console.log('🔄 useTeam: Utilisateur autonome - accès propriétaire par défaut');
          setIsOwner(true);
          setTeamMembers([]);
          setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
          setUserRole('owner');
        }
      }

    } catch (err) {
      console.error('❌ useTeam: Erreur chargement équipe:', err);
      
      // Gestion spécifique des erreurs réseau
      if (isNetworkError(err)) {
        console.warn('🌐 useTeam: Erreur réseau détectée - mode hors ligne');
        setError('Connexion réseau indisponible. Mode hors ligne activé.');
        
        // Mode hors ligne - donner accès propriétaire par défaut
        setIsOwner(true);
        setTeamMembers([]);
        setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
        setUserRole('owner');
      } else {
        // Autres erreurs
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
        
        // Fallback en cas d'erreur - donner accès propriétaire
        console.log('🔄 useTeam: Fallback - accès propriétaire accordé');
        setIsOwner(true);
        setTeamMembers([]);
        setUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
        setUserRole('owner');
      }
    } finally {
      console.log('🏁 useTeam: Finally block - setLoading(false)');
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
      console.log('📧 useTeam: Invitation membre:', memberData.email, 'Rôle:', memberData.role_name);
      
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

      // Recharger les données
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
      console.log('🔄 useTeam: Mise à jour permissions membre:', memberId);
      console.log('📋 useTeam: Nouvelles permissions:', permissions);
      console.log('🏷️ useTeam: Nouveau rôle:', role_name);
      
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

      console.log('✅ useTeam: Permissions mises à jour avec succès');
      await fetchTeamData();
    } catch (error) {
      console.error('❌ useTeam: Erreur mise à jour permissions:', error);
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      console.log('🗑️ useTeam: Suppression membre:', memberId);
      
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

      console.log('✅ useTeam: Membre supprimé avec succès');
      await fetchTeamData();
    } catch (error) {
      console.error('❌ useTeam: Erreur suppression membre:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Le propriétaire a toujours toutes les permissions
    if (isOwner) return true;
    
    // Vérifier si l'utilisateur a la permission spécifique
    const hasDirectPermission = userPermissions.includes(permission);
    
    console.log('🔍 useTeam: Vérification permission:', permission);
    console.log('🔍 useTeam: Permissions utilisateur:', userPermissions);
    console.log('🔍 useTeam: A la permission:', hasDirectPermission);
    console.log('🔍 useTeam: Est propriétaire:', isOwner);
    
    return hasDirectPermission;
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
    
    // Si l'utilisateur peut modifier toutes les réservations
    if (hasPermission('edit_all_bookings')) return true;
    
    // Si l'utilisateur peut modifier seulement ses réservations assignées
    if (hasPermission('edit_own_bookings') && booking.assigned_user_id === user?.id) {
      return true;
    }
    
    return false;
  };

  const canDeleteBooking = (booking: any): boolean => {
    if (isOwner) return true;
    
    // Seuls les admins peuvent supprimer des réservations
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
    
    // Si on a un rôle stocké en base, l'utiliser directement
    if (userRole && TEAM_ROLES[userRole]) {
      console.log('🎯 useTeam: Utilisation du rôle stocké en base:', userRole, TEAM_ROLES[userRole].name);
      return TEAM_ROLES[userRole];
    }
    
    // Sinon, déterminer le rôle par les permissions
    const roleFromPermissions = getUserRole(userPermissions);
    console.log('🎯 useTeam: Rôle déterminé par permissions:', roleFromPermissions.name);
    return roleFromPermissions;
  };

  const getAccessLevel = (): number => {
    const roleInfo = getUserRoleInfo();
    return roleInfo.level;
  };

  // Fonction pour obtenir les limites d'utilisation selon le rôle
  const getUsageLimits = () => {
    const accessLevel = getAccessLevel();
    
    switch (accessLevel) {
      case 4: // Propriétaire
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
      case 3: // Admin
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
      case 2: // Manager
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
      case 1: // Employé/Réceptionniste
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
      default: // Viewer
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
    console.log('🔄 useTeam: useEffect déclenché, user:', user?.email);
    if (user) {
      console.log('🔄 useTeam: Appel fetchTeamData...');
      fetchTeamData();
    }
  }, [user?.id]);

  return {
    teamMembers,
    userPermissions,
    userRole,
    isOwner,
    loading,
    error,
    hasPermission,
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
    removeMember,
    refetch: fetchTeamData
  };
}