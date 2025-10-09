import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLATFORM_STRIPE_SECRET_KEY = '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';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription_id } = await req.json()

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id requis' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('🔄 Annulation abonnement:', subscription_id)

    // Initialiser Stripe avec la clé plateforme
    const stripe = new Stripe(PLATFORM_STRIPE_SECRET_KEY, {
      appInfo: {
        name: 'BookingFast',
        version: '1.0.0',
      },
    })

    // Annuler l'abonnement à la fin de la période
    const subscription = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true
    })

    console.log('✅ Abonnement programmé pour annulation:', subscription.id)

    // Mettre à jour la base de données
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription_id)

    if (updateError) {
      console.error('❌ Erreur mise à jour base:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        cancel_at: subscription.cancel_at,
        current_period_end: subscription.current_period_end
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur annulation:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur lors de l\'annulation'
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
