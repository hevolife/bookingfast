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
    console.log('🔵 [CREATE] Début création lien de paiement');
    console.log('🔵 [CREATE] Params:', { bookingId, amount, expiryMinutes });

    if (!user || !isSupabaseConfigured) {
      console.error('❌ [CREATE] Supabase non configuré ou utilisateur non connecté');
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    console.log('✅ [CREATE] User ID:', user.id);

    try {
      // 🔥 VÉRIFICATION AUTH CRITIQUE
      const { data: { user: supabaseUser }, error: userError } = await supabase!.auth.getUser();
      const { data: { session }, error: sessionError } = await supabase!.auth.getSession();

      console.log('🔥 [AUTH CHECK] Supabase User:', supabaseUser?.id);
      console.log('🔥 [AUTH CHECK] Session exists:', !!session);
      console.log('🔥 [AUTH CHECK] Access token exists:', !!session?.access_token);

      if (!supabaseUser) {
        throw new Error('Utilisateur non authentifié dans Supabase');
      }

      if (!session?.access_token) {
        throw new Error('Session invalide ou expirée');
      }

      let targetUserId = user.id;

      // Vérifier équipe
      try {
        console.log('🔍 [CREATE] Vérification équipe...');
        const { data: membershipData } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
          console.log('✅ [CREATE] Membre d\'équipe, owner_id:', targetUserId);
        } else {
          console.log('✅ [CREATE] Utilisateur propriétaire');
        }
      } catch (teamError) {
        console.warn('⚠️ [CREATE] Erreur vérification équipe:', teamError);
      }

      // Récupérer les paramètres de délai d'expiration
      console.log('🔍 [CREATE] Récupération paramètres expiration...');
      const { data: settings, error: settingsError } = await supabase!
        .from('business_settings')
        .select('payment_link_expiry_minutes')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (settingsError) {
        console.warn('⚠️ [CREATE] Erreur récupération settings:', settingsError);
      } else {
        console.log('✅ [CREATE] Settings:', settings);
      }

      const expiryMins = expiryMinutes || settings?.payment_link_expiry_minutes || 30;
      const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000).toISOString();

      console.log('✅ [CREATE] Expiration calculée:', { expiryMins, expiresAt });

      // 🔥 ÉTAPE 1 : Créer le lien de paiement
      const insertData = {
        booking_id: bookingId,
        user_id: targetUserId,
        amount,
        expires_at: expiresAt,
        status: 'pending' as const
      };

      console.log('🔵 [CREATE] Données lien de paiement:', insertData);

      const { data: paymentLink, error: insertError } = await supabase!
        .from('payment_links')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ [CREATE] Erreur INSERT payment_link:', insertError);
        throw insertError;
      }

      if (!paymentLink) {
        console.error('❌ [CREATE] Aucune donnée retournée après INSERT');
        throw new Error('Aucune donnée retournée après création');
      }

      console.log('✅ [CREATE] Lien créé avec succès:', paymentLink);

      // 🔥 ÉTAPE 2 : Créer la transaction "pending" liée au payment_link dans pos_transactions
      console.log('🔵 [CREATE] Création transaction pending dans pos_transactions...');
      
      const { data: transaction, error: transactionError } = await supabase!
        .from('pos_transactions')
        .insert({
          booking_id: bookingId,
          payment_link_id: paymentLink.id, // 🔥 LIEN CRITIQUE
          amount: amount,
          method: 'stripe',
          status: 'pending',
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (transactionError) {
        console.error('❌ [CREATE] Erreur création transaction:', transactionError);
        // Ne pas bloquer si la transaction échoue, le lien est créé
      } else {
        console.log('✅ [CREATE] Transaction pending créée:', transaction);
      }

      // Générer l'URL du lien de paiement
      const paymentUrl = `${window.location.origin}/payment?link_id=${paymentLink.id}`;
      console.log('✅ [CREATE] URL générée:', paymentUrl);

      // Mettre à jour avec l'URL
      console.log('🔵 [CREATE] Mise à jour URL...');
      const { data: updatedLink, error: updateError } = await supabase!
        .from('payment_links')
        .update({ payment_url: paymentUrl })
        .eq('id', paymentLink.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [CREATE] Erreur UPDATE URL:', updateError);
        throw updateError;
      }

      console.log('✅ [CREATE] URL mise à jour:', updatedLink);

      setPaymentLinks(prev => [updatedLink, ...prev]);
      
      console.log('✅ [CREATE] Création terminée avec succès');
      return updatedLink;
    } catch (err) {
      console.error('❌ [CREATE] Erreur globale:', err);
      console.error('❌ [CREATE] Stack:', err instanceof Error ? err.stack : 'N/A');
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
