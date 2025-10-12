import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.4.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 === DÉBUT EDGE FUNCTION ===')
    console.log('📋 Method:', req.method)

    // ⚠️ CLÉS HARDCODÉES - À REMPLACER PAR VOS VRAIES CLÉS STRIPE
    // TODO: Déplacer vers les secrets Supabase en production !
    const HARDCODED_STRIPE_SECRET_KEY = 'STRIPE_SECRET_KEY=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'
    
    // Configuration Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🔑 SUPABASE_URL:', supabaseUrl ? '✅ Défini' : '❌ MANQUANT')
    console.log('🔑 SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Défini' : '❌ MANQUANT')
    console.log('🔑 STRIPE_SECRET_KEY: ✅ HARDCODÉE')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Initialiser Stripe avec la clé hardcodée
    const stripe = new Stripe(HARDCODED_STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })

    console.log('✅ Stripe initialisé avec clé hardcodée')

    // Parser le body
    let body
    try {
      const text = await req.text()
      console.log('📦 Body brut:', text)
      body = JSON.parse(text)
      console.log('📦 Body parsé:', body)
    } catch (e) {
      console.error('❌ Erreur parsing body:', e)
      throw new Error('Body JSON invalide')
    }

    const { userId, pluginId } = body

    if (!userId || !pluginId) {
      console.error('❌ Données manquantes - userId:', userId, 'pluginId:', pluginId)
      throw new Error('userId et pluginId requis')
    }

    console.log('👤 User ID:', userId)
    console.log('🔌 Plugin ID:', pluginId)

    // Récupérer le plugin
    console.log('🔍 Recherche plugin...')
    const { data: plugin, error: pluginError } = await supabaseClient
      .from('plugins')
      .select('*')
      .eq('id', pluginId)
      .single()

    if (pluginError) {
      console.error('❌ Erreur récupération plugin:', pluginError)
      throw new Error(`Plugin non trouvé: ${pluginError.message}`)
    }

    if (!plugin) {
      throw new Error('Plugin non trouvé')
    }

    console.log('✅ Plugin trouvé:', plugin.name)
    console.log('💰 Price ID:', plugin.stripe_price_id)

    if (!plugin.stripe_price_id) {
      throw new Error(`Aucun stripe_price_id configuré pour le plugin "${plugin.name}". Créez un Price dans Stripe Dashboard et mettez à jour la table plugins.`)
    }

    // Récupérer l'utilisateur
    console.log('🔍 Recherche utilisateur...')
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('❌ Erreur récupération user:', userError)
      throw new Error(`Utilisateur non trouvé: ${userError.message}`)
    }

    if (!user) {
      throw new Error('Utilisateur non trouvé')
    }

    console.log('✅ User trouvé:', user.email)

    // Créer ou récupérer le customer Stripe
    let customerId = user.stripe_customer_id

    if (!customerId) {
      console.log('➕ Création nouveau customer Stripe...')
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: userId
          }
        })
        customerId = customer.id
        console.log('✅ Customer créé:', customerId)

        // Sauvegarder le customer ID
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)

        if (updateError) {
          console.error('⚠️ Erreur sauvegarde customer ID:', updateError)
        }
      } catch (e) {
        console.error('❌ Erreur création customer Stripe:', e)
        throw new Error(`Erreur Stripe: ${e.message}`)
      }
    } else {
      console.log('✅ Customer existant:', customerId)
    }

    // Créer la session Checkout
    console.log('💳 Création session Checkout...')
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        client_reference_id: `${userId}|${pluginId}`,
        line_items: [
          {
            price: plugin.stripe_price_id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.get('origin') || 'https://bookingfast.hevolife.fr'}/plugins?success=true`,
        cancel_url: `${req.headers.get('origin') || 'https://bookingfast.hevolife.fr'}/plugins?canceled=true`,
        metadata: {
          user_id: userId,
          plugin_id: pluginId,
          payment_type: 'plugin_subscription'
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            plugin_id: pluginId
          }
        }
      })

      console.log('✅ Session créée:', session.id)
      console.log('🔗 URL:', session.url)

      return new Response(
        JSON.stringify({ 
          url: session.url,
          sessionId: session.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (e) {
      console.error('❌ Erreur création session Stripe:', e)
      throw new Error(`Erreur Stripe: ${e.message}`)
    }

  } catch (error) {
    console.error('❌ === ERREUR EDGE FUNCTION ===')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
