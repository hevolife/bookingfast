import React from 'react';
import { CheckCircle, Calendar, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { StripeWebhookHandler } from '../../lib/stripeWebhookHandler';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  
  React.useEffect(() => {
    let processed = false;
    
    if (sessionId && !processed) {
      (async () => {
        console.log('💳 TRAITEMENT PAIEMENT SIMPLE - SESSION:', sessionId);
        
        processed = true; // Marquer comme traité immédiatement
        
        try {
          console.log('📊 Paramètres URL:', {
            sessionId,
            amount: searchParams.get('amount'),
            email: searchParams.get('email'),
            date: searchParams.get('date'),
            time: searchParams.get('time'),
            booking_id: bookingId
          });
          
          // Préparer les données de session pour le traitement
          const sessionData = {
            id: sessionId,
            payment_status: 'paid',
            amount_total: parseFloat(searchParams.get('amount') || '0') * 100, // Convertir en centimes
            customer_details: {
              email: searchParams.get('email')
            },
            metadata: {
              date: searchParams.get('date'),
              time: searchParams.get('time'),
              booking_date: searchParams.get('date'),
              booking_time: searchParams.get('time'),
              booking_id: bookingId || 'unknown'
            }
          };
          
          console.log('📊 DONNÉES SESSION PRÉPARÉES:', sessionData);
          
          await StripeWebhookHandler.processStripeWebhook(sessionData);
          console.log('✅ PAIEMENT TRAITÉ AVEC SUCCÈS');
          
          // Déclencher rafraîchissements multiples
          setTimeout(() => {
            console.log('🔄 RAFRAÎCHISSEMENT 1/3');
            window.dispatchEvent(new CustomEvent('refreshBookings'));
          }, 500);
          
          setTimeout(() => {
            console.log('🔄 RAFRAÎCHISSEMENT 2/3');
            window.dispatchEvent(new CustomEvent('refreshBookings'));
          }, 1500);
          
          setTimeout(() => {
            console.log('🔄 RAFRAÎCHISSEMENT 3/3');
            window.dispatchEvent(new CustomEvent('refreshBookings'));
          }, 3000);
          
        } catch (error) {
          // Rafraîchissement simple
          console.error('❌ ERREUR TRAITEMENT PAIEMENT:', error);
          // Rafraîchissement de secours
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshBookings'));
          }, 1000);
        }
      })();
    }
  }, [sessionId, searchParams, bookingId]);

  const handleBackToHome = () => {
    // Fermer la fenêtre ou rediriger vers une page de confirmation
    try {
      if (window.opener) {
        window.close();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      setTimeout(() => {
        console.error('❌ Erreur paiement:', error);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Paiement réussi !
        </h1>
        
        <p className="text-gray-600 text-lg mb-6">
          Votre acompte a été payé avec succès ! Votre réservation est maintenant confirmée.
        </p>

        {/* Confirmation Details */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Réservation confirmée</span>
          </div>
          {bookingId && (
            <div className="text-green-600 text-sm mt-2">
              Référence: {bookingId.slice(0, 8)}...
            </div>
          )}
        </div>

        {/* Information sur le solde */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="text-blue-700 text-sm">
            <div className="font-medium mb-1">📧 Email de confirmation envoyé</div>
            <div>Le solde restant sera à régler lors de votre rendez-vous</div>
          </div>
        </div>
        {/* Back Button */}
        <button
          onClick={handleBackToHome}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Fermer
        </button>
      </div>
    </div>
  );
}