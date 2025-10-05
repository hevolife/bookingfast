import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
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

      const { data: currentMember, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .single();

      if (memberError) throw memberError;

      setCurrentUserRole(currentMember.role);

      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          created_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('team_id', currentMember.team_id)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      const formattedMembers = members.map(member => ({
        id: member.id,
        user_id: member.user_id,
        team_id: member.team_id,
        role: member.role,
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
