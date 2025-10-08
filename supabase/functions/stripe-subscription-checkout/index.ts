import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Début traitement stripe-subscription-checkout...')

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      )
    }

    const { plan_id, billing_period = 'monthly', success_url, cancel_url, customer_email, metadata } = await req.json()

    // Validation des paramètres
    if (!plan_id || !success_url || !cancel_url || !customer_email) {
      console.error('❌ Paramètres manquants:', { plan_id, billing_period, success_url, cancel_url, customer_email })
      return new Response(
        JSON.stringify({ error: 'Paramètres requis manquants: plan_id, success_url, cancel_url, customer_email' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📊 Données reçues:', {
      plan_id,
      billing_period,
      customer_email,
      user_id: metadata?.user_id
    })

    // Initialiser Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer le plan depuis la base de données
    console.log('🔍 Récupération du plan:', plan_id)
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      console.error('❌ Plan non trouvé:', planError)
      return new Response(
        JSON.stringify({ error: 'Plan d\'abonnement non trouvé' }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ Plan trouvé:', plan.name)

    // Sélectionner le bon Price ID selon la période de facturation
    let stripePriceId: string | null = null
    let planName = plan.name

    if (billing_period === 'yearly' && plan.stripe_price_id_yearly) {
      stripePriceId = plan.stripe_price_id_yearly
      planName = `${plan.name} (Annuel)`
      console.log('📅 Abonnement annuel sélectionné')
    } else if (plan.stripe_price_id_monthly) {
      stripePriceId = plan.stripe_price_id_monthly
      planName = `${plan.name} (Mensuel)`
      console.log('📅 Abonnement mensuel sélectionné')
    }

    if (!stripePriceId) {
      console.error('❌ Aucun Price ID Stripe trouvé pour ce plan et cette période')
      return new Response(
        JSON.stringify({ error: 'Configuration de prix manquante pour ce plan' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('💰 Price ID Stripe:', stripePriceId)

    // Initialiser Stripe
    const stripeSecretKey = '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'
    
    console.log('🔑 Initialisation Stripe...')
    const stripe = new Stripe(stripeSecretKey, {
      appInfo: {
        name: 'BookingFast',
        version: '1.0.0',
      },
    })

    console.log('✅ Stripe initialisé avec succès')

    // Créer ou récupérer le client Stripe
    let customerId
    
    try {
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1,
      })
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
        console.log('✅ Client Stripe existant trouvé:', customerId)
      } else {
        const newCustomer = await stripe.customers.create({
          email: customer_email,
          metadata: metadata || {},
        })
        customerId = newCustomer.id
        console.log('✅ Nouveau client Stripe créé:', customerId)
      }
    } catch (customerError) {
      console.error('❌ Erreur gestion client Stripe:', customerError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du client Stripe' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Créer la session de checkout avec le Price ID
    console.log('💳 Création session checkout avec Price ID...')
    
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url,
        cancel_url,
        metadata: {
          ...metadata,
          plan_id,
          billing_period,
        },
        subscription_data: {
          metadata: {
            ...metadata,
            plan_id,
            billing_period,
          },
        },
      })

      console.log('✅ Session checkout créée:', session.id)
      console.log('🔗 URL session:', session.url)

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url,
          success: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (stripeError) {
      console.error('❌ Erreur création session Stripe:', stripeError)
      
      let errorMessage = 'Erreur lors de la création de la session de paiement'
      
      if (stripeError.message.includes('Invalid API Key')) {
        errorMessage = 'Clé API Stripe invalide. Contactez le support.'
      } else if (stripeError.message.includes('No such customer')) {
        errorMessage = 'Erreur client Stripe. Veuillez réessayer.'
      } else if (stripeError.message.includes('price')) {
        errorMessage = 'Configuration de prix invalide. Contactez le support.'
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: stripeError.message 
        }),
        { status: 500, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('❌ Erreur générale stripe-subscription-checkout:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
