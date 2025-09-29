import { EmailWorkflow, EmailTemplate } from '../types/email';
import { Booking } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuth } from '../contexts/AuthContext';

interface WorkflowLog {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: string;
  bookingId: string;
  clientEmail: string;
  status: 'success' | 'error';
  message: string;
  timestamp: string;
}

// Remplacer les variables dans le contenu
const replaceVariables = (content: string, booking: Booking): string => {
  const variables: Record<string, string> = {
    '{{client_firstname}}': booking.client_firstname || '',
    '{{client_lastname}}': booking.client_name || '',
    '{{client_email}}': booking.client_email || '',
    '{{client_phone}}': booking.client_phone || '',
    '{{service_name}}': booking.service?.name || 'Service',
    '{{service_description}}': booking.service?.description || '',
    '{{service_price}}': booking.service?.price_ttc?.toFixed(2) || '0.00',
    '{{service_duration}}': booking.duration_minutes?.toString() || '0',
    '{{booking_date}}': new Date(booking.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    '{{booking_time}}': booking.time?.slice(0, 5) || '',
    '{{booking_quantity}}': booking.quantity?.toString() || '1',
    '{{total_amount}}': booking.total_amount?.toFixed(2) || '0.00',
    '{{payment_amount}}': (booking.payment_amount || 0).toFixed(2),
    '{{remaining_amount}}': (booking.total_amount - (booking.payment_amount || 0)).toFixed(2),
    '{{payment_link}}': booking.payment_link || '#',
    '{{business_name}}': 'BookingFast',
    '{{current_date}}': new Date().toLocaleDateString('fr-FR'),
    '{{current_time}}': new Date().toLocaleTimeString('fr-FR')
  };

  let result = content;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return result;
};

// Vérifier si les conditions d'un workflow sont remplies
const checkWorkflowConditions = (workflow: EmailWorkflow, booking: Booking): boolean => {
  if (!workflow.conditions || workflow.conditions.length === 0) {
    return true; // Pas de conditions = toujours vrai
  }

  return workflow.conditions.every(condition => {
    let fieldValue: any;
    
    switch (condition.field) {
      case 'booking_status':
        fieldValue = booking.booking_status;
        break;
      case 'payment_status':
        fieldValue = booking.payment_status;
        break;
      case 'service_name':
        fieldValue = booking.service?.name;
        break;
      case 'total_amount':
        fieldValue = booking.total_amount;
        break;
      case 'client_email':
        fieldValue = booking.client_email;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      default:
        return false;
    }
  });
};

// Envoyer un email via Brevo
const sendEmail = async (
  to: string, 
  subject: string, 
  htmlContent: string, 
  textContent: string, 
  userId: string,
  templateVariables: Record<string, string> = {}
): Promise<boolean> => {
  console.log('📧 DÉBUT ENVOI EMAIL');
  console.log('📧 À:', to);
  console.log('📧 Sujet:', subject);
  console.log('📧 User ID:', userId);
  
  if (!isSupabaseConfigured()) {
    console.log('📧 SIMULATION ENVOI EMAIL - Mode démo');
    console.log('📧 Contenu HTML:', htmlContent.length, 'caractères');
    console.log('📧 Contenu texte:', textContent.length, 'caractères');
    console.log('✅ EMAIL SIMULÉ AVEC SUCCÈS');
    return true; // Simuler le succès en mode démo
  }

  try {
    console.log('📧 ENVOI EMAIL RÉEL VIA BREVO...');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log('🔗 URL Supabase:', supabaseUrl);
    const response = await fetch('/api/send-brevo-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        to_email: to,
        to_name: to.split('@')[0],
        subject: subject,
        html_content: htmlContent,
        text_content: textContent,
        template_variables: templateVariables
      }),
    });

    console.log('📧 Statut réponse Brevo:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email envoyé avec succès via Brevo:', result.messageId);
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ Erreur envoi email Brevo:', errorData);
      console.error('❌ Statut:', response.status);
      console.error('❌ Détails:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ ERREUR RÉSEAU ENVOI EMAIL:', error);
    return false;
  }
};

