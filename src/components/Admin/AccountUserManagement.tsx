import React, { useState } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Shield, Crown, Mail, Phone, Calendar, Search, Eye, EyeOff, X, Save, AlertTriangle, UserPlus } from 'lucide-react';
import { useAccount } from '../../hooks/useAccount';
import { ACCOUNT_PERMISSIONS, ACCOUNT_ROLES } from '../../types/account';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function AccountUserManagement() {
  const { 
    account, 
    accountUsers, 
    isOwner, 
    loading, 
    createAccountUser, 
    updateUserPermissions, 
    removeAccountUser,
    refetch
  } = useAccount();
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    permissions: [] as string[]
  });

  const filteredUsers = accountUsers.filter(user =>
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (!userFormData.email || !userFormData.password) {
      alert('Email et mot de passe requis');
      return;
    }

    setSaving(true);
    try {
      await createAccountUser(userFormData);
      setShowUserModal(false);
      resetForm();
      alert('Utilisateur créé avec succès !');
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      console.log('🔄 Début mise à jour permissions pour:', editingUser.email);
      console.log('📋 Permissions sélectionnées:', userFormData.permissions);
      
      await updateUserPermissions(editingUser.user_id, userFormData.permissions);
      
      console.log('✅ Permissions mises à jour avec succès');
      
      setShowUserModal(false);
      resetForm();
      
      // Forcer le rechargement après fermeture du modal
      setTimeout(async () => {
        await refetch();
      }, 100);
      
      alert('Permissions mises à jour avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await removeAccountUser(userToDelete.user_id);
      setShowDeleteModal(false);
      setUserToDelete(null);
      alert('Utilisateur supprimé avec succès !');
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const resetForm = () => {
    setUserFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
      permissions: []
    });
    setEditingUser(null);
  };

  const handleRoleChange = (role: string) => {
    const rolePermissions = ACCOUNT_ROLES[role as keyof typeof ACCOUNT_ROLES]?.permissions || [];
    setUserFormData(prev => ({
      ...prev,
      role,
      permissions: rolePermissions
    }));
  };

  const togglePermission = (permissionId: string) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const groupedPermissions = ACCOUNT_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof ACCOUNT_PERMISSIONS>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dashboard': return '📊';
      case 'calendar': return '📅';
      case 'services': return '🛍️';
      case 'emails': return '📧';
      case 'admin': return '⚙️';
      case 'financial': return '💰';
      case 'clients': return '👥';
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
      case 'clients': return 'Clients';
      default: return category;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-800 mb-2">Accès refusé</h3>
          <p className="text-red-600">Seul le propriétaire du compte peut gérer les utilisateurs.</p>
        </div>
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
              Gestion des Utilisateurs du Compte
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Gérez les accès à votre compte "{account?.name}"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                resetForm();
                setShowUserModal(true);
              }}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <UserPlus className="w-5 h-5" />
              Ajouter un Utilisateur
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

        {/* Informations du compte */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-800">{account?.name}</h3>
              <p className="text-blue-600 text-sm">{account?.description}</p>
            </div>
          </div>
          <div className="text-blue-700 text-sm">
            <strong>Propriétaire :</strong> Vous • <strong>Utilisateurs :</strong> {accountUsers.length}
          </div>
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              Utilisateurs du Compte ({filteredUsers.length})
            </h3>
          </div>

          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((accountUser, index) => (
                <div
                  key={accountUser.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-300 animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {(accountUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {accountUser.full_name || accountUser.email || 'Utilisateur'}
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          accountUser.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700'
                            : accountUser.role === 'manager'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {ACCOUNT_ROLES[accountUser.role as keyof typeof ACCOUNT_ROLES]?.name || accountUser.role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{accountUser.email || 'Email non disponible'}</div>
                      <div className="text-xs text-gray-500">
                        {accountUser.permissions.length} permission(s) • Rejoint le {new Date(accountUser.joined_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      accountUser.is_active 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {accountUser.is_active ? '✅ Actif' : '❌ Inactif'}
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditingUser(accountUser);
                        setUserFormData({
                          email: accountUser.email || '',
                          password: '',
                          full_name: accountUser.full_name || '',
                          role: accountUser.role,
                          permissions: accountUser.permissions
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
                        setUserToDelete(accountUser);
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
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
              </h4>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Aucun utilisateur ne correspond à votre recherche' 
                  : `Ajoutez votre premier utilisateur au compte`
                }
              </p>
              {/* Debug info - only show if there are loaded users but none filtered */}
              {accountUsers.length > 0 && filteredUsers.length === 0 && (
                <div className="mt-4 text-xs text-gray-400">
                  Debug: {accountUsers.length} utilisateurs chargés, {filteredUsers.length} après filtrage
                  <br />
                  Premier utilisateur: {JSON.stringify(accountUsers[0], null, 2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rôles disponibles */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-600" />
              Rôles Prédéfinis
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Object.entries(ACCOUNT_ROLES).map(([roleKey, role], index) => (
              <div
                key={roleKey}
                className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white ${
                      roleKey === 'owner' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : roleKey === 'admin'
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : roleKey === 'manager'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}>
                      {roleKey === 'owner' ? <Crown className="w-4 h-4 sm:w-5 sm:h-5" /> : <Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{role.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">{role.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2">
                    {role.permissions.length} permission(s)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map(permissionId => {
                      const permission = ACCOUNT_PERMISSIONS.find(p => p.id === permissionId);
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Utilisateur */}
      {showUserModal && (
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          size="lg"
        >
          <div className="space-y-6">
            {!editingUser && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                      required
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                      placeholder="utilisateur@email.com"
                    />
                  </div>
                  
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
                </div>
                
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
              </>
            )}

            {/* Sélection du rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle prédéfini
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ACCOUNT_ROLES).filter(([key]) => key !== 'owner').map(([roleKey, role]) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleRoleChange(roleKey)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      userFormData.role === roleKey
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">{role.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{role.description}</div>
                    <div className="text-xs text-blue-600">{role.permissions.length} permissions</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions personnalisées */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Permissions personnalisées
              </label>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{getCategoryIcon(category)}</span>
                      <h4 className="font-bold text-gray-900">{getCategoryLabel(category)}</h4>
                    </div>
                    <div className="space-y-2">
                      {permissions.map(permission => (
                        <label key={permission.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                          <input
                            type="checkbox"
                            checked={userFormData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
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
                onClick={() => setShowUserModal(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors font-medium text-base"
              >
                Annuler
              </button>
              <button
                onClick={editingUser ? handleUpdatePermissions : handleCreateUser}
                disabled={saving || (!editingUser && (!userFormData.email || !userFormData.password))}
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
        </Modal>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && userToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirmer la suppression"
          size="sm"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Supprimer l'utilisateur</h4>
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer l'accès de{' '}
                <strong>{userToDelete.email}</strong> à votre compte ?
              </p>
              <p className="text-red-600 text-sm mt-2 font-medium">
                ⚠️ L'utilisateur perdra l'accès à toutes vos données !
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer l'accès
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}