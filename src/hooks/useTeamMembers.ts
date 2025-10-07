import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  firstname?: string;
  lastname?: string;
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

        // CORRECTION : Utiliser maybeSingle() pour gérer le cas où l'utilisateur n'est pas dans team_members
        const { data: currentMember, error: memberError } = await supabase
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        // Si l'utilisateur n'est pas dans team_members, retourner une liste vide
        if (!currentMember) {
          console.log('ℹ️ Utilisateur non membre d\'une équipe');
          setTeamMembers([]);
          setLoading(false);
          return;
        }

        // Récupérer tous les membres de la même équipe (même owner_id)
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            role_name,
            profiles:user_id (
              full_name,
              email,
              firstname,
              lastname
            )
          `)
          .eq('owner_id', currentMember.owner_id)
          .order('created_at', { ascending: true });

        if (membersError) throw membersError;

        const formattedMembers: TeamMember[] = (members || []).map(member => ({
          id: member.id,
          user_id: member.user_id,
          full_name: member.profiles?.full_name || 'Utilisateur',
          email: member.profiles?.email || '',
          firstname: member.profiles?.firstname,
          lastname: member.profiles?.lastname,
          role: member.role_name as 'owner' | 'admin' | 'member'
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
