const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

// Configuration CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type', 'stripe-signature']
}));

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Cache global pour éviter les doublons de webhook
const processedSessions = new Map();

// Nettoyer le cache toutes les 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [sessionId, data] of processedSessions.entries()) {
    if (now - data.timestamp > tenMinutes) {
      processedSessions.delete(sessionId);
    }
  }
}, 10 * 60 * 1000);

app.post('/api/stripe-webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook Stripe reçu');
    
    // Créer le client Supabase
    const supabaseClient = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Lire le body de la requête
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      console.error('❌ Signature Stripe manquante');
      return res.status(400).json({ error: 'Signature manquante' });
    }

    // Pour le développement, on parse directement le JSON
    let event;
    try {
      event = JSON.parse(body);
      console.log('📦 Événement Stripe:', event.type);
    } catch (err) {
      console.error('❌ Erreur parsing JSON:', err);
      return res.status(400).json({ error: 'JSON invalide' });
    }

    // Traiter l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;
      
      console.log('💳 Session de paiement complétée:', sessionId);
      console.log('📊 Statut de la session:', session.status);
      console.log('📊 Statut du paiement:', session.payment_status);
      
      // 🔒 VÉRIFICATION CRITIQUE : Ne traiter QUE les paiements complètement réussis
      if (session.status !== 'complete' || session.payment_status !== 'paid') {
        console.log('⚠️ PAIEMENT NON COMPLET - Session ignorée');
        return res.json({ 
          success: true, 
          type: 'payment_not_complete',
          message: 'Payment not complete - session ignored'
        });
      }
      
      console.log('✅ PAIEMENT COMPLET CONFIRMÉ - Traitement de la réservation');
      
      // 🔒 VÉRIFICATION CACHE GLOBAL
      if (processedSessions.has(sessionId)) {
        const cached = processedSessions.get(sessionId);
        console.log('🔒 SESSION DÉJÀ TRAITÉE DANS LE CACHE');
        return res.json({ 
          success: true, 
          type: 'cached_duplicate_prevented',
          message: 'Session already processed in cache'
        });
      }

      // Marquer immédiatement dans le cache
      processedSessions.set(sessionId, { 
        timestamp: Date.now(), 
        result: { processing: true } 
      });

      const customerEmail = session.customer_details?.email;
      const amountPaid = session.amount_total / 100; // Convertir centimes en euros
      const metadata = session.metadata || {};

      if (!customerEmail) {
        console.error('❌ Email client manquant');
        processedSessions.delete(sessionId);
        return res.status(400).json({ error: 'Email client manquant' });
      }

      // Vérifier si c'est un paiement d'abonnement
      if (metadata.subscription === 'true') {
        console.log('💳 Paiement d\'abonnement détecté');
        
        const userId = metadata.user_id;
        const planId = metadata.plan_id;
        
        if (!userId || !planId) {
          console.error('❌ Données abonnement manquantes');
          processedSessions.delete(sessionId);
          return res.status(400).json({ error: 'Données abonnement manquantes' });
        }
        
        // Mettre à jour le statut d'abonnement de l'utilisateur
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({
            subscription_status: 'active',
            trial_ends_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('❌ Erreur mise à jour abonnement:', updateError);
          processedSessions.delete(sessionId);
          return res.status(500).json({ error: 'Erreur mise à jour abonnement' });
        }
        
        console.log('✅ Abonnement activé pour utilisateur:', userId);
        
        const result = { 
          success: true, 
          type: 'subscription',
          userId: userId,
          planId: planId,
          status: 'active'
        };
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result });
        return res.json(result);
      }

      // Vérifier si c'est un paiement de réservation publique
      if (metadata.create_booking_after_payment === 'true') {
        console.log('🎯 Paiement de réservation publique détecté - CRÉATION UNIQUE');
        
        // Créer la réservation directement
        const bookingData = {
          user_id: metadata.user_id,
          service_id: metadata.service_id,
          date: metadata.date || metadata.booking_date,
          time: metadata.time || metadata.booking_time,
          duration_minutes: parseInt(metadata.duration_minutes),
          quantity: parseInt(metadata.quantity),
          client_name: metadata.client_name,
          client_firstname: metadata.client_firstname,
          client_email: customerEmail,
          client_phone: metadata.phone,
          total_amount: parseFloat(metadata.total_amount),
          payment_status: 'partial',
          payment_amount: amountPaid,
          booking_status: 'confirmed',
          transactions: [{
            id: require('crypto').randomUUID(),
            amount: amountPaid,
            method: 'stripe',
            status: 'completed',
            note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
            created_at: new Date().toISOString()
          }]
        };
        
        const { data: newBooking, error: bookingError } = await supabaseClient
          .from('bookings')
          .insert([bookingData])
          .select()
          .single();
        
        if (bookingError) {
          console.error('❌ Erreur création réservation:', bookingError);
          processedSessions.delete(sessionId);
          return res.status(500).json({ error: 'Erreur création réservation' });
        }
        
        console.log('✅ NOUVELLE RÉSERVATION CRÉÉE:', newBooking.id);
        
        const result = { 
          success: true, 
          type: 'booking_created',
          bookingId: newBooking.id,
          amountPaid: amountPaid,
          sessionId: sessionId
        };
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result });
        return res.json(result);
      }
      
      // Paiement pour une réservation existante
      console.log('🔍 Recherche de la réservation existante pour:', customerEmail);
      
      let booking = null;
      
      // Recherche par booking_id si disponible
      if (metadata.booking_id) {
        const { data: bookingData } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('id', metadata.booking_id)
          .maybeSingle();

        if (bookingData) {
          booking = bookingData;
        }
      }
      
      // Recherche par email et métadonnées (fallback)
      if (!booking && metadata.client && metadata.booking_date && metadata.booking_time) {
        const { data: bookingData } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .eq('date', metadata.booking_date)
          .eq('time', metadata.booking_time)
          .maybeSingle();

        if (bookingData) {
          booking = bookingData;
        }
      }

      if (!booking) {
        console.error('❌ Aucune réservation trouvée pour:', customerEmail);
        processedSessions.delete(sessionId);
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      // Mettre à jour la réservation existante
      const existingTransactions = booking.transactions || [];
      
      // Créer une nouvelle transaction
      const newTransaction = {
        id: require('crypto').randomUUID(),
        amount: amountPaid,
        method: 'stripe',
        status: 'completed',
        note: `Paiement Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
        created_at: new Date().toISOString()
      };
      
      const finalTransactions = [...existingTransactions, newTransaction];
      const newTotalPaid = amountPaid + (booking.payment_amount || 0);
      const totalAmount = parseFloat(booking.total_amount);

      let newPaymentStatus = 'pending';
      if (newTotalPaid >= totalAmount) {
        newPaymentStatus = 'completed';
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'partial';
      }

      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_amount: newTotalPaid,
          payment_status: newPaymentStatus,
          booking_status: 'confirmed',
          transactions: finalTransactions,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour réservation:', updateError);
        processedSessions.delete(sessionId);
        return res.status(500).json({ error: 'Erreur mise à jour' });
      }

      console.log('✅ Réservation mise à jour avec succès');

      const result = { 
        success: true, 
        bookingId: booking.id,
        amountPaid: amountPaid,
        paymentStatus: newPaymentStatus,
        sessionId: sessionId
      };
      
      processedSessions.set(sessionId, { timestamp: Date.now(), result });
      return res.json(result);
    }

    // Autres types d'événements
    console.log('ℹ️ Événement non traité:', event.type);
    return res.json({ received: true });

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = app;