import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

  const fetchStats = async () => {
    if (!supabase || !user) {
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
      // Check for Enterprise Pack subscription
      const { data: enterpriseSubscription } = await supabase
        .from('subscriptions')
        .select('plugin_slug')
        .eq('user_id', user.id)
        .eq('plugin_slug', 'entreprisepack')
        .in('status', ['active', 'trial'])
        .maybeSingle();

      const hasEnterprise = !!enterpriseSubscription;
      const limit = hasEnterprise ? 50 : 10;

      // Count current team members
      const { count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_active', true);

      const current = memberCount || 0;

      setStats({
        currentMembers: current,
        memberLimit: limit,
        availableSlots: Math.max(0, limit - current),
        hasEnterprisePack: hasEnterprise
      });
    } catch (error) {
      console.error('Error fetching team stats:', error);
      setStats({
        currentMembers: 0,
        memberLimit: 10,
        availableSlots: 10,
        hasEnterprisePack: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const canAddMember = async (): Promise<boolean> => {
    await fetchStats();
    return stats.availableSlots > 0;
  };

  const isAtLimit = (): boolean => {
    return stats.availableSlots === 0;
  };

  const needsUpgrade = (): boolean => {
    return !stats.hasEnterprisePack && stats.currentMembers >= stats.memberLimit * 0.8;
  };

  return {
    stats,
    loading,
    canAddMember,
    isAtLimit,
    needsUpgrade,
    refetch: fetchStats
  };
}
