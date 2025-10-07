import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TeamMember {
  id: string;
  user_id: string;
  owner_id: string;
  role: 'owner' | 'admin' | 'member';
  full_name: string;
  email: string;
  created_at: string;
}

interface TeamContextType {
  teamMembers: TeamMember[];
  currentUserRole: 'owner' | 'admin' | 'member' | null;
  isOwner: boolean;
  isAdmin: boolean;
  loading: boolean;
  refreshTeamMembers: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeamMembers = async () => {
    if (!user) {
      setTeamMembers([]);
      setCurrentUserRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // CORRECTION : Utiliser owner_id au lieu de team_id et maybeSingle() pour gérer le cas où l'utilisateur n'existe pas
      const { data: currentMember, error: memberError } = await supabase
        .from('team_members')
        .select('owner_id, role_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error('❌ Erreur récupération membre:', memberError);
        throw memberError;
      }

      if (!currentMember) {
        console.log('ℹ️ Utilisateur pas dans une équipe');
        setTeamMembers([]);
        setCurrentUserRole(null);
        setLoading(false);
        return;
      }

      // Mapper role_name vers le type attendu
      const roleMap: Record<string, 'owner' | 'admin' | 'member'> = {
        'owner': 'owner',
        'admin': 'admin',
        'employee': 'member',
        'member': 'member'
      };
      
      setCurrentUserRole(roleMap[currentMember.role_name] || 'member');

      // CORRECTION : Utiliser owner_id au lieu de team_id
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          owner_id,
          role_name,
          created_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('owner_id', currentMember.owner_id)
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error('❌ Erreur récupération membres:', membersError);
        throw membersError;
      }

      const formattedMembers = (members || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        owner_id: member.owner_id,
        role: roleMap[member.role_name] || 'member',
        full_name: member.profiles?.full_name || 'Utilisateur',
        email: member.profiles?.email || '',
        created_at: member.created_at
      }));

      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('❌ Erreur chargement équipe:', error);
      setTeamMembers([]);
      setCurrentUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [user]);

  const value: TeamContextType = {
    teamMembers,
    currentUserRole,
    isOwner: currentUserRole === 'owner',
    isAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    loading,
    refreshTeamMembers: fetchTeamMembers
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
