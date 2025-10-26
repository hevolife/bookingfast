import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Eye, Send, Check, X, Edit, Trash2, RefreshCw, Palette } from 'lucide-react';
import { useInvoices } from '../../hooks/useInvoices';
import { Invoice } from '../../types';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { SendInvoiceModal } from './SendInvoiceModal';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { PDFCustomizationModal } from './PDFCustomizationModal';

export function InvoicesPage() {
  const { invoices, loading, fetchInvoices, updateInvoice, deleteInvoice } = useInvoices();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Invoice['status']) => {
    const badges = {
      draft: { label: 'Brouillon', class: 'bg-gray-100 text-gray-700' },
      sent: { label: 'Envoyée', class: 'bg-blue-100 text-blue-700' },
      paid: { label: 'Payée', class: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annulée', class: 'bg-red-100 text-red-700' }
    };

    const badge = badges[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.class}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      await updateInvoice(invoice.id, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });
    } catch (error) {
      alert('Erreur lors du marquage comme payée');
    }
  };

  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSendModal(true);
  };

  const handleResendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSendModal(true);
  };

  const handlePreviewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPreviewModal(true);
  };

  // ✅ CALLBACK pour forcer le refresh après création
  const handleInvoiceCreated = async () => {
    console.log('🔄 handleInvoiceCreated - Force refresh');
    await fetchInvoices();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mobile-optimized">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Factures
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Gérez vos factures clients ({filteredInvoices.length})
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowCustomizationModal(true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Palette className="w-5 h-5" />
              <span className="hidden sm:inline">Personnaliser PDF</span>
            </Button>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nouvelle facture</span>
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="paid">Payée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-purple-600">
                {invoices.reduce((sum, inv) => sum + inv.total_ttc, 0).toFixed(2)}€
              </div>
              <div className="text-xs text-purple-700">Total facturé</div>
            </div>
          </div>
        </div>

        {/* Liste des factures */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
          {filteredInvoices.length > 0 ? (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">N° Facture</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Client</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Montant TTC</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Statut</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map((invoice, index) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 transition-colors animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-purple-600">{invoice.invoice_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {invoice.client?.firstname} {invoice.client?.lastname}
                          </div>
                          <div className="text-sm text-gray-600">{invoice.client?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDate(invoice.invoice_date)}</div>
                          <div className="text-xs text-gray-600">Échéance: {formatDate(invoice.due_date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{invoice.total_ttc.toFixed(2)}€</div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreviewInvoice(invoice)}
                              className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                              title="Aperçu"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowDetailsModal(true);
                              }}
                              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              title="Détails"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => handleSendInvoice(invoice)}
                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                title="Envoyer"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'paid') && (
                              <button
                                onClick={() => handleResendInvoice(invoice)}
                                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                title="Renvoyer"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            {invoice.status === 'sent' && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice)}
                                className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                                title="Marquer comme payée"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden space-y-4 p-4">
                {filteredInvoices.map((invoice, index) => (
                  <div
                    key={invoice.id}
                    className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border border-purple-200 p-4 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-purple-600">{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-600">{formatDate(invoice.invoice_date)}</div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="mb-3">
                      <div className="font-medium text-gray-900">
                        {invoice.client?.firstname} {invoice.client?.lastname}
                      </div>
                      <div className="text-sm text-gray-600">{invoice.client?.email}</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-bold text-gray-900">{invoice.total_ttc.toFixed(2)}€</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors mobile-tap-target"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mobile-tap-target"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleSendInvoice(invoice)}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mobile-tap-target"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'paid') && (
                          <button
                            onClick={() => handleResendInvoice(invoice)}
                            className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors mobile-tap-target"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {invoice.status === 'sent' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice)}
                            className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors mobile-tap-target"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
              <p className="text-gray-500 mb-4">Créez votre première facture</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Nouvelle facture
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onInvoiceCreated={handleInvoiceCreated}
        />
      )}

      {showDetailsModal && selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {showSendModal && selectedInvoice && (
        <SendInvoiceModal
          invoice={selectedInvoice}
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {showPreviewModal && selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {showCustomizationModal && (
        <PDFCustomizationModal
          isOpen={showCustomizationModal}
          onClose={() => setShowCustomizationModal(false)}
        />
      )}
    </>
  );
}
