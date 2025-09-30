import React from 'react';
import { X, Clock, User, Mail, Phone, CreditCard, Edit, Trash2, Calendar } from 'lucide-react';
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
  if (!isOpen) return null;

  const totalAmount = bookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalPaid = bookings.reduce((sum, booking) => sum + (booking.payment_amount || 0), 0);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      case 'partial':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅ Payé';
      case 'partial':
        return '💵 Partiellement';
      default:
        return '❌ Non payé';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
      <div className="bg-white w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 sm:p-6 sm:rounded-t-3xl relative overflow-hidden modal-header">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white">{serviceName}</h2>
                  <p className="text-sm sm:text-base text-white/80">{bookings.length} réservation(s)</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 sm:p-3 text-white hover:bg-white/20 rounded-xl transition-all duration-300 transform hover:scale-110"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="text-white/80 text-xs sm:text-sm">Chiffre d'affaires</div>
                <div className="text-lg sm:text-2xl font-bold text-white">{totalAmount.toFixed(2)}€</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="text-white/80 text-xs sm:text-sm">Encaissé</div>
                <div className="text-lg sm:text-2xl font-bold text-white">{totalPaid.toFixed(2)}€</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
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
                            {getPaymentStatusText(booking.payment_status)}
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
                          <span>{booking.quantity} participant(s)</span>
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
                          // Fermer le modal immédiatement après suppression
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