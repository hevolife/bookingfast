import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Invoice } from '../../types';
import { FileText, Calendar, User, Mail, Phone, Download, RefreshCw, Eye, Plus, CreditCard, Banknote, Building2, FileText as FileTextIcon, Trash2, Undo2 } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';
import { useInvoicePayments } from '../../hooks/useInvoicePayments';
import { SendInvoiceModal } from './SendInvoiceModal';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { AddPaymentModal } from './AddPaymentModal';
import { RefundPaymentModal } from './RefundPaymentModal';

interface InvoiceDetailsModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

const paymentMethodIcons = {
  especes: { icon: Banknote, label: 'Espèces', color: 'text-green-600' },
  carte: { icon: CreditCard, label: 'Carte bancaire', color: 'text-blue-600' },
  virement: { icon: Building2, label: 'Virement', color: 'text-purple-600' },
  cheque: { icon: FileTextIcon, label: 'Chèque', color: 'text-orange-600' }
};

export function InvoiceDetailsModal({ invoice, isOpen, onClose }: InvoiceDetailsModalProps) {
  const { companyInfo } = useCompanyInfo();
  const { payments, deletePayment, getTotalPaid, fetchPayments } = useInvoicePayments(invoice.id);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const totalPaid = getTotalPaid();
  const remainingAmount = invoice.total_ttc - totalPaid;
  const isFullyPaid = remainingAmount <= 0;

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

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Supprimer ce paiement ?')) return;

    try {
      await deletePayment(paymentId);
      alert('✅ Paiement supprimé');
    } catch (error) {
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handlePaymentAdded = () => {
    fetchPayments();
  };

  const handleRefund = () => {
    setShowRefundModal(true);
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

          {/* Statut de paiement */}
          <div className={`rounded-2xl p-6 border-2 ${
            isFullyPaid 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
              : totalPaid > 0
              ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300'
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className={`text-2xl font-black ${
                  isFullyPaid ? 'text-green-600' : totalPaid > 0 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {isFullyPaid ? '✅ Payée' : totalPaid > 0 ? '⚠️ Partiellement payée' : '❌ Non payée'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {totalPaid.toFixed(2)}€ / {invoice.total_ttc.toFixed(2)}€
                </div>
              </div>
              <div className="flex gap-2">
                {!isFullyPaid && (
                  <Button
                    onClick={() => setShowAddPaymentModal(true)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un paiement
                  </Button>
                )}
                {totalPaid > 0 && (
                  <Button
                    onClick={handleRefund}
                    variant="secondary"
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Rembourser
                  </Button>
                )}
              </div>
            </div>

            {remainingAmount > 0 && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-bold">Reste à payer:</span>
                  <span className="text-2xl font-black text-orange-600">
                    {remainingAmount.toFixed(2)}€
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Liste des paiements */}
          {payments.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Paiements reçus ({payments.length})
              </h3>
              <div className="space-y-3">
                {payments.map((payment) => {
                  const methodInfo = paymentMethodIcons[payment.payment_method];
                  const Icon = methodInfo.icon;
                  return (
                    <div key={payment.id} className="bg-white rounded-xl p-4 border border-blue-300">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${methodInfo.color}`} />
                          <div>
                            <div className="font-bold text-gray-900">{methodInfo.label}</div>
                            <div className="text-sm text-gray-600">{formatDate(payment.payment_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-black text-green-600">
                            {payment.amount.toFixed(2)}€
                          </div>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {payment.reference && (
                        <div className="text-sm text-gray-600 mt-2">
                          Réf: {payment.reference}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-sm text-gray-600 mt-1 italic">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

      {showAddPaymentModal && (
        <AddPaymentModal
          invoice={invoice}
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          onPaymentAdded={handlePaymentAdded}
        />
      )}

      {showRefundModal && (
        <RefundPaymentModal
          invoice={invoice}
          totalPaid={totalPaid}
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onRefundAdded={handlePaymentAdded}
        />
      )}
    </>
  );
}
