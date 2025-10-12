import React, { useState, useMemo } from 'react';
import { Calendar, User, Clock, Search, CreditCard, CheckCircle } from 'lucide-react';
import { Booking } from '../../types';
import { Client } from '../../types/client';

interface ReservationPaymentProps {
  bookings: Booking[];
  clients: Client[];
  onSelectBooking: (booking: Booking) => void;
}

export function ReservationPayment({ bookings, clients, onSelectBooking }: ReservationPaymentProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ CORRECTION : Filtrer uniquement les réservations NON ENTIÈREMENT PAYÉES
  const unpaidBookings = useMemo(() => {
    return bookings.filter(booking => {
      const totalAmount = booking.total_amount || 0;
      const paidAmount = booking.payment_amount || 0;
      const remaining = totalAmount - paidAmount;
      
      // ✅ Afficher seulement si reste > 0 (avec tolérance pour les arrondis)
      return remaining > 0.01;
    });
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return unpaidBookings;

    const query = searchQuery.toLowerCase();
    return unpaidBookings.filter(booking => {
      const clientName = booking.client_name?.toLowerCase() || '';
      const clientEmail = booking.client_email?.toLowerCase() || '';
      const serviceName = booking.service?.name?.toLowerCase() || '';
      
      return clientName.includes(query) || 
             clientEmail.includes(query) || 
             serviceName.includes(query);
    });
  }, [unpaidBookings, searchQuery]);

  const getClient = (email: string) => {
    return clients.find(c => c.email === email);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getRemainingAmount = (booking: Booking) => {
    const total = booking.total_amount || 0;
    const paid = booking.payment_amount || 0;
    return Math.max(0, total - paid);
  };

  const getPaymentStatus = (booking: Booking) => {
    const remaining = getRemainingAmount(booking);
    const paid = booking.payment_amount || 0;
    
    if (remaining <= 0.01) {
      return { label: 'Payé', color: 'green' };
    } else if (paid > 0) {
      return { label: 'Partiel', color: 'orange' };
    } else {
      return { label: 'Non payé', color: 'red' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Paiement de réservations
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredBookings.length} réservation{filteredBookings.length > 1 ? 's' : ''} en attente
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un client, email ou service..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Aucune réservation en attente
          </h3>
          <p className="text-gray-600">
            {searchQuery 
              ? 'Aucun résultat pour cette recherche'
              : 'Toutes les réservations sont payées'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map(booking => {
            const client = getClient(booking.client_email);
            const remaining = getRemainingAmount(booking);
            const status = getPaymentStatus(booking);

            return (
              <button
                key={booking.id}
                onClick={() => onSelectBooking(booking)}
                className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-bold text-gray-900">{booking.client_name}</p>
                      <p className="text-xs text-gray-600">{booking.client_email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    status.color === 'green' ? 'bg-green-100 text-green-700' :
                    status.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{booking.time}</span>
                  </div>
                  {booking.service && (
                    <div className="text-sm font-medium text-gray-900">
                      {booking.service.name}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Montant total</span>
                    <span className="font-medium">{booking.total_amount.toFixed(2)} €</span>
                  </div>
                  {booking.payment_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Déjà payé</span>
                      <span className="font-medium text-green-600">
                        {booking.payment_amount.toFixed(2)} €
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                    <span className="text-gray-900">Reste à payer</span>
                    <span className="text-red-600">
                      {remaining.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg text-center font-bold text-sm flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Encaisser le paiement
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
