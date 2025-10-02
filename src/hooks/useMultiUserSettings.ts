import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface MultiUserSetting {
  id: string;
  user_id: string;
  team_member_id: string;
  can_view_only_assigned: boolean;
  created_at: string;
  updated_at: string;
}

export function useMultiUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MultiUserSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user || !isSupabaseConfigured()) {
      setSettings([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('multi_user_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Erreur chargement paramètres multi-user:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (teamMemberId: string, canViewOnlyAssigned: boolean) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const { error } = await supabase
        .from('multi_user_settings')
        .upsert({
          user_id: user.id,
          team_member_id: teamMemberId,
          can_view_only_assigned: canViewOnlyAssigned,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      await fetchSettings();
    } catch (error) {
      console.error('Erreur mise à jour paramètre:', error);
      throw error;
    }
  };

  const getSettingForMember = (teamMemberId: string): boolean => {
    const setting = settings.find(s => s.team_member_id === teamMemberId);
    return setting?.can_view_only_assigned || false;
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  return {
    settings,
    loading,
    updateSetting,
    getSettingForMember,
    refetch: fetchSettings
  };
}
