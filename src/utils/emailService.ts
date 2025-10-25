import { supabase } from '../lib/supabase';
import { Invoice } from '../types';
import jsPDF from 'jspdf';

export async function sendInvoiceEmail(invoice: Invoice): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase non configuré');
  }

  // Récupérer l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  // Récupérer les paramètres Brevo depuis business_settings (mêmes que les workflows)
  const { data: businessSettings, error: settingsError } = await supabase
    .from('business_settings')
    .select('brevo_enabled, brevo_api_key, brevo_sender_email, brevo_sender_name, business_name')
    .eq('user_id', user.id)
    .single();

  if (settingsError || !businessSettings) {
    throw new Error('Paramètres non trouvés. Veuillez configurer Brevo dans Paramètres > Général.');
  }

  // Vérifier que Brevo est configuré
  if (!businessSettings.brevo_enabled || !businessSettings.brevo_api_key || !businessSettings.brevo_sender_email) {
    throw new Error('Brevo non configuré. Veuillez activer et configurer Brevo dans Paramètres > Général.');
  }

  // Récupérer les infos de l'entreprise pour le PDF et l'email
  const { data: companyInfo } = await supabase
    .from('company_info')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Générer le PDF en base64
  const pdfBase64 = await generateInvoicePDFBase64(invoice, companyInfo);

  // Préparer le contenu HTML de l'email
  const businessName = businessSettings.business_name || companyInfo?.company_name || 'BookingPro';
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 10px; margin-top: 20px; }
        .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { color: #6b7280; }
        .detail-value { font-weight: bold; color: #111827; }
        .total { font-size: 24px; color: #9333ea; font-weight: bold; }
        .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Nouvelle Facture</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${invoice.invoice_number}</p>
        </div>
        
        <div class="content">
          <p>Bonjour ${invoice.client?.firstname} ${invoice.client?.lastname},</p>
          
          <p>Veuillez trouver ci-joint votre facture.</p>
          
          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Numéro de facture:</span>
              <span class="detail-value">${invoice.invoice_number}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date d'échéance:</span>
              <span class="detail-value">${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="detail-row" style="border-bottom: none; padding-top: 20px;">
              <span class="detail-label" style="font-size: 18px;">Montant total TTC:</span>
              <span class="total">${invoice.total_ttc.toFixed(2)}€</span>
            </div>
          </div>
          
          <p>Le PDF de la facture est joint à cet email.</p>
          
          <p>Cordialement,<br>${businessName}</p>
        </div>
        
        <div class="footer">
          <p>${businessName}</p>
          ${companyInfo?.email ? `<p>${companyInfo.email}</p>` : ''}
          ${companyInfo?.phone ? `<p>${companyInfo.phone}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  // Appeler l'Edge Function pour envoyer l'email (même fonction que les workflows)
  const { data, error } = await supabase.functions.invoke('send-brevo-email', {
    body: {
      brevo_api_key: businessSettings.brevo_api_key,
      brevo_sender_email: businessSettings.brevo_sender_email,
      brevo_sender_name: businessSettings.brevo_sender_name || businessName,
      to_email: invoice.client?.email,
      to_name: `${invoice.client?.firstname} ${invoice.client?.lastname}`,
      subject: `Facture ${invoice.invoice_number}`,
      html_content: emailHtml,
      text_content: `Facture ${invoice.invoice_number} - Montant: ${invoice.total_ttc.toFixed(2)}€`,
      attachments: [
        {
          name: `Facture_${invoice.invoice_number}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        }
      ]
    }
  });

  if (error) {
    console.error('Erreur Edge Function:', error);
    throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erreur lors de l\'envoi de l\'email');
  }
}

async function generateInvoicePDFBase64(invoice: Invoice, companyInfo?: any): Promise<string> {
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [147, 51, 234]; // Purple
  const secondaryColor = [100, 100, 100]; // Gray
  const accentColor = [236, 72, 153]; // Pink

  let yPos = 20;

  // EN-TÊTE
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 20, 33);

  // INFORMATIONS ENTREPRISE
  yPos = 50;
  if (companyInfo) {
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ÉMETTEUR', 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPos += 6;
    
    if (companyInfo.company_name) {
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo.company_name, 20, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
    }
    
    if (companyInfo.address) {
      doc.text(companyInfo.address, 20, yPos);
      yPos += 4;
    }
    
    if (companyInfo.postal_code || companyInfo.city) {
      doc.text(`${companyInfo.postal_code || ''} ${companyInfo.city || ''}`, 20, yPos);
      yPos += 4;
    }
    
    if (companyInfo.siret) {
      doc.text(`SIRET: ${companyInfo.siret}`, 20, yPos);
      yPos += 4;
    }
  }

  // INFORMATIONS CLIENT
  yPos = 50;
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', 120, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  yPos += 6;
  
  if (invoice.client) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${invoice.client.firstname} ${invoice.client.lastname}`, 120, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
    if (invoice.client.email) {
      doc.text(invoice.client.email, 120, yPos);
      yPos += 4;
    }
  }

  // DATES
  yPos = Math.max(yPos, companyInfo ? 85 : 70);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 170, 12, 'F');
  
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 25, yPos + 6);
  doc.text('Échéance:', 25, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');
  doc.text(formatDate(invoice.invoice_date), 60, yPos + 6);
  doc.text(formatDate(invoice.due_date), 60, yPos + 10);

  // TABLEAU PRODUITS
  yPos += 20;
  doc.setFillColor(...primaryColor);
  doc.rect(20, yPos, 170, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, yPos + 5);
  doc.text('Qté', 120, yPos + 5);
  doc.text('Prix HT', 140, yPos + 5);
  doc.text('Total TTC', 170, yPos + 5);
  
  yPos += 8;

  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  
  invoice.items?.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, yPos, 170, 7, 'F');
    }
    
    doc.text(item.description.substring(0, 35), 25, yPos + 4);
    doc.text(item.quantity.toString(), 120, yPos + 4);
    doc.text(`${item.unit_price_ht.toFixed(2)}€`, 140, yPos + 4);
    doc.text(`${item.total_ttc.toFixed(2)}€`, 170, yPos + 4);
    
    yPos += 7;
  });

  // TOTAUX
  yPos += 10;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.rect(120, yPos, 70, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total HT:', 125, yPos + 5);
  doc.text(`${invoice.subtotal_ht.toFixed(2)}€`, 185, yPos + 5, { align: 'right' });
  
  doc.text('TVA:', 125, yPos + 10);
  doc.text(`${invoice.total_tva.toFixed(2)}€`, 185, yPos + 10, { align: 'right' });
  
  doc.setFillColor(...accentColor);
  doc.rect(120, yPos + 12, 70, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL TTC:', 125, yPos + 17);
  doc.text(`${invoice.total_ttc.toFixed(2)}€`, 185, yPos + 17, { align: 'right' });

  // Convertir en base64
  const pdfOutput = doc.output('datauristring');
  return pdfOutput.split(',')[1]; // Retourner seulement la partie base64
}
