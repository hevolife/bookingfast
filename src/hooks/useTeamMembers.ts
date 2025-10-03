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
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('firstname');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Erreur chargement membres équipe:', err);
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
