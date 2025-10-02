import React, { useState } from 'react';
import { Search, Calendar, Clock, User } from 'lucide-react';
import { Booking } from '../../types';
import { Client } from '../../types';

interface ReservationPaymentProps {
  bookings: Booking[];
  clients: Client[];
  onSelectBooking: (booking: Booking) => void;
}

export function ReservationPayment({ bookings, clients, onSelectBooking }: ReservationPaymentProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const unpaidBookings = bookings.filter(b => 
    b.payment_status !== 'completed' &&
    (b.booking_status === 'confirmed' || b.booking_status === 'pending')
  );

  const filteredBookings = unpaidBookings.filter(b => {
    const query = searchQuery.toLowerCase();
    const client = clients.find(c => c.email === b.client_email);
    return (
      b.client_name.toLowerCase().includes(query) ||
      b.client_email.toLowerCase().includes(query) ||
      (client && `${client.firstname} ${client.lastname}`.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Paiement de réservations
          <span className="ml-3 text-sm font-normal text-gray-600">
            {unpaidBookings.length} réservation(s) en attente
          </span>
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBookings.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-400">
            <Calendar className="w-16 h-16 mx-auto mb-4" />
            <p>Aucune réservation en attente de paiement</p>
          </div>
        ) : (
          filteredBookings.map(booking => {
            const client = clients.find(c => c.email === booking.client_email);
            const remainingAmount = booking.total_amount - (booking.payment_amount || 0);

            return (
              <div
                key={booking.id}
                onClick={() => onSelectBooking(booking)}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <h3 className="font-bold text-gray-900">
                        {client ? `${client.firstname} ${client.lastname}` : booking.client_name}
                      </h3>
                    </div>
                    <div className="text-sm text-gray-600">{booking.client_email}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.payment_status === 'partial'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {booking.payment_status === 'partial' ? 'Partiel' : 'Non payé'}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(booking.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {booking.time}
                  </div>
                  {booking.service && (
                    <div className="text-sm font-medium text-gray-900">
                      {booking.service.name}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
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
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Reste à payer</span>
                    <span className="text-red-600">{remainingAmount.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
