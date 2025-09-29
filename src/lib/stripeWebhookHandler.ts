// Gestionnaire de webhook Stripe côté client - VERSION ULTRA SIMPLE QUI FONCTIONNE
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

      console.log('🔍 RECHERCHE RÉSERVATION');
      console.log('📧 Email:', customerEmail);
      console.log('📅 Date:', metadata.date || metadata.booking_date);
      console.log('⏰ Heure:', metadata.time || metadata.booking_time);
      console.log('💰 Montant:', amountPaid, '€');

      const searchDate = metadata.date || metadata.booking_date;
      const searchTime = metadata.time || metadata.booking_time;
      
      if (!searchDate || !searchTime) {
        console.error('❌ Date ou heure manquante');
        return;
      }

      // ÉTAPE 1: Rechercher la réservation
      console.log('🔍 Recherche avec:', { email: customerEmail, date: searchDate, time: searchTime });

      const { data: foundBookings, error: searchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', customerEmail)
        .eq('date', searchDate)
        .eq('time', searchTime);

      if (searchError) {
        console.error('❌ Erreur recherche réservation:', searchError);
        return;
      }

      if (!foundBookings || foundBookings.length === 0) {
        console.error('❌ AUCUNE RÉSERVATION TROUVÉE');
        return;
      }

      const targetBooking = foundBookings[0];
      console.log('✅ RÉSERVATION TROUVÉE:', targetBooking.id);

      // ÉTAPE 2: Vérifier si déjà traité
      const existingTransactions = targetBooking.transactions || [];
      const alreadyProcessed = existingTransactions.some((t: any) => 
        t.method === 'stripe' && 
        t.status === 'completed' &&
        t.note && t.note.includes(sessionId)
      );

      if (alreadyProcessed) {
        console.log('⚠️ Paiement déjà traité');
        return;
      }

      // ÉTAPE 3: Préparer les nouvelles transactions
      const updatedTransactions = [...existingTransactions];
      let transactionUpdated = false;

      // Chercher une transaction en attente avec le bon montant
      for (let i = 0; i < updatedTransactions.length; i++) {
        const transaction = updatedTransactions[i];
        if (transaction.method === 'stripe' && 
            transaction.status === 'pending' &&
            Math.abs(transaction.amount - amountPaid) < 0.01) {
          
          console.log('🔄 Mise à jour transaction existante:', transaction.id);
          updatedTransactions[i] = {
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
        updatedTransactions.push({
          id: crypto.randomUUID(),
          amount: amountPaid,
          method: 'stripe',
          status: 'completed',
          note: `Payé via Stripe - Session: ${sessionId}`,
          created_at: new Date().toISOString()
        });
      }

      // ÉTAPE 4: Calculer les nouveaux totaux
      const totalPaid = updatedTransactions
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      let newPaymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
      if (totalPaid >= targetBooking.total_amount) {
        newPaymentStatus = 'completed';
      } else if (totalPaid > 0) {
        newPaymentStatus = 'partial';
      }

      console.log('💰 CALCULS:', {
        totalPaid: totalPaid.toFixed(2),
        totalAmount: targetBooking.total_amount.toFixed(2),
        newPaymentStatus
      });

      // ÉTAPE 5: MISE À JOUR DIRECTE AVEC L'ID EXACT
      console.log('🔄 MISE À JOUR DIRECTE AVEC ID:', targetBooking.id);
      
      const updateData = {
        transactions: updatedTransactions,
        payment_status: newPaymentStatus,
        payment_amount: totalPaid,
        booking_status: 'confirmed',
        updated_at: new Date().toISOString()
      };

      console.log('📊 Données à mettre à jour:', updateData);

      const { data: updateResult, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', targetBooking.id)
        .select();

      if (updateError) {
        console.error('❌ ERREUR MISE À JOUR:', updateError);
        throw updateError;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ AUCUNE LIGNE MISE À JOUR - ID:', targetBooking.id);
        
        // VÉRIFICATION SUPPLÉMENTAIRE - Est-ce que l'ID existe vraiment ?
        const { data: checkBooking, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .eq('id', targetBooking.id);
        
        if (checkError) {
          console.error('❌ Erreur vérification ID:', checkError);
        } else if (!checkBooking || checkBooking.length === 0) {
          console.error('❌ ID INEXISTANT EN BASE:', targetBooking.id);
        } else {
          console.log('✅ ID existe en base, problème de mise à jour');
        }
        
        throw new Error(`Réservation ${targetBooking.id} non trouvée pour mise à jour`);
      }

      console.log('✅ RÉSERVATION MISE À JOUR AVEC SUCCÈS');
      console.log('📊 Lignes affectées:', updateResult.length);
      console.log('📊 Nouveau statut:', {
        id: targetBooking.id,
        payment_status: newPaymentStatus,
        payment_amount: totalPaid,
        transactions_count: updatedTransactions.length
      });

      // ÉTAPE 6: Déclencher rafraîchissement IMMÉDIAT
      console.log('🔄 RAFRAÎCHISSEMENT IMMÉDIAT');
      window.dispatchEvent(new CustomEvent('refreshBookings'));
      window.dispatchEvent(new CustomEvent('forceRefreshBookings'));
      
      // Rafraîchissements supplémentaires
      setTimeout(() => {
        console.log('🔄 Rafraîchissement +500ms');
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 500);
      
      setTimeout(() => {
        console.log('🔄 Rafraîchissement +1500ms');
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 1500);

    } catch (error) {
      console.error('❌ ERREUR TRAITEMENT WEBHOOK:', error);
      
      // Déclencher quand même un rafraîchissement en cas d'erreur
      setTimeout(() => {
        console.log('🔄 Rafraîchissement de secours après erreur');
        window.dispatchEvent(new CustomEvent('refreshBookings'));
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