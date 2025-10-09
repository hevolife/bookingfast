import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLATFORM_STRIPE_SECRET_KEY = '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';

// Prix récurrents Stripe - REMPLACEZ PAR VOS VRAIS PRICE IDs
const STRIPE_PRICES = {
  starter: 'price_1QpCZhKiNbWQJGP3YourStarterPriceID',
  monthly: 'price_1QpCZhKiNbWQJGP3YourMonthlyPriceID',
  yearly: 'price_1QpCZhKiNbWQJGP3YourYearlyPriceID'
}

Deno.serve(async (req) => {
  console.log('🚀 === STRIPE-CHECKOUT V5 - FIX VALIDATION === 🚀')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      )
    }

    const { amount, currency = 'eur', success_url, cancel_url, customer_email, metadata, service_name } = await req.json()

    if (!success_url || !cancel_url || !customer_email || !service_name) {
      console.error('❌ Paramètres manquants')
      return new Response(
        JSON.stringify({ error: 'Paramètres requis manquants' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📊 Données reçues:', {
      customer_email,
      service_name,
      payment_type: metadata?.payment_type,
      plan_id: metadata?.plan_id
    })

    let stripeSecretKey: string | undefined;
    
    // ABONNEMENT PLATEFORME
    if (metadata?.payment_type === 'platform_subscription') {
      console.log('💳 CRÉATION ABONNEMENT RÉCURRENT')
      
      stripeSecretKey = PLATFORM_STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe manquante' }),
          { status: 500, headers: corsHeaders }
        )
      }

      const stripe = new Stripe(stripeSecretKey, {
        appInfo: {
          name: 'BookingFast',
          version: '1.0.0',
        },
      })

      // Créer ou récupérer le client
      let customerId
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1,
      })
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
        console.log('✅ Client existant:', customerId)
      } else {
        const newCustomer = await stripe.customers.create({
          email: customer_email,
          metadata: metadata || {},
        })
        customerId = newCustomer.id
        console.log('✅ Nouveau client créé:', customerId)
      }

      // Récupérer le Price ID selon le plan
      const planId = metadata?.plan_id || 'starter'
      const priceId = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES]

      console.log('🔍 Plan demandé:', planId)
      console.log('🔍 Price ID récupéré:', priceId)

      // CORRECTION: Vérifier que le Price ID existe ET ne commence PAS par "price_1QpCZh" (placeholder)
      if (!priceId || priceId.includes('YourStarterPriceID') || priceId.includes('YourMonthlyPriceID') || priceId.includes('YourYearlyPriceID')) {
        console.error('❌ Price ID non configuré pour le plan:', planId)
        console.error('❌ Price ID actuel:', priceId)
        return new Response(
          JSON.stringify({ 
            error: 'Prix Stripe non configuré. Créez les prix récurrents dans votre dashboard Stripe.',
            help: 'Allez dans Stripe Dashboard > Produits > Créer un prix récurrent',
            debug: {
              planId,
              priceId,
              availablePlans: Object.keys(STRIPE_PRICES)
            }
          }),
          { status: 500, headers: corsHeaders }
        )
      }

      // CRÉER UN ABONNEMENT
      console.log('💳 Création session ABONNEMENT avec Price ID:', priceId)
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url,
        cancel_url,
        metadata: metadata || {},
        subscription_data: {
          metadata: metadata || {},
        },
      })

      console.log('✅ Session ABONNEMENT créée:', session.id)
      console.log('🔗 URL:', session.url)

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url,
          success: true,
          type: 'subscription'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      // PAIEMENT UTILISATEUR (réservation)
      console.log('💳 Paiement utilisateur - Utilisation Stripe utilisateur')
      
      const userId = metadata?.user_id
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'user_id requis' }),
          { status: 400, headers: corsHeaders }
        )
      }

      const { data: settings, error: settingsError } = await supabaseClient
        .from('business_settings')
        .select('stripe_enabled, stripe_secret_key')
        .eq('user_id', userId)
        .single()

      if (settingsError || !settings?.stripe_enabled || !settings?.stripe_secret_key) {
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe utilisateur manquante' }),
          { status: 400, headers: corsHeaders }
        )
      }

      stripeSecretKey = settings.stripe_secret_key

      const stripe = new Stripe(stripeSecretKey, {
        appInfo: {
          name: 'BookingFast',
          version: '1.0.0',
        },
      })

      let customerId
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1,
      })
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      } else {
        const newCustomer = await stripe.customers.create({
          email: customer_email,
          metadata: metadata || {},
        })
        customerId = newCustomer.id
      }

      // PAIEMENT UNIQUE pour les réservations
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: service_name,
                description: `Réservation - ${service_name}`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url,
        cancel_url,
        metadata: metadata || {},
      })

      console.log('✅ Session paiement créée:', session.id)

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url,
          success: true,
          type: 'payment'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
