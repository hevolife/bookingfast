import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { triggerWorkflow } from '../lib/workflowEngine';

interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  participants?: number;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  service?: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  transactions?: Array<{
    id: string;
    method: string;
    status: string;
    amount: number;
    stripe_session_id?: string;
  }>;
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!isSupabaseConfigured()) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          client:clients(*),
          service:services(*),
          transactions(*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Erreur chargement réservations:', fetchError);
        setError(fetchError.message);
      } else {
        setBookings(data || []);
      }
    } catch (err) {
      console.error('❌ Erreur chargement réservations:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const addBooking = async (bookingData: Partial<Booking>) => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase non configuré');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select(`
          *,
          client:clients(*),
          service:services(*),
          transactions(*)
        `)
        .single();

      if (insertError) {
        console.error('❌ Erreur création réservation:', insertError);
        throw insertError;
      }

      // Vérifier s'il y a des transactions Stripe en attente
      const hasPendingStripeTransaction = data.transactions?.some(t => 
        t.method === 'stripe' && t.status === 'pending'
      );

      console.log('🔍 Transactions en attente détectées:', hasPendingStripeTransaction);
      console.log('📋 Transactions:', data.transactions?.map(t => ({
        method: t.method,
        status: t.status,
        amount: t.amount
      })));

      if (!hasPendingStripeTransaction) {
        // Pas de lien de paiement en attente → déclencher le workflow immédiatement
        console.log('✅ Réservation sans lien de paiement - déclenchement workflow immédiat');
        try {
          await triggerWorkflow('booking_created', data);
          console.log('✅ Workflow booking_created déclenché avec succès');
        } catch (workflowError) {
          console.error('❌ Erreur déclenchement workflow:', workflowError);
        }
      } else {
        // Lien de paiement en attente → attendre le paiement
        console.log('⏳ Réservation avec lien de paiement - workflow en attente du paiement');
        console.log('💳 Le workflow sera déclenché par le webhook Stripe après paiement');
      }

      setBookings(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('❌ Erreur création réservation:', err);
      throw err;
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase non configuré');
      return null;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          client:clients(*),
          service:services(*),
          transactions(*)
        `)
        .single();

      if (updateError) {
        console.error('❌ Erreur mise à jour réservation:', updateError);
        throw updateError;
      }

      setBookings(prev => prev.map(booking => 
        booking.id === id ? data : booking
      ));
      return data;
    } catch (err) {
      console.error('❌ Erreur mise à jour réservation:', err);
      throw err;
    }
  };

  const deleteBooking = async (id: string) => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase non configuré');
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erreur suppression réservation:', deleteError);
        throw deleteError;
      }

      setBookings(prev => prev.filter(booking => booking.id !== id));
      return true;
    } catch (err) {
      console.error('❌ Erreur suppression réservation:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return {
    bookings,
    loading,
    error,
    addBooking,
    updateBooking,
    deleteBooking,
    refetch: fetchBookings
  };
}