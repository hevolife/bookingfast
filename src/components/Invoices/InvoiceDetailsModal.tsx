import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Invoice } from '../../types';
import { FileText, Calendar, User, Mail, Phone, Download, RefreshCw, Eye } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';
import { SendInvoiceModal } from './SendInvoiceModal';
import { InvoicePreviewModal } from './InvoicePreviewModal';

interface InvoiceDetailsModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailsModal({ invoice, isOpen, onClose }: InvoiceDetailsModalProps) {
  const { companyInfo } = useCompanyInfo();
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice, companyInfo);
  };

  const handleResend = () => {
    setShowSendModal(true);
  };

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Détails de la facture" size="lg">
        <div className="space-y-6">
          {/* En-tête facture */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-black text-purple-600">{invoice.invoice_number}</div>
                <div className="text-sm text-gray-600">Facture</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-gray-900">{invoice.total_ttc.toFixed(2)}€</div>
                <div className="text-sm text-gray-600">TTC</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Date de facture</div>
                <div className="font-bold text-gray-900">{formatDate(invoice.invoice_date)}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Date d'échéance</div>
                <div className="font-bold text-gray-900">{formatDate(invoice.due_date)}</div>
              </div>
            </div>
          </div>

          {/* Informations client */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Client
            </h3>
            <div className="space-y-2">
              <div className="font-bold text-gray-900">
                {invoice.client?.firstname} {invoice.client?.lastname}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-blue-500" />
                {invoice.client?.email}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-green-500" />
                {invoice.client?.phone}
              </div>
            </div>
          </div>

          {/* Lignes de facture */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détails
            </h3>
            <div className="space-y-3">
              {invoice.items?.map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-green-300">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">{item.description}</div>
                    <div className="font-bold text-gray-900">{item.total_ttc.toFixed(2)}€</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} × {item.unit_price_ht.toFixed(2)}€ HT (TVA {item.tva_rate}%)
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-green-300 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Sous-total HT:</span>
                <span className="font-bold">{invoice.subtotal_ht.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>TVA:</span>
                <span className="font-bold">{invoice.total_tva.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xl font-black text-green-600">
                <span>Total TTC:</span>
                <span>{invoice.total_ttc.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Fermer
            </Button>
            <Button 
              onClick={handlePreview}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Aperçu
            </Button>
            {(invoice.status === 'sent' || invoice.status === 'paid') && (
              <Button 
                onClick={handleResend}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Renvoyer
              </Button>
            )}
            <Button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>
      </Modal>

      {showSendModal && (
        <SendInvoiceModal
          invoice={invoice}
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
        />
      )}

      {showPreviewModal && (
        <InvoicePreviewModal
          invoice={invoice}
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  );
}
