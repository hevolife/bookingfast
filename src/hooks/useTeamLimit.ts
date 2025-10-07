import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TeamLimitStats {
  currentMembers: number;
  memberLimit: number;
  availableSlots: number;
  hasEnterprisePack: boolean;
}

export function useTeamLimit() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TeamLimitStats>({
    currentMembers: 0,
    memberLimit: 10,
    availableSlots: 10,
    hasEnterprisePack: false
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user || !supabase) {
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
      setLoading(true);

      // ÉTAPE 1 : Récupérer l'UUID du plugin entreprisepack
      const { data: pluginData, error: pluginError } = await supabase
        .from('plugins')
        .select('id')
        .eq('slug', 'entreprisepack')
        .maybeSingle();

      if (pluginError) {
        console.error('❌ Erreur récupération plugin:', pluginError);
        throw pluginError;
      }

      // ÉTAPE 2 : Vérifier l'abonnement avec l'UUID
      let hasEnterprisePack = false;
      if (pluginData) {
        const { data: subscription, error: subError } = await supabase
          .from('plugin_subscriptions')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('plugin_id', pluginData.id)
          .in('status', ['active', 'trial'])
          .maybeSingle();

        if (subError) {
          console.error('❌ Erreur vérification abonnement:', subError);
        }

        hasEnterprisePack = !!subscription;
      }

      // Compter les membres actuels
      const { count, error: countError } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (countError) throw countError;

      const currentMembers = count || 0;
      const memberLimit = hasEnterprisePack ? 50 : 10;
      const availableSlots = Math.max(0, memberLimit - currentMembers);

      setStats({
        currentMembers,
        memberLimit,
        availableSlots,
        hasEnterprisePack
      });
    } catch (error) {
      console.error('❌ Erreur chargement stats équipe:', error);
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
    return stats.availableSlots > 0;
  };

  const isAtLimit = (): boolean => {
    return stats.availableSlots === 0;
  };

  const needsUpgrade = (): boolean => {
    return !stats.hasEnterprisePack && stats.currentMembers >= 8;
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
