import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLATFORM_STRIPE_SECRET_KEY = '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';

Deno.serve(async (req) => {
  console.log('🚀 === STRIPE-CHECKOUT V16 - SYNTAX FIXED === 🚀')
  console.log('📍 Request URL:', req.url)
  console.log('📍 Request Method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Step 1: Reading environment variables')
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Configuration Supabase:', {
      url: supabaseUrl ? '✅ Défini' : '❌ Manquant',
      serviceKey: supabaseServiceKey ? '✅ Défini' : '❌ Manquant'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Supabase manquante',
          details: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non défini'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      console.error('❌ Method not allowed:', req.method)
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔧 Step 2: Parsing request body')
    const body = await req.json();
    console.log('📥 Body reçu:', JSON.stringify(body, null, 2));

    const { amount, currency = 'eur', success_url, cancel_url, customer_email, metadata, service_name, parent_url } = body;

    console.log('🔧 Step 3: Validating required parameters')
    if (!success_url || !cancel_url || !customer_email || !service_name) {
      console.error('❌ Paramètres manquants:', {
        success_url: !!success_url,
        cancel_url: !!cancel_url,
        customer_email: !!customer_email,
        service_name: !!service_name
      });
      return new Response(
        JSON.stringify({ error: 'Paramètres requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Paramètres validés:', {
      customer_email,
      service_name,
      payment_type: metadata?.payment_type,
      amount,
      parent_url
    })

    let stripeSecretKey: string | undefined;
    
    // PAIEMENT RÉSERVATION IFRAME (booking_deposit)
    if (metadata?.payment_type === 'booking_deposit') {
      console.log('💳 === PAIEMENT RÉSERVATION IFRAME === 💳')
      
      const userId = metadata?.user_id
      if (!userId) {
        console.error('❌ user_id manquant dans metadata');
        return new Response(
          JSON.stringify({ error: 'user_id requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('🔧 Step 4: Fetching Stripe configuration for user:', userId);
      console.log('🔗 API URL:', `${supabaseUrl}/rest/v1/business_settings?user_id=eq.${userId}`);

      const settingsResponse = await fetch(
        `${supabaseUrl}/rest/v1/business_settings?user_id=eq.${userId}&select=stripe_enabled,stripe_secret_key`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      console.log('📡 API Response Status:', settingsResponse.status);
      console.log('📡 API Response Headers:', Object.fromEntries(settingsResponse.headers.entries()));

      if (!settingsResponse.ok) {
        const errorText = await settingsResponse.text();
        console.error('❌ Erreur API Supabase:', settingsResponse.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur récupération configuration Stripe',
            details: errorText,
            status: settingsResponse.status
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const settingsData = await settingsResponse.json();
      console.log('📦 Résultat API business_settings:', {
        count: settingsData.length,
        data: settingsData
      });

      if (!settingsData || settingsData.length === 0) {
        console.error('❌ Aucune configuration trouvée pour user_id:', userId);
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe non trouvée' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const settings = settingsData[0];
      console.log('🔍 Settings found:', {
        stripe_enabled: settings.stripe_enabled,
        has_secret_key: !!settings.stripe_secret_key
      });

      if (!settings.stripe_enabled) {
        console.error('❌ Stripe non activé pour cet utilisateur');
        return new Response(
          JSON.stringify({ error: 'Stripe non activé pour cet utilisateur' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!settings.stripe_secret_key) {
        console.error('❌ Clé secrète Stripe manquante');
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe incomplète' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      stripeSecretKey = settings.stripe_secret_key
      console.log('✅ Clé Stripe utilisateur récupérée');

      console.log('🔧 Step 5: Initializing Stripe client');
      const stripe = new Stripe(stripeSecretKey, {
        appInfo: {
          name: 'BookingFast',
          version: '1.0.0',
        },
      })

      console.log('🔧 Step 6: Finding or creating Stripe customer');
      let customerId
      console.log('🔍 Recherche client Stripe avec email:', customer_email);
      
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

      console.log('🔧 Step 7: Building redirect URLs');
      let redirectBaseUrl: string;
      
      if (parent_url && parent_url !== 'https://bookingfast.pro') {
        redirectBaseUrl = parent_url;
        console.log('🌐 Iframe externe détecté - redirect vers:', redirectBaseUrl);
      } else {
        redirectBaseUrl = success_url.includes('localhost') 
          ? success_url.split('/payment-success')[0] 
          : 'https://bookingfast.pro';
        console.log('🏠 Iframe BookingFast - redirect vers:', redirectBaseUrl);
      }
      
      const iframeSuccessUrl = `${redirectBaseUrl}/booking/${userId}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const iframeCancelUrl = `${redirectBaseUrl}/booking/${userId}?payment=cancelled`;

      console.log('🔗 URLs de redirection:', {
        success: iframeSuccessUrl,
        cancel: iframeCancelUrl
      });

      console.log('🔧 Step 8: Creating Stripe checkout session');
      console.log('💳 Création session PAIEMENT UNIQUE:', {
        amount,
        currency,
        service_name
      });

      try {
        const sessionData = {
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: service_name,
                  description: `Acompte - ${service_name}`,
                },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: iframeSuccessUrl,
          cancel_url: iframeCancelUrl,
          metadata: metadata || {},
        };

        console.log('📋 Données session Stripe:', JSON.stringify(sessionData, null, 2));

        const session = await stripe.checkout.sessions.create(sessionData);

        console.log('✅ Session PAIEMENT créée:', session.id)
        console.log('🔗 URL:', session.url)

        return new Response(
          JSON.stringify({ 
            sessionId: session.id, 
            url: session.url,
            success: true,
            type: 'payment'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (stripeError: any) {
        console.error('❌ Erreur Stripe:', {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          param: stripeError.param
        });
        return new Response(
          JSON.stringify({ 
            error: 'Erreur Stripe',
            details: stripeError.message,
            type: stripeError.type,
            code: stripeError.code
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } else if (metadata?.payment_type === 'platform_subscription' || metadata?.payment_type === 'plugin_subscription') {
      console.log('💳 CRÉATION ABONNEMENT RÉCURRENT')
      
      stripeSecretKey = PLATFORM_STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        console.error('❌ PLATFORM_STRIPE_SECRET_KEY non défini');
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe manquante' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Clé Stripe plateforme trouvée');

      const stripe = new Stripe(stripeSecretKey, {
        appInfo: {
          name: 'BookingFast',
          version: '1.0.0',
        },
      })

      let customerId
      console.log('🔍 Recherche client Stripe avec email:', customer_email);
      
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

      let priceId: string | undefined;

      if (metadata?.payment_type === 'plugin_subscription') {
        console.log('🔌 === ABONNEMENT PLUGIN === 🔌')
        
        const pluginId = metadata?.plugin_id
        if (!pluginId) {
          console.error('❌ plugin_id manquant dans metadata');
          return new Response(
            JSON.stringify({ error: 'plugin_id requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('🔍 Requête API plugins pour ID:', pluginId);
        
        const pluginResponse = await fetch(
          `${supabaseUrl}/rest/v1/plugins?id=eq.${pluginId}&select=id,name,slug,stripe_price_id`,
          {
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('📡 Plugin API Response Status:', pluginResponse.status);

        if (!pluginResponse.ok) {
          const errorText = await pluginResponse.text();
          console.error('❌ Erreur API plugins:', pluginResponse.status, errorText);
          return new Response(
            JSON.stringify({ 
              error: 'Erreur lors de la récupération du plugin',
              details: errorText
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const pluginData = await pluginResponse.json();
        console.log('📦 Plugin data:', pluginData);

        if (!pluginData || pluginData.length === 0) {
          console.error('❌ Plugin non trouvé avec ID:', pluginId);
          return new Response(
            JSON.stringify({ error: 'Plugin non trouvé' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const plugin = pluginData[0];
        console.log('✅ Plugin trouvé:', plugin.name);

        if (!plugin.stripe_price_id) {
          console.error('❌ stripe_price_id manquant pour le plugin:', plugin.slug);
          return new Response(
            JSON.stringify({ 
              error: 'Configuration Stripe du plugin manquante',
              help: 'Ajoutez le stripe_price_id dans la table plugins pour ce plugin',
              plugin: plugin.slug
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        priceId = plugin.stripe_price_id
        console.log('✅ Price ID plugin récupéré:', priceId)

      } else {
        const STRIPE_PRICES = {
          starter: 'price_1QpCZhKiNbWQJGP3YourStarterPriceID',
          monthly: 'price_1QpCZhKiNbWQJGP3YourMonthlyPriceID',
          yearly: 'price_1QpCZhKiNbWQJGP3YourYearlyPriceID'
        }

        const planId = metadata?.plan_id || 'starter'
        priceId = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES]

        console.log('🔍 Plan demandé:', planId)
        console.log('🔍 Price ID récupéré:', priceId)

        if (!priceId || priceId.includes('YourStarterPriceID') || priceId.includes('YourMonthlyPriceID') || priceId.includes('YourYearlyPriceID')) {
          console.error('❌ Price ID non configuré pour le plan:', planId)
          return new Response(
            JSON.stringify({ 
              error: 'Prix Stripe non configuré. Créez les prix récurrents dans votre dashboard Stripe.',
              help: 'Allez dans Stripe Dashboard > Produits > Créer un prix récurrent'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      console.log('💳 Création session ABONNEMENT avec Price ID:', priceId)
      
      try {
        const sessionData = {
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
        };

        console.log('📋 Données session Stripe:', JSON.stringify(sessionData, null, 2));

        const session = await stripe.checkout.sessions.create(sessionData);

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
      } catch (stripeError: any) {
        console.error('❌ Erreur Stripe:', {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          param: stripeError.param
        });
        return new Response(
          JSON.stringify({ 
            error: 'Erreur Stripe',
            details: stripeError.message,
            type: stripeError.type,
            code: stripeError.code
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } else {
      console.error('❌ Type de paiement non reconnu:', metadata?.payment_type);
      return new Response(
        JSON.stringify({ error: 'Type de paiement non reconnu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('❌ === ERREUR GLOBALE === ❌')
    console.error('Type:', error.constructor?.name)
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne',
        details: error.message,
        type: error.constructor?.name,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});
