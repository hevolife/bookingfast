import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

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
    console.log('🔄 Début traitement stripe-checkout...')
    
    // Créer le client Supabase
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

    // Validation des paramètres
    if (!amount || !success_url || !cancel_url || !customer_email || !service_name) {
      console.error('❌ Paramètres manquants:', { amount, success_url, cancel_url, customer_email, service_name })
      return new Response(
        JSON.stringify({ error: 'Paramètres requis manquants: amount, success_url, cancel_url, customer_email, service_name' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📊 Données reçues:', {
      amount,
      currency,
      customer_email,
      service_name,
      user_id: metadata?.user_id
    })

    // ÉTAPE 1: Récupérer les paramètres Stripe de l'utilisateur depuis business_settings
    const userId = metadata?.user_id
    if (!userId) {
      console.error('❌ user_id manquant dans metadata')
      return new Response(
        JSON.stringify({ error: 'user_id requis dans metadata pour récupérer la configuration Stripe' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('🔍 Récupération configuration Stripe pour utilisateur:', userId)

    const { data: settings, error: settingsError } = await supabaseClient
      .from('business_settings')
      .select('stripe_enabled, stripe_secret_key, stripe_public_key')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings) {
      console.error('❌ Erreur récupération paramètres:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Configuration utilisateur non trouvée' }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ Paramètres récupérés:', {
      stripe_enabled: settings.stripe_enabled,
      has_secret_key: !!settings.stripe_secret_key,
      has_public_key: !!settings.stripe_public_key
    })

    // Vérifier que Stripe est activé et configuré
    if (!settings.stripe_enabled) {
      console.error('❌ Stripe non activé pour cet utilisateur')
      return new Response(
        JSON.stringify({ error: 'Stripe non activé. Activez Stripe dans vos paramètres.' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!settings.stripe_secret_key) {
      console.error('❌ Clé secrète Stripe manquante')
      return new Response(
        JSON.stringify({ error: 'Clé secrète Stripe non configurée. Ajoutez votre clé secrète dans les paramètres.' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // ÉTAPE 2: Initialiser Stripe avec la clé de l'utilisateur
    console.log('🔑 Initialisation Stripe avec clé utilisateur...')
    const stripe = new Stripe(settings.stripe_secret_key, {
      appInfo: {
        name: 'BookingFast',
        version: '1.0.0',
      },
    })

    console.log('✅ Stripe initialisé avec succès')

    // ÉTAPE 3: Créer ou récupérer le client Stripe
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

    // ÉTAPE 4: Créer la session de checkout
    console.log('💳 Création session checkout...')
    
    try {
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
              unit_amount: Math.round(amount * 100), // Convertir en centimes
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url,
        cancel_url,
        metadata: metadata || {},
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
      
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Erreur lors de la création de la session de paiement'
      
      if (stripeError.message.includes('Invalid API Key')) {
        errorMessage = 'Clé API Stripe invalide. Vérifiez votre clé secrète dans les paramètres.'
      } else if (stripeError.message.includes('No such customer')) {
        errorMessage = 'Erreur client Stripe. Veuillez réessayer.'
      } else if (stripeError.message.includes('amount')) {
        errorMessage = 'Montant invalide. Le montant doit être supérieur à 0.'
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
    console.error('❌ Erreur générale stripe-checkout:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})