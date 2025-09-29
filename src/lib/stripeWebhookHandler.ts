// Gestionnaire de webhook Stripe côté client - Version complètement refaite
import { supabase, isSupabaseConfigured } from './supabase';
import { Booking } from '../types';

export class StripeWebhookHandler {
  // Traiter un paiement Stripe réussi
  static async processStripeWebhook(sessionData: any): Promise<void> {
    console.log('🔄 DÉBUT TRAITEMENT PAIEMENT STRIPE');
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

      console.log('🔍 Recherche de la réservation...');
      console.log('📧 Email client:', customerEmail);
      console.log('📅 Date:', metadata.date || metadata.booking_date);
      console.log('⏰ Heure:', metadata.time || metadata.booking_time);
      console.log('💰 Montant payé:', amountPaid, '€');

      // Rechercher la réservation correspondante
      let booking = null;
      let findError = null;

      // Rechercher par email, date et heure (méthode principale)
      console.log('🔍 Recherche réservation par email/date/heure');
      const result = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', customerEmail)
        .eq('date', metadata.date || metadata.booking_date)
        .eq('time', metadata.time || metadata.booking_time)
        .maybeSingle();
      
      booking = result.data;
      findError = result.error;
      
      if (booking) {
        console.log('✅ Réservation trouvée:', booking.id);
      }

      if (findError || !booking) {
        console.error('❌ Réservation non trouvée:', {
          email: customerEmail,
          date: metadata.date || metadata.booking_date,
          time: metadata.time || metadata.booking_time,
          error: findError
        });
        return;
      }

      console.log('📋 Réservation trouvée:', {
        id: booking.id,
        client: booking.client_email,
        total_amount: booking.total_amount,
        payment_amount: booking.payment_amount,
        payment_status: booking.payment_status
      });

      // Vérifier si le paiement n'a pas déjà été traité
      const existingTransactions = booking.transactions || [];
      const alreadyProcessed = existingTransactions.some((t: any) => 
        t.method === 'stripe' && 
        t.status === 'completed' &&
        t.note && t.note.includes(sessionId)
      );

      if (alreadyProcessed) {
        console.log('⚠️ Paiement déjà traité pour cette session:', sessionId);
        return;
      }

      console.log('📋 Transactions actuelles:', existingTransactions.length);

      // Mettre à jour la transaction Stripe correspondante
      const updatedTransactions = existingTransactions.map((transaction: any) => {
        // Trouver la transaction Stripe en attente avec le bon montant
        if (transaction.method === 'stripe' && 
            transaction.status === 'pending' &&
            Math.abs(transaction.amount - amountPaid) < 0.01) {
          
          console.log('🔄 Mise à jour transaction:', transaction.id);
          console.log('💰 Montant transaction:', transaction.amount, '€');
          console.log('💰 Montant payé:', amountPaid, '€');
          
          return {
            ...transaction,
            status: 'completed',
            note: `Payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`
          };
        }
        return transaction;
      });

      // Si aucune transaction en attente trouvée, créer une nouvelle transaction
      if (updatedTransactions.length === existingTransactions.length) {
        console.log('➕ Création nouvelle transaction Stripe');
        updatedTransactions.push({
          id: crypto.randomUUID(),
          amount: amountPaid,
          method: 'stripe',
          status: 'completed',
          note: `Payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
          created_at: new Date().toISOString()
        });
      }

      console.log('📋 Transactions après mise à jour:', updatedTransactions.length);

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

      console.log('💰 Calculs finaux:', {
        totalPaid: totalPaid.toFixed(2),
        totalAmount: booking.total_amount.toFixed(2),
        newPaymentStatus
      });

      // Mettre à jour la réservation en base
      console.log('🔄 Mise à jour réservation en base...');
      const { data: updatedBookings, error: updateError } = await supabase
        .from('bookings')
        .update({
          transactions: updatedTransactions,
          payment_status: newPaymentStatus,
          payment_amount: totalPaid,
          booking_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
        .select();

      if (updateError) {
        console.error('❌ Erreur mise à jour réservation:', updateError);
        throw updateError;
      }

      if (updatedBookings && updatedBookings.length > 0) {
        const updatedBooking = updatedBookings[0];
        console.log('✅ Réservation mise à jour avec succès:', {
          id: updatedBooking.id,
          payment_status: updatedBooking.payment_status,
          payment_amount: updatedBooking.payment_amount,
          transactions_count: updatedBooking.transactions?.length || 0
        });
      } else {
        console.warn('⚠️ Aucune réservation mise à jour - ID introuvable:', booking.id);
      }

      // Déclencher un rafraîchissement de l'interface
      setTimeout(() => {
        console.log('🔄 Déclenchement rafraîchissement interface');
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 500);

    } catch (error) {
      console.error('❌ Erreur traitement webhook Stripe:', error);
      throw error;
    }
  }

  // Synchroniser les paiements Stripe (version simplifiée)
  static async syncStripePayments(bookings: Booking[]): Promise<Booking[]> {
    if (!isSupabaseConfigured()) return bookings;

    console.log('🔄 Synchronisation paiements Stripe pour', bookings.length, 'réservations');
    
    // Pour l'instant, retourner les réservations telles quelles
    // La synchronisation se fait via le webhook
    return bookings;
  }
}