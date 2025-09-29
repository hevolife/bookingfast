// Gestionnaire de webhook Stripe côté client - VERSION SIMPLE QUI FONCTIONNE
import { supabase, isSupabaseConfigured } from './supabase';
import { Booking } from '../types';

export class StripeWebhookHandler {
  // Traiter un paiement Stripe réussi - VERSION ULTRA SIMPLE
  static async processStripeWebhook(sessionData: any): Promise<void> {
    console.log('🔄 DÉBUT TRAITEMENT PAIEMENT STRIPE - VERSION ULTRA SIMPLE');
    console.log('📊 Session data:', sessionData);
    
    if (!isSupabaseConfigured()) {
      console.log('📧 MODE DÉMO - Simulation traitement webhook');
      return;
    }

    try {
      const customerEmail = sessionData.customer_details?.email;
      const amountPaid = sessionData.amount_total / 100; // Stripe utilise les centimes
      const sessionId = sessionData.id;
      const metadata = sessionData.metadata;

      if (!customerEmail || !metadata) {
        console.warn('⚠️ Données webhook incomplètes');
        return;
      }

      const searchDate = metadata.date || metadata.booking_date;
      const searchTime = metadata.time || metadata.booking_time;
      
      if (!searchDate || !searchTime) {
        console.error('❌ Date ou heure manquante dans les métadonnées');
        return;
      }

      console.log('🔍 RECHERCHE RÉSERVATION AVEC:', { 
        email: customerEmail, 
        date: searchDate, 
        time: searchTime 
      });

      // ÉTAPE 1: Trouver la réservation
      const { data: bookings, error: searchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', customerEmail)
        .eq('date', searchDate)
        .eq('time', searchTime);

      if (searchError) {
        console.error('❌ Erreur recherche réservation:', searchError);
        return;
      }

      if (!bookings || bookings.length === 0) {
        console.error('❌ AUCUNE RÉSERVATION TROUVÉE');
        return;
      }

      const booking = bookings[0];
      console.log('✅ RÉSERVATION TROUVÉE:', booking.id);

      // ÉTAPE 2: Préparer les nouvelles transactions
      const currentTransactions = booking.transactions || [];
      const newTransactions = [...currentTransactions];
      
      // Chercher une transaction en attente à mettre à jour
      let transactionUpdated = false;
      for (let i = 0; i < newTransactions.length; i++) {
        const transaction = newTransactions[i];
        if (transaction.method === 'stripe' && 
            transaction.status === 'pending' &&
            Math.abs(transaction.amount - amountPaid) < 0.01) {
          
          console.log('🔄 Mise à jour transaction existante:', transaction.id);
          newTransactions[i] = {
            ...transaction,
            status: 'completed',
            note: `Payé via Stripe - Session: ${sessionId}`
          };
          transactionUpdated = true;
          break;
        }
      }

      // Si aucune transaction trouvée, en créer une nouvelle
      if (!transactionUpdated) {
        console.log('➕ Création nouvelle transaction');
        newTransactions.push({
          id: crypto.randomUUID(),
          amount: amountPaid,
          method: 'stripe',
          status: 'completed',
          note: `Payé via Stripe - Session: ${sessionId}`,
          created_at: new Date().toISOString()
        });
      }

      // ÉTAPE 3: Calculer les nouveaux totaux
      const totalPaid = newTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      let newPaymentStatus = 'pending';
      if (totalPaid >= booking.total_amount) {
        newPaymentStatus = 'completed';
      } else if (totalPaid > 0) {
        newPaymentStatus = 'partial';
      }

      console.log('💰 CALCULS:', {
        totalPaid: totalPaid.toFixed(2),
        totalAmount: booking.total_amount.toFixed(2),
        newPaymentStatus
      });

      // ÉTAPE 4: MISE À JOUR DIRECTE EN BASE
      console.log('🔄 MISE À JOUR DIRECTE EN BASE...');
      
      const updateData = {
        transactions: newTransactions,
        payment_status: newPaymentStatus,
        payment_amount: totalPaid,
        booking_status: 'confirmed',
        updated_at: new Date().toISOString()
      };

      console.log('📊 Données à mettre à jour:', updateData);

      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id)
        .select('id, payment_status, payment_amount, transactions')
        .single();

      if (updateError) {
        console.error('❌ ERREUR MISE À JOUR:', updateError);
        console.error('❌ Détails erreur:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      if (!updatedBooking) {
        console.error('❌ AUCUNE DONNÉE RETOURNÉE APRÈS MISE À JOUR');
        throw new Error('Mise à jour échouée - aucune donnée retournée');
      }

      console.log('✅ RÉSERVATION MISE À JOUR AVEC SUCCÈS');
      console.log('📊 Données mises à jour:', updatedBooking);

      // ÉTAPE 5: Vérification immédiate en base
      console.log('🔍 VÉRIFICATION IMMÉDIATE EN BASE...');
      const { data: verificationData, error: verificationError } = await supabase
        .from('bookings')
        .select('id, payment_status, payment_amount, transactions')
        .eq('id', booking.id)
        .single();

      if (verificationError) {
        console.error('❌ Erreur vérification:', verificationError);
      } else {
        console.log('✅ VÉRIFICATION RÉUSSIE:', verificationData);
        console.log('📊 Statut en base:', {
          payment_status: verificationData.payment_status,
          payment_amount: verificationData.payment_amount,
          transactions_count: verificationData.transactions?.length || 0
        });
      }

      // ÉTAPE 6: Déclencher rafraîchissement IMMÉDIAT
      console.log('🔄 RAFRAÎCHISSEMENT IMMÉDIAT');
      window.dispatchEvent(new CustomEvent('forceRefreshBookings'));
      
      // Rafraîchissements multiples pour être sûr
      setTimeout(() => {
        console.log('🔄 Rafraîchissement +500ms');
        window.dispatchEvent(new CustomEvent('forceRefreshBookings'));
      }, 500);
      
      setTimeout(() => {
        console.log('🔄 Rafraîchissement +1000ms');
        window.dispatchEvent(new CustomEvent('forceRefreshBookings'));
      }, 1000);

    } catch (error) {
      console.error('❌ ERREUR TRAITEMENT WEBHOOK:', error);
      
      // Déclencher quand même un rafraîchissement en cas d'erreur
      setTimeout(() => {
        console.log('🔄 Rafraîchissement de secours après erreur');
        window.dispatchEvent(new CustomEvent('forceRefreshBookings'));
      }, 1000);
      
      throw error;
    }
  }

  // Synchroniser les paiements Stripe (version simplifiée)
  static async syncStripePayments(bookings: Booking[]): Promise<Booking[]> {
    if (!isSupabaseConfigured()) return bookings;
    
    console.log('🔄 Synchronisation paiements Stripe pour', bookings.length, 'réservations');
    return bookings; // Retourner tel quel, la sync se fait via webhook
  }
}