// Fonction principale pour déclencher un workflow
export const triggerWorkflow = async (trigger: string, booking: Booking, userId?: string): Promise<void> => {
  if (!userId) {
    console.log('⚠️ Pas d\'utilisateur connecté, workflow ignoré');
    return;
  }
  console.log('🚀 DÉBUT DÉCLENCHEMENT WORKFLOW');
  console.log('📋 Trigger:', trigger);
  console.log('📋 Réservation ID:', booking.id);
  console.log('📋 Client:', booking.client_email);
  console.log('📋 Service:', booking.service?.name || 'Service inconnu');
  console.log('📋 User ID:', userId);
  
  if (!isSupabaseConfigured()) {
    console.log('📧 MODE DÉMO - SIMULATION WORKFLOW');
    console.log('✅ Workflow simulé avec succès pour:', trigger);
    return;
  }

  try {
    // Charger les workflows actifs pour ce déclencheur
    console.log('🔍 Recherche workflows pour trigger:', trigger, 'user_id:', userId);
    const { data: workflows, error: workflowsError } = await supabase
      .from('email_workflows')
      .select('*')
      .eq('user_id', userId)
      .eq('trigger', trigger)
      .eq('active', true);

    if (workflowsError) {
      console.error('❌ Erreur chargement workflows:', workflowsError);
      return;
    }

    console.log('📊 Workflows trouvés:', workflows?.length || 0);
    if (workflows && workflows.length > 0) {
      console.log('📋 Liste workflows:', workflows.map(w => ({ id: w.id, name: w.name, template_id: w.template_id })));
    }

    if (!workflows || workflows.length === 0) {
      console.log('ℹ️ Aucun workflow actif pour le déclencheur:', trigger);
      return;
    }

    // Charger les templates
    const templateIds = workflows.map(w => w.template_id);
    console.log('🔍 Chargement templates:', templateIds);
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select('*')
      .in('id', templateIds);

    if (templatesError) {
      console.error('❌ Erreur chargement templates:', templatesError);
      return;
    }
    
    console.log('📊 Templates trouvés:', templates?.length || 0);
    if (templates && templates.length > 0) {
      console.log('📋 Liste templates:', templates.map(t => ({ id: t.id, name: t.name })));
    }
  
    // Filtrer les workflows qui correspondent aux conditions
    const matchingWorkflows = workflows.filter(workflow => 
      checkWorkflowConditions(workflow, booking)
    );
  
    console.log('🔍 Workflows correspondants aux conditions:', matchingWorkflows.length);
  
    for (const workflow of matchingWorkflows) {
      try {
        console.log('⚡ EXÉCUTION WORKFLOW:', workflow.name);
        console.log('📧 Template ID:', workflow.template_id);
      
        // Trouver le template
        const template = templates?.find(t => t.id === workflow.template_id);
        if (!template) {
          console.error(`❌ Template non trouvé: ${workflow.template_id}`);
          console.log('📋 Templates disponibles:', templates?.map(t => t.id) || []);
          continue; // Passer au workflow suivant au lieu d'échouer
        }
        
        console.log('✅ Template trouvé:', template.name);
      
        // Attendre le délai si spécifié
        if (workflow.delay && workflow.delay > 0) {
          console.log('⏳ Attente de', workflow.delay, 'secondes...');
          // En production, vous utiliseriez un système de queue
          // Ici on simule juste le délai
          await new Promise(resolve => setTimeout(resolve, workflow.delay * 1000)); // Secondes pour la démo
        }
      
        // Préparer les variables pour le template
        const templateVariables = {
          '{{client_firstname}}': booking.client_firstname || '',
          '{{client_lastname}}': booking.client_name || '',
          '{{client_email}}': booking.client_email || '',
          '{{client_phone}}': booking.client_phone || '',
          '{{service_name}}': booking.service?.name || 'Service',
          '{{service_description}}': booking.service?.description || '',
          '{{service_price}}': booking.service?.price_ttc?.toFixed(2) || '0.00',
          '{{service_duration}}': booking.duration_minutes?.toString() || '0',
          '{{booking_date}}': new Date(booking.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          '{{booking_time}}': booking.time?.slice(0, 5) || '',
          '{{booking_quantity}}': booking.quantity?.toString() || '1',
          '{{total_amount}}': booking.total_amount?.toFixed(2) || '0.00',
          '{{payment_amount}}': (booking.payment_amount || 0).toFixed(2),
          '{{remaining_amount}}': (booking.total_amount - (booking.payment_amount || 0)).toFixed(2),
          '{{payment_link}}': booking.payment_link || '#',
          '{{business_name}}': 'BookingPro'
        };
        
        console.log('📧 Variables template préparées:', Object.keys(templateVariables).length, 'variables');
      
        // Envoyer l'email
        console.log('📤 Envoi email à:', booking.client_email);
        const success = await sendEmail(
          booking.client_email, 
          template.subject, 
          template.html_content, 
          template.text_content,
          userId,
          templateVariables
        );
        
        // Mettre à jour les statistiques du workflow
        if (success) {
          console.log('📊 Mise à jour statistiques workflow...');
          await supabase
            .from('email_workflows')
            .update({
              sent_count: workflow.sent_count + 1
            })
            .eq('id', workflow.id);
        }
        
        console.log(success ? '✅' : '❌', 'Workflow', workflow.name, success ? 'réussi' : 'échoué');
        
      } catch (error) {
        console.error('❌ Erreur workflow', workflow.name, ':', error);
          // Ne pas faire échouer la génération du lien pour une erreur de workflow
        // Continuer avec les autres workflows même si un échoue
      }
    }
  } catch (error) {
    console.error('❌ Erreur générale workflow:', error);
  }
  
  console.log('🏁 FIN EXÉCUTION WORKFLOWS POUR:', trigger);
};

// Fonction pour envoyer un email manuel
export const sendManualEmail = async (
  userId: string,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  templateVariables: Record<string, string> = {}
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('📧 SIMULATION ENVOI EMAIL MANUEL');
    return true;
  }

  try {
    const response = await fetch('/api/send-brevo-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        to_email: toEmail,
        to_name: toName,
        subject: subject,
        html_content: htmlContent,
        text_content: textContent,
        template_variables: templateVariables
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email manuel envoyé avec succès:', result.messageId);
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ Erreur envoi email manuel:', errorData);
      throw new Error(errorData.error || 'Erreur envoi email');
    }
  } catch (error) {
    console.error('❌ Erreur réseau envoi email manuel:', error);
    throw error;
  }
};

