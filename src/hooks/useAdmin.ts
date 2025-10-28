import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_super_admin: boolean;
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled' | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  user?: User;
  plan?: SubscriptionPlan;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  max_bookings: number | null;
  max_team_members: number | null;
}

export interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  access_type: 'days' | 'weeks' | 'months' | 'lifetime';
  access_duration: number | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface CodeRedemption {
  id: string;
  code_id: string;
  user_id: string;
  redeemed_at: string;
  access_granted_until: string | null;
  code?: AccessCode;
  user?: User;
}

export function useAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [redemptions, setRedemptions] = useState<CodeRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les utilisateurs
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Charger les abonnements avec les relations
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          user:users(*),
          plan:subscription_plans(*)
        `)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;
      setSubscriptions(subscriptionsData || []);

      // Charger les plans d'abonnement
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;
      setSubscriptionPlans(plansData || []);

      // Charger les codes d'accès
      const { data: codesData, error: codesError } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) {
        console.error('Error loading access codes:', codesError);
        setAccessCodes([]);
      } else {
        setAccessCodes(codesData || []);
      }

      // Charger les utilisations de codes
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('code_redemptions')
        .select(`
          *,
          code:access_codes(*),
          user:users(*)
        `)
        .order('redeemed_at', { ascending: false });

      if (redemptionsError) {
        console.error('Error loading redemptions:', redemptionsError);
        setRedemptions([]);
      } else {
        setRedemptions(redemptionsData || []);
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
      setError(error instanceof Error ? error.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data?.is_super_admin || false;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  };

  const updateUserStatus = async (
    userId: string,
    updates: {
      full_name?: string;
      is_super_admin?: boolean;
      subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled';
      trial_ends_at?: string;
    }
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, updates })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }

      await loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const createSubscription = async (userId: string, planId: string) => {
    try {
      // 1. Annuler tous les abonnements actifs existants pour cet utilisateur
      const { data: existingSubscriptions } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (existingSubscriptions && existingSubscriptions.length > 0) {
        // Mettre à jour les abonnements existants en 'cancelled'
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            cancel_at_period_end: true
          })
          .eq('user_id', userId)
          .eq('status', 'active');
      }

      // 2. Créer le nouvel abonnement
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Mettre à jour le statut de l'utilisateur
      await supabase
        .from('users')
        .update({ 
          subscription_status: 'active',
          trial_ends_at: null
        })
        .eq('id', userId);

      // 4. Créer les plugin_subscriptions pour tous les plugins du plan
      const { data: plugins } = await supabase
        .from('plugins')
        .select('id')
        .eq('subscription_plan_id', planId);

      if (plugins && plugins.length > 0) {
        const pluginSubscriptions = plugins.map(plugin => ({
          user_id: userId,
          plugin_id: plugin.id,
          status: 'active',
          expires_at: periodEnd.toISOString()
        }));

        await supabase
          .from('plugin_subscriptions')
          .insert(pluginSubscriptions);
      }

      await loadData();
      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          cancel_at_period_end: true
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  const createAccessCode = async (codeData: {
    code: string;
    description?: string;
    access_type: 'days' | 'weeks' | 'months' | 'lifetime';
    access_duration?: number;
    max_uses: number;
    expires_at?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .insert({
          code: codeData.code.toUpperCase(),
          description: codeData.description || null,
          access_type: codeData.access_type,
          access_duration: codeData.access_type === 'lifetime' ? null : codeData.access_duration,
          max_uses: codeData.max_uses,
          current_uses: 0,
          is_active: true,
          expires_at: codeData.expires_at || null
        })
        .select()
        .single();

      if (error) throw error;

      await loadData();
      return data;
    } catch (error) {
      console.error('Error creating access code:', error);
      throw error;
    }
  };

  return {
    users,
    subscriptions,
    subscriptionPlans,
    accessCodes,
    redemptions,
    loading,
    error,
    isSuperAdmin,
    updateUserStatus,
    deleteUser,
    createSubscription,
    cancelSubscription,
    createAccessCode,
    refetch: loadData
  };
}
