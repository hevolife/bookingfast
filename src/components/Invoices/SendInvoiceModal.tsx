import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Invoice } from '../../types';
import { Mail, Loader2 } from 'lucide-react';
import { sendInvoiceEmail } from '../../utils/emailService';
import { supabase } from '../../lib/supabase';

interface SendInvoiceModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export function SendInvoiceModal({ invoice, isOpen, onClose }: SendInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Envoyer le devis par email">
      <div className="space-y-6">
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
    </Modal>
  );
}
