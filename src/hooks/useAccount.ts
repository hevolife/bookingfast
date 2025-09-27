import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Account, AccountUser, ACCOUNT_PERMISSIONS } from '../types/account';

export function useAccount() {
  const { user } = useAuth();
  const mounted = useRef(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountData = async () => {
    if (!user) {
      setAccount(null);
      setUserPermissions([]);
      setIsOwner(false);
      setAccountUsers([]);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      const demoAccount: Account = {
        id: 'demo-account',
        name: 'Compte Démo',
        description: 'Compte de démonstration',
        owner_id: user?.id || 'demo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setAccount(demoAccount);
      setUserPermissions(ACCOUNT_PERMISSIONS.map(p => p.id));
      setIsOwner(true);
      setAccountUsers([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout chargement compte')), 6000);
      });

      // Charger les utilisateurs du compte
      let accountUsersData = [];
      try {
        const accountUsersPromise = supabase
          .from('account_users')
          .select(`
            id, account_id, user_id, role, permissions, is_active, invited_by, joined_at, created_at, updated_at, email, full_name
          `)
          .eq('account_id', user.id)
          .eq('is_active', true);

        const accountUsersResult = await Promise.race([accountUsersPromise, timeoutPromise]) as any;
        const rawData = accountUsersResult.data || [];
        
        // Use the data directly since email and full_name are now stored in account_users
        accountUsersData = rawData || [];
        
        console.log('✅ Utilisateurs du compte chargés:', accountUsersData.length);
        console.log('📋 Données utilisateurs:', accountUsersData);
      } catch (err) {
        console.warn('⚠️ Table account_users non trouvée ou erreur, continuons sans:', err);
        accountUsersData = [];
      }

      const rolesPromise = supabase
        .from('user_roles')
        .select(`
          role_id,
          role:roles(permissions)
        `)
        .eq('user_id', user.id);

      let userRoles = null;
      let rolesError = null;
      
      try {
        const result = await Promise.race([rolesPromise, timeoutPromise]) as any;
        userRoles = result.data;
        rolesError = result.error;
        
        if (rolesError) {
          console.warn('⚠️ Erreur chargement rôles:', rolesError.message);
        } else {
          console.log('✅ Rôles chargés depuis la base:', userRoles?.length || 0);
        }
      } catch (err) {
        console.warn('⚠️ Table user_roles non trouvée ou timeout:', err);
        rolesError = { message: 'Table user_roles not found' };
      }

      let permissions: string[] = [];
      
      if (rolesError || !userRoles || userRoles.length === 0) {
        console.log('⚠️ Aucun rôle trouvé ou erreur - attribution de toutes les permissions (compte principal)');
        permissions = ACCOUNT_PERMISSIONS.map(p => p.id);
      } else {
        permissions = userRoles.reduce((acc: string[], userRole) => {
          const rolePermissions = userRole.role?.permissions || [];
          return [...acc, ...rolePermissions];
        }, []);
        
        permissions = [...new Set(permissions)];
        console.log('✅ Permissions chargées depuis les rôles:', permissions.length, 'permissions');
        console.log('📋 Liste des permissions:', permissions);
      }

      const account: Account = {
        id: user.id,
        name: 'Mon Compte',
        description: 'Compte principal',
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (mounted.current) {
        setAccount(account);
        setUserPermissions(permissions);
        setIsOwner(true);
        setAccountUsers(accountUsersData);
      }

    } catch (err) {
      console.error('❌ Erreur chargement compte:', err);
      
      if (mounted.current) {
        const fallbackAccount: Account = {
          id: user.id,
          name: 'Mon Compte',
          description: 'Compte principal',
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setAccount(fallbackAccount);
        setUserPermissions(ACCOUNT_PERMISSIONS.map(p => p.id));
        setIsOwner(true);
        setAccountUsers([]);
        
        if (err instanceof Error && err.message.includes('Timeout')) {
          console.log('⏰ Timeout détecté - mode fallback activé avec toutes les permissions');
        } else {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
        }
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const createAccountUser = async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role: string;
    permissions: string[];
  }) => {
    if (!isSupabaseConfigured() || !account) {
      throw new Error('Supabase non configuré ou compte non trouvé');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-account-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          account_id: account.id,
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role,
          permissions: userData.permissions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création');
      }

      await fetchAccountData();
      return result.user;

    } catch (error) {
      console.error('Erreur création utilisateur compte:', error);
      throw error;
    }
  };

  const updateUserPermissions = async (userId: string, permissions: string[]) => {
    if (!isSupabaseConfigured() || !account) {
      throw new Error('Supabase non configuré ou compte non trouvé');
    }

    try {
      console.log('🔄 Mise à jour permissions pour utilisateur:', userId);
      console.log('📋 Nouvelles permissions:', permissions);
      
      const { error } = await supabase
        .from('account_users')
        .update({
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('account_id', account.id)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erreur mise à jour permissions:', error);
        throw error;
      }
      
      console.log('✅ Permissions mises à jour en base de données');

      // Recharger les données depuis la base pour s'assurer de la cohérence
      await fetchAccountData();
      
      console.log('✅ Données rechargées depuis la base');
    } catch (error) {
      console.error('Erreur mise à jour permissions:', error);
      throw error;
    }
  };

  const removeAccountUser = async (userId: string) => {
    if (!isSupabaseConfigured() || !account) {
      throw new Error('Supabase non configuré ou compte non trouvé');
    }

    try {
      const { error } = await supabase
        .from('account_users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('account_id', account.id)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchAccountData();
    } catch (error) {
      console.error('Erreur suppression utilisateur compte:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  useEffect(() => {
    mounted.current = true;
    
    const loadAccount = async () => {
      if (mounted.current && user) {
        setLoading(true);
        await fetchAccountData();
      }
    };
    
    if (user) {
      loadAccount();
    }
    
    return () => {
      mounted.current = false;
    };
  }, [user?.id]);

  return {
    account,
    accountUsers,
    userPermissions,
    isOwner,
    loading,
    error,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    createAccountUser,
    updateUserPermissions,
    removeAccountUser,
    refetch: fetchAccountData
  };
}