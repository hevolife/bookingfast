import React, { useState } from 'react';
import { X, Clock, User, Mail, Phone, CreditCard, CreditCard as Edit, Trash2, Calendar, Eye } from 'lucide-react';
import { Booking } from '../../types';

interface ServiceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  serviceName: string;
  serviceId: string;
  selectedDate: string;
  selectedTime: string;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
  onNewBooking: (date: string, time: string, serviceId: string) => void;
}

export function ServiceBookingModal({ 
  isOpen, 
  onClose, 
  bookings, 
  serviceName, 
  serviceId,
  selectedDate,
  selectedTime,
  onEditBooking,
  onDeleteBooking,
  onNewBooking
}: ServiceBookingModalProps) {
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  if (!isOpen) return null;

  const totalAmount = bookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalPaid = bookings.reduce((sum, booking) => sum + (booking.payment_amount || 0), 0);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      case 'partial':
        return 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅ Payé';
      case 'partial':
        return '⏳ Acompte';
      default:
        return '❌ Non payé';
    }
  };

  // Fonction pour obtenir le nom d'unité du service
  const getUnitName = (booking: Booking) => {
    if (booking.service?.unit_name && booking.service.unit_name !== 'personnes') {
      return booking.service.unit_name;
    }
    return 'participants';
  };

  // Fonction pour obtenir le pluriel du nom d'unité avec suffixe (s)
  const getPluralUnitName = (booking: Booking, quantity: number) => {
    const unitName = getUnitName(booking);
    if (quantity <= 1) {
      // Retirer le 's' final si présent et ajouter (s) après
      return `${unitName.replace(/s$/, '')}(s)`;
    }
    return `${unitName}(s)`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  // Modal de détails de réservation
  if (selectedBookingDetails) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
        <div className="bg-white w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content">
          {/* Header */}
          <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 pr-2">
                  <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl items-center justify-center shadow-lg">
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base sm:text-2xl font-bold text-white drop-shadow-lg">
                      Détails de la réservation
                    </h2>
                    <p className="text-xs sm:text-base text-white/80 mt-0.5 sm:mt-1">
                      {selectedBookingDetails.client_firstname} {selectedBookingDetails.client_name}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedBookingDetails(null)}
                  className="group relative p-1.5 sm:p-3 text-white hover:bg-white/20 rounded-lg sm:rounded-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 mobile-tap-target flex-shrink-0 backdrop-blur-sm"
                  aria-label="Fermer"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-lg sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <X className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                </button>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>

          {/* Contenu */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Informations client */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informations client
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Nom complet</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {selectedBookingDetails.client_firstname} {selectedBookingDetails.client_name}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Email</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base break-all">
                    {selectedBookingDetails.client_email}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Téléphone</div>
                  <a 
                    href={`tel:${selectedBookingDetails.client_phone}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm sm:text-base"
                  >
                    {selectedBookingDetails.client_phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Informations réservation */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Détails de la réservation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Service</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {selectedBookingDetails.custom_service_data?.name || selectedBookingDetails.service?.name || 'Service personnalisé'}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Date</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {formatDate(selectedBookingDetails.date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Heure</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {formatTime(selectedBookingDetails.time)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Durée</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {selectedBookingDetails.duration_minutes} minutes
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Quantité</div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    {selectedBookingDetails.quantity} {getPluralUnitName(selectedBookingDetails, selectedBookingDetails.quantity)}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Statut</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                    selectedBookingDetails.booking_status === 'confirmed' 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200'
                      : selectedBookingDetails.booking_status === 'cancelled'
                      ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200'
                      : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-orange-200'
                  }`}>
                    {selectedBookingDetails.booking_status === 'confirmed' ? '✅ Confirmée' : 
                     selectedBookingDetails.booking_status === 'cancelled' ? '❌ Annulée' : '⏳ En attente'}
                  </div>
                </div>
              </div>
            </div>

            {/* Informations paiement */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-orange-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                Paiement
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Montant total</span>
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {selectedBookingDetails.total_amount.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Montant payé</span>
                  <span className="text-base sm:text-lg font-bold text-green-600">
                    {(selectedBookingDetails.payment_amount || 0).toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                  <span className="text-sm sm:text-base text-gray-600">Reste à payer</span>
                  <span className="text-base sm:text-lg font-bold text-red-600">
                    {(selectedBookingDetails.total_amount - (selectedBookingDetails.payment_amount || 0)).toFixed(2)}€
                  </span>
                </div>
                <div className="pt-3 border-t border-orange-200">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2">Statut du paiement</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(selectedBookingDetails.payment_status)}`}>
                    {getPaymentStatusText(selectedBookingDetails.payment_status)}
                  </div>
                </div>
              </div>

              {/* Transactions */}
              {selectedBookingDetails.transactions && selectedBookingDetails.transactions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <div className="text-sm font-medium text-gray-700 mb-3">Historique des transactions</div>
                  <div className="space-y-2">
                    {selectedBookingDetails.transactions.map((transaction, index) => (
                      <div key={transaction.id || index} className="bg-white rounded-lg p-3 border border-orange-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {transaction.amount.toFixed(2)}€
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {transaction.status === 'completed' ? 'Payé' :
                                 transaction.status === 'pending' ? 'En attente' : 'Annulé'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {transaction.method === 'cash' ? '💵 Espèces' :
                               transaction.method === 'card' ? '💳 Carte bancaire' :
                               transaction.method === 'check' ? '📝 Chèque' :
                               transaction.method === 'transfer' ? '🏦 Virement' :
                               '🔗 Stripe'}
                            </div>
                            {transaction.note && (
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {transaction.note}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  onEditBooking(selectedBookingDetails);
                  setSelectedBookingDetails(null);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                Modifier
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
      <div className="bg-white w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content">
        {/* Header avec design amélioré - Hauteur réduite sur mobile */}
        <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top">
          {/* Fond dégradé principal */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>
          
          {/* Effet de brillance animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
          
          {/* Motif de points décoratifs */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          
          {/* Contenu du header - Padding réduit sur mobile */}
          <div className="relative z-10 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              {/* Titre avec icône décorative */}
              <div className="flex items-center gap-2 sm:gap-4 flex-1 pr-2">
                <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl items-center justify-center shadow-lg">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-2xl font-bold text-white drop-shadow-lg">
                    {serviceName}
                  </h2>
                  <p className="text-xs sm:text-base text-white/80 mt-0.5 sm:mt-1">{bookings.length} réservation(s)</p>
                </div>
              </div>
              
              {/* Bouton de fermeture amélioré - Taille réduite sur mobile */}
              <button
                onClick={onClose}
                className="group relative p-1.5 sm:p-3 text-white hover:bg-white/20 rounded-lg sm:rounded-2xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 mobile-tap-target flex-shrink-0 backdrop-blur-sm"
                aria-label="Fermer"
              >
                <div className="absolute inset-0 bg-white/10 rounded-lg sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <X className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
              </button>
            </div>

            {/* Stats - Taille réduite sur mobile */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-2xl p-2 sm:p-4">
                <div className="text-white/80 text-xs">Chiffre d'affaires</div>
                <div className="text-base sm:text-2xl font-bold text-white">{totalAmount.toFixed(2)}€</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-2xl p-2 sm:p-4">
                <div className="text-white/80 text-xs">Encaissé</div>
                <div className="text-base sm:text-2xl font-bold text-white">{totalPaid.toFixed(2)}€</div>
              </div>
            </div>
          </div>
          
          {/* Bordure inférieure décorative */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        </div>

        {/* Bookings List - Padding ajouté */}
        <div className="p-4 sm:p-6 modal-body">
          {/* Bouton Ajouter une réservation */}
          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => {
                onClose();
                onNewBooking(selectedDate, selectedTime, serviceId);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 sm:gap-3 font-bold"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm">+</span>
              </div>
              <span className="text-sm sm:text-base">Ajouter un client à ce créneau</span>
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {bookings.map((booking, index) => (
              <div
                key={booking.id}
                className="bg-gradient-to-r from-gray-50 to-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                      {booking.client_firstname.charAt(0)}{booking.client_name.charAt(0)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">
                          {booking.client_firstname} {booking.client_name}
                        </h3>
                        <div className="flex gap-2">
                          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border self-start ${
                            booking.booking_status === 'confirmed' 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200'
                              : booking.booking_status === 'cancelled'
                              ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200'
                              : 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border-orange-200'
                          }`}>
                            {booking.booking_status === 'confirmed' ? '✅ Confirmée' : 
                             booking.booking_status === 'cancelled' ? '❌ Annulée' : '⏳ En attente'}
                          </div>
                          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border self-start ${getPaymentStatusColor(booking.payment_status)}`}>
                            {booking.payment_status === 'completed' ? '✅ Payé' :
                             booking.payment_status === 'partial' ? '💵 Partiellement' : '❌ Non payé'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                          <span>{booking.time.slice(0, 5)} ({booking.duration_minutes}min)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                          <span>{booking.quantity} {getPluralUnitName(booking, booking.quantity)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                          <span className="truncate">{booking.client_email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                          <a 
                            href={`tel:${booking.client_phone}`}
                            className="text-orange-600 hover:text-orange-800 hover:underline transition-colors font-medium"
                            title={`Appeler ${booking.client_phone}`}
                          >
                            {booking.client_phone}
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium text-green-600 text-xs sm:text-sm">
                            {booking.payment_amount?.toFixed(2) || '0.00'}€ / {booking.total_amount.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:gap-3 self-start sm:self-center">
                    <button
                      onClick={() => setSelectedBookingDetails(booking)}
                      className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg sm:rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 shadow-lg flex items-center justify-center"
                      title="Voir les détails"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onEditBooking(booking)}
                      className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-110 shadow-lg flex items-center justify-center"
                      title="Modifier"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer la réservation de ${booking.client_firstname} ${booking.client_name} ?`)) {
                          onDeleteBooking(booking.id);
                          onClose();
                        }
                      }}
                      className="p-2 sm:p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg sm:rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 shadow-lg flex items-center justify-center"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {bookings.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
              <p className="text-sm sm:text-base text-gray-500">Aucune réservation pour ce service</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
