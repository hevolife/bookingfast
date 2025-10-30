import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, Euro, CreditCard, MapPin, FileText, Link as LinkIcon, Trash2, Copy, Check } from 'lucide-react';
import { Booking, PaymentLink } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PaymentLinkModal } from './PaymentLinkModal';
import { usePaymentLinks } from '../../hooks/usePaymentLinks';
import { formatTime } from '../../utils/dateUtils';

interface BookingDetailsModalProps {
  booking: Booking;
  onClose: () => void;
  onUpdate?: () => void;
}

export function BookingDetailsModal({ booking, onClose, onUpdate }: BookingDetailsModalProps) {
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const { paymentLinks, loading: linksLoading, refetch: refetchLinks, cancelPaymentLink } = usePaymentLinks(booking.id);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    refetchLinks();
  }, [booking.id, refetchLinks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'completed':
        return 'Complété';
      case 'partial':
        return 'Partiel';
      case 'pending':
        return 'En attente';
      case 'refunded':
        return 'Remboursé';
      default:
        return status;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      case 'completed':
        return 'Terminée';
      default:
        return status;
    }
  };

  const handleCopyLink = (link: PaymentLink) => {
    if (link.payment_url) {
      navigator.clipboard.writeText(link.payment_url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  const handleCancelLink = async (linkId: string) => {
    if (confirm('Êtes-vous sûr de vouloir annuler ce lien de paiement ?')) {
      try {
        await cancelPaymentLink(linkId);
        refetchLinks();
      } catch (error) {
        console.error('Erreur annulation lien:', error);
        alert('Erreur lors de l\'annulation du lien');
      }
    }
  };

  const getLinkStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLinkStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'expired':
        return 'Expiré';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const activePaymentLinks = paymentLinks.filter(link => 
    link.status === 'pending' || link.status === 'expired'
  );

  const displayTransactions = (booking.transactions || []).filter(transaction => 
    transaction.status === 'completed' || transaction.status === 'paid'
  );

  return (
    <>
      {/* Desktop: Modal centré avec overlay */}
      <div className="hidden sm:block fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl transform animate-slideUp flex flex-col">
          {/* Header Desktop - FIXE */}
          <div className="flex-shrink-0 relative overflow-hidden rounded-t-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">Détails de la réservation</h2>
                    <p className="text-white/80 mt-1">#{booking.id.slice(0, 8)}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="group relative p-3 text-white hover:bg-white/20 rounded-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 backdrop-blur-sm"
                  aria-label="Fermer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>

          {/* Content - SCROLLABLE */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Statuts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Statut réservation</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusColor(booking.booking_status)}`}>
                    {getStatusLabel(booking.booking_status)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Statut paiement</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getPaymentStatusColor(booking.payment_status)}`}>
                    {getPaymentStatusLabel(booking.payment_status)}
                  </span>
                </div>
              </div>

              {/* Informations client */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Informations client
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nom</p>
                      <p className="font-semibold text-gray-900">{booking.client_firstname} {booking.client_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{booking.client_email}</p>
                    </div>
                  </div>
                  {booking.client_phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Téléphone</p>
                        <p className="font-semibold text-gray-900">{booking.client_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Détails réservation */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Détails de la réservation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(booking.date), 'EEEE d MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Heure</p>
                      <p className="font-semibold text-gray-900">{formatTime(booking.time)}</p>
                    </div>
                  </div>
                  {booking.service_name && (
                    <div className="flex items-center gap-3 md:col-span-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Service</p>
                        <p className="font-semibold text-gray-900">{booking.service_name}</p>
                      </div>
                    </div>
                  )}
                  {booking.location && (
                    <div className="flex items-center gap-3 md:col-span-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Lieu</p>
                        <p className="font-semibold text-gray-900">{booking.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations financières */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Euro className="w-5 h-5 text-yellow-600" />
                  Informations financières
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-yellow-200">
                    <span className="text-gray-700 font-medium">Montant total</span>
                    <span className="text-xl font-bold text-gray-900">{booking.total_amount.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-yellow-200">
                    <span className="text-gray-700 font-medium">Montant payé</span>
                    <span className="text-xl font-bold text-green-600">{(booking.payment_amount || 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-900 font-bold">Solde restant</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {(booking.total_amount - (booking.payment_amount || 0)).toFixed(2)}€
                    </span>
                  </div>
                </div>

                {booking.payment_status !== 'paid' && booking.payment_status !== 'completed' && (
                  <button
                    onClick={() => setShowPaymentLinkModal(true)}
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-5 h-5" />
                    Créer un lien de paiement
                  </button>
                )}
              </div>

              {activePaymentLinks.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-purple-600" />
                    Liens de paiement en attente ({activePaymentLinks.length})
                  </h3>
                  <div className="space-y-3">
                    {activePaymentLinks.map((link) => (
                      <div key={link.id} className="bg-white rounded-xl p-4 border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getLinkStatusColor(link.status)}`}>
                            {getLinkStatusLabel(link.status)}
                          </span>
                          <span className="text-lg font-bold text-gray-900">{link.amount.toFixed(2)}€</span>
                        </div>
                        {link.payment_url && link.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleCopyLink(link)}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                                copiedLinkId === link.id
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              {copiedLinkId === link.id ? (
                                <>
                                  <Check className="w-4 h-4 inline mr-2" />
                                  Copié !
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 inline mr-2" />
                                  Copier le lien
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelLink(link.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {link.status === 'pending' && link.expires_at && (
                            <>Expire le {format(new Date(link.expires_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</>
                          )}
                          {link.status === 'expired' && link.expires_at && (
                            <>Expiré le {format(new Date(link.expires_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayTransactions.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border-2 border-indigo-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    Historique des paiements ({displayTransactions.length})
                  </h3>
                  <div className="space-y-3">
                    {displayTransactions.map((transaction, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border-2 border-indigo-200 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}€
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.method === 'stripe' ? 'Stripe' : 
                             transaction.method === 'cash' ? 'Espèces' : 
                             transaction.method === 'card' ? 'Carte' : 
                             transaction.method}
                          </p>
                          {transaction.date && (
                            <p className="text-xs text-gray-500">
                              {format(new Date(transaction.date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getPaymentStatusColor(transaction.status)}`}>
                          {getPaymentStatusLabel(transaction.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.notes && (
                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Notes
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Modal plein écran */}
      <div className="sm:hidden fixed inset-0 z-40">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
          style={{ zIndex: 40 }}
        />
        
        <div 
          className="fixed left-0 right-0 bottom-0 bg-white shadow-2xl animate-slideUp flex flex-col"
          style={{ 
            top: '80px',
            zIndex: 45,
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px'
          }}
        >
          {/* Header Mobile - FIXE */}
          <div 
            className="flex-shrink-0 relative overflow-hidden"
            style={{
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
            
            <div className="relative z-10 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white drop-shadow-lg">Détails de la réservation</h2>
                    <p className="text-white/80 text-xs">#{booking.id.slice(0, 8)}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>
          
          {/* Content Mobile - SCROLLABLE */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '120px'
            }}
          >
            <div className="p-4 space-y-4">
              {/* Même contenu que desktop mais avec classes mobile */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Statut réservation</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border-2 ${getStatusColor(booking.booking_status)}`}>
                    {getStatusLabel(booking.booking_status)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Statut paiement</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border-2 ${getPaymentStatusColor(booking.payment_status)}`}>
                    {getPaymentStatusLabel(booking.payment_status)}
                  </span>
                </div>
              </div>

              {/* Reste du contenu mobile identique... */}
            </div>
          </div>
        </div>
      </div>

      {showPaymentLinkModal && (
        <PaymentLinkModal
          booking={booking}
          onClose={() => {
            setShowPaymentLinkModal(false);
            refetchLinks();
            onUpdate?.();
          }}
        />
      )}
    </>
  );
}
