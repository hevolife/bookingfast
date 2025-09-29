// Gestionnaire de webhook Stripe côté client
import { supabase, isSupabaseConfigured } from './supabase';
import { Booking } from '../types';

export class StripeWebhookHandler {
  // Vérifier et synchroniser les paiements Stripe
  static async syncStripePayments(bookings: Booking[]): Promise<Booking[]> {
    if (!isSupabaseConfigured()) return bookings;

    const updatedBookings: Booking[] = [];
    let hasUpdates = false;

    for (const booking of bookings) {
      let updatedBooking = { ...booking };
      let needsUpdate = false;

      // Vérifier les transactions Stripe en attente
      if (booking.transactions && booking.transactions.length > 0) {
        const updatedTransactions = await Promise.all(
          booking.transactions.map(async (transaction) => {
            // Si c'est une transaction Stripe en attente, vérifier le statut
            if (transaction.method === 'stripe' && transaction.status === 'pending') {
              // Extraire l'ID de session depuis la note si disponible
              const sessionMatch = transaction.note.match(/Session:\s*(cs_[a-zA-Z0-9_]+)/);
              
              if (sessionMatch) {
                const sessionId = sessionMatch[1];
                
                try {
                  // Vérifier le statut via l'API Stripe
                  const paymentStatus = await this.checkStripePaymentStatus(sessionId, booking.user_id);
                  
                  if (paymentStatus === 'paid') {
                    console.log('💰 Paiement Stripe détecté comme payé:', sessionId);
                    needsUpdate = true;
                    return {
                      ...transaction,
                      status: 'completed' as const,
                      note: transaction.note.replace('En attente', 'Payé via Stripe')
                    };
                  }
                } catch (error) {
                  console.warn('⚠️ Erreur vérification statut Stripe:', error);
                }
              } else {
                // Si pas d'ID de session, vérifier par métadonnées
                const isRecentPayment = await this.checkRecentStripePayment(
                  booking.client_email,
                  transaction.amount,
                  booking.date,
                  booking.time
                );
                
                if (isRecentPayment) {
                  console.log('💰 Paiement Stripe récent détecté pour:', booking.client_email);
                  needsUpdate = true;
                  return {
                    ...transaction,
                    status: 'completed' as const,
                    note: transaction.note.replace('En attente', 'Payé via Stripe')
                  };
                }
              }
            }
            return transaction;
          })
        );

        if (needsUpdate) {
          // Recalculer les totaux
          const completedTransactions = updatedTransactions.filter(
            t => t.status === 'completed'
          );
          const totalPaid = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
          
          let newPaymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
          if (totalPaid >= booking.total_amount) {
            newPaymentStatus = 'completed';
          } else if (totalPaid > 0) {
            newPaymentStatus = 'partial';
          }

          updatedBooking = {
            ...booking,
            transactions: updatedTransactions,
            payment_status: newPaymentStatus,
            payment_amount: totalPaid,
            booking_status: totalPaid > 0 ? 'confirmed' : booking.booking_status
          };

          hasUpdates = true;

          // Mettre à jour en base de données
          try {
            await supabase
              .from('bookings')
              .update({
                transactions: updatedTransactions,
                payment_status: newPaymentStatus,
                payment_amount: totalPaid,
                booking_status: updatedBooking.booking_status,
                updated_at: new Date().toISOString()
              })
              .eq('id', booking.id);
            
            console.log('✅ Réservation mise à jour après paiement Stripe:', booking.id);
          } catch (error) {
            console.error('❌ Erreur mise à jour réservation:', error);
          } finally {
            // Forcer un rafraîchissement de l'interface après mise à jour
            setTimeout(() => {
              console.log('🔄 Déclenchement rafraîchissement post-sync Stripe');
              window.dispatchEvent(new CustomEvent('refreshBookings'));
            }, 100);
          }
        }
      }

      updatedBookings.push(updatedBooking);
    }

    return updatedBookings;
  }

