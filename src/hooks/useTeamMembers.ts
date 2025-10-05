import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

export function useTeamMembers() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: currentMember, error: memberError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (memberError) throw memberError;

        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            role,
            profiles:user_id (
              full_name,
              email
            )
          `)
          .eq('team_id', currentMember.team_id)
          .order('created_at', { ascending: true });

        if (membersError) throw membersError;

        const formattedMembers: TeamMember[] = members.map(member => ({
          id: member.id,
          user_id: member.user_id,
          full_name: member.profiles?.full_name || 'Utilisateur',
          email: member.profiles?.email || '',
          role: member.role
        }));

        setTeamMembers(formattedMembers);
      } catch (err) {
        console.error('❌ Erreur chargement membres équipe:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [user]);

  return { teamMembers, loading, error };
}
