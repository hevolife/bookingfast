import React, { useEffect, useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Invoice } from '../../types';
import { X, Download } from 'lucide-react';
import { generateInvoicePDFDataUrl } from '../../utils/pdfGenerator';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { isPWA } from '../../utils/pwaDetection';

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

  const mobileModalTop = isPWA() ? '120px' : '80px';

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

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white w-full sm:max-w-4xl max-h-[90vh] overflow-hidden sm:rounded-3xl shadow-2xl transform animate-slideUp">
            {/* Header Desktop */}
            <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top sm:rounded-t-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-yellow-600 to-amber-600"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              </div>
              
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                        Aperçu de la facture
                      </h2>
                      <p className="text-white/80 mt-1">{invoice.invoice_number}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="group relative p-3 text-white hover:bg-white/20 rounded-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 backdrop-blur-sm"
                    aria-label="Fermer"
                  >
                    <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
            </div>

            {/* Contenu Desktop */}
            <div className="p-6 space-y-4">
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
                    <button
                      onClick={onClose}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Fermer
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">Impossible de générer l'aperçu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Modal SOUS LA NAVBAR AVEC HEADER FIXE */}
      <div className="sm:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
        
        {/* Modal Container - z-50 pour passer au-dessus du backdrop */}
        <div 
          className="fixed left-0 right-0 bottom-0 z-50 flex flex-col bg-white"
          style={{ 
            top: mobileModalTop
          }}
        >
          {/* Header FIXE - Position absolute pour rester en haut */}
          <div 
            className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-600 via-yellow-600 to-amber-600 px-4 py-4 flex items-center justify-between z-10"
          >
            <div>
              <h2 className="text-lg font-bold text-white">Aperçu de la facture</h2>
              <p className="text-white/80 text-sm">{invoice.invoice_number}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenu avec padding-top pour compenser le header fixe */}
          <div 
            className="overflow-y-auto flex-1"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              paddingTop: '72px', // Hauteur du header
              paddingBottom: '80px'
            }}
          >
            <div className="p-4 space-y-4">
              {(loading || companyLoading) ? (
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <LoadingSpinner size="lg" />
                  <p className="text-gray-600 text-sm">
                    {companyLoading ? 'Chargement des informations...' : 'Génération du PDF en cours...'}
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4 text-sm">{error}</p>
                  <button
                    onClick={generatePreview}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg text-sm"
                  >
                    Réessayer
                  </button>
                </div>
              ) : pdfDataUrl ? (
                <>
                  <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                    <iframe
                      src={pdfDataUrl}
                      className="w-full h-[500px]"
                      title="Aperçu facture PDF"
                      style={{ border: 'none' }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={onClose}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg text-sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Fermer
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg text-sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-sm">Impossible de générer l'aperçu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
