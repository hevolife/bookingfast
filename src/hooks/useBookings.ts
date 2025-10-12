import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { GoogleCalendarService } from '../lib/googleCalendar';

export function useBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Utiliser useRef pour éviter les re-renders
  const fetchingRef = useRef(false);

  const fetchBookings = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (fetchingRef.current) {
      console.log('⏭️ fetchBookings déjà en cours, skip');
      return;
    }

    if (!user) {
      console.log('⚠️ fetchBookings - Pas d\'utilisateur');
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      console.log('⚠️ fetchBookings - Supabase non configuré');
      setBookings([]);
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    console.log('🔄 fetchBookings - Chargement en cours...');
    setLoading(true);
    setError(null);

    try {
      let targetUserId = user.id;
      console.log('🔍 fetchBookings - targetUserId initial:', targetUserId);
      
      try {
        console.log('🔍 fetchBookings - Vérification team_members...');
        const { data: membershipData, error: membershipError } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        console.log('🔍 fetchBookings - membershipData:', membershipData);
        
        if (!membershipError && membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
          console.log('🔍 fetchBookings - targetUserId mis à jour:', targetUserId);
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe:', teamError);
      }

      console.log('🔍 fetchBookings - Requête bookings pour user_id:', targetUserId);
      const { data, error } = await supabase!
        .from('bookings')
        .select(`
          *,
          service:services(*)
        `)
        .eq('user_id', targetUserId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('❌ Erreur chargement bookings:', error);
        throw error;
      }

      console.log('✅ Bookings chargés:', data?.length || 0, 'réservations');
      setBookings(data || []);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des réservations:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setBookings([]);
    } finally {
      console.log('🏁 fetchBookings - Terminé');
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]); // ✅ Seulement user.id comme dépendance

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'created_at' | 'user_id'>) => {
    if (!isSupabaseConfigured || !user) {
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

      // Vérifier la limite de réservations
      const { data: limitCheck, error: limitError } = await supabase!
        .rpc('check_booking_limit', { user_id_param: targetUserId });

      if (limitError) {
        console.warn('⚠️ Erreur vérification limite:', limitError);
      } else if (limitCheck && !limitCheck.allowed) {
        throw new Error(
          `Limite de réservations atteinte ! Vous avez utilisé ${limitCheck.current}/${limitCheck.limit} réservations ce mois-ci. Passez au plan Pro pour des réservations illimitées.`
        );
      }

      const { data, error } = await supabase!
        .from('bookings')
        .insert([{ ...bookingData, user_id: targetUserId }])
        .select(`
          *,
          service:services(*)
        `)
        .single();

      if (error) throw error;

      if (data) {
        setBookings(prev => [...prev, data]);
        
        try {
          await GoogleCalendarService.createEvent(data, targetUserId);
        } catch (calendarError) {
          console.warn('⚠️ Erreur synchronisation Google Calendar:', calendarError);
        }
        
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la réservation:', err);
      throw err;
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    if (!isSupabaseConfigured || !user) {
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

      const { data, error } = await supabase!
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          service:services(*)
        `)
        .single();

      if (error) throw error;

      if (data) {
        setBookings(prev => prev.map(b => b.id === id ? data : b));
        
        try {
          await GoogleCalendarService.updateEvent(data, targetUserId);
        } catch (calendarError) {
          console.warn('⚠️ Erreur synchronisation Google Calendar:', calendarError);
        }
        
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la réservation:', err);
      throw err;
    }
  };

  const deleteBooking = async (id: string) => {
    if (!isSupabaseConfigured || !user) {
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

      const { data: bookingData } = await supabase!
        .from('bookings')
        .select('google_calendar_event_id')
        .eq('id', id)
        .single();

      const { error } = await supabase!
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBookings(prev => prev.filter(b => b.id !== id));
      
      if (bookingData?.google_calendar_event_id) {
        try {
          await GoogleCalendarService.deleteEvent(bookingData.google_calendar_event_id, targetUserId);
        } catch (calendarError) {
          console.warn('⚠️ Erreur suppression événement Google Calendar:', calendarError);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la suppression de la réservation:', err);
      throw err;
    }
  };

  useEffect(() => {
    console.log('🔍 useEffect - Déclenché, user:', user?.id);
    
    if (user) {
      console.log('✅ useEffect - Appel de fetchBookings');
      fetchBookings();
    } else {
      console.log('⚠️ useEffect - Pas d\'utilisateur, reset bookings');
      setBookings([]);
      setLoading(false);
    }
  }, [user?.id, fetchBookings]); // ✅ Dépendances stables

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
    addBooking,
    updateBooking,
    deleteBooking
  };
}
