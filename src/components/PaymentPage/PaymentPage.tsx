import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, Clock, User, Mail, Calendar, AlertTriangle, XCircle, Timer } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ClientPaymentManager } from '../../lib/clientPayments';

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Récupérer les paramètres de l'URL
  const amount = searchParams.get('amount');
  const service = searchParams.get('service');
  const client = searchParams.get('client');
  const email = searchParams.get('email');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const expiresAt = searchParams.get('expires');

  // Vérifier si le lien de paiement existe encore
  useEffect(() => {
    const checkPaymentLinkStatus = async () => {
      if (!email || !date || !time) {
        setCheckingStatus(false);
        return;
      }

      if (!isSupabaseConfigured()) {
        // En mode démo, toujours autoriser l'accès
        setCheckingStatus(false);
        return;
      }

      try {
        // Rechercher la réservation correspondante
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('transactions, payment_status, total_amount, payment_amount')
          .eq('client_email', email)
          .eq('date', date)
          .eq('time', time)
          .single();

        if (error || !booking) {
          console.warn('⚠️ Réservation non trouvée, mais autorisation du lien pour les clients externes');
          // Ne pas bloquer pour les clients externes - ils peuvent avoir un lien valide
          setCheckingStatus(false);
          return;
        }

        // Si la réservation est déjà entièrement payée, marquer comme supprimé
        if (booking.payment_status === 'completed' && 
            (booking.payment_amount || 0) >= booking.total_amount) {
          console.log('💰 Réservation déjà entièrement payée');
          setIsDeleted(true);
          setCheckingStatus(false);
          return;
        }
        
        // Sinon, autoriser l'accès au lien de paiement
        console.log('✅ Lien de paiement autorisé');
      } catch (error) {
        console.warn('⚠️ Erreur vérification lien, mais autorisation pour les clients externes:', error);
        // En cas d'erreur, autoriser quand même l'accès pour les clients externes
      } finally {
        setCheckingStatus(false);
      }
    };

    checkPaymentLinkStatus();
  }, [email, date, time, amount]);
  // Calculer le temps restant
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = parseInt(expiresAt);
      const remaining = Math.max(0, expiry - now);
      
      setTimeLeft(remaining);
      setIsExpired(remaining === 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Formater le temps restant
  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeLeftReadable = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Affichage pendant la vérification
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vérification...</h1>
          <p className="text-gray-600">Vérification du statut du lien de paiement</p>
        </div>
      </div>
    );
  }

  // Vérifier si le lien a été supprimé
  if (isDeleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Lien non disponible
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Ce lien de paiement n'est plus disponible. Il a peut-être été supprimé ou la réservation a été modifiée.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <h4 className="font-bold text-blue-800 mb-2">💡 Que faire ?</h4>
            <ul className="text-blue-700 text-sm space-y-1 text-left">
              <li>• Contactez l'établissement pour un nouveau lien</li>
              <li>• Vérifiez si votre réservation est toujours valide</li>
              <li>• Un nouveau lien peut être généré si nécessaire</li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }
  // Vérifier si le lien est valide
  if (!amount || !service || !client || !email || !date || !time) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Lien invalide</h1>
          <p className="text-gray-600 text-lg mb-6">
            Ce lien de paiement n'est pas valide ou a été corrompu.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Retour à la réservation
          </button>
        </div>
      </div>
    );
  }

  // Vérifier si le lien a expiré
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Lien expiré</h1>
          <p className="text-gray-600 text-lg mb-6">
            Ce lien de paiement a expiré. Veuillez contacter l'établissement pour obtenir un nouveau lien.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    if (isExpired || processing) return;

    setProcessing(true);
    try {
      console.log('🔄 Début du processus de paiement');
      console.log('📊 Données de paiement:', {
        amount: parseFloat(amount),
        service_name: service,
        customer_email: email,
        metadata: {
          client: client,
          email: email,
          date: date,
          time: time,
        }
      });

      if (isSupabaseConfigured()) {
        // Récupérer les paramètres Stripe depuis la base
        const { data: settings, error: settingsError } = await supabase
          .from('business_settings')
          .select('stripe_enabled, stripe_public_key, stripe_secret_key')
          .limit(1)
          .single();

        if (settingsError || !settings?.stripe_enabled) {
          throw new Error('Configuration Stripe non trouvée');
        }

        // Utiliser le gestionnaire de paiements côté client
        await ClientPaymentManager.createCheckoutSession({
          amount: parseFloat(amount),
          serviceName: service,
          customerEmail: email,
          metadata: {
            client: client,
            email: email,
            date: date,
            time: time,
          },
          settings
        });
      } else {
        // Mode démo - simuler le paiement
        console.log('🎭 Mode démo - simulation du paiement');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Rediriger vers la page de succès
        window.location.href = '/payment-success';
        return;
      }
    } catch (error) {
      console.error('Erreur de paiement:', error);
      alert(`Une erreur est survenue lors du paiement: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Veuillez réessayer.`);
    } finally {
      setProcessing(false);
    }
  };

  const isWarning = timeLeft > 0 && timeLeft < 5 * 60 * 1000; // Moins de 5 minutes

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header avec compteur */}
        <div className={`p-6 text-white relative overflow-hidden ${
          isWarning 
            ? 'bg-gradient-to-r from-orange-500 to-red-500' 
            : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Paiement sécurisé</h1>
                  <p className="text-white/80 text-sm">Powered by Stripe</p>
                </div>
              </div>
            </div>

            {/* Compteur d'expiration */}
            {expiresAt && timeLeft > 0 && (
              <div className={`bg-white/20 backdrop-blur-sm rounded-xl p-3 ${
                isWarning ? 'animate-pulse' : ''
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isWarning ? 'Attention ! ' : ''}Temps restant : {formatTimeLeft(timeLeft)}
                  </span>
                </div>
                {isWarning && (
                  <div className="text-center text-xs mt-1 text-white/90">
                    Ce lien expire bientôt !
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Détails de la réservation */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">{client}</div>
                <div className="text-sm text-gray-600">{email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium text-gray-900">{service}</div>
                <div className="text-sm text-gray-600">
                  {new Date(date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })} à {time}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Montant à payer</span>
                <span className="text-2xl font-bold text-green-600">{parseFloat(amount).toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Avertissement si proche de l'expiration */}
          {isWarning && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="text-orange-800 text-sm">
                <div className="font-medium">Attention !</div>
                <div>Ce lien de paiement expire dans moins de 5 minutes.</div>
              </div>
            </div>
          )}

          {/* Bouton de paiement */}
          <button
            onClick={handlePayment}
            disabled={isExpired || processing}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 ${
              isExpired
                ? 'bg-gray-400 cursor-not-allowed'
                : processing
                ? 'bg-blue-400 cursor-wait'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Traitement en cours...
              </>
            ) : isExpired ? (
              <>
                <XCircle className="w-5 h-5" />
                Lien expiré
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Payer {parseFloat(amount).toFixed(2)}€
              </>
            )}
          </button>

          {/* Informations de sécurité */}
          <div className="mt-6 text-center">
            <div className="text-xs text-gray-500 mb-2">
              🔒 Paiement sécurisé par Stripe
            </div>
            <div className="text-xs text-gray-400">
              Vos informations de paiement sont protégées par un chiffrement SSL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}