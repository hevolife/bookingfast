import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SubscriptionLimits {
  tier: 'basic' | 'premium';
  maxBookingsPerMonth: number | null;
  currentBookingCount: number;
  teamMembersAllowed: boolean;
  customServicesAllowed: boolean;
  canCreateBooking: boolean;
  canAddTeamMember: boolean;
  canUseCustomService: boolean;
}

export function useSubscriptionLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      if (!user || !supabase) {
        setLimits(null);
        setLoading(false);
        return;
      }

      try {
        // Get user profile with subscription info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_tier, monthly_booking_count, booking_count_reset_date')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Get plan limitations
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('max_bookings_per_month, team_members_allowed, custom_services_allowed')
          .eq('id', profile.subscription_tier || 'basic')
          .single();

        if (planError) throw planError;

        const isPremium = profile.subscription_tier === 'premium';

        setLimits({
          tier: profile.subscription_tier || 'basic',
          maxBookingsPerMonth: plan.max_bookings_per_month,
          currentBookingCount: profile.monthly_booking_count || 0,
          teamMembersAllowed: plan.team_members_allowed,
          customServicesAllowed: plan.custom_services_allowed,
          canCreateBooking: isPremium || (profile.monthly_booking_count || 0) < (plan.max_bookings_per_month || 150),
          canAddTeamMember: plan.team_members_allowed,
          canUseCustomService: plan.custom_services_allowed
        });
      } catch (error) {
        console.error('❌ Erreur chargement limites abonnement:', error);
        setLimits(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [user]);

  return { limits, loading };
}
