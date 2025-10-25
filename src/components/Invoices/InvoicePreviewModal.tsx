import React, { useEffect, useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Invoice } from '../../types';
import { X, Download } from 'lucide-react';
import { generateInvoicePDFDataUrl } from '../../utils/pdfGenerator';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface InvoicePreviewModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePreviewModal({ invoice, isOpen, onClose }: InvoicePreviewModalProps) {
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !companyLoading) {
      console.log('📋 Company Info:', companyInfo);
      generatePreview();
    }

    return () => {
      setPdfDataUrl(null);
    };
  }, [isOpen, invoice, companyInfo, companyLoading]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Génération du PDF preview...');
      console.log('🏢 Infos entreprise:', companyInfo);
      
      const dataUrl = await generateInvoicePDFDataUrl(invoice, companyInfo);
      console.log('✅ PDF généré, taille:', dataUrl.length, 'caractères');
      
      setPdfDataUrl(dataUrl);
    } catch (error) {
      console.error('❌ Erreur génération preview:', error);
      setError('Erreur lors de la génération du preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfDataUrl) {
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.download = `Facture_${invoice.invoice_number}.pdf`;
      link.click();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aperçu de la facture" size="xl">
      <div className="space-y-4">
        {(loading || companyLoading) ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">
              {companyLoading ? 'Chargement des informations...' : 'Génération du PDF en cours...'}
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={generatePreview} variant="secondary">
              Réessayer
            </Button>
          </div>
        ) : pdfDataUrl ? (
          <>
            <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
              <iframe
                src={pdfDataUrl}
                className="w-full h-[600px]"
                title="Aperçu facture PDF"
                style={{ border: 'none' }}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Fermer
              </Button>
              <Button 
                onClick={handleDownload}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Impossible de générer l'aperçu</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
