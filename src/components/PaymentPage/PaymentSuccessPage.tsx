import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Calendar, Mail, User, ArrowRight } from 'lucide-react';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const service = searchParams.get('service');
  const client = searchParams.get('client');
  const email = searchParams.get('email');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // Redirection automatique après 10 secondes
    const timer = setTimeout(() => {
      window.close();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Paiement réussi !
        </h1>

        <p className="text-gray-600 text-lg mb-8">
          Votre paiement a été traité avec succès. Vous allez recevoir un email de confirmation.
        </p>

        {/* Détails de la réservation */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 text-left">
          <h3 className="font-bold text-green-800 mb-4 text-center">Détails de votre réservation</h3>
          
          <div className="space-y-3">
            {service && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Service</div>
                  <div className="font-medium text-gray-900">{service}</div>
                </div>
              </div>
            )}

            {client && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Client</div>
                  <div className="font-medium text-gray-900">{client}</div>
                </div>
              </div>
            )}

            {email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium text-gray-900">{email}</div>
                </div>
              </div>
            )}

            {date && time && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Date et heure</div>
                  <div className="font-medium text-gray-900">
                    {new Date(date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })} à {time}
                  </div>
                </div>
              </div>
            )}

            {amount && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center text-green-600 font-bold">€</div>
                <div>
                  <div className="text-sm text-gray-600">Montant payé</div>
                  <div className="font-bold text-green-600 text-lg">{parseFloat(amount).toFixed(2)}€</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.close()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            Fermer
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-sm text-gray-500">
            Cette fenêtre se fermera automatiquement dans 10 secondes
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Un email de confirmation a été envoyé à <strong>{email}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
