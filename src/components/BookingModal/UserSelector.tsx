import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Users } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useTeam } from '../../hooks/useTeam';

interface AppUser {
  id: string;
  email: string;
  full_name?: string;
}

interface UserSelectorProps {
  selectedUserId?: string;
  onUserSelect: (userId: string | undefined) => void;
  disabled?: boolean;
}

export function UserSelector({ selectedUserId, onUserSelect, disabled }: UserSelectorProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { teamMembers } = useTeam();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!isSupabaseConfigured()) {
      // Mode démo avec utilisateurs fictifs
      const demoUsers: AppUser[] = [
        { id: 'demo-1', email: 'marie@example.com', full_name: 'Marie Dubois' },
        { id: 'demo-2', email: 'thomas@example.com', full_name: 'Thomas Martin' },
        { id: 'demo-3', email: 'sophie@example.com', full_name: 'Sophie Laurent' }
      ];
      setUsers(demoUsers);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Chargement des utilisateurs du compte pour assignation...');
      
      // Utiliser les membres de l'équipe depuis useTeam
      const mappedUsers = teamMembers.map(member => ({
        id: member.user_id,
        email: member.email || '',
        full_name: member.full_name || ''
      }));
      
      console.log('✅ Membres d\'équipe récupérés:', mappedUsers.length);
      console.log('📋 Liste des utilisateurs:', mappedUsers);
      
      setUsers(mappedUsers);
      
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Recharger quand les utilisateurs du compte changent
  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchUsers();
    }
  }, [teamMembers]);

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Assigner à un utilisateur
      </label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : isOpen
            ? 'border-blue-500 bg-blue-50 shadow-lg'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
            selectedUser ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {selectedUser ? `${selectedUser.full_name || selectedUser.email}` : 'Aucun utilisateur assigné'}
            </div>
            <div className="text-xs text-gray-500">
              {loading ? 'Chargement...' : `${users.length} utilisateur(s) disponible(s)`}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown des utilisateurs */}
      {isOpen && (
        <>
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100000] max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <div>Chargement des utilisateurs...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="font-medium text-lg mb-1">Aucun utilisateur</div>
                <div className="text-sm">Aucun utilisateur disponible</div>
              </div>
            ) : (
              <div className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-3 text-center">
                  Choisir un utilisateur
                </div>
                
                {/* Option "Aucun utilisateur" */}
                <button
                  type="button"
                  onClick={() => {
                    onUserSelect(undefined);
                    setIsOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-left font-medium transition-all duration-300 transform hover:scale-105 mb-2 ${
                    !selectedUserId
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center text-white">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold">Aucun utilisateur</div>
                      <div className="text-xs opacity-75">Non assigné</div>
                    </div>
                  </div>
                </button>
                
                {/* Liste des utilisateurs */}
                <div className="space-y-2">
                  {users.map((user, index) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        onUserSelect(user.id);
                        setIsOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-left font-medium transition-all duration-300 transform hover:scale-105 animate-fadeIn ${
                        selectedUserId === user.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          selectedUserId === user.id 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        }`}>
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold">{user.full_name || user.email}</div>
                          <div className="text-xs opacity-75">{user.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-[99999]" 
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}