import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.4.0'

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
    console.log('🎯 Création session Checkout Stripe pour plugin')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-12-18.acacia',
    })

    const { userId, pluginId } = await req.json()

    if (!userId || !pluginId) {
      throw new Error('userId et pluginId requis')
    }

    console.log('👤 User ID:', userId)
    console.log('🔌 Plugin ID:', pluginId)

    // Récupérer les infos du plugin
    const { data: plugin, error: pluginError } = await supabaseClient
      .from('plugins')
      .select('*')
      .eq('id', pluginId)
      .single()

    if (pluginError || !plugin) {
      throw new Error('Plugin non trouvé')
    }

    console.log('📦 Plugin:', plugin.name)

    // Récupérer les infos de l'utilisateur
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('Utilisateur non trouvé')
    }

    console.log('📧 Email:', user.email)

    // Créer ou récupérer le customer Stripe
    let customerId = user.stripe_customer_id

    if (!customerId) {
      console.log('➕ Création nouveau customer Stripe')
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: userId
        }
      })
      customerId = customer.id

      // Sauvegarder le customer ID
      await supabaseClient
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)

      console.log('✅ Customer créé:', customerId)
    } else {
      console.log('✅ Customer existant:', customerId)
    }

    // Vérifier si un price existe pour ce plugin
    if (!plugin.stripe_price_id) {
      throw new Error('Aucun prix Stripe configuré pour ce plugin')
    }

    console.log('💰 Price ID:', plugin.stripe_price_id)

    // Créer la session Checkout
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
      success_url: `${req.headers.get('origin')}/plugins?success=true`,
      cancel_url: `${req.headers.get('origin')}/plugins?canceled=true`,
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

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
