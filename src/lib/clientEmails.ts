import { supabase, isSupabaseConfigured } from './supabase';

// Gestion des emails côté client
export class ClientEmailManager {
  static async sendEmail(emailData: {
    userId: string;
    toEmail: string;
    toName: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    templateVariables?: Record<string, string>;
  }) {
    if (!isSupabaseConfigured()) {
      console.log('📧 SIMULATION ENVOI EMAIL - Mode démo');
      return true;
    }

    try {
      // Récupérer la configuration Brevo
      const { data: settings, error } = await supabase
        .from('business_settings')
        .select('brevo_enabled, brevo_api_key, brevo_sender_email, brevo_sender_name, business_name')
        .eq('user_id', emailData.userId)
        .single();

      if (error || !settings?.brevo_enabled || !settings?.brevo_api_key) {
        console.log('📧 Brevo non configuré - email non envoyé');
        return false;
      }

      // Remplacer les variables
      let finalHtmlContent = emailData.htmlContent;
      let finalTextContent = emailData.textContent;
      let finalSubject = emailData.subject;

      const defaultVariables = {
        '{{business_name}}': settings.business_name || 'BookingFast',
        '{{current_date}}': new Date().toLocaleDateString('fr-FR'),
        '{{current_time}}': new Date().toLocaleTimeString('fr-FR'),
        ...emailData.templateVariables
      };

      Object.entries(defaultVariables).forEach(([key, value]) => {
        const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
        finalSubject = finalSubject.replace(regex, String(value));
        finalHtmlContent = finalHtmlContent.replace(regex, String(value));
        finalTextContent = finalTextContent.replace(regex, String(value));
      });

      // Envoyer via l'API Brevo directement
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': settings.brevo_api_key
        },
        body: JSON.stringify({
          sender: {
            name: settings.brevo_sender_name || settings.business_name || 'BookingFast',
            email: settings.brevo_sender_email
          },
          to: [{
            email: emailData.toEmail,
            name: emailData.toName
          }],
          subject: finalSubject,
          htmlContent: finalHtmlContent,
          textContent: finalTextContent || finalHtmlContent.replace(/<[^>]*>/g, '')
        })
      });

      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.json();
        throw new Error(errorData.message || 'Erreur Brevo');
      }

      console.log('✅ Email envoyé via Brevo côté client');
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      return false;
    }
  }

  static async sendPaymentLinkEmail(userId: string, booking: any, paymentLink: string) {
    const subject = `Lien de paiement pour votre réservation - ${booking.service?.name || 'Service'}`;
    
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0f9ff;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">💳 Lien de paiement</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Finalisez votre réservation</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">Bonjour {{client_firstname}},</h2>
    
    <p style="color: #666; line-height: 1.6;">
      Votre réservation est presque finalisée ! Cliquez sur le lien ci-dessous pour effectuer le paiement :
    </p>
    
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #334155; margin-top: 0;">Détails de votre réservation</h3>
      <p><strong>Service :</strong> {{service_name}}</p>
      <p><strong>Date :</strong> {{booking_date}}</p>
      <p><strong>Heure :</strong> {{booking_time}}</p>
      <p><strong>Montant à payer :</strong> {{remaining_amount}}€</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
        💳 Payer maintenant
      </a>
    </div>
    
    <p style="color: #666; line-height: 1.6; font-size: 14px;">
      <strong>⏰ Important :</strong> Ce lien expire dans 30 minutes pour votre sécurité.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 14px;">
    <p>{{business_name}} - Paiement sécurisé</p>
  </div>
</div>`;

    const textContent = `Bonjour {{client_firstname}},

Votre réservation est presque finalisée !

Détails de votre réservation :
- Service : {{service_name}}
- Date : {{booking_date}}
- Heure : {{booking_time}}
- Montant à payer : {{remaining_amount}}€

Lien de paiement : ${paymentLink}

Important : Ce lien expire dans 30 minutes.

{{business_name}}`;

    const templateVariables = {
      '{{client_firstname}}': booking.client_firstname || '',
      '{{client_lastname}}': booking.client_name || '',
      '{{service_name}}': booking.service?.name || 'Service',
      '{{booking_date}}': new Date(booking.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      '{{booking_time}}': booking.time?.slice(0, 5) || '',
      '{{total_amount}}': booking.total_amount?.toFixed(2) || '0.00',
      '{{remaining_amount}}': (booking.total_amount - (booking.payment_amount || 0)).toFixed(2)
    };

    return await this.sendEmail({
      userId,
      toEmail: booking.client_email,
      toName: `${booking.client_firstname} ${booking.client_name}`,
      subject,
      htmlContent,
      textContent,
      templateVariables
    });
  }
}