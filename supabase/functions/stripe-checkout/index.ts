import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 🔑 CLÉS STRIPE HARDCODÉES
// ⚠️ IMPORTANT: Remplacez ces valeurs par vos vraies clés Stripe
const PLATFORM_STRIPE_SECRET_KEY = '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'; // 🔴 À REMPLACER
const PLATFORM_STRIPE_PUBLIC_KEY = 'pk_live_51QnoItKiNbWQJGP3D6PzBKhVbxPvsScrzVOJ1ryf69rVdqptCHDMoDaA26DkyKm6WdS82HwqLuPgaq7oJ1DaFYP400gPsE4jy3'; // 🔴 À REMPLACER

Deno.serve(async (req) => {
  console.log('🚀 === STRIPE-CHECKOUT V3 - CLÉS HARDCODÉES === 🚀')
  console.log('📅 Version déployée le:', new Date().toISOString())
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Début traitement stripe-checkout...')
    
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
      payment_type: metadata?.payment_type,
      user_id: metadata?.user_id
    })

    // DÉTERMINER QUEL COMPTE STRIPE UTILISER
    let stripeSecretKey: string | undefined;
    
    if (metadata?.payment_type === 'platform_subscription') {
      // ABONNEMENT PLATEFORME: Utiliser les clés hardcodées
      console.log('💳 Type: Abonnement plateforme - Utilisation clés hardcodées')
      
      stripeSecretKey = PLATFORM_STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey || stripeSecretKey === 'sk_test_VOTRE_CLE_SECRETE_ICI') {
        console.error('❌ ❌ ❌ CLÉ STRIPE PLATEFORME NON CONFIGURÉE ❌ ❌ ❌')
        console.error('⚠️ Vous devez remplacer PLATFORM_STRIPE_SECRET_KEY dans le code')
        
        return new Response(
          JSON.stringify({ 
            error: 'Configuration Stripe plateforme manquante. Les clés doivent être configurées dans le code.',
            debug: {
              version: 'V3 - HARDCODED KEYS',
              deployed_at: new Date().toISOString(),
              key_configured: stripeSecretKey !== 'sk_test_VOTRE_CLE_SECRETE_ICI'
            }
          }),
          { status: 500, headers: corsHeaders }
        )
      }
      
      console.log('✅ ✅ ✅ CLÉ STRIPE PLATEFORME HARDCODÉE PRÊTE ✅ ✅ ✅')
      console.log('🔑 Clé commence par:', stripeSecretKey.substring(0, 10) + '...')
      
    } else {
      // PAIEMENT UTILISATEUR: Utiliser le Stripe de l'utilisateur
      console.log('💳 Type: Paiement utilisateur - Utilisation Stripe utilisateur')
      
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

      stripeSecretKey = settings.stripe_secret_key
    }

    // INITIALISER STRIPE
    console.log('🔑 Initialisation Stripe...')
    const stripe = new Stripe(stripeSecretKey, {
      appInfo: {
        name: 'BookingFast',
        version: '1.0.0',
      },
    })

    console.log('✅ Stripe initialisé avec succès')

    // CRÉER OU RÉCUPÉRER LE CLIENT STRIPE
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

    // CRÉER LA SESSION DE CHECKOUT
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
                description: metadata?.payment_type === 'platform_subscription' 
                  ? `Abonnement mensuel - ${service_name}`
                  : `Réservation - ${service_name}`,
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
        errorMessage = 'Clé API Stripe invalide. Vérifiez votre configuration.'
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
