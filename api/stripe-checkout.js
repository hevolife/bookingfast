const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

// Configuration CORS
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'BookingFast Integration',
    version: '1.0.0',
  },
});

app.post('/api/stripe-checkout', async (req, res) => {
  try {
    const { amount, currency = 'eur', success_url, cancel_url, customer_email, metadata, service_name } = req.body;

    // Validation des paramètres
    if (!amount || !success_url || !cancel_url || !customer_email || !service_name) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: amount, success_url, cancel_url, customer_email, service_name requis' 
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Le montant doit être un nombre positif' });
    }

    // Créer ou récupérer le client Stripe par email
    let customerId;
    
    const existingCustomers = await stripe.customers.list({
      email: customer_email,
      limit: 1,
    });
    
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
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

    console.log(`✅ Session checkout créée: ${session.id} pour client ${customerId}`);

    res.json({ 
      sessionId: session.id, 
      url: session.url,
      success: true 
    });
  } catch (error) {
    console.error(`❌ Erreur checkout:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;