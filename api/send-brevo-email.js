const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

app.post('/api/send-brevo-email', async (req, res) => {
  try {
    console.log('📧 Début envoi email Brevo...');
    
    const supabaseClient = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { 
      user_id, 
      to_email, 
      to_name, 
      subject, 
      html_content, 
      text_content,
      template_variables = {}
    } = req.body;

    if (!user_id || !to_email || !subject) {
      console.error('❌ Paramètres manquants');
      return res.status(400).json({ error: 'user_id, to_email and subject are required' });
    }

    // Récupérer la configuration Brevo
    const { data: settings, error: settingsError } = await supabaseClient
      .from('business_settings')
      .select('brevo_enabled, brevo_api_key, brevo_sender_email, brevo_sender_name, business_name')
      .eq('user_id', user_id)
      .single();

    if (settingsError || !settings) {
      console.error('❌ Paramètres non trouvés:', settingsError);
      return res.status(404).json({ error: 'Business settings not found' });
    }

    if (!settings.brevo_enabled || !settings.brevo_api_key) {
      console.error('❌ Brevo non configuré');
      return res.status(400).json({ error: 'Brevo not configured' });
    }

    // Remplacer les variables
    const defaultVariables = {
      '{{business_name}}': settings.business_name || 'BookingFast',
      '{{current_date}}': new Date().toLocaleDateString('fr-FR'),
      '{{current_time}}': new Date().toLocaleTimeString('fr-FR')
    };

    const allVariables = { ...defaultVariables, ...template_variables };

    let finalSubject = subject;
    let finalHtmlContent = html_content || '';
    let finalTextContent = text_content || '';

    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      finalSubject = finalSubject.replace(regex, String(value));
      finalHtmlContent = finalHtmlContent.replace(regex, String(value));
      finalTextContent = finalTextContent.replace(regex, String(value));
    });

    // Générer du texte depuis HTML si nécessaire
    if (!finalTextContent || finalTextContent.trim() === '') {
      if (finalHtmlContent && finalHtmlContent.trim() !== '') {
        finalTextContent = finalHtmlContent
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      if (!finalTextContent || finalTextContent.trim() === '') {
        finalTextContent = 'Contenu de l\'email.';
      }
    }

    // Préparer les données pour Brevo
    const emailData = {
      sender: {
        name: settings.brevo_sender_name || settings.business_name || 'BookingFast',
        email: settings.brevo_sender_email
      },
      to: [
        {
          email: to_email,
          name: to_name || to_email.split('@')[0]
        }
      ],
      subject: finalSubject,
      htmlContent: finalHtmlContent,
      textContent: finalTextContent
    };

    // Envoyer via Brevo
    const fetch = (await import('node-fetch')).default;
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': settings.brevo_api_key
      },
      body: JSON.stringify(emailData)
    });

    const responseText = await brevoResponse.text();

    if (!brevoResponse.ok) {
      let errorMessage = 'Erreur envoi email';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${brevoResponse.status}: ${responseText}`;
      }
      
      return res.status(400).json({ 
        error: errorMessage,
        status: brevoResponse.status
      });
    }

    let brevoResult;
    try {
      brevoResult = JSON.parse(responseText);
    } catch (parseError) {
      brevoResult = { messageId: 'unknown' };
    }

    console.log('✅ Email envoyé avec succès via Brevo');

    res.json({ 
      success: true, 
      messageId: brevoResult.messageId,
      provider: 'brevo',
      to: to_email,
      subject: finalSubject
    });

  } catch (error) {
    console.error('❌ Erreur envoi email Brevo:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Unexpected error during email sending'
    });
  }
});

module.exports = app;