import { supabase, isSupabaseConfigured } from './supabase';

// Gestion des paiements côté client avec Stripe.js
export class ClientPaymentManager {
  private static stripePromise: Promise<any> | null = null;

  static async loadStripe(publicKey: string) {
    if (!this.stripePromise) {
      // Charger Stripe.js dynamiquement
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      document.head.appendChild(script);

      this.stripePromise = new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.Stripe) {
            resolve(window.Stripe(publicKey));
          } else {
            reject(new Error('Stripe non chargé'));
          }
        };
        script.onerror = reject;
      });
    }
    return this.stripePromise;
  }

  static async createCheckoutSession(paymentData: {
    amount: number;
    serviceName: string;
    customerEmail: string;
    metadata: Record<string, string>;
    settings: any;
  }) {
    const { amount, serviceName, customerEmail, metadata, settings } = paymentData;

    if (!settings?.stripe_enabled || !settings?.stripe_public_key) {
      throw new Error('Stripe non configuré');
    }

    try {
      // Utiliser l'API Stripe directement côté client
      const stripe = await this.loadStripe(settings.stripe_public_key);

      // Créer une session de checkout via l'API REST de Stripe
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.stripe_secret_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'line_items[0][price_data][currency]': 'eur',
          'line_items[0][price_data][product_data][name]': serviceName,
          'line_items[0][price_data][unit_amount]': (amount * 100).toString(),
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': `${window.location.origin}/payment-success`,
          'cancel_url': `${window.location.origin}/payment-cancel`,
          'customer_email': customerEmail,
          ...Object.entries(metadata).reduce((acc, [key, value]) => {
            acc[`metadata[${key}]`] = value;
            return acc;
          }, {} as Record<string, string>)
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur Stripe: ${response.status}`);
      }

      const session = await response.json();
      
      // Rediriger vers Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (error) {
        throw error;
      }

      return session;
    } catch (error) {
      console.error('Erreur création session Stripe:', error);
      throw error;
    }
  }

  static async handleWebhookLocally(sessionData: any) {
    if (!isSupabaseConfigured()) return;

    try {
      const { customer_details, metadata, amount_total, id: sessionId } = sessionData;
      const customerEmail = customer_details?.email;
      const amountPaid = amount_total / 100;

      if (!customerEmail || !metadata) return;

      // Traitement selon le type de paiement
      if (metadata.create_booking_after_payment === 'true') {
        // Créer une nouvelle réservation
        const bookingData = {
          user_id: metadata.user_id,
          service_id: metadata.service_id,
          date: metadata.date,
          time: metadata.time,
          duration_minutes: parseInt(metadata.duration_minutes),
          quantity: parseInt(metadata.quantity),
          client_name: metadata.client_name,
          client_firstname: metadata.client_firstname,
          client_email: customerEmail,
          client_phone: metadata.phone,
          total_amount: parseFloat(metadata.total_amount),
          payment_status: 'partial',
          payment_amount: amountPaid,
          booking_status: 'confirmed',
          transactions: [{
            id: crypto.randomUUID(),
            amount: amountPaid,
            method: 'stripe',
            status: 'completed',
            note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
            created_at: new Date().toISOString()
          }]
        };

        const { error } = await supabase
          .from('bookings')
          .insert([bookingData]);

        if (error) throw error;
      } else {
        // Mettre à jour une réservation existante
        const { data: booking, error: findError } = await supabase
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .eq('date', metadata.booking_date)
          .eq('time', metadata.booking_time)
          .single();

        if (findError || !booking) return;

        const existingTransactions = booking.transactions || [];
        const newTransaction = {
          id: crypto.randomUUID(),
          amount: amountPaid,
          method: 'stripe',
          status: 'completed',
          note: `Paiement Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
          created_at: new Date().toISOString()
        };

        const finalTransactions = [...existingTransactions, newTransaction];
        const newTotalPaid = amountPaid + (booking.payment_amount || 0);
        
        let newPaymentStatus = 'pending';
        if (newTotalPaid >= booking.total_amount) {
          newPaymentStatus = 'completed';
        } else if (newTotalPaid > 0) {
          newPaymentStatus = 'partial';
        }

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_amount: newTotalPaid,
            payment_status: newPaymentStatus,
            booking_status: 'confirmed',
            transactions: finalTransactions,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) throw updateError;
      }

      console.log('✅ Paiement traité côté client');
    } catch (error) {
      console.error('❌ Erreur traitement paiement:', error);
    }
  }
}

// Déclaration TypeScript pour Stripe
declare global {
  interface Window {
    Stripe: any;
  }
}