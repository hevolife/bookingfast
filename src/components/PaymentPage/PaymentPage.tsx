import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, User, Mail, Calendar, AlertTriangle, XCircle, Timer, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export function PaymentPage() {
  console.log('🎯 PaymentPage - COMPONENT MOUNTED');
  console.log('🌐 URL:', window.location.href);
  console.log('📍 Pathname:', window.location.pathname);
  console.log('🔍 Search:', window.location.search);

  // 🎯 PARSER L'URL MANUELLEMENT
  const searchParams = new URLSearchParams(window.location.search);
  
  console.log('📦 URL Parameters:');
  console.log('  - amount:', searchParams.get('amount'));
  console.log('  - service:', searchParams.get('service'));
  console.log('  - client:', searchParams.get('client'));
  console.log('  - email:', searchParams.get('email'));
  console.log('  - date:', searchParams.get('date'));
  console.log('  - time:', searchParams.get('time'));
  console.log('  - expires:', searchParams.get('expires'));
  console.log('  - user_id:', searchParams.get('user_id'));

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  console.log('🔄 Initial State:');
  console.log('  - checkingStatus:', checkingStatus);
  console.log('  - isDeleted:', isDeleted);
  console.log('  - isExpired:', isExpired);

  // Récupérer les paramètres de l'URL
  const amount = searchParams.get('amount');
  const service = searchParams.get('service');
  const client = searchParams.get('client');
  const email = searchParams.get('email');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const expiresAt = searchParams.get('expires');
  const userId = searchParams.get('user_id');

  // Vérifier si le lien de paiement existe encore
  useEffect(() => {
    console.log('🔍 useEffect - checkPaymentLinkStatus STARTED');
    
    const checkPaymentLinkStatus = async () => {
      console.log('⏳ checkPaymentLinkStatus - FUNCTION CALLED');
      
      if (!email || !date || !time) {
        console.log('⚠️ Missing required params - SKIPPING CHECK');
        console.log('  - email:', email);
        console.log('  - date:', date);
        console.log('  - time:', time);
        setCheckingStatus(false);
        return;
      }

      const supabaseConfigured = isSupabaseConfigured();
      console.log('🔧 Supabase configured:', supabaseConfigured);

      if (!supabaseConfigured) {
        console.log('🎭 DEMO MODE - Skipping Supabase check');
        setCheckingStatus(false);
        return;
      }

      try {
        console.log('🔍 Querying Supabase for booking...');
        console.log('  - email:', email);
        console.log('  - date:', date);
        console.log('  - time:', time);

        const { data: booking, error } = await supabase!
          .from('bookings')
          .select('transactions, payment_status, total_amount, payment_amount')
          .eq('client_email', email)
          .eq('date', date)
          .eq('time', time)
          .single();

        console.log('📊 Supabase Response:');
        console.log('  - error:', error);
        console.log('  - booking:', booking);

        if (error || !booking) {
          console.warn('⚠️ Booking not found - Allowing external client access');
          setCheckingStatus(false);
          return;
        }

        console.log('✅ Booking found:', booking);

        // Si la réservation est déjà entièrement payée
        if (booking.payment_status === 'completed' && 
            (booking.payment_amount || 0) >= booking.total_amount) {
          console.log('💰 Booking fully paid - Setting isDeleted=true');
          setIsDeleted(true);
          setCheckingStatus(false);
          return;
        }
        
        // Vérifier si le montant demandé a déjà été payé
        const requestedAmount = parseFloat(amount || '0');
        const alreadyPaid = (booking.payment_amount || 0);
        
        console.log('💵 Payment check:');
        console.log('  - requestedAmount:', requestedAmount);
        console.log('  - alreadyPaid:', alreadyPaid);
        
        if (requestedAmount > 0 && alreadyPaid >= requestedAmount) {
          console.log('✅ Amount already paid - Setting isDeleted=true');
          setIsDeleted(true);
          setCheckingStatus(false);
          return;
        }
        
        // Vérifier les transactions Stripe
        const stripeTransactions = booking.transactions?.filter(t => 
          t.method === 'stripe' && 
          t.status === 'completed' &&
          Math.abs(t.amount - requestedAmount) < 0.01
        ) || [];
        
        console.log('💳 Stripe transactions:', stripeTransactions);
        
        if (stripeTransactions.length > 0) {
          console.log('✅ Stripe transaction found - Setting isDeleted=true');
          setIsDeleted(true);
          setCheckingStatus(false);
          return;
        }

        console.log('✅ All checks passed - Payment link valid');
        
      } catch (error) {
        console.error('❌ Error checking payment link:', error);
      } finally {
        console.log('🏁 checkPaymentLinkStatus - FINALLY BLOCK');
        setCheckingStatus(false);
      }
    };

    checkPaymentLinkStatus();
  }, [email, date, time, amount]);

  // Calculer le temps restant
  useEffect(() => {
    console.log('⏰ useEffect - Timer STARTED');
    console.log('  - expiresAt:', expiresAt);
    
    if (!expiresAt) {
      console.log('⚠️ No expiration time - SKIPPING TIMER');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = parseInt(expiresAt);
      const remaining = Math.max(0, expiry - now);
      
      console.log('⏱️ Timer update:');
      console.log('  - now:', now);
      console.log('  - expiry:', expiry);
      console.log('  - remaining:', remaining);
      
      setTimeLeft(remaining);
      setIsExpired(remaining === 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      console.log('🛑 Timer cleanup');
      clearInterval(interval);
    };
  }, [expiresAt]);

  // Formater le temps restant
  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  console.log('🎨 RENDER - Current State:');
  console.log('  - checkingStatus:', checkingStatus);
  console.log('  - isDeleted:', isDeleted);
  console.log('  - isExpired:', isExpired);
  console.log('  - processing:', processing);

  // Affichage pendant la vérification
  if (checkingStatus) {
    console.log('⏳ RENDERING: Checking status screen');
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
    console.log('✅ RENDERING: Payment already completed screen');
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Paiement validé !
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Cette réservation a déjà été payée avec succès. Aucun paiement supplémentaire n'est nécessaire.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <h4 className="font-bold text-green-800 mb-2">✅ Réservation confirmée</h4>
            <div className="text-green-700 text-sm space-y-1 text-left">
              <div>• <strong>Service :</strong> {service || 'Service réservé'}</div>
              <div>• <strong>Client :</strong> {client || 'Client'}</div>
              <div>• <strong>Date :</strong> {date ? new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric', 
                month: 'long'
              }) : 'Date réservée'}</div>
              <div>• <strong>Heure :</strong> {time || 'Heure réservée'}</div>
              <div>• <strong>Montant payé :</strong> {amount ? parseFloat(amount).toFixed(2) : '0.00'}€</div>
            </div>
          </div>
          <button
            onClick={() => window.close()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Fermer
          </button>
        </div>
      </div>
    );
  }

  // Vérifier si le lien est valide
  if (!amount || !service || !client || !email || !date || !time) {
    console.log('❌ RENDERING: Invalid link screen');
    console.log('Missing params:', { amount, service, client, email, date, time });
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
            onClick={() => window.location.href = '/'}
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
    console.log('⏰ RENDERING: Expired link screen');
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
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-2xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    console.log('💳 handlePayment - CALLED');
    
    if (isExpired || processing) {
      console.log('⚠️ Payment blocked:', { isExpired, processing });
      return;
    }

    setProcessing(true);
    console.log('⏳ Processing payment...');
    
    try {
      if (isSupabaseConfigured()) {
        console.log('🔧 Supabase configured - Creating Stripe session');
        
        // 🔥 FIX: Récupérer l'URL Supabase correctement
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        console.log('🌐 Supabase URL:', supabaseUrl);
        
        // 🔥 FIX: Construire l'URL correctement (sans double slash)
        const functionUrl = `${supabaseUrl}/functions/v1/stripe-checkout`;
        console.log('🔗 Function URL:', functionUrl);
        
        const payload = {
          amount: parseFloat(amount),
          service_name: service,
          customer_email: email,
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/payment-cancel`,
          metadata: {
            payment_type: 'booking_deposit',
            client: client,
            email: email,
            date: date,
            time: time,
            user_id: userId,
          },
        };
        
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        console.log('📡 Stripe response status:', response.status);

        if (response.ok) {
          const { url } = await response.json();
          console.log('✅ Stripe URL received:', url);
          if (url) {
            console.log('🔄 Redirecting to Stripe...');
            window.location.href = url;
            return;
          } else {
            throw new Error('Aucune URL de paiement reçue');
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Stripe error:', errorData);
          throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
        }
      } else {
        console.log('🎭 DEMO MODE - Simulating payment');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Demo payment complete - Redirecting');
        window.location.href = '/payment-success';
        return;
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      alert(`Une erreur est survenue lors du paiement: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Veuillez réessayer.`);
    } finally {
      console.log('🏁 handlePayment - FINALLY');
      setProcessing(false);
    }
  };

  const isWarning = timeLeft > 0 && timeLeft < 5 * 60 * 1000;

  console.log('💳 RENDERING: Payment form');

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
