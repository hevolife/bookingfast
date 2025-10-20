import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TeamLimitInfo {
  allowed: boolean;
  limit: number | null;
  current: number;
  remaining: number | null;
  has_plugin?: boolean;
  subscription_tier?: string;
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
      console.log('🔍 Vérification limite équipe pour:', user.email);
      console.log('🆔 User ID:', user.id);

      // ✅ CORRECTION : JOIN avec subscription_plans pour récupérer la limite
      const { data: subscriptionData, error: subscriptionError } = await supabase!
        .from('subscriptions')
        .select(`
          plan_id,
          status,
          created_at,
          subscription_plans!inner(
            id,
            name,
            team_member_limit
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('❌ Erreur récupération abonnement:', subscriptionError);
        throw subscriptionError;
      }

      console.log('📊 Données abonnement avec plan:', JSON.stringify(subscriptionData, null, 2));

      // Extraire les données du plan
      const planId = subscriptionData?.plan_id;
      const planName = subscriptionData?.subscription_plans?.name;
      const teamMemberLimit = subscriptionData?.subscription_plans?.team_member_limit;
      const status = subscriptionData?.status;

      console.log('📊 plan_id:', planId);
      console.log('📊 plan_name:', planName);
      console.log('📊 team_member_limit:', teamMemberLimit);
      console.log('📊 status:', status);

      // Vérifier si l'utilisateur a le plugin Pack Société
      const { data: pluginData, error: pluginError } = await supabase!
        .from('plugin_subscriptions')
        .select('plugin_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (pluginError && pluginError.code !== 'PGRST116') {
        console.warn('⚠️ Erreur vérification plugin:', pluginError);
      }

      const hasPlugin = pluginData?.plugin_id === 'pack-societe';
      console.log('🔌 Plugin Pack Société:', hasPlugin ? 'ACTIF' : 'INACTIF');

      // Compter les membres actuels
      const { count: currentCount, error: countError } = await supabase!
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (countError) {
        console.error('❌ Erreur comptage membres:', countError);
        throw countError;
      }

      const current = currentCount || 0;
      console.log('👥 Membres actuels:', current);

      // ✅ CORRECTION : Utiliser team_member_limit depuis subscription_plans
      let limit: number | null = 0;
      let allowed = false;

      console.log('🔍 Vérification des conditions:');
      console.log('   - hasPlugin:', hasPlugin);
      console.log('   - teamMemberLimit:', teamMemberLimit);
      console.log('   - status:', status);

      if (hasPlugin) {
        limit = null;
        allowed = true;
        console.log('✅ CONDITION 1: Pack Société actif - Membres illimités');
      } else if (status === 'active' && teamMemberLimit !== undefined && teamMemberLimit !== null) {
        limit = teamMemberLimit;
        allowed = current < limit;
        console.log(`✅ CONDITION 2: Plan actif avec limite ${limit} - Actuel: ${current}, Autorisé: ${allowed}`);
      } else {
        limit = 0;
        allowed = false;
        console.log('❌ CONDITION 3: Aucun abonnement actif ou limite non définie');
        console.log('   Raison: status =', status, ', teamMemberLimit =', teamMemberLimit);
      }

      const remaining = limit === null ? null : Math.max(0, limit - current);

      const result: TeamLimitInfo = {
        allowed,
        limit,
        current,
        remaining,
        has_plugin: hasPlugin,
        subscription_tier: planName || 'none'
      };

      console.log('📋 RÉSULTAT FINAL:', JSON.stringify(result, null, 2));
      console.log('🎯 canInviteMember:', result.allowed);
      console.log('🎯 isAtLimit:', limit !== null && current >= limit);

      setLimitInfo(result);
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
    canInviteMember: limitInfo?.allowed ?? false,
    isUnlimited: limitInfo?.limit === null,
    isAtLimit: limitInfo ? (limitInfo.limit !== null && limitInfo.current >= limitInfo.limit) : false,
    hasPlugin: limitInfo?.has_plugin ?? false
  };
}