  // Vérifier le statut d'un paiement Stripe via l'API
  private static async checkStripePaymentStatus(sessionId: string, userId?: string): Promise<string> {
    try {
      // Récupérer les clés Stripe depuis les paramètres
      const { data: settings, error } = await supabase
        .from('business_settings')
        .select('stripe_secret_key')
        .eq('user_id', userId)
        .single();

      if (error || !settings?.stripe_secret_key) {
        throw new Error('Clés Stripe non trouvées');
      }

      // Appeler l'API Stripe pour vérifier le statut de la session
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${settings.stripe_secret_key}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API Stripe: ${response.status}`);
      }

      const session = await response.json();
      return session.payment_status; // 'paid', 'unpaid', etc.
      
    } catch (error) {
      console.error('Erreur vérification statut Stripe:', error);
      throw error;
    }
  }

  // Vérifier s'il y a eu un paiement récent pour ce client
  private static async checkRecentStripePayment(
    clientEmail: string,
    amount: number,
    bookingDate: string,
    bookingTime: string
  ): Promise<boolean> {
    try {
      // Vérifier s'il y a eu des paiements récents (dernières 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      // Chercher d'autres réservations du même client avec paiements récents
      const { data: recentBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', clientEmail)
        .gte('updated_at', tenMinutesAgo);

      if (error || !recentBookings) return false;

      // Vérifier si une réservation similaire a été payée récemment
      return recentBookings.some(booking => {
        if (booking.date === bookingDate && booking.time === bookingTime) {
          return booking.transactions?.some((t: any) => 
            t.method === 'stripe' && 
            t.status === 'completed' &&
            Math.abs(t.amount - amount) < 0.01 // Tolérance de 1 centime
          );
        }
        return false;
      });
      
    } catch (error) {
      console.error('Erreur vérification paiements récents:', error);
      return false;
    }
  }

  // Traiter un webhook Stripe manuellement
  static async processStripeWebhook(sessionData: any): Promise<void> {
    console.log('🔄 Début traitement webhook Stripe');
    console.log('📊 Session data reçue:', sessionData);
    
    if (!isSupabaseConfigured()) {
      console.log('📧 MODE DÉMO - Simulation traitement webhook');
      return;
    }

    try {
      const { customer_details, metadata, amount_total, id: sessionId } = sessionData;
      const customerEmail = customer_details?.email;
      const amountPaid = amount_total / 100; // Stripe utilise les centimes

      if (!customerEmail || !metadata) {
        console.warn('⚠️ Données webhook incomplètes');
        return;
      }

      console.log('🔄 Traitement webhook Stripe:', {
        sessionId,
        customerEmail,
        amountPaid,
        metadata
      });

      // Utiliser une connexion Supabase avec la clé service pour contourner l'authentification
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseServiceClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      
      console.log('🔍 Recherche réservation avec client service...');
      
      // Trouver la réservation correspondante avec le client service
      const { data: booking, error: findError } = await supabaseServiceClient
        .from('bookings')
        .select('*')
        .eq('client_email', customerEmail)
        .eq('date', metadata.date || metadata.booking_date)
        .eq('time', metadata.time || metadata.booking_time)
        .single();

      if (findError || !booking) {
        console.error('❌ Réservation non trouvée pour le webhook:', {
          email: customerEmail,
          date: metadata.date || metadata.booking_date,
          time: metadata.time || metadata.booking_time,
          error: findError
        });
        return;
      }

      console.log('✅ Réservation trouvée:', booking.id);
      console.log('📋 Transactions actuelles:', booking.transactions);

      // Mettre à jour la transaction Stripe correspondante
      const existingTransactions = booking.transactions || [];
      const updatedTransactions = existingTransactions.map((transaction: any) => {
        // Trouver la transaction Stripe en attente avec le bon montant
        if (transaction.method === 'stripe' && 
            transaction.status === 'pending' &&
            Math.abs(transaction.amount - amountPaid) < 0.01) {
          
          console.log('🔄 Mise à jour transaction Stripe:', transaction.id);
          console.log('📊 Transaction avant:', transaction);
          
          const updatedTransaction = {
            ...transaction,
            status: 'completed',
            note: `Payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`
          };
          
          console.log('📊 Transaction après:', updatedTransaction);
          return {
            ...transaction,
            status: 'completed',
            note: `Payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`
          };
        }
        return transaction;
      });

      console.log('📋 Transactions mises à jour:', updatedTransactions);
      // Calculer les nouveaux totaux
      const totalPaid = updatedTransactions
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      let newPaymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
      if (totalPaid >= booking.total_amount) {
        newPaymentStatus = 'completed';
      } else if (totalPaid > 0) {
        newPaymentStatus = 'partial';
      }

      console.log('💰 Calculs paiement:', {
        totalPaid,
        totalAmount: booking.total_amount,
        newPaymentStatus
      });
      // Mettre à jour la réservation
      console.log('🔄 Mise à jour réservation en base...');
      const { data: updatedBooking, error: updateError } = await supabaseServiceClient
        .from('bookings')
        .update({
          transactions: updatedTransactions,
          payment_status: newPaymentStatus,
          payment_amount: totalPaid,
          booking_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur mise à jour réservation:', updateError);
        return;
      }

      console.log('✅ Réservation mise à jour en base:', updatedBooking);
      console.log('✅ Paiement Stripe traité avec succès:', {
        bookingId: booking.id,
        amountPaid,
        newPaymentStatus,
        totalPaid
      });

    } catch (error) {
      console.error('❌ Erreur traitement webhook Stripe:', error);
    }
  }
}