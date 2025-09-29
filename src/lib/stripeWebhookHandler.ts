// Gestionnaire de webhook Stripe côté client - Version simplifiée et robuste
import { supabase, isSupabaseConfigured } from './supabase';
import { Booking } from '../types';

export class StripeWebhookHandler {
  // Traiter un paiement Stripe réussi - VERSION SIMPLIFIÉE
  static async processStripeWebhook(sessionData: any): Promise<void> {
    console.log('🔄 DÉBUT TRAITEMENT PAIEMENT STRIPE - VERSION SIMPLIFIÉE');
    console.log('📊 Session data:', sessionData);
    
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

      console.log('🔍 RECHERCHE RÉSERVATION SIMPLE');
      console.log('📧 Email:', customerEmail);
      console.log('📅 Date:', metadata.date || metadata.booking_date);
      console.log('⏰ Heure:', metadata.time || metadata.booking_time);
      console.log('💰 Montant:', amountPaid, '€');

      // ÉTAPE 1: Rechercher la réservation par email/date/heure UNIQUEMENT
      const searchDate = metadata.date || metadata.booking_date;
      const searchTime = metadata.time || metadata.booking_time;
      
      if (!searchDate || !searchTime) {
        console.error('❌ Date ou heure manquante dans les métadonnées');
        return;
      }

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
        console.log('🔍 Critères de recherche:', { email: customerEmail, date: searchDate, time: searchTime });
        return;
      }

      if (foundBookings.length > 1) {
        console.warn('⚠️ Plusieurs réservations trouvées, utilisation de la première');
      }

      const booking = foundBookings[0];
      console.log('✅ RÉSERVATION TROUVÉE:', booking.id);

      // ÉTAPE 2: Vérifier que la réservation existe vraiment en base
      console.log('🔍 VÉRIFICATION EXISTENCE RÉSERVATION...');
      const { data: verifyBooking, error: verifyError } = await supabase
        .from('bookings')
        .select('id, total_amount, transactions')
        .eq('id', booking.id)
        .maybeSingle();

      if (verifyError) {
        console.error('❌ Erreur vérification existence:', verifyError);
        return;
      }

      if (!verifyBooking) {
        console.error('❌ RÉSERVATION INEXISTANTE EN BASE:', booking.id);
        console.log('🔍 Tentative de recherche alternative...');
        
        // Recherche alternative sans limite
        const { data: alternativeBookings, error: altError } = await supabase
          .from('bookings')
          .select('id, client_email, date, time, total_amount, transactions')
          .eq('client_email', customerEmail)
          .eq('date', searchDate)
          .eq('time', searchTime);

        console.log('📊 Recherche alternative résultats:', alternativeBookings?.length || 0);
        if (alternativeBookings && alternativeBookings.length > 0) {
          console.log('📋 Réservations alternatives trouvées:', alternativeBookings.map(b => ({
            id: b.id,
            email: b.client_email,
            date: b.date,
            time: b.time
          })));
          
          // Utiliser la première réservation trouvée
          const realBooking = alternativeBookings[0];
          console.log('✅ UTILISATION RÉSERVATION ALTERNATIVE:', realBooking.id);
          
          // Continuer avec cette réservation
          booking = realBooking;
        } else {
          console.error('❌ AUCUNE RÉSERVATION ALTERNATIVE TROUVÉE');
          return;
        }
      } else {
        console.log('✅ RÉSERVATION CONFIRMÉE EN BASE:', verifyBooking.id);
        booking = verifyBooking;
      }

      // ÉTAPE 2: Vérifier si déjà traité
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

      // ÉTAPE 3: Créer ou mettre à jour la transaction
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

      // ÉTAPE 5: Mise à jour SIMPLE en base
      console.log('🔄 MISE À JOUR SIMPLE EN BASE...');
      
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          transactions: updatedTransactions,
          payment_status: newPaymentStatus,
          payment_amount: totalPaid,
          booking_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour:', updateError);
        throw updateError;
      }

      console.log('✅ RÉSERVATION MISE À JOUR AVEC SUCCÈS');
      console.log('📊 Nouveau statut:', {
        id: booking.id,
        payment_status: newPaymentStatus,
        payment_amount: totalPaid,
        transactions_count: updatedTransactions.length
      });

      // ÉTAPE 6: Déclencher rafraîchissement
      setTimeout(() => {
        console.log('🔄 Déclenchement rafraîchissement interface');
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 500);

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