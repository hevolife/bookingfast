import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { GoogleCalendarService } from '../lib/googleCalendar';

export function useBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      const demoBookings: Booking[] = [];
      setBookings(demoBookings);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
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
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe:', teamError);
      }

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

      console.log('✅ Bookings chargés:', data?.length || 0);
      setBookings(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des réservations:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

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
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadBookings = async () => {
      if (mounted && user) {
        console.log('🔄 Chargement bookings pour:', user.email);
        setLoading(true);
        
        // Timeout de sécurité
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('⏰ Timeout chargement bookings');
            setLoading(false);
            setBookings([]);
          }
        }, 10000);
        
        await fetchBookings();
        clearTimeout(timeoutId);
      }
    };
    
    if (user) {
      loadBookings();
    } else {
      setLoading(false);
      setBookings([]);
    }
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user?.id]);

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
