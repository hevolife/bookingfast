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

        // Récupérer le membre actuel pour obtenir son owner_id
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
          .select('*')
          .eq('owner_id', currentMember.owner_id)
          .order('created_at', { ascending: true });

        if (membersError) throw membersError;

        // Mapper role_name vers le type attendu
        const roleMap: Record<string, 'owner' | 'admin' | 'member'> = {
          'owner': 'owner',
          'admin': 'admin',
          'employee': 'member',
          'member': 'member'
        };

        // Utiliser les données directement de team_members
        const formattedMembers: TeamMember[] = (members || []).map(member => ({
          id: member.id,
          user_id: member.user_id,
          full_name: member.full_name || `${member.firstname || ''} ${member.lastname || ''}`.trim() || 'Utilisateur',
          email: member.email || '',
          firstname: member.firstname,
          lastname: member.lastname,
          role: roleMap[member.role_name] || 'member'
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