// Fonction pour envoyer un email de lien de paiement
export const sendPaymentLinkEmail = async (
  userId: string,
  booking: Booking,
  paymentLink: string
): Promise<boolean> => {
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
    '{{remaining_amount}}': (booking.total_amount - (booking.payment_amount || 0)).toFixed(2),
    '{{payment_link}}': paymentLink
  };

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
      <a href="{{payment_link}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
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

Lien de paiement : {{payment_link}}

Important : Ce lien expire dans 30 minutes.

{{business_name}}`;

  return await sendEmail(
    booking.client_email,
    subject,
    htmlContent,
    textContent,
    userId,
    templateVariables
  );
};

// Fonction pour envoyer un email de confirmation
export const sendConfirmationEmail = async (
  userId: string,
  booking: Booking
): Promise<boolean> => {
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
    '{{service_duration}}': booking.duration_minutes?.toString() || '0',
    '{{booking_quantity}}': booking.quantity?.toString() || '1',
    '{{total_amount}}': booking.total_amount?.toFixed(2) || '0.00'
  };

  const subject = `Confirmation de votre réservation - ${booking.service?.name || 'Service'}`;
  
  const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">{{business_name}}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Confirmation de réservation</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">Bonjour {{client_firstname}},</h2>
    
    <p style="color: #666; line-height: 1.6;">
      Votre réservation a été confirmée avec succès ! Voici les détails :
    </p>
    
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #334155; margin-top: 0;">Détails de votre réservation</h3>
      <p><strong>Service :</strong> {{service_name}}</p>
      <p><strong>Date :</strong> {{booking_date}}</p>
      <p><strong>Heure :</strong> {{booking_time}}</p>
      <p><strong>Durée :</strong> {{service_duration}} minutes</p>
      <p><strong>Participants :</strong> {{booking_quantity}}</p>
      <p><strong>Montant total :</strong> {{total_amount}}€</p>
    </div>
    
    <p style="color: #666; line-height: 1.6;">
      Nous avons hâte de vous accueillir ! Si vous avez des questions, n'hésitez pas à nous contacter.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 14px;">
    <p>{{business_name}} - {{current_date}}</p>
  </div>
</div>`;

  const textContent = `Bonjour {{client_firstname}},

Votre réservation a été confirmée avec succès !

Détails de votre réservation :
- Service : {{service_name}}
- Date : {{booking_date}}
- Heure : {{booking_time}}
- Durée : {{service_duration}} minutes
- Participants : {{booking_quantity}}
- Montant total : {{total_amount}}€

Nous avons hâte de vous accueillir !

{{business_name}}`;

  return await sendEmail(
    booking.client_email,
    subject,
    htmlContent,
    textContent,
    userId,
    templateVariables
  );
};

// Fonction pour récupérer les logs de workflows
export const getWorkflowLogs = (userId: string): WorkflowLog[] => {
  console.log('ℹ️ Logs workflow en mémoire uniquement');
  return [];
};

// Fonction pour vider les logs
export const clearWorkflowLogs = (userId: string): void => {
  console.log('ℹ️ Nettoyage logs en mémoire');
};