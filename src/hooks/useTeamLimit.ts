import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TeamStats {
  currentMembers: number;
  memberLimit: number;
  availableSlots: number;
  hasEnterprisePack: boolean;
}

export function useTeamLimit() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TeamStats>({
    currentMembers: 0,
    memberLimit: 10,
    availableSlots: 10,
    hasEnterprisePack: false
  });
  const [loading, setLoading] = useState(true);

  const fetchTeamStats = async () => {
    if (!user || !isSupabaseConfigured()) {
      setStats({
        currentMembers: 0,
        memberLimit: 10,
        availableSlots: 10,
        hasEnterprisePack: false
      });
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Chargement statistiques équipe pour:', user.id);

      const { data, error } = await supabase
        .rpc('get_team_stats', { p_owner_id: user.id });

      if (error) {
        console.error('❌ Erreur chargement stats:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const statsData = data[0];
        console.log('✅ Stats équipe:', statsData);
        
        setStats({
          currentMembers: statsData.current_members || 0,
          memberLimit: statsData.member_limit || 10,
          availableSlots: statsData.available_slots || 10,
          hasEnterprisePack: statsData.has_enterprise_pack || false
        });
      }
    } catch (err) {
      console.error('❌ Erreur récupération stats équipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const canAddMember = async (): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .rpc('can_add_team_member', { p_owner_id: user.id });

      if (error) {
        console.error('❌ Erreur vérification limite:', error);
        return false;
      }

      console.log('🔍 Peut ajouter membre:', data);
      return data === true;
    } catch (err) {
      console.error('❌ Erreur vérification limite:', err);
      return false;
    }
  };

  const getTeamLimit = (): number => {
    return stats.memberLimit;
  };

  const isAtLimit = (): boolean => {
    return stats.availableSlots <= 0;
  };

  const needsUpgrade = (): boolean => {
    return !stats.hasEnterprisePack && stats.currentMembers >= 8; // Alerte à 80%
  };

  useEffect(() => {
    if (user) {
      fetchTeamStats();
    }
  }, [user?.id]);

  return {
    stats,
    loading,
    canAddMember,
    getTeamLimit,
    isAtLimit,
    needsUpgrade,
    refetch: fetchTeamStats
  };
}
