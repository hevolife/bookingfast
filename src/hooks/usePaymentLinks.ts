import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PaymentLink } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function usePaymentLinks(bookingId?: string) {
  const { user } = useAuth();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentLinks = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setPaymentLinks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetUserId = user.id;

      // Vérifier si l'utilisateur est membre d'une équipe
      try {
        const { data: membershipData } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe:', teamError);
      }

      let query = supabase!
        .from('payment_links')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPaymentLinks(data || []);
    } catch (err) {
      console.error('❌ Erreur chargement liens de paiement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.id, bookingId]);

  const createPaymentLink = async (
    bookingId: string,
    amount: number,
    expiryMinutes?: number
  ): Promise<PaymentLink | null> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      let targetUserId = user.id;

      try {
        const { data: membershipData } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe:', teamError);
      }

      // Récupérer les paramètres de délai d'expiration
      const { data: settings } = await supabase!
        .from('business_settings')
        .select('payment_link_expiry_minutes')
        .eq('user_id', targetUserId)
        .single();

      const expiryMins = expiryMinutes || settings?.payment_link_expiry_minutes || 30;
      const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000).toISOString();

      // Créer le lien de paiement
      const { data: paymentLink, error } = await supabase!
        .from('payment_links')
        .insert({
          booking_id: bookingId,
          user_id: targetUserId,
          amount,
          expires_at: expiresAt,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Générer l'URL du lien de paiement
      const paymentUrl = `${window.location.origin}/payment?link_id=${paymentLink.id}`;

      // Mettre à jour avec l'URL
      const { data: updatedLink, error: updateError } = await supabase!
        .from('payment_links')
        .update({ payment_url: paymentUrl })
        .eq('id', paymentLink.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setPaymentLinks(prev => [updatedLink, ...prev]);
      return updatedLink;
    } catch (err) {
      console.error('❌ Erreur création lien de paiement:', err);
      throw err;
    }
  };

  const cancelPaymentLink = async (linkId: string) => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      const { error } = await supabase!
        .from('payment_links')
        .update({ status: 'cancelled' })
        .eq('id', linkId);

      if (error) throw error;

      setPaymentLinks(prev =>
        prev.map(link =>
          link.id === linkId ? { ...link, status: 'cancelled' as const } : link
        )
      );
    } catch (err) {
      console.error('❌ Erreur annulation lien:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchPaymentLinks();
    }
  }, [user?.id, fetchPaymentLinks]);

  return {
    paymentLinks,
    loading,
    error,
    refetch: fetchPaymentLinks,
    createPaymentLink,
    cancelPaymentLink
  };
}
