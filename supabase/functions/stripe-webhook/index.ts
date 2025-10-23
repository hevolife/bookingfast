import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🎯 === STRIPE WEBHOOK V22 - POS_TRANSACTIONS === 🎯');
  console.log('📍 Request URL:', req.url);
  console.log('📍 Request Method:', req.method);

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔧 Step 1: Reading environment variables');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    console.log('🔧 Configuration:', {
      supabaseUrl: supabaseUrl ? '✅ Défini' : '❌ Manquant',
      serviceKey: supabaseServiceKey ? '✅ Défini' : '❌ Manquant',
      webhookSecret: stripeWebhookSecret ? '✅ Défini' : '❌ Manquant'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Step 2: Reading request body');
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('📥 Signature présente:', !!signature);

    if (!signature) {
      console.error('❌ Signature Stripe manquante');
      return new Response(
        JSON.stringify({ error: 'Signature manquante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔧 Step 3: Verifying webhook signature');
    let event: Stripe.Event;

    try {
      // Pour le webhook, on doit récupérer la clé secrète de l'utilisateur
      // On va d'abord parser l'événement sans vérification pour obtenir les métadonnées
      const parsedEvent = JSON.parse(body);
      console.log('📦 Event type:', parsedEvent.type);
      console.log('📦 Event ID:', parsedEvent.id);

      // Récupérer les métadonnées pour identifier l'utilisateur
      const metadata = parsedEvent.data?.object?.metadata;
      console.log('📦 Metadata:', metadata);

      if (!metadata?.user_id) {
        console.error('❌ user_id manquant dans metadata');
        return new Response(
          JSON.stringify({ error: 'user_id requis dans metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = metadata.user_id;
      console.log('✅ User ID trouvé:', userId);

      // Récupérer la clé secrète Stripe de l'utilisateur
      const { data: settings, error: settingsError } = await supabase
        .from('business_settings')
        .select('stripe_secret_key, stripe_webhook_secret')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError || !settings) {
        console.error('❌ Erreur récupération settings:', settingsError);
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe non trouvée' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Settings trouvés:', {
        has_secret_key: !!settings.stripe_secret_key,
        has_webhook_secret: !!settings.stripe_webhook_secret
      });

      // Vérifier la signature avec le webhook secret de l'utilisateur
      const userWebhookSecret = settings.stripe_webhook_secret || stripeWebhookSecret;
      
      if (!userWebhookSecret) {
        console.error('❌ Webhook secret manquant');
        return new Response(
          JSON.stringify({ error: 'Webhook secret non configuré' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stripe = new Stripe(settings.stripe_secret_key, {
        appInfo: {
          name: 'BookingFast',
          version: '1.0.0',
        },
      });

      event = stripe.webhooks.constructEvent(body, signature, userWebhookSecret);
      console.log('✅ Signature vérifiée avec succès');

    } catch (err: any) {
      console.error('❌ Erreur vérification signature:', err.message);
      return new Response(
        JSON.stringify({ error: 'Signature invalide', details: err.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔧 Step 4: Processing event type:', event.type);

    // 🔥 TRAITER LES ÉVÉNEMENTS DE PAIEMENT
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('💳 Session Stripe complétée:', session.id);
      console.log('📦 Metadata:', session.metadata);

      const metadata = session.metadata;
      const paymentLinkId = metadata?.payment_link_id;

      console.log('🔍 Payment Link ID:', paymentLinkId);

      if (!paymentLinkId) {
        console.log('⚠️ Pas de payment_link_id - paiement direct (non lien)');
        // C'est un paiement direct (iframe), pas un lien de paiement
        // On laisse le code existant gérer ça
        return new Response(
          JSON.stringify({ received: true, message: 'Paiement direct traité' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('🔥 === PAIEMENT VIA LIEN DE PAIEMENT === 🔥');

      // 🔥 ÉTAPE 1 : Trouver la transaction pending liée au payment_link dans pos_transactions
      console.log('🔍 Recherche transaction pending dans pos_transactions avec payment_link_id:', paymentLinkId);

      const { data: existingTransaction, error: findError } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('payment_link_id', paymentLinkId)
        .eq('status', 'pending')
        .maybeSingle();

      if (findError) {
        console.error('❌ Erreur recherche transaction:', findError);
        return new Response(
          JSON.stringify({ error: 'Erreur recherche transaction', details: findError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!existingTransaction) {
        console.error('❌ Aucune transaction pending trouvée pour payment_link_id:', paymentLinkId);
        return new Response(
          JSON.stringify({ error: 'Transaction pending non trouvée' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Transaction pending trouvée:', existingTransaction.id);

      // 🔥 ÉTAPE 2 : Mettre à jour la transaction de "pending" à "completed"
      console.log('🔄 Mise à jour transaction vers "completed"...');

      const { data: updatedTransaction, error: updateError } = await supabase
        .from('pos_transactions')
        .update({
          status: 'completed',
          stripe_session_id: session.id,
          date: new Date().toISOString()
        })
        .eq('id', existingTransaction.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur mise à jour transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur mise à jour transaction', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Transaction mise à jour:', updatedTransaction);

      // 🔥 ÉTAPE 3 : Mettre à jour le payment_link en "completed"
      console.log('🔄 Mise à jour payment_link vers "completed"...');

      const { error: linkUpdateError } = await supabase
        .from('payment_links')
        .update({ status: 'completed' })
        .eq('id', paymentLinkId);

      if (linkUpdateError) {
        console.error('❌ Erreur mise à jour payment_link:', linkUpdateError);
      } else {
        console.log('✅ Payment link mis à jour');
      }

      // 🔥 ÉTAPE 4 : Mettre à jour le statut de paiement de la réservation
      const bookingId = existingTransaction.booking_id;
      console.log('🔄 Mise à jour statut paiement réservation:', bookingId);

      const { data: booking, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('total_amount, payment_amount')
        .eq('id', bookingId)
        .single();

      if (bookingFetchError) {
        console.error('❌ Erreur récupération réservation:', bookingFetchError);
      } else {
        const newPaymentAmount = (booking.payment_amount || 0) + updatedTransaction.amount;
        const newPaymentStatus = newPaymentAmount >= booking.total_amount ? 'paid' : 'partial';

        console.log('💰 Calcul paiement:', {
          ancien: booking.payment_amount,
          ajout: updatedTransaction.amount,
          nouveau: newPaymentAmount,
          total: booking.total_amount,
          statut: newPaymentStatus
        });

        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            payment_amount: newPaymentAmount,
            payment_status: newPaymentStatus
          })
          .eq('id', bookingId);

        if (bookingUpdateError) {
          console.error('❌ Erreur mise à jour réservation:', bookingUpdateError);
        } else {
          console.log('✅ Réservation mise à jour');
        }
      }

      console.log('✅ === TRAITEMENT TERMINÉ === ✅');

      return new Response(
        JSON.stringify({ 
          received: true, 
          message: 'Transaction mise à jour avec succès',
          transaction_id: updatedTransaction.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Autres événements
    console.log('ℹ️ Événement non traité:', event.type);
    return new Response(
      JSON.stringify({ received: true, message: 'Événement non traité' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ === ERREUR GLOBALE === ❌');
    console.error('Type:', error.constructor?.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: 'Erreur interne',
        details: error.message,
        type: error.constructor?.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
