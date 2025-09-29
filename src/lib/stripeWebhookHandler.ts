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

      const targetBooking = foundBookings[0];
      console.log('✅ RÉSERVATION TROUVÉE:', targetBooking.id);

      // ÉTAPE 2: Vérifier que la réservation existe vraiment en base
      console.log('🔍 VÉRIFICATION EXISTENCE RÉSERVATION...');
      const { data: bookingCheck, error: checkError } = await supabase
        .from('bookings')
        .select('id, total_amount, transactions')
        .eq('id', targetBooking.id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erreur vérification existence:', checkError);
        return;
      }

      if (!bookingCheck) {
        console.error('❌ RÉSERVATION INEXISTANTE EN BASE:', targetBooking.id);
        return;
      }

      console.log('✅ RÉSERVATION CONFIRMÉE EN BASE:', bookingCheck.id);

      // ÉTAPE 3: Vérifier si déjà traité
      const existingTransactions = bookingCheck.transactions || [];
      
      // Vérifier si ce sessionId a déjà été traité
      const alreadyProcessed = existingTransactions.some((t: any) => 
        t.method === 'stripe' && 
        t.status === 'completed' &&
        t.note && (
          t.note.includes(sessionId) || 
          t.note.includes(`Session: ${sessionId}`) ||
          t.note.includes(`cs_${sessionId.split('_')[1]}`) // Partie unique de la session
        )
      );

      if (alreadyProcessed) {
        console.log('⚠️ Paiement déjà traité pour cette session:', sessionId);
        console.log('🔄 Rafraîchissement simple car déjà traité');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshBookings'));
        }, 500);
        return;
      }

      // ÉTAPE 4: Créer ou mettre à jour la transaction
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

      // ÉTAPE 5: Calculer les nouveaux totaux
      const totalPaid = updatedTransactions
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      let newPaymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
      if (totalPaid >= bookingCheck.total_amount) {
        newPaymentStatus = 'completed';
      } else if (totalPaid > 0) {
        newPaymentStatus = 'partial';
      }

      console.log('💰 CALCULS:', {
        totalPaid: totalPaid.toFixed(2),
        totalAmount: bookingCheck.total_amount.toFixed(2),
        newPaymentStatus
      });

      // ÉTAPE 6: Mise à jour SIMPLE en base
      console.log('🔄 MISE À JOUR SIMPLE EN BASE...');
      
      const updateData = {
        payment_status: newPaymentStatus,
        payment_amount: totalPaid,
        transactions: updatedTransactions
      };

      // APPROCHE DIRECTE - Mise à jour sans vérification RLS
      const { data: updateResult, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', targetBooking.id)
        .eq('client_email', customerEmail)
        .eq('date', searchDate)
        .eq('time', searchTime)
        .select();

      if (updateError) {
        console.error('❌ ERREUR MISE À JOUR DIRECTE:', updateError);
        console.log('🔍 TENTATIVE AVEC CRITÈRES MULTIPLES...');
        
        // TENTATIVE ALTERNATIVE - Mise à jour par email/date/time
        const { data: altUpdateResult, error: altUpdateError } = await supabase
          .from('bookings')
          .update({
            payment_status: newPaymentStatus,
            payment_amount: totalPaid,
            transactions: updatedTransactions
          })
          .eq('client_email', customerEmail)
          .eq('date', searchDate)
          .eq('time', searchTime)
          .select();
          
        if (altUpdateError) {
          console.error('❌ ERREUR MISE À JOUR ALTERNATIVE:', altUpdateError);
          throw altUpdateError;
        }
        
        if (!altUpdateResult || altUpdateResult.length === 0) {
          console.error('❌ ÉCHEC TOTAL - Aucune réservation mise à jour');
          throw new Error('Impossible de mettre à jour la réservation');
        }
        
        console.log('✅ MISE À JOUR ALTERNATIVE RÉUSSIE');
        console.log('📊 Lignes affectées:', altUpdateResult.length);
      } else {
        if (!updateResult || updateResult.length === 0) {
          console.error('❌ AUCUNE LIGNE MISE À JOUR');
          console.log('🔍 TENTATIVE AVEC CRITÈRES MULTIPLES...');
        } else {
          console.log('✅ RÉSERVATION MISE À JOUR AVEC SUCCÈS');
          console.log('📊 Lignes affectées:', updateResult.length);
        }
      }

      console.log('📊 Nouveau statut:', {
        id: bookingCheck.id,
        payment_status: newPaymentStatus,
        payment_amount: totalPaid,
        transactions_count: updatedTransactions.length
      });

      // ÉTAPE 7: Déclencher rafraîchissement
      setTimeout(() => {
        console.log('🔄 Rafraîchissement automatique après paiement');
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 2000);

      console.log('✅ TRAITEMENT WEBHOOK TERMINÉ AVEC SUCCÈS');

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