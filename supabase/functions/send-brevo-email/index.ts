import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 Début envoi email Brevo...')
    
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lire les données de la requête
    const { 
      user_id, 
      to_email, 
      to_name, 
      subject, 
      html_content, 
      text_content,
      template_variables = {}
    } = await req.json()

    if (!user_id || !to_email || !subject) {
      console.error('❌ Paramètres manquants')
      return new Response(
        JSON.stringify({ error: 'user_id, to_email and subject are required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📧 Envoi email à:', to_email)
    console.log('📧 Sujet:', subject)

    // Récupérer la configuration Brevo de l'utilisateur
    const { data: settings, error: settingsError } = await supabaseClient
      .from('business_settings')
      .select('brevo_enabled, brevo_api_key, brevo_sender_email, brevo_sender_name, business_name')
      .eq('user_id', user_id)
      .single()

    if (settingsError || !settings) {
      console.error('❌ Paramètres non trouvés:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Business settings not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (!settings.brevo_enabled || !settings.brevo_api_key) {
      console.error('❌ Brevo non configuré')
      return new Response(
        JSON.stringify({ error: 'Brevo not configured' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('✅ Configuration Brevo trouvée')
    console.log('📧 Expéditeur:', settings.brevo_sender_email)

    // Remplacer les variables dans le contenu
    let finalHtmlContent = html_content || ''
    let finalTextContent = text_content || ''
    let finalSubject = subject

    // Variables par défaut
    const defaultVariables = {
      '{{business_name}}': settings.business_name || 'BookingPro',
      '{{current_date}}': new Date().toLocaleDateString('fr-FR'),
      '{{current_time}}': new Date().toLocaleTimeString('fr-FR')
    }

    // Fusionner avec les variables personnalisées
    const allVariables = { ...defaultVariables, ...template_variables }

    // Remplacer les variables
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
      finalSubject = finalSubject.replace(regex, String(value))
      finalHtmlContent = finalHtmlContent.replace(regex, String(value))
      finalTextContent = finalTextContent.replace(regex, String(value))
    })

    // S'assurer que le contenu texte n'est pas vide
    if (!finalTextContent || finalTextContent.trim() === '') {
      if (finalHtmlContent && finalHtmlContent.trim() !== '') {
        // Générer du texte à partir du HTML
        finalTextContent = finalHtmlContent
          .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
      }
      
      if (!finalTextContent || finalTextContent.trim() === '') {
        finalTextContent = 'Contenu de l\'email.'
      }
    }

    console.log('📧 Contenu préparé:')
    console.log('  - Sujet:', finalSubject)
    console.log('  - HTML:', finalHtmlContent.length, 'caractères')
    console.log('  - Texte:', finalTextContent.length, 'caractères')

    // Préparer les données pour l'API Brevo
    const emailData = {
      sender: {
        name: settings.brevo_sender_name || settings.business_name || 'BookingPro',
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
    }

    console.log('📧 Données email Brevo:', {
      sender: emailData.sender,
      to: emailData.to,
      subject: emailData.subject,
      hasHtml: !!emailData.htmlContent,
      hasText: !!emailData.textContent
    })

    // Envoyer l'email via l'API Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': settings.brevo_api_key
      },
      body: JSON.stringify(emailData)
    })

    const responseText = await brevoResponse.text()
    console.log('📧 Réponse Brevo status:', brevoResponse.status)
    console.log('📧 Réponse Brevo body:', responseText)

    if (!brevoResponse.ok) {
      let errorMessage = 'Erreur envoi email'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorMessage
        console.error('❌ Erreur Brevo détaillée:', errorData)
      } catch (parseError) {
        console.error('❌ Erreur parsing réponse Brevo:', parseError)
        errorMessage = `HTTP ${brevoResponse.status}: ${responseText}`
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: brevoResponse.status,
          details: responseText
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    let brevoResult
    try {
      brevoResult = JSON.parse(responseText)
    } catch (parseError) {
      console.warn('⚠️ Impossible de parser la réponse Brevo, mais status OK')
      brevoResult = { messageId: 'unknown' }
    }

    console.log('✅ Email envoyé avec succès via Brevo')
    console.log('📧 Message ID:', brevoResult.messageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: brevoResult.messageId,
        provider: 'brevo',
        to: to_email,
        subject: finalSubject
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur envoi email Brevo:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Unexpected error during email sending'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
