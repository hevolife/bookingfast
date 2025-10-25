import jsPDF from 'jspdf';
import { Invoice } from '../types';

export function generateInvoicePDF(invoice: Invoice, companyInfo?: any) {
  const doc = new jsPDF();
  
  // Configuration des couleurs
  const primaryColor = [147, 51, 234]; // Purple
  const secondaryColor = [100, 100, 100]; // Gray
  const accentColor = [236, 72, 153]; // Pink

  let yPos = 20;

  // ===== EN-TÊTE =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 20, 33);

  // ===== INFORMATIONS ENTREPRISE (si disponibles) =====
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
    
    if (companyInfo.email) {
      doc.text(`Email: ${companyInfo.email}`, 20, yPos);
      yPos += 4;
    }
    
    if (companyInfo.phone) {
      doc.text(`Tél: ${companyInfo.phone}`, 20, yPos);
      yPos += 4;
    }
  }

  // ===== INFORMATIONS CLIENT =====
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
    
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, 120, yPos);
      yPos += 4;
    }
  }

  // ===== DATES =====
  yPos = Math.max(yPos, companyInfo ? 95 : 75);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 170, 15, 'F');
  
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date de facture:', 25, yPos + 6);
  doc.text('Date d\'échéance:', 25, yPos + 11);
  
  doc.setFont('helvetica', 'normal');
  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');
  doc.text(formatDate(invoice.invoice_date), 70, yPos + 6);
  doc.text(formatDate(invoice.due_date), 70, yPos + 11);

  // ===== TABLEAU DES PRODUITS =====
  yPos += 25;
  
  // En-tête du tableau
  doc.setFillColor(...primaryColor);
  doc.rect(20, yPos, 170, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, yPos + 6);
  doc.text('Qté', 120, yPos + 6);
  doc.text('Prix HT', 140, yPos + 6);
  doc.text('TVA', 160, yPos + 6);
  doc.text('Total TTC', 175, yPos + 6);
  
  yPos += 10;

  // Lignes du tableau
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  
  invoice.items?.forEach((item, index) => {
    // Alternance de couleur de fond
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, yPos, 170, 8, 'F');
    }
    
    doc.text(item.description.substring(0, 40), 25, yPos + 5);
    doc.text(item.quantity.toString(), 120, yPos + 5);
    doc.text(`${item.unit_price_ht.toFixed(2)}€`, 140, yPos + 5);
    doc.text(`${item.tva_rate}%`, 160, yPos + 5);
    doc.text(`${item.total_ttc.toFixed(2)}€`, 175, yPos + 5);
    
    yPos += 8;
    
    // Nouvelle page si nécessaire
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
  });

  // ===== TOTAUX =====
  yPos += 10;
  
  // Cadre des totaux
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.rect(120, yPos, 70, 25);
  
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  
  // Sous-total HT
  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total HT:', 125, yPos + 6);
  doc.text(`${invoice.subtotal_ht.toFixed(2)}€`, 180, yPos + 6, { align: 'right' });
  
  // TVA
  doc.text('TVA:', 125, yPos + 12);
  doc.text(`${invoice.total_tva.toFixed(2)}€`, 180, yPos + 12, { align: 'right' });
  
  // Total TTC
  doc.setFillColor(...accentColor);
  doc.rect(120, yPos + 15, 70, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL TTC:', 125, yPos + 21);
  doc.text(`${invoice.total_ttc.toFixed(2)}€`, 185, yPos + 21, { align: 'right' });

  // ===== NOTES =====
  if (invoice.notes) {
    yPos += 35;
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(invoice.notes, 170);
    doc.text(splitNotes, 20, yPos + 5);
  }

  // ===== PIED DE PAGE =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...primaryColor);
    doc.rect(0, 287, 210, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Facture ${invoice.invoice_number} - Page ${i}/${pageCount}`,
      105,
      292,
      { align: 'center' }
    );
  }

  // Télécharger le PDF
  doc.save(`Facture_${invoice.invoice_number}.pdf`);
}
