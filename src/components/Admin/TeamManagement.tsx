import React, { useState } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Shield, Mail, Save, X, AlertTriangle, UserPlus, Eye, EyeOff, Crown, Star, Award, Settings } from 'lucide-react';
import { useTeam } from '../../hooks/useTeam';
import { AVAILABLE_PERMISSIONS, TEAM_ROLES, TeamRole } from '../../types/team';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function TeamManagement() {
  const { 
    teamMembers, 
    isOwner, 
    loading, 
    error,
    inviteTeamMember, 
    updateMemberPermissions, 
    removeMember,
    refetch,
    getUserRoleInfo,
    getUsageLimits
  } = useTeam();
  
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('employee');

  const [memberFormData, setMemberFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role_name: 'employee',
    permissions: [] as string[]
  });

  const filteredMembers = teamMembers.filter(member =>
    (member.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteMember = async () => {
    if (!memberFormData.email || !memberFormData.password) {
      alert('Email et mot de passe requis');
      return;
    }

    setSaving(true);
    try {
      await inviteTeamMember(memberFormData);
      setShowMemberModal(false);
      resetForm();
      alert('Membre invité avec succès !');
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingMember) return;

    setSaving(true);
    try {
      await updateMemberPermissions(
        editingMember.id, 
        memberFormData.permissions,
        memberFormData.role_name
      );
      setShowMemberModal(false);
      resetForm();
      alert('Permissions mises à jour avec succès !');
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      await removeMember(memberToDelete.id);
      setShowDeleteModal(false);
      setMemberToDelete(null);
      alert('Membre supprimé avec succès !');
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const resetForm = () => {
    setMemberFormData({
      email: '',
      password: '',
      full_name: '',
      role_name: 'employee',
      permissions: []
    });
    setEditingMember(null);
    setSelectedRole('employee');
  };

  const handleRoleChange = (roleId: string) => {
    const role = TEAM_ROLES[roleId];
    if (role) {
      setSelectedRole(roleId);
      setMemberFormData(prev => ({
        ...prev,
        role_name: roleId,
        permissions: [...role.permissions]
      }));
    }
  };

  const togglePermission = (permissionId: string) => {
    setMemberFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const selectAllPermissions = () => {
    setMemberFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
  };

  const clearAllPermissions = () => {
    setMemberFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const getRoleInfo = (roleName: string): TeamRole => {
    return TEAM_ROLES[roleName] || TEAM_ROLES.viewer;
  };

  const getPermissionsByCategory = () => {
    const categories = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);
    
    return categories;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dashboard': return '📊';
      case 'calendar': return '📅';
      case 'services': return '🛍️';
      case 'clients': return '👥';
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
      case 'clients': return 'Clients';
      case 'emails': return 'Emails';
      case 'admin': return 'Administration';
      case 'financial': return 'Financier';
      default: return category;
    }
  };

  const getRoleIcon = (roleKey: string) => {
    switch (roleKey) {
      case 'admin': return Shield;
      case 'manager': return Star;
      case 'employee': return Users;
      case 'receptionist': return Settings;
      default: return Eye;
    }
  };

  const getRoleGradient = (roleKey: string) => {
    switch (roleKey) {
      case 'admin': return 'from-red-500 to-pink-500';
      case 'manager': return 'from-blue-500 to-cyan-500';
      case 'employee': return 'from-green-500 to-emerald-500';
      case 'receptionist': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleBgGradient = (roleKey: string) => {
    switch (roleKey) {
      case 'admin': return 'from-red-50 to-pink-50';
      case 'manager': return 'from-blue-50 to-cyan-50';
      case 'employee': return 'from-green-50 to-emerald-50';
      case 'receptionist': return 'from-purple-50 to-pink-50';
      default: return 'from-gray-50 to-gray-100';
    }
  };

  const getRoleBorderColor = (roleKey: string) => {
    switch (roleKey) {
      case 'admin': return 'border-red-200';
      case 'manager': return 'border-blue-200';
      case 'employee': return 'border-green-200';
      case 'receptionist': return 'border-purple-200';
      default: return 'border-gray-200';
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
          <p className="text-red-600">Seul le propriétaire du compte peut gérer l'équipe.</p>
        </div>
      </div>
    );
  }

  const userRoleInfo = getUserRoleInfo();
  const usageLimits = getUsageLimits();
  const permissionsByCategory = getPermissionsByCategory();

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-800">Gestion de l'Équipe</h2>
              <p className="text-purple-600">Vous êtes le propriétaire de cette équipe</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{teamMembers.length}</div>
              <div className="text-sm text-purple-700">Membres actifs</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{userRoleInfo.level}</div>
              <div className="text-sm text-purple-700">Votre niveau</div>
            </div>
            <div className="bg-white border border-purple-300 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">∞</div>
              <div className="text-sm text-purple-700">Accès illimité</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              Membres de l'Équipe ({filteredMembers.length})
            </h3>
            <p className="text-gray-600 mt-1">
              Gérez les accès et permissions de votre équipe
            </p>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setShowMemberModal(true);
            }}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <UserPlus className="w-5 h-5" />
            Inviter un Membre
          </Button>
        </div>

        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Award className="w-6 h-6 text-orange-600" />
            Rôles et Niveaux d'Accès
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(TEAM_ROLES).filter(([key]) => key !== 'owner').map(([roleKey, role], index) => {
              const RoleIcon = getRoleIcon(roleKey);
              const gradient = getRoleGradient(roleKey);
              const bgGradient = getRoleBgGradient(roleKey);
              const borderColor = getRoleBorderColor(roleKey);
              
              return (
                <div
                  key={roleKey}
                  className={`bg-gradient-to-r ${bgGradient} rounded-xl p-4 border-2 ${borderColor} hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{role.name}</h4>
                      <div className={`text-xs font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                        Niveau {role.level}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{role.description}</p>
                  
                  <div className="text-xs text-gray-600">
                    <div className="font-medium mb-1">{role.permissions.length} permissions</div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map(permissionId => {
                        const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
                        return permission ? (
                          <span
                            key={permissionId}
                            className="bg-white/60 text-gray-700 px-2 py-1 rounded-full text-xs"
                          >
                            {permission.name}
                          </span>
                        ) : null;
                      })}
                      {role.permissions.length > 3 && (
                        <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                          +{role.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {filteredMembers.length > 0 ? (
            <div className="space-y-4">
              {filteredMembers.map((member, index) => {
                const memberRole = getRoleInfo(member.role_name);
                const RoleIcon = getRoleIcon(member.role_name);
                const gradient = getRoleGradient(member.role_name);
                const bgGradient = getRoleBgGradient(member.role_name);
                const borderColor = getRoleBorderColor(member.role_name);
                
                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-4 bg-gradient-to-r ${bgGradient} rounded-xl border-2 ${borderColor} hover:shadow-md transition-all duration-300 animate-fadeIn`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {(member.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {member.full_name || member.email}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${gradient} text-white shadow-md flex items-center gap-1`}>
                            <RoleIcon className="w-3 h-3" />
                            {memberRole.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{member.permissions.length} permission(s)</span>
                          <span>•</span>
                          <span className={`font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                            Niveau {memberRole.level}
                          </span>
                          <span>•</span>
                          <span>Rejoint le {new Date(member.joined_at || member.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        member.is_active 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {member.is_active ? '✅ Actif' : '❌ Inactif'}
                      </div>
                      
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setMemberFormData({
                            email: member.email || '',
                            password: '',
                            full_name: member.full_name || '',
                            role_name: member.role_name || 'employee',
                            permissions: member.permissions || []
                          });
                          setSelectedRole(member.role_name || 'employee');
                          setShowMemberModal(true);
                        }}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setMemberToDelete(member);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110"
                        title="Supprimer le membre"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun membre trouvé' : 'Aucun membre d\'équipe'}
              </h4>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Aucun membre ne correspond à votre recherche' 
                  : 'Invitez votre premier membre d\'équipe'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {showMemberModal && (
        <Modal
          isOpen={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          title={editingMember ? 'Modifier le membre' : 'Inviter un membre'}
          size="lg"
        >
          <div className="space-y-6">
            {!editingMember && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={memberFormData.email}
                      onChange={(e) => setMemberFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                      required
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder="membre@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={memberFormData.password}
                        onChange={(e) => setMemberFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        minLength={6}
                        className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="Minimum 6 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={memberFormData.full_name}
                    onChange={(e) => setMemberFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    placeholder="Nom complet (optionnel)"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Rôle prédéfini
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(TEAM_ROLES).filter(([key]) => key !== 'owner').map(([roleKey, role]) => {
                  const RoleIcon = getRoleIcon(roleKey);
                  const gradient = getRoleGradient(roleKey);
                  const bgGradient = getRoleBgGradient(roleKey);
                  const borderColor = getRoleBorderColor(roleKey);
                  
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => handleRoleChange(roleKey)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                        selectedRole === roleKey
                          ? `${borderColor} bg-gradient-to-r ${bgGradient} shadow-lg`
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center text-white shadow-md`}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{role.name}</div>
                          <div className={`text-xs font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                            Niveau {role.level}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{role.description}</div>
                      <div className="text-xs text-blue-600">{role.permissions.length} permissions</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Permissions personnalisées
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    type="button"
                    onClick={clearAllPermissions}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 rounded-xl p-4">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <div key={category} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{getCategoryIcon(category)}</span>
                      <h4 className="font-bold text-gray-900">{getCategoryLabel(category)}</h4>
                    </div>
                    <div className="space-y-2">
                      {permissions.map(permission => (
                        <label key={permission.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={memberFormData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                              {permission.name}
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                permission.level === 'read' ? 'bg-blue-100 text-blue-700' :
                                permission.level === 'write' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {permission.level === 'read' ? '👁️ Lecture' :
                                 permission.level === 'write' ? '✏️ Écriture' :
                                 '🔒 Admin'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                <span>{memberFormData.permissions.length} permission(s) sélectionnée(s)</span>
                {selectedRole !== 'custom' && (
                  <span className="text-blue-600">
                    Rôle: {TEAM_ROLES[selectedRole]?.name} (Niveau {TEAM_ROLES[selectedRole]?.level})
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={editingMember ? handleUpdatePermissions : handleInviteMember}
                disabled={saving || (!editingMember && (!memberFormData.email || !memberFormData.password))}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingMember ? 'Modifier' : 'Inviter'}
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteModal && memberToDelete && (
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
              <h4 className="text-lg font-bold text-gray-900 mb-2">Supprimer le membre</h4>
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer l'accès de{' '}
                <strong>{memberToDelete.email}</strong> à votre équipe ?
              </p>
              <p className="text-red-600 text-sm mt-2 font-medium">
                ⚠️ Le membre perdra l'accès à toutes vos données !
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
                onClick={handleDeleteMember}
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
