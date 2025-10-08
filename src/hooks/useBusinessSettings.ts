import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BusinessSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useBusinessSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const defaultSettings: BusinessSettings = {
        id: 'default-anonymous',
        user_id: user?.id || 'demo', 
        business_name: 'BookingFast',
        primary_color: '#3B82F6',
        secondary_color: '#8B5CF6',
        opening_hours: {
          monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
          sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
        },
        buffer_minutes: 15,
        default_deposit_percentage: 30,
        minimum_booking_delay_hours: 24,
        payment_link_expiry_minutes: 30,
        deposit_type: 'percentage',
        deposit_fixed_amount: 20,
        email_notifications: true,
        brevo_enabled: false,
        brevo_api_key: '',
        brevo_sender_email: '',
        brevo_sender_name: 'BookingFast',
        stripe_enabled: false,
        stripe_public_key: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        timezone: 'Europe/Paris',
      };
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('🔄 Chargement paramètres pour:', user.email);
      
      let targetUserId = user.id;
      
      try {
        const { data: membershipData, error: membershipError } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!membershipError && membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
          console.log('👥 Membre d\'équipe - chargement paramètres du propriétaire:', targetUserId);
        } else {
          console.log('👑 Propriétaire - chargement paramètres propres:', targetUserId);
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe, utilisation ID utilisateur:', teamError);
      }

      const { data, error } = await supabase!
        .from('business_settings')
        .select('*')
        .eq('user_id', targetUserId)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        console.log('⚠️ Paramètres non trouvés, création des valeurs par défaut');
        const defaultSettings: BusinessSettings = {
          id: 'default',
          user_id: targetUserId,
          business_name: 'BookingFast',
          primary_color: '#3B82F6',
          secondary_color: '#8B5CF6',
          opening_hours: {
            monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
            tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
            wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
            thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
            friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
            saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
          },
          buffer_minutes: 15,
          default_deposit_percentage: 30,
          minimum_booking_delay_hours: 24,
          payment_link_expiry_minutes: 30,
          deposit_type: 'percentage',
          deposit_fixed_amount: 20,
          email_notifications: true,
          brevo_enabled: false,
          brevo_api_key: '',
          brevo_sender_email: '',
          brevo_sender_name: 'BookingFast',
          stripe_enabled: false,
          stripe_public_key: '',
          stripe_secret_key: '',
          stripe_webhook_secret: '',
          timezone: 'Europe/Paris',
          enable_user_assignment: false
        };
        setSettings(defaultSettings);
        return;
      }

      console.log('✅ Paramètres chargés');
      setSettings(data);
      
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres:', err);
      
      const defaultSettings: BusinessSettings = {
        id: 'default-fallback',
        user_id: user.id,
        business_name: 'BookingFast',
        primary_color: '#3B82F6',
        secondary_color: '#8B5CF6',
        opening_hours: {
          monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
          saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
          sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
        },
        buffer_minutes: 15,
        default_deposit_percentage: 30,
        minimum_booking_delay_hours: 24,
        payment_link_expiry_minutes: 30,
        deposit_type: 'percentage',
        deposit_fixed_amount: 20,
        email_notifications: true,
        brevo_enabled: false,
        brevo_api_key: '',
        brevo_sender_email: '',
        brevo_sender_name: 'BookingFast',
        stripe_enabled: false,
        stripe_public_key: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        timezone: 'Europe/Paris',
      };
      setSettings(defaultSettings);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase non configuré');
    }

    try {
      if (!settings?.id) {
        throw new Error('Aucun paramètre à mettre à jour');
      }

      const { data, error } = await supabase!
        .from('business_settings')
        .update({
          ...newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setSettings(data);
        return data;
      } else {
        await fetchSettings();
        return settings;
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadSettings = async () => {
      if (!mounted || !user) {
        setLoading(false);
        return;
      }

      console.log('🔄 Chargement paramètres business');
      setLoading(true);
      
      // Timeout de sécurité
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('⏰ Timeout chargement paramètres - utilisation valeurs par défaut');
          const defaultSettings: BusinessSettings = {
            id: 'default-timeout',
            user_id: user.id,
            business_name: 'BookingFast',
            primary_color: '#3B82F6',
            secondary_color: '#8B5CF6',
            opening_hours: {
              monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
              sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
            },
            buffer_minutes: 15,
            default_deposit_percentage: 30,
            minimum_booking_delay_hours: 24,
            payment_link_expiry_minutes: 30,
            deposit_type: 'percentage',
            deposit_fixed_amount: 20,
            email_notifications: true,
            brevo_enabled: false,
            brevo_api_key: '',
            brevo_sender_email: '',
            brevo_sender_name: 'BookingFast',
            stripe_enabled: false,
            stripe_public_key: '',
            stripe_secret_key: '',
            stripe_webhook_secret: '',
            timezone: 'Europe/Paris',
          };
          setSettings(defaultSettings);
          setLoading(false);
        }
      }, 10000);
      
      await fetchSettings();
      clearTimeout(timeoutId);
    };
    
    if (user) {
      loadSettings();
    } else {
      setLoading(false);
    }
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user?.id]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSettings
  };
}
