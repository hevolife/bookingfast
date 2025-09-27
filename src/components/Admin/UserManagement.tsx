import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Crown, Mail, Phone, Calendar, Search, Eye, EyeOff, X, Save, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Role, UserRole, AVAILABLE_PERMISSIONS, DEFAULT_ROLES } from '../../types/permissions';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  roles?: UserRole[];
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role_ids: [] as string[]
  });

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    is_default: false
  });

  // Charger les utilisateurs et rôles
  const fetchData = async () => {
    if (!isSupabaseConfigured()) {
      // Mode démo avec données par défaut
      const demoRoles = DEFAULT_ROLES.map(role => ({
        ...role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setRoles(demoRoles);
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
     console.log('🔄 Début chargement des données utilisateurs...');

      // Charger les rôles
      let rolesData = null;
      let rolesError = null;
      
      try {
        const result = await supabase
          .from('roles')
          .select('id, name, description, permissions, is_default, created_at, updated_at')
          .order('name');
        rolesData = result.data;
        rolesError = result.error;
      } catch (err) {
        console.warn('Table roles non trouvée, utilisation des rôles par défaut');
        rolesError = { message: 'Table roles not found' };
      }

      if (rolesError) {
        console.error('Erreur chargement rôles:', rolesError);
        // Utiliser les rôles par défaut
        setRoles(DEFAULT_ROLES.map(role => ({
          ...role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));
      } else {
        setRoles(rolesData || []);
      }

      // Utiliser la Edge Function pour récupérer les utilisateurs
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('URL Supabase non configurée');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/list-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Erreur détaillée:', errorData);
        } catch (parseError) {
          console.error('❌ Erreur parsing réponse d\'erreur:', parseError);
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des utilisateurs');
      }

      
      setUsers(result.users || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      // En cas d'erreur, charger seulement depuis la table users
      try {
        const { data: userProfiles, error: profilesError } = await supabase
          .from('users')
          .select(`
            id, email, full_name, is_super_admin, subscription_status, 
            trial_started_at, trial_ends_at, created_at, updated_at
          `)
          .order('created_at', { ascending: false });

        if (!profilesError && userProfiles) {
          setUsers(userProfiles.map(profile => ({
            ...profile,
            roles: []
          })));
        }
      } catch (fallbackError) {
        console.error('❌ Erreur fallback:', fallbackError);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Créer un utilisateur
  const createUser = async () => {
    if (!isSupabaseConfigured()) {
      alert('Fonctionnalité disponible uniquement avec Supabase configuré');
      return;
    }

    // Validation différente selon le mode (création vs modification)
    if (editingUser) {
      // Mode modification : seuls les rôles peuvent être modifiés
      if (!userFormData.role_ids || userFormData.role_ids.length === 0) {
        alert('Veuillez sélectionner au moins un rôle');
        return;
      }
    } else {
      // Mode création : email et mot de passe requis
      if (!userFormData.email || !userFormData.password) {
        alert('Email et mot de passe requis pour créer un utilisateur');
        return;
      }
    }
    try {
      setSaving(true);

      if (editingUser) {
        // Mode modification : mettre à jour seulement les rôles et le nom
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session non trouvée');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
          throw new Error('URL Supabase non configurée');
        }

        // Supprimer les anciens rôles
        const { error: deleteRolesError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);

        if (deleteRolesError) {
          throw new Error('Erreur lors de la suppression des anciens rôles');
        }

        // Ajouter les nouveaux rôles
        if (userFormData.role_ids.length > 0) {
          const roleAssignments = userFormData.role_ids.map(roleId => ({
            user_id: editingUser.id,
            role_id: roleId,
            granted_by: session.user.id
          }));

          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(roleAssignments);

          if (rolesError) {
            throw new Error('Erreur lors de l\'assignation des nouveaux rôles');
          }
        }

        // Mettre à jour le nom complet si fourni
        if (userFormData.full_name !== editingUser.full_name) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              full_name: userFormData.full_name || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingUser.id);

          if (updateError) {
            throw new Error('Erreur lors de la mise à jour du nom');
          }
        }

        alert(`Utilisateur ${editingUser.email} modifié avec succès !`);
      } else {
      // Appeler la fonction Edge pour créer l'utilisateur de manière sécurisée
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('URL Supabase non configurée');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-app-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: userFormData.email,
          password: userFormData.password,
          full_name: userFormData.full_name || null,
          role_ids: userFormData.role_ids
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('Réponse invalide du serveur');
      }

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de l\'utilisateur');
      }

        // Notification de succès
        alert(`Utilisateur ${userFormData.email} créé avec succès !`);
      }

      // Attendre un peu pour que la base de données soit à jour
      setTimeout(async () => {
        await fetchData();
      }, 1000);
      setShowUserModal(false);
      resetUserForm();
    } catch (error) {
      console.error('Erreur', editingUser ? 'modification' : 'création', 'utilisateur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // Créer un rôle
  const createRole = async () => {
    if (!isSupabaseConfigured()) {
      alert('Fonctionnalité disponible uniquement avec Supabase configuré');
      return;
    }

    try {
      setSaving(true);

      if (editingRole) {
        const roleData = {
          ...roleFormData
        };
        
        const { error } = await supabase
          .from('roles')
          .update(roleData)
          .eq('id', editingRole.id);

        if (error) throw error;
      } else {
        const roleData = {
          id: crypto.randomUUID(),
          ...roleFormData
        };
        
        const { error } = await supabase
          .from('roles')
          .insert([roleData]);

        if (error) throw error;
      }

      await fetchData();
      setShowRoleModal(false);
      resetRoleForm();
    } catch (error) {
      console.error('Erreur sauvegarde rôle:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un utilisateur
  const deleteUser = async () => {
    if (!userToDelete || !isSupabaseConfigured()) {
      alert('Fonctionnalité disponible uniquement avec Supabase configuré');
      return;
    }

    setDeleting(true);
    try {

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
        throw new Error('URL Supabase non configurée');
      }

      // Appeler la fonction Edge pour supprimer l'utilisateur de manière sécurisée
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-app-user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userToDelete.id
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression de l\'utilisateur');
      }

      
      // Rafraîchir la liste
      await fetchData();
      
      setShowDeleteModal(false);
      setUserToDelete(null);
      alert(`Utilisateur ${userToDelete.email} supprimé avec succès !`);
      
    } catch (error) {
      console.error('❌ Erreur suppression utilisateur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setDeleting(false);
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      email: '',
      password: '',
      full_name: '',
      role_ids: []
    });
    setEditingUser(null);
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      permissions: [],
      is_default: false
    });
    setEditingRole(null);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      is_default: role.is_default
    });
    setShowRoleModal(true);
  };

  const deleteRole = async (roleId: string) => {
    if (!isSupabaseConfigured()) return;

    if (window.confirm('Supprimer ce rôle ? Les utilisateurs assignés perdront ces permissions.')) {
      try {
        const { error } = await supabase
          .from('roles')
          .delete()
          .eq('id', roleId);

        if (error) throw error;
        await fetchData();
      } catch (error) {
        alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
  };

  const togglePermission = (permissionId: string) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dashboard': return '📊';
      case 'calendar': return '📅';
      case 'services': return '🛍️';
      case 'emails': return '📧';
      case 'admin': return '⚙️';
      case 'financial': return '💰';
      default: return '🔧';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'dashboard': return 'Dashboard';
      case 'calendar': return 'Calendrier';
      case 'services': return 'Services';
      case 'emails': return 'Emails';
      case 'admin': return 'Administration';
      case 'financial': return 'Financier';
      default: return category;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Gestion des Utilisateurs & Permissions
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Créez des utilisateurs et gérez leurs accès</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                resetRoleForm();
                setShowRoleModal(true);
              }}
              variant="secondary"
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Shield className="w-5 h-5" />
              Nouveau Rôle
            </Button>
            <Button
              onClick={() => {
                resetUserForm();
                setShowUserModal(true);
              }}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Nouvel Utilisateur
            </Button>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="pl-10 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 w-full text-base"
          />
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              Utilisateurs ({filteredUsers.length})
            </h3>
          </div>

          {filteredUsers.length > 0 ? (
            <>
              {/* Version desktop - Table */}
              <div className="hidden lg:block space-y-4">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-300 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {user.full_name || user.email}
                          {user.is_super_admin && (
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              <Crown className="w-3 h-3 inline mr-1" />
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-xs text-gray-500">
                          {user.roles?.length || 0} rôle(s) assigné(s)
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-700'
                          : user.subscription_status === 'trial'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.subscription_status === 'active' ? '✅ Actif' :
                         user.subscription_status === 'trial' ? '⏳ Essai' : '❌ Expiré'}
                      </div>
                      
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setUserFormData({
                            email: user.email,
                            password: '',
                            full_name: user.full_name || '',
                            role_ids: user.roles?.map(r => r.role_id) || []
                          });
                          setShowUserModal(true);
                        }}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110"
                        title="Supprimer l'utilisateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Version mobile - Cards */}
              <div className="lg:hidden space-y-4">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-200 p-4 hover:shadow-md transition-all duration-300 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Header mobile */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-gray-900 text-sm truncate">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-xs text-gray-600 truncate">{user.email}</div>
                        </div>
                      </div>
                      
                      {user.is_super_admin && (
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          ADMIN
                        </span>
                      )}
                    </div>

                    {/* Informations mobile */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Statut</div>
                        <div className={`text-xs font-bold ${
                          user.subscription_status === 'active' 
                            ? 'text-green-600'
                            : user.subscription_status === 'trial'
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          {user.subscription_status === 'active' ? '✅ Actif' :
                           user.subscription_status === 'trial' ? '⏳ Essai' : '❌ Expiré'}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Rôles</div>
                        <div className="text-xs font-bold text-gray-900">
                          {user.roles?.length || 0} assigné(s)
                        </div>
                      </div>
                    </div>

                    {/* Actions mobile */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setUserFormData({
                            email: user.email,
                            password: '',
                            full_name: user.full_name || '',
                            role_ids: user.roles?.map(r => r.role_id) || []
                          });
                          setShowUserModal(true);
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteModal(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 px-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
              </h4>
              <p className="text-sm sm:text-base text-gray-500">
                {searchTerm 
                  ? 'Aucun utilisateur ne correspond à votre recherche' 
                  : 'Créez votre premier utilisateur'
                }
              </p>
            </div>
          )}
        </div>
        {/* Rôles disponibles */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-600" />
              Rôles et Permissions ({roles.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {roles.map((role, index) => (
              <div
                key={role.id}
                className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white ${
                      role.is_default 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                      {role.is_default ? <Crown className="w-4 h-4 sm:w-5 sm:h-5" /> : <Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{role.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">{role.description}</p>
                    </div>
                  </div>
                  
                  {role.is_default && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold hidden sm:inline">
                      Par défaut
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2">
                    {role.permissions.length} permission(s)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map(permissionId => {
                      const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
                      return permission ? (
                        <span
                          key={permissionId}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium truncate"
                        >
                          {permission.name}
                        </span>
                      ) : null;
                    })}
                    {role.permissions.length > 3 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                        +{role.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                  {!role.is_default && (
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg sm:rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center text-sm sm:text-base"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden">Suppr.</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debug info */}
      {/* Modal Nouvel Utilisateur */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 sm:rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 text-white hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                  required
                  disabled={!!editingUser}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 disabled:bg-gray-100 text-base"
                  placeholder="utilisateur@email.com"
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                    placeholder="Minimum 6 caractères"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                  placeholder="Nom complet (optionnel)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôles
                </label>
                <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={userFormData.role_ids.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserFormData(prev => ({ ...prev, role_ids: [...prev.role_ids, role.id] }));
                          } else {
                            setUserFormData(prev => ({ ...prev, role_ids: prev.role_ids.filter(id => id !== role.id) }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{role.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{role.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors font-medium text-base"
                >
                  Annuler
                </button>
                <button
                  onClick={createUser}
                  disabled={saving || !userFormData.email || (!editingUser && !userFormData.password)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center gap-2 text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingUser ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau Rôle */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6 sm:rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 text-white hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du rôle *
                  </label>
                  <input
                    type="text"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-base"
                    placeholder="Ex: Manager"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-base"
                    placeholder="Description du rôle"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={roleFormData.is_default}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
                  Rôle par défaut (assigné automatiquement aux nouveaux utilisateurs)
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Permissions
                </label>
                <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-80 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, permissions]) => (
                    <div key={category} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{getCategoryIcon(category)}</span>
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">{getCategoryLabel(category)}</h4>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        {permissions.map(permission => (
                          <label key={permission.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                            <input
                              type="checkbox"
                              checked={roleFormData.permissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm">{permission.name}</div>
                              <div className="text-xs text-gray-500 line-clamp-2">{permission.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors font-medium text-base"
                >
                  Annuler
                </button>
                <button
                  onClick={createRole}
                  disabled={saving || !roleFormData.name}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center gap-2 text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingRole ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 sm:p-6 sm:rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-white">Confirmer la suppression</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Supprimer l'utilisateur</h4>
                <p className="text-sm sm:text-base text-gray-600">
                  Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur <strong>{userToDelete.email}</strong> ?
                </p>
                <p className="text-red-600 text-sm mt-2 font-medium">
                  ⚠️ Cette action est irréversible !
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors font-medium text-base"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteUser}
                  disabled={deleting}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center gap-2 text-base"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}