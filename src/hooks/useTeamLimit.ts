import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TeamLimitInfo {
  allowed: boolean;
  limit: number | null;
  current: number;
  remaining: number | null;
  has_plugin?: boolean;
}

export function useTeamLimit() {
  const { user } = useAuth();
  const [limitInfo, setLimitInfo] = useState<TeamLimitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLimit = async () => {
    if (!user || !isSupabaseConfigured) {
      setLimitInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase!
        .rpc('check_team_member_limit', { owner_id_param: user.id });

      if (rpcError) throw rpcError;

      setLimitInfo(data as TeamLimitInfo);
    } catch (err) {
      console.error('❌ Erreur vérification limite équipe:', err);
      setError(err instanceof Error ? err.message : 'Erreur de vérification');
      setLimitInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkLimit();
    } else {
      setLimitInfo(null);
    }
  }, [user?.id]);

  return {
    limitInfo,
    loading,
    error,
    refetch: checkLimit,
    canInviteMember: limitInfo?.allowed ?? true,
    isUnlimited: limitInfo?.limit === null,
    isAtLimit: limitInfo ? limitInfo.current >= (limitInfo.limit || 0) : false,
    hasPlugin: limitInfo?.has_plugin ?? false
  };
}
