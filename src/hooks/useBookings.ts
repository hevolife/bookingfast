import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Booking } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessSettings } from './useBusinessSettings';
import { bookingEvents } from '../lib/bookingEvents';
import { notificationEvents } from '../lib/notificationEvents';
import { triggerWorkflow } from '../lib/workflowEngine';
import { StripeWebhookHandler } from '../lib/stripeWebhookHandler';

const checkAndUpdateExpiredPaymentLinks = async (bookings: Booking[], settings?: any): Promise<Booking[]> => {
  if (!isSupabaseConfigured()) return bookings;

  const now = Date.now();
  const expiryMinutes = settings?.payment_link_expiry_minutes || 30;
  const expiryMs = expiryMinutes * 60 * 1000;
  const updatedBookings: Booking[] = [];
  let hasUpdates = false;

  for (const booking of bookings) {
    let updatedBooking = { ...booking };
    let needsUpdate = false;

    if (booking.transactions && booking.transactions.length > 0) {
      const updatedTransactions = booking.transactions.map(transaction => {
        if (transaction.method === 'stripe' && 
            transaction.status === 'pending' && 
            transaction.created_at) {
          
          const transactionTime = new Date(transaction.created_at).getTime();
          const expirationTime = transactionTime + expiryMs;
          
          if (now > expirationTime) {
            console.log(`⏰ Lien de paiement expiré pour réservation: ${booking.id} (délai: ${expiryMinutes}min)`);
            
            notificationEvents.emit('paymentLinkExpired', {
              booking,
              transaction,
              expiredAt: new Date(expirationTime)
            });
            
            needsUpdate = true;
            return {
              ...transaction,
              status: 'cancelled' as const,
              note: transaction.note.replace('En attente', 'Expiré').replace('(expire dans', '(expiré après')
            };
          }
        }
        return transaction;
      });

      if (needsUpdate) {
        const completedTransactions = updatedTransactions.filter(t => t.status === 'completed' || (t.status !== 'pending' && t.status !== 'cancelled'));
        const totalPaid = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        let newPaymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
        if (totalPaid >= booking.total_amount) {
          newPaymentStatus = 'completed';
        } else if (totalPaid > 0) {
          newPaymentStatus = 'partial';
        }

        let newBookingStatus = booking.booking_status;
        if (totalPaid === 0 && booking.booking_status === 'confirmed') {
          newBookingStatus = 'pending';
          console.log('📋 Réservation passée en "en attente" suite à expiration du lien:', booking.id);
        }

        updatedBooking = {
          ...booking,
          transactions: updatedTransactions,
          payment_status: newPaymentStatus,
          payment_amount: totalPaid,
          booking_status: newBookingStatus
        };

        hasUpdates = true;

        try {
          await supabase
            .from('bookings')
            .update({
              transactions: updatedTransactions,
              payment_status: newPaymentStatus,
              payment_amount: totalPaid,
              booking_status: newBookingStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);
          
          console.log('✅ Réservation mise à jour en base:', booking.id);
        } catch (error) {
          console.error('❌ Erreur mise à jour réservation expirée:', error);
        }
      }
    }

    updatedBookings.push(updatedBooking);
  }

  return updatedBookings;
};

export function useBookings(date?: string) {
  const { user } = useAuth();
  const { settings } = useBusinessSettings();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  const fetchBookings = async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase non configuré - mode démo');
      setBookings([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      console.log('🔄 Début chargement réservations...');
      setError(null);
      
      if (!navigator.onLine) {
        throw new Error('Aucune connexion internet détectée');
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout chargement réservations')), 8000);
      });

      // Déterminer l'ID utilisateur pour lequel charger les données
      let targetUserId = user.id;
      
      // Vérifier si l'utilisateur est membre d'une équipe
      try {
        const { data: membershipData, error: membershipError } = await supabase
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!membershipError && membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
          console.log('👥 Membre d\'équipe - chargement données du propriétaire:', targetUserId);
        } else {
          console.log('👑 Propriétaire - chargement données propres:', targetUserId);
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe, utilisation ID utilisateur:', teamError);
      }
      let query = supabase
        .from('bookings')
        .select(`
          *,
          service:services(*)
        `)
        .eq('user_id', targetUserId)
        .in('booking_status', ['pending', 'confirmed'])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(1000);

      if (date) {
        console.log('📅 Filtrage par date:', date);
        query = query.eq('date', date);
      }

      const { data, error } = await Promise.race([query, timeoutPromise]) as any;

      if (error) {
        throw error;
      }

      console.log('✅ Réservations chargées:', data?.length || 0);
      console.log('📋 Détails des réservations chargées:', data?.map(b => ({
        id: b.id,
        client: b.client_email,
        date: b.date,
        time: b.time,
        user_id: b.user_id,
        assigned_user_id: b.assigned_user_id
      })));

      // Synchroniser les paiements Stripe avant de vérifier les liens expirés
      let syncedBookings = await StripeWebhookHandler.syncStripePayments(data || []);
      const updatedBookings = await checkAndUpdateExpiredPaymentLinks(syncedBookings, settings);
      
      setBookings(updatedBookings);
      console.log('✅ Réservations finales après vérification:', updatedBookings.length);
    } catch (err) {
      console.error('❌ Erreur chargement réservations:', err);
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        if (err.message.includes('Timeout')) {
          errorMessage = 'Chargement trop lent. Réessayez dans quelques instants.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Impossible de se connecter à la base de données. Vérifiez votre connexion internet.';
        } else if (err.message.includes('NetworkError')) {
          errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const addBooking = async (booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([{ 
          ...booking, 
          user_id: user.id
        }])
        .select(`
          *,
          service:services(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setBookings(prev => {
          const exists = prev.some(b => b.id === data.id);
          const updated = exists ? prev : [...prev, data];
          console.log('📊 État local mis à jour - Nouvelles réservations:', updated.length);
          return updated;
        });
        
        console.log('✅ Nouvelle réservation créée:', data.id);
        
        // Déclencher le workflow immédiatement après création réussie
        try {
          console.log('🚀 Déclenchement workflow booking_created pour:', data.client_email);
          await triggerWorkflow('booking_created', data, user.id);
          console.log('✅ Workflow booking_created déclenché avec succès');
        } catch (workflowError) {
          console.error('❌ Erreur déclenchement workflow:', workflowError);
        }
        
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la réservation:', err);
      throw err;
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré');
    }

    try {
      let paymentStatus = updates.payment_status;
      let actualPaidAmount = updates.payment_amount || 0;
      let bookingStatus = updates.booking_status;
      
      if (updates.transactions && updates.total_amount) {
        const totalPaid = updates.transactions
          .filter((t: any) => t.status !== 'pending' && t.status !== 'cancelled')
          .reduce((sum: number, t: any) => sum + t.amount, 0);
        
        actualPaidAmount = totalPaid;
        
        if (totalPaid >= updates.total_amount) {
          paymentStatus = 'completed';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'pending';
        }
        
        const now = Date.now();
        const expiredLinks = updates.transactions.filter((t: any) => 
          t.method === 'stripe' && 
          t.status === 'pending' && 
          t.created_at && 
          (now - new Date(t.created_at).getTime()) > (30 * 60 * 1000)
        );
        
        if (expiredLinks.length > 0 && paymentStatus === 'pending') {
          bookingStatus = 'pending';
        }
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({
          ...updates,
          payment_status: paymentStatus,
          payment_amount: actualPaidAmount,
          booking_status: bookingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          service:services(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setBookings(prev => {
          const updated = prev.map(b => b.id === id ? data : b);
          console.log('📊 État local mis à jour - Réservation modifiée:', id);
          return updated;
        });
        
        console.log('Réservation mise à jour:', data.id);
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la réservation:', err);
      throw err;
    }
  };

  const deleteBooking = async (id: string) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setBookings(prev => prev.filter(b => b.id !== id));
      console.log('Réservation supprimée:', id);
    } catch (err) {
      console.error('Erreur lors de la suppression de la réservation:', err);
      throw err;
    }
  };

  const refetch = () => {
    setLastInteraction(Date.now());
    fetchBookings();
  };

  // Vérifier les liens expirés toutes les 30 secondes
  useEffect(() => {
    const checkExpiredLinks = async () => {
      if (bookings.length > 0) {
        const updatedBookings = await checkAndUpdateExpiredPaymentLinks(bookings, settings);
        
        const hasChanges = updatedBookings.some((updated, index) => {
          const original = bookings[index];
          return original && (
            updated.payment_status !== original.payment_status ||
            updated.booking_status !== original.booking_status ||
            JSON.stringify(updated.transactions) !== JSON.stringify(original.transactions)
          );
        });

        if (hasChanges) {
          console.log('🔄 Mise à jour automatique des liens expirés');
          setBookings(updatedBookings);
        }
      }
    };

    const interval = setInterval(checkExpiredLinks, 30000);
    return () => clearInterval(interval);
  }, [bookings, settings]);

  // Auto-refresh toutes les 2 minutes si pas d'interaction
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      const twoMinutes = 2 * 60 * 1000;
      
      if (timeSinceLastInteraction >= twoMinutes) {
        console.log('🔄 Auto-refresh du planning (2 minutes d\'inactivité)');
        fetchBookings();
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lastInteraction, user?.id]);

  // Écouter l'événement de rafraîchissement manuel
  useEffect(() => {
    const handleRefreshBookings = () => {
      console.log('🔄 Rafraîchissement manuel des réservations demandé');
      fetchBookings();
    };

    window.addEventListener('refreshBookings', handleRefreshBookings);
    return () => window.removeEventListener('refreshBookings', handleRefreshBookings);
  }, []);

  // Mettre à jour lastInteraction lors des interactions utilisateur
  useEffect(() => {
    const handleUserInteraction = () => {
      setLastInteraction(Date.now());
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('scroll', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const loadBookings = async () => {
      if (mounted && user) {
        setLoading(true);
        await fetchBookings();
      }
    };
    
    if (user) {
      loadBookings();
    }
    
    return () => {
      mounted = false;
    };
  }, [date, user?.id]);

  return {
    bookings,
    loading,
    error,
    refetch,
    addBooking,
    updateBooking,
    deleteBooking
  };
}