import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Vérifier que la clé Stripe est configurée
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY non configuré dans les variables d\'environnement');
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

console.log('✅ STRIPE_SECRET_KEY trouvé:', stripeSecret.substring(0, 7) + '...');

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    console.log('🔄 Début traitement stripe-checkout...');
    console.log('🔑 Variables d\'environnement disponibles:', {
      STRIPE_SECRET_KEY: !!Deno.env.get('STRIPE_SECRET_KEY'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    });

    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { amount, currency = 'eur', success_url, cancel_url, customer_email, metadata, service_name } = await req.json();

    const error = validateParameters(
      { amount, success_url, cancel_url, customer_email, service_name },
      {
        amount: 'number',
        cancel_url: 'string',
        success_url: 'string',
        customer_email: 'string',
        service_name: 'string',
      },
    );

    if (error) {
      return corsResponse({ error }, 400);
    }

    console.log('📊 Données reçues:', {
      amount,
      currency,
      customer_email,
      service_name,
      has_metadata: !!metadata
    });

    // Créer ou récupérer le client Stripe par email
    let customerId;
    
    // Chercher un client existant par email
    const existingCustomers = await stripe.customers.list({
      email: customer_email,
      limit: 1,
    });
    
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      // Créer un nouveau client
      const newCustomer = await stripe.customers.create({
        email: customer_email,
        metadata: metadata || {},
      });
      customerId = newCustomer.id;
    }

    // Créer la session de checkout
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
    });

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);
    console.log(`Session URL: ${session.url}`);

    return corsResponse({ 
      sessionId: session.id, 
      url: session.url,
      success: true 
    });
  } catch (error: any) {
    console.error(`❌ Erreur stripe-checkout: ${error.message}`);
    console.error(`❌ Stack trace:`, error.stack);
    
    // Erreur spécifique pour clé Stripe manquante
    if (error.message.includes('apiKey') || error.message.includes('authenticator')) {
      return corsResponse({ 
        error: 'Configuration Stripe manquante. Vérifiez que STRIPE_SECRET_KEY est configuré dans les variables d\'environnement Supabase.',
        details: 'STRIPE_SECRET_KEY environment variable is required'
      }, 500);
    }
    
    return corsResponse({ error: error.message }, 500);
  }
});

type ExpectedType = 'string' | 'number' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else if (expectation === 'number') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'number') {
        return `Expected parameter ${parameter} to be a number got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}