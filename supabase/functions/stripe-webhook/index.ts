import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const processedSessions = new Map<string, { timestamp: number; result: any }>()

setInterval(() => {
  const now = Date.now()
  const tenMinutes = 10 * 60 * 1000
  
  for (const [sessionId, data] of processedSessions.entries()) {
    if (now - data.timestamp > tenMinutes) {
      processedSessions.delete(sessionId)
    }
  }
}, 10 * 60 * 1000)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Webhook Stripe reçu')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Signature Stripe manquante')
      return new Response('Signature manquante', { status: 400, headers: corsHeaders })
    }

    let event
    try {
      event = JSON.parse(body)
      console.log('📦 Événement Stripe:', event.type)
    } catch (err) {
      console.error('❌ Erreur parsing JSON:', err)
      return new Response('JSON invalide', { status: 400, headers: corsHeaders })
    }

    // Gérer les événements d'abonnement
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      console.log('📊 Mise à jour abonnement:', subscription.id)

      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          subscription_status: subscription.status === 'active' ? 'active' : 'cancelled',
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('❌ Erreur mise à jour abonnement:', updateError)
      } else {
        console.log('✅ Abonnement mis à jour')
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Traiter checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const sessionId = session.id
      
      console.log('💳 Session de paiement complétée:', sessionId)
      console.log('📋 Metadata:', JSON.stringify(session.metadata, null, 2))
      
      if (session.status !== 'complete' || session.payment_status !== 'paid') {
        console.log('⚠️ PAIEMENT NON COMPLET - Session ignorée')
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'payment_not_complete'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (processedSessions.has(sessionId)) {
        const cached = processedSessions.get(sessionId)!
        console.log('🔒 SESSION DÉJÀ TRAITÉE')
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'cached_duplicate_prevented',
          result: cached.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      processedSessions.set(sessionId, { 
        timestamp: Date.now(), 
        result: { processing: true } 
      })

      const customerEmail = session.customer_details?.email
      const clientReferenceId = session.client_reference_id
      const metadata = session.metadata || {}

      if (!customerEmail) {
        console.error('❌ Email client manquant')
        processedSessions.delete(sessionId)
        return new Response('Email client manquant', { status: 400, headers: corsHeaders })
      }

      // RÉSERVATION IFRAME (booking_deposit)
      if (metadata.payment_type === 'booking_deposit') {
        console.log('📅 === CRÉATION RÉSERVATION APRÈS PAIEMENT === 📅')
        
        const userId = metadata.user_id
        const serviceId = metadata.service_id
        const date = metadata.date
        const time = metadata.time
        const quantity = parseInt(metadata.quantity || '1')
        const clientFirstname = metadata.client_firstname
        const clientLastname = metadata.client_lastname
        const clientPhone = metadata.client_phone
        const assignedUserId = metadata.assigned_user_id

        if (!userId || !serviceId || !date || !time) {
          console.error('❌ Données réservation manquantes:', { userId, serviceId, date, time })
          processedSessions.delete(sessionId)
          return new Response('Données réservation manquantes', { status: 400, headers: corsHeaders })
        }

        // Récupérer les infos du service
        const { data: service, error: serviceError } = await supabaseClient
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single()

        if (serviceError || !service) {
          console.error('❌ Service non trouvé:', serviceError)
          processedSessions.delete(sessionId)
          return new Response('Service non trouvé', { status: 404, headers: corsHeaders })
        }

        const totalAmount = service.price_ttc * quantity
        const depositAmount = session.amount_total / 100 // Stripe envoie en centimes

        // Créer la réservation
        const bookingData: any = {
          user_id: userId,
          service_id: serviceId,
          date: date,
          time: time,
          duration_minutes: service.duration_minutes,
          quantity: quantity,
          client_name: clientLastname,
          client_firstname: clientFirstname,
          client_email: customerEmail,
          client_phone: clientPhone,
          total_amount: totalAmount,
          payment_status: 'paid',
          payment_amount: depositAmount,
          booking_status: 'confirmed',
          stripe_session_id: sessionId
        }

        if (assignedUserId) {
          bookingData.assigned_user_id = assignedUserId
        }

        console.log('📝 Création réservation:', bookingData)

        const { data: booking, error: bookingError } = await supabaseClient
          .from('bookings')
          .insert(bookingData)
          .select()
          .single()

        if (bookingError) {
          console.error('❌ Erreur création réservation:', bookingError)
          processedSessions.delete(sessionId)
          return new Response('Erreur création réservation', { status: 500, headers: corsHeaders })
        }

        console.log('✅ RÉSERVATION CRÉÉE:', booking.id)

        const result = { 
          success: true, 
          type: 'booking_created',
          bookingId: booking.id
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // ABONNEMENT PLUGIN
      if (clientReferenceId && clientReferenceId.includes('|')) {
        console.log('🔌 ABONNEMENT PLUGIN détecté via client_reference_id')
        
        const [userId, pluginId] = clientReferenceId.split('|')
        
        console.log('👤 User ID extrait:', userId)
        console.log('🔌 Plugin ID extrait:', pluginId)
        
        if (!userId || !pluginId) {
          console.error('❌ Format client_reference_id invalide:', clientReferenceId)
          processedSessions.delete(sessionId)
          return new Response('Format client_reference_id invalide', { status: 400, headers: corsHeaders })
        }
        
        const stripeSubscriptionId = session.subscription

        const { data: existingSub, error: checkError } = await supabaseClient
          .from('plugin_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('plugin_id', pluginId)
          .maybeSingle()

        if (checkError) {
          console.error('❌ Erreur vérification souscription:', checkError)
          processedSessions.delete(sessionId)
          return new Response('Erreur vérification souscription', { status: 500, headers: corsHeaders })
        }

        if (existingSub) {
          console.log('📋 Souscription existante trouvée, mise à jour...')
          
          const { error: updateError } = await supabaseClient
            .from('plugin_subscriptions')
            .update({
              status: 'active',
              is_trial: false,
              trial_ends_at: null,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: session.customer,
              current_period_start: new Date().toISOString(),
              current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id)
          
          if (updateError) {
            console.error('❌ Erreur mise à jour plugin:', updateError)
            processedSessions.delete(sessionId)
            return new Response('Erreur mise à jour plugin', { status: 500, headers: corsHeaders })
          }
          
          console.log('✅ PLUGIN ACTIVÉ (mise à jour)')
        } else {
          console.log('➕ Création nouvelle souscription plugin...')
          
          const { error: insertError } = await supabaseClient
            .from('plugin_subscriptions')
            .insert({
              user_id: userId,
              plugin_id: pluginId,
              status: 'active',
              is_trial: false,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: session.customer,
              current_period_start: new Date().toISOString(),
              current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
            })
          
          if (insertError) {
            console.error('❌ Erreur création plugin:', insertError)
            processedSessions.delete(sessionId)
            return new Response('Erreur création plugin', { status: 500, headers: corsHeaders })
          }
          
          console.log('✅ PLUGIN ACTIVÉ (création)')
        }
        
        const result = { 
          success: true, 
          type: 'plugin_subscription',
          userId: userId,
          pluginId: pluginId,
          status: 'active'
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Abonnement plateforme
      if (metadata.payment_type === 'platform_subscription') {
        console.log('💳 ABONNEMENT PLATEFORME')
        
        const userId = metadata.user_id
        const planId = metadata.plan_id || metadata.plan_type
        
        if (!userId || !planId) {
          console.error('❌ Données abonnement manquantes')
          processedSessions.delete(sessionId)
          return new Response('Données abonnement manquantes', { status: 400, headers: corsHeaders })
        }
        
        let subscriptionTier = 'starter'
        if (planId === 'monthly' || planId === 'pro' || planId === 'yearly') {
          subscriptionTier = 'pro'
        }
        
        const stripeSubscriptionId = session.subscription

        const { error: updateError } = await supabaseClient
          .from('users')
          .update({
            subscription_tier: subscriptionTier,
            subscription_status: 'active',
            trial_ends_at: null,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: session.customer,
            current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        
        if (updateError) {
          console.error('❌ Erreur mise à jour abonnement:', updateError)
          processedSessions.delete(sessionId)
          return new Response('Erreur mise à jour abonnement', { status: 500, headers: corsHeaders })
        }
        
        console.log('✅ ABONNEMENT ACTIVÉ')
        
        const result = { 
          success: true, 
          type: 'platform_subscription',
          userId: userId,
          planId: planId,
          subscriptionTier: subscriptionTier,
          status: 'active'
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('⚠️ Type de paiement non reconnu')
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('ℹ️ Événement non traité:', event.type)
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erreur webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
