import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface TeamMember {
  id: string;
  user_id: string;
  owner_id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name?: string;
}

export function useTeamMembers() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    if (!isSupabaseConfigured() || !user) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Récupération membres équipe pour:', user.id);

      // Récupérer tous les membres de l'équipe (owner_id = user.id)
      const { data, error } = await supabase
        .from('team_members')
        .select('id, user_id, owner_id, firstname, lastname, email, phone, full_name, is_active, created_at, updated_at')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('firstname');

      if (error) {
        console.error('❌ Erreur récupération membres:', error);
        throw error;
      }

      console.log('✅ Membres récupérés:', data);

      // Enrichir les données si nécessaire
      const enrichedMembers = data.map(member => ({
        ...member,
        // Utiliser full_name si firstname/lastname sont vides
        firstname: member.firstname || member.full_name?.split(' ')[0] || '',
        lastname: member.lastname || member.full_name?.split(' ').slice(1).join(' ') || '',
        // S'assurer que l'email est présent
        email: member.email || ''
      }));

      console.log('📊 Membres enrichis:', enrichedMembers);
      setTeamMembers(enrichedMembers);
    } catch (err) {
      console.error('❌ Erreur chargement membres équipe:', err);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    teamMembers,
    loading,
    refetch: fetchTeamMembers
  };
}
