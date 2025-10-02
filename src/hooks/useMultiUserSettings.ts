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
      console.log('🔍 Chargement paramètres pour user:', user.id);
      
      const { data, error } = await supabase
        .from('multi_user_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur chargement:', error);
        throw error;
      }
      
      console.log('✅ Paramètres chargés:', data);
      setSettings(data || []);
    } catch (error) {
      console.error('❌ Erreur chargement paramètres multi-user:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (teamMemberId: string, canViewOnlyAssigned: boolean) => {
    if (!user || !isSupabaseConfigured()) {
      throw new Error('Utilisateur non connecté ou Supabase non configuré');
    }

    try {
      console.log('🔄 Tentative mise à jour:', { 
        user_id: user.id, 
        team_member_id: teamMemberId, 
        can_view_only_assigned: canViewOnlyAssigned 
      });

      const { data: existing, error: checkError } = await supabase
        .from('multi_user_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_member_id', teamMemberId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erreur vérification:', checkError);
        throw checkError;
      }

      if (existing) {
        console.log('📝 UPDATE existant:', existing.id);
        const { error: updateError } = await supabase
          .from('multi_user_settings')
          .update({
            can_view_only_assigned: canViewOnlyAssigned,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ Erreur UPDATE:', updateError);
          throw updateError;
        }
        console.log('✅ UPDATE réussi');
      } else {
        console.log('➕ INSERT nouveau');
        const { error: insertError } = await supabase
          .from('multi_user_settings')
          .insert({
            user_id: user.id,
            team_member_id: teamMemberId,
            can_view_only_assigned: canViewOnlyAssigned
          });

        if (insertError) {
          console.error('❌ Erreur INSERT:', insertError);
          throw insertError;
        }
        console.log('✅ INSERT réussi');
      }

      await fetchSettings();
    } catch (error) {
      console.error('❌ Erreur mise à jour paramètre:', error);
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
