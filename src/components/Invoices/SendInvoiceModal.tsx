import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Invoice } from '../../types';
import { Mail, Loader2 } from 'lucide-react';
import { sendInvoiceEmail } from '../../utils/emailService';
import { supabase } from '../../lib/supabase';
import { isPWA } from '../../utils/pwaDetection';

interface SendInvoiceModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export function SendInvoiceModal({ invoice, isOpen, onClose }: SendInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const mobileModalTop = isPWA() ? '120px' : '60px';

  const handleSend = async () => {
    if (!invoice.client?.email) {
      alert('Le client n\'a pas d\'adresse email');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      console.log('📧 Envoi email pour:', invoice.id);

      // 1. Envoyer l'email
      await sendInvoiceEmail(invoice);
      console.log('✅ Email envoyé');

      // 2. Mettre à jour le statut à "sent"
      console.log('🔄 Mise à jour du statut à "sent"...');
      const { error: updateError } = await supabase!
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour statut:', updateError);
        throw updateError;
      }

      console.log('✅ Statut mis à jour à "sent"');

      setMessage('✅ Email envoyé avec succès !');
      setTimeout(() => {
        onClose();
        // Force refresh de la page
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      setMessage(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-hidden sm:rounded-3xl shadow-2xl transform animate-slideUp">
            {/* Header Desktop */}
            <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top sm:rounded-t-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              </div>
              
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                        Envoyer le devis par email
                      </h2>
                      <p className="text-white/80 mt-1">{invoice.quote_number || invoice.invoice_number}</p>
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
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-bold text-gray-900">Destinataire</div>
                    <div className="text-sm text-gray-600">{invoice.client?.email}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Devis:</span>
                    <span className="font-bold">{invoice.quote_number || invoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant:</span>
                    <span className="font-bold">{invoice.total_ttc.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-bold">
                      {invoice.client?.firstname} {invoice.client?.lastname}
                    </span>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl ${
                  message.includes('✅') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  onClick={onClose} 
                  disabled={loading}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
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
            className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-4 py-4 flex items-center justify-between z-10"
          >
            <div>
              <h2 className="text-lg font-bold text-white">Envoyer le devis par email</h2>
              <p className="text-white/80 text-sm">{invoice.quote_number || invoice.invoice_number}</p>
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
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Destinataire</div>
                    <div className="text-xs text-gray-600">{invoice.client?.email}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Devis:</span>
                    <span className="font-bold">{invoice.quote_number || invoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant:</span>
                    <span className="font-bold">{invoice.total_ttc.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-bold">
                      {invoice.client?.firstname} {invoice.client?.lastname}
                    </span>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-sm ${
                  message.includes('✅') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg text-sm disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
