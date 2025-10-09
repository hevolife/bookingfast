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
      const amountPaid = session.amount_total / 100
      const metadata = session.metadata || {}

      if (!customerEmail) {
        console.error('❌ Email client manquant')
        processedSessions.delete(sessionId)
        return new Response('Email client manquant', { status: 400, headers: corsHeaders })
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
        
        // Récupérer l'ID de l'abonnement Stripe
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

      // Reste du code pour les réservations...
      // (code existant inchangé)
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
