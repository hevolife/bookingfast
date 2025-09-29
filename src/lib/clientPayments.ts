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
          'success_url': `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&amount=${amount}&email=${customerEmail}&date=${metadata.date || metadata.booking_date}&time=${metadata.time || metadata.booking_time}&booking_id=${metadata.booking_id || ''}`,
          'cancel_url': `${window.location.origin}/payment-cancel`,
          'customer_email': customerEmail,
          ...Object.entries(metadata).reduce((acc, [key, value]) => {
            acc[`metadata[${key}]`] = value;
            return acc;
          }, {} as Record<string, string>),
          // Ajouter l'ID de réservation si disponible
          ...(metadata.booking_id ? { 'metadata[booking_id]': metadata.booking_id } : {})
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

}

// Déclaration TypeScript pour Stripe
declare global {
  interface Window {
    Stripe: any;
  }
}