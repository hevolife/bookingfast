import jsPDF from 'jspdf';
import { Invoice } from '../types';

export function generateInvoicePDF(invoice: Invoice, companyInfo?: any) {
  const doc = createInvoicePDF(invoice, companyInfo);
  doc.save(`Facture_${invoice.invoice_number}.pdf`);
}

export async function generateInvoicePDFBlob(invoice: Invoice, companyInfo?: any): Promise<Blob> {
  const doc = createInvoicePDF(invoice, companyInfo);
  return doc.output('blob');
}

export async function generateInvoicePDFDataUrl(invoice: Invoice, companyInfo?: any): Promise<string> {
  console.log('📄 Création PDF avec companyInfo:', companyInfo);
  const doc = createInvoicePDF(invoice, companyInfo);
  return doc.output('dataurlstring');
}

function createInvoicePDF(invoice: Invoice, companyInfo?: any): jsPDF {
  console.log('🏗️ Construction PDF, companyInfo reçu:', companyInfo);
  
  const doc = new jsPDF();
  
  // Configuration des couleurs modernes
  const primaryColor = [147, 51, 234]; // Purple
  const primaryLight = [196, 181, 253]; // Light purple
  const accentColor = [236, 72, 153]; // Pink
  const textDark = [31, 41, 55]; // Gray-800
  const textMedium = [107, 114, 128]; // Gray-500
  const bgLight = [249, 250, 251]; // Gray-50
  const white = [255, 255, 255];

  let yPos = 20;

  // ===== EN-TÊTE AVEC DÉGRADÉ =====
  // Fond principal
  doc.setFillColor(...primaryColor);
  doc.roundedRect(0, 0, 210, 50, 0, 0, 'F');
  
  // Accent décoratif
  doc.setFillColor(...accentColor);
  doc.circle(200, 10, 15, 'F');
  doc.setFillColor(...primaryLight);
  doc.circle(190, 45, 10, 'F');
  
  // Titre FACTURE
  doc.setTextColor(...white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 28);
  
  // Numéro de facture
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 20, 40);

  // ===== SECTION ÉMETTEUR ET CLIENT =====
  yPos = 65;
  
  // Carte Émetteur
  console.log('🏢 Affichage émetteur, companyInfo:', companyInfo);
  
  doc.setFillColor(...bgLight);
  doc.roundedRect(15, yPos, 85, 50, 3, 3, 'F');
  
  doc.setTextColor(...textMedium);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉMETTEUR', 20, yPos + 6);
  
  let emitterYPos = yPos + 12;
  
  if (companyInfo) {
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    
    if (companyInfo.company_name) {
      console.log('✅ Nom entreprise:', companyInfo.company_name);
      doc.text(companyInfo.company_name, 20, emitterYPos);
      emitterYPos += 6;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (companyInfo.address) {
      console.log('✅ Adresse:', companyInfo.address);
      const addressLines = doc.splitTextToSize(companyInfo.address, 75);
      doc.text(addressLines, 20, emitterYPos);
      emitterYPos += addressLines.length * 4;
    }
    
    if (companyInfo.postal_code || companyInfo.city) {
      const location = `${companyInfo.postal_code || ''} ${companyInfo.city || ''}`.trim();
      console.log('✅ Localisation:', location);
      doc.text(location, 20, emitterYPos);
      emitterYPos += 4;
    }
    
    if (companyInfo.siret) {
      console.log('✅ SIRET:', companyInfo.siret);
      doc.setTextColor(...textMedium);
      doc.text(`SIRET: ${companyInfo.siret}`, 20, emitterYPos);
      emitterYPos += 4;
      doc.setTextColor(...textDark);
    }
    
    if (companyInfo.email) {
      console.log('✅ Email:', companyInfo.email);
      doc.text(companyInfo.email, 20, emitterYPos);
      emitterYPos += 4;
    }
    
    if (companyInfo.phone) {
      console.log('✅ Téléphone:', companyInfo.phone);
      doc.text(companyInfo.phone, 20, emitterYPos);
    }
  } else {
    console.warn('⚠️ Aucune information entreprise disponible');
    doc.setTextColor(...textMedium);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Informations non renseignées', 20, emitterYPos);
  }

  // Carte Client
  yPos = 65;
  doc.setFillColor(...bgLight);
  doc.roundedRect(110, yPos, 85, 50, 3, 3, 'F');
  
  doc.setTextColor(...textMedium);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', 115, yPos + 6);
  
  doc.setTextColor(...textDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  yPos += 12;
  
  if (invoice.client) {
    doc.text(`${invoice.client.firstname} ${invoice.client.lastname}`, 115, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (invoice.client.email) {
      doc.text(invoice.client.email, 115, yPos);
      yPos += 4;
    }
    
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, 115, yPos);
    }
  }

  // ===== DATES =====
  yPos = 125;
  doc.setFillColor(...primaryLight);
  doc.roundedRect(15, yPos, 180, 18, 3, 3, 'F');
  
  doc.setTextColor(...textDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date de facture:', 20, yPos + 7);
  doc.text('Date d\'échéance:', 20, yPos + 14);
  
  doc.setFont('helvetica', 'normal');
  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');
  doc.text(formatDate(invoice.invoice_date), 70, yPos + 7);
  doc.text(formatDate(invoice.due_date), 70, yPos + 14);

  // ===== TABLEAU DES PRODUITS =====
  yPos += 28;
  
  // En-tête du tableau avec coins arrondis
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, 180, 12, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 20, yPos + 8);
  doc.text('Qté', 125, yPos + 8, { align: 'center' });
  doc.text('Prix HT', 145, yPos + 8, { align: 'center' });
  doc.text('TVA', 165, yPos + 8, { align: 'center' });
  doc.text('Total TTC', 185, yPos + 8, { align: 'right' });
  
  yPos += 12;

  // Lignes du tableau avec espacement
  doc.setTextColor(...textDark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  invoice.items?.forEach((item, index) => {
    // Carte pour chaque ligne
    if (index % 2 === 0) {
      doc.setFillColor(...bgLight);
    } else {
      doc.setFillColor(...white);
    }
    doc.roundedRect(15, yPos, 180, 10, 2, 2, 'F');
    
    // Description (tronquée si trop longue)
    const description = item.description.length > 45 
      ? item.description.substring(0, 42) + '...' 
      : item.description;
    doc.text(description, 20, yPos + 6);
    
    // Quantité
    doc.text(item.quantity.toString(), 125, yPos + 6, { align: 'center' });
    
    // Prix HT
    doc.text(`${item.unit_price_ht.toFixed(2)}€`, 145, yPos + 6, { align: 'center' });
    
    // TVA
    doc.text(`${item.tva_rate}%`, 165, yPos + 6, { align: 'center' });
    
    // Total TTC
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.total_ttc.toFixed(2)}€`, 185, yPos + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    
    yPos += 12;
    
    // Nouvelle page si nécessaire
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
  });

  // ===== TOTAUX AVEC DESIGN MODERNE =====
  yPos += 5;
  
  // Carte des totaux
  doc.setFillColor(...bgLight);
  doc.roundedRect(110, yPos, 85, 35, 3, 3, 'F');
  
  doc.setTextColor(...textDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Sous-total HT
  doc.text('Sous-total HT:', 115, yPos + 8);
  doc.text(`${invoice.subtotal_ht.toFixed(2)}€`, 190, yPos + 8, { align: 'right' });
  
  // TVA
  doc.text('TVA:', 115, yPos + 16);
  doc.text(`${invoice.total_tva.toFixed(2)}€`, 190, yPos + 16, { align: 'right' });
  
  // Total TTC avec accent
  doc.setFillColor(...accentColor);
  doc.roundedRect(110, yPos + 20, 85, 15, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL TTC:', 115, yPos + 30);
  doc.setFontSize(14);
  doc.text(`${invoice.total_ttc.toFixed(2)}€`, 190, yPos + 30, { align: 'right' });

  // ===== NOTES =====
  if (invoice.notes) {
    yPos += 45;
    
    // Vérifier si on a assez d'espace
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(...bgLight);
    doc.roundedRect(15, yPos, 180, 30, 3, 3, 'F');
    
    doc.setTextColor(...textMedium);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 20, yPos + 6);
    
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(invoice.notes, 170);
    doc.text(splitNotes, 20, yPos + 12);
  }

  // ===== PIED DE PAGE MODERNE =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Barre de pied de page
    doc.setFillColor(...primaryColor);
    doc.roundedRect(0, 282, 210, 15, 0, 0, 'F');
    
    // Accent décoratif
    doc.setFillColor(...accentColor);
    doc.circle(10, 289.5, 3, 'F');
    doc.circle(200, 289.5, 3, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Facture ${invoice.invoice_number} - Page ${i}/${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  console.log('✅ PDF créé avec succès');
  return doc;
}
