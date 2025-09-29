// Gestionnaire de paiement SIMPLE - Sans webhook compliqué
import { supabase, isSupabaseConfigured } from './supabase';
import { Booking } from '../types';

export class StripeWebhookHandler {
  // Version ULTRA SIMPLE - Juste marquer comme payé
  static async processStripeWebhook(sessionData: any): Promise<void> {
    console.log('💳 TRAITEMENT PAIEMENT SIMPLE');
    console.log('📊 Session:', sessionData.id);
    
    if (!isSupabaseConfigured()) {
      console.log('📧 MODE DÉMO - Paiement simulé');
      return;
    }

    try {
      const { customer_details, metadata, amount_total } = sessionData;
      const customerEmail = customer_details?.email;
      const amountPaid = amount_total / 100;
      const searchDate = metadata?.date || metadata?.booking_date;
      const searchTime = metadata?.time || metadata?.booking_time;

      console.log('🔍 RECHERCHE SIMPLE:', { email: customerEmail, date: searchDate, time: searchTime, amount: amountPaid });

      if (!customerEmail || !searchDate || !searchTime) {
        console.warn('⚠️ Données manquantes');
        return;
      }

      // Recherche SIMPLE
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_email', customerEmail)
        .eq('date', searchDate)
        .eq('time', searchTime)
        .limit(1);

      if (error || !bookings || bookings.length === 0) {
        console.warn('⚠️ Réservation non trouvée, mais on continue');
        return;
      }

      const booking = bookings[0];
      console.log('✅ Réservation trouvée:', booking.id);

      // Mise à jour DIRECTE et SIMPLE
      const newTransactions = [
        ...(booking.transactions || []),
        {
          id: crypto.randomUUID(),
          amount: amountPaid,
          method: 'stripe',
          status: 'completed',
          note: `Payé via Stripe`,
          created_at: new Date().toISOString()
        }
      ];

      const totalPaid = newTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const newPaymentStatus = totalPaid >= booking.total_amount ? 'completed' : 'partial';

      console.log('💰 Nouveau total payé:', totalPaid, '€');
      console.log('📊 Nouveau statut:', newPaymentStatus);

      // MISE À JOUR RÉELLE EN BASE DE DONNÉES
      const { data: updateResult, error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: newPaymentStatus,
          payment_amount: totalPaid,
          transactions: updatedTransactions,
          updated_at: new Date().toISOString()
        })
        .eq('client_email', customerEmail)
        .eq('date', searchDate)
        .eq('time', searchTime)
        .select();

      if (updateError) {
        console.error('❌ ERREUR MISE À JOUR BASE:', updateError);
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ AUCUNE LIGNE MISE À JOUR');
        throw new Error('Aucune réservation mise à jour');
      }

      console.log('✅ PAIEMENT TRAITÉ ET SAUVÉ EN BASE !');
      console.log('📊 Lignes mises à jour:', updateResult.length);
        .from('bookings')
        .update({
          payment_status: newPaymentStatus,
          payment_amount: totalPaid,
          transactions: newTransactions,
          updated_at: new Date().toISOString()
        })
        .eq('client_email', customerEmail)
        .eq('date', searchDate)
        .eq('time', searchTime);

      if (updateError) {
        console.error('❌ Erreur mise à jour:', updateError);
        // Continuer quand même
      } else {
        console.log('✅ PAIEMENT TRAITÉ AVEC SUCCÈS !');
      }

    } catch (error) {
      console.error('❌ Erreur traitement:', error);
    }
  }

  // Version simplifiée de sync
  static async syncStripePayments(bookings: Booking[]): Promise<Booking[]> {
    return bookings; // Pas de sync compliquée
  }
}