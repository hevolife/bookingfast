import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, Euro, Search, Filter, ChevronLeft, ChevronRight, CreditCard as Edit, Eye, Package, CreditCard, AlertCircle, CheckCircle, ArrowUpDown } from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { useServices } from '../../hooks/useServices';
import { Booking } from '../../types';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';

interface BookingsListProps {
  onEditBooking?: (booking: Booking) => void;
}

export function BookingsList({ onEditBooking }: BookingsListProps) {
  const { bookings, loading } = useBookings();
  const { services } = useServices();
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'partial' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'service' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const itemsPerPage = 12;

  // Filtrer et trier les réservations
  useEffect(() => {
    let filtered = [...bookings];

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.client_firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.client_phone.includes(searchTerm) ||
        booking.service?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrer par statut de réservation
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.booking_status === statusFilter);
    }

    // Filtrer par statut de paiement
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(booking => booking.payment_status === paymentFilter);
    }

    // Trier
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime();
          break;
        case 'client':
          comparison = (a.client_firstname + ' ' + a.client_name).localeCompare(b.client_firstname + ' ' + b.client_name);
          break;
        case 'service':
          comparison = (a.service?.name || '').localeCompare(b.service?.name || '');
          break;
        case 'amount':
          comparison = a.total_amount - b.total_amount;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredBookings(filtered);
    setCurrentPage(1); // Reset à la première page lors du filtrage
  }, [bookings, searchTerm, statusFilter, paymentFilter, sortBy, sortOrder]);

  // Calculer la pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'partial':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'pending':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }


  return (
    <>
      <div className="p-4 sm:p-6 h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mobile-optimized">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mes Réservations
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Liste complète de toutes vos réservations ({filteredBookings.length})
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
              />
            </div>

            {/* Filtre statut réservation */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmées</option>
              </select>
            </div>

            {/* Filtre statut paiement */}
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
              >
                <option value="all">Tous les paiements</option>
                <option value="pending">Non payé</option>
                <option value="partial">Acompte</option>
                <option value="completed">Payé</option>
              </select>
            </div>

            {/* Tri */}
            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
              >
                <option value="date-desc">Date (récent)</option>
                <option value="date-asc">Date (ancien)</option>
                <option value="client-asc">Client (A-Z)</option>
                <option value="client-desc">Client (Z-A)</option>
                <option value="service-asc">Service (A-Z)</option>
                <option value="amount-desc">Montant (élevé)</option>
                <option value="amount-asc">Montant (faible)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des réservations */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
          {currentBookings.length > 0 ? (
            <>
              {/* Version desktop - Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          Date & Heure
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('client')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          Client
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('service')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          Service
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">Statut</th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('amount')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          Montant
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentBookings.map((booking, index) => (
                      <tr
                        key={booking.id}
                        className="hover:bg-gray-50 transition-colors animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{formatDate(booking.date)}</div>
                              <div className="text-sm text-gray-600">{formatTime(booking.time)}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-gray-900">
                              {booking.client_firstname} {booking.client_name}
                            </div>
                            <div className="text-sm text-gray-600">{booking.client_email}</div>
                            <div className="text-sm text-gray-500">{booking.client_phone}</div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{booking.service?.name}</div>
                              <div className="text-sm text-gray-600">
                                {booking.duration_minutes}min • {booking.quantity} pers.
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.booking_status)}`}>
                              {booking.booking_status === 'confirmed' ? '✅ Confirmée' : 
                               booking.booking_status === 'cancelled' ? '❌ Annulée' : '⏳ En attente'}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(booking.payment_status)}`}>
                              {booking.payment_status === 'completed' ? '💰 Payé' :
                               booking.payment_status === 'partial' ? '💳 Acompte' : '❌ Non payé'}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-green-600">{booking.total_amount.toFixed(2)}€</div>
                            <div className="text-sm text-gray-600">
                              Payé: {(booking.payment_amount || 0).toFixed(2)}€
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(booking)}
                              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors transform hover:scale-110"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {onEditBooking && (
                              <button
                                onClick={() => onEditBooking(booking)}
                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors transform hover:scale-110"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Version mobile - Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {currentBookings.map((booking, index) => (
                  <div
                    key={booking.id}
                    className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-200 p-4 hover:shadow-md transition-all duration-300 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {booking.client_firstname.charAt(0)}{booking.client_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {booking.client_firstname} {booking.client_name}
                          </div>
                          <div className="text-xs text-gray-600">{booking.client_email}</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mobile-tap-target"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onEditBooking && (
                          <button
                            onClick={() => onEditBooking(booking)}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mobile-tap-target"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Informations principales */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-gray-600">Date</div>
                          <div className="font-medium text-gray-900 text-sm">{formatDate(booking.date)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="text-xs text-gray-600">Heure</div>
                          <div className="font-medium text-gray-900 text-sm">{formatTime(booking.time)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-green-500" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-600">Service</div>
                        <div className="font-medium text-gray-900 text-sm">{booking.service?.name}</div>
                        <div className="text-xs text-gray-500">
                          {booking.duration_minutes}min • {booking.quantity} participant(s)
                        </div>
                      </div>
                    </div>

                    {/* Statuts et montant */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.booking_status)}`}>
                          {booking.booking_status === 'confirmed' ? '✅ Confirmée' : 
                           booking.booking_status === 'cancelled' ? '❌ Annulée' : '⏳ En attente'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(booking.payment_status)}`}>
                          {booking.payment_status === 'completed' ? '💰 Payé' :
                           booking.payment_status === 'partial' ? '💳 Acompte' : '❌ Non payé'}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-sm">{booking.total_amount.toFixed(2)}€</div>
                        <div className="text-xs text-gray-500">
                          Payé: {(booking.payment_amount || 0).toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} sur {filteredBookings.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mobile-tap-target"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-300 mobile-tap-target ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mobile-tap-target"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? 'Aucune réservation ne correspond à votre recherche'
                  : 'Les réservations apparaîtront ici une fois créées'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails */}
      {showDetailsModal && selectedBooking && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Détails de la réservation"
          size="md"
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Informations client */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                  {selectedBooking.client_firstname.charAt(0)}{selectedBooking.client_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    {selectedBooking.client_firstname} {selectedBooking.client_name}
                  </h3>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedBooking.booking_status === 'confirmed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {selectedBooking.booking_status === 'confirmed' ? '✅ Confirmée' : '⏳ En attente'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                  <a 
                    href={`mailto:${selectedBooking.client_email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {selectedBooking.client_email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  <button
                    onClick={() => window.open(`tel:${selectedBooking.client_phone}`, '_self')}
                    className="text-green-600 hover:text-green-800 hover:underline font-medium"
                  >
                    {selectedBooking.client_phone}
                  </button>
                </div>
              </div>
            </div>

            {/* Détails de la réservation */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Détails de la réservation
              </h4>
              
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-700">Service</span>
                  <span className="font-medium text-purple-800">
                    {services.find(s => s.id === selectedBooking.service_id)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Date et heure</span>
                  <span className="font-medium text-purple-800">
                    {formatDate(selectedBooking.date)} à {formatTime(selectedBooking.time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Durée</span>
                  <span className="font-medium text-purple-800">{selectedBooking.duration_minutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-700">Participants</span>
                  <span className="font-medium text-purple-800">{selectedBooking.quantity} personne(s)</span>
                </div>
              </div>
            </div>

            {/* Informations de paiement */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
              <h4 className="font-bold text-green-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Euro className="w-4 h-4 sm:w-5 sm:h-5" />
                Paiement
              </h4>
              
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Montant total</span>
                  <span className="font-bold text-green-800">{selectedBooking.total_amount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Montant payé</span>
                  <span className="font-medium text-green-800">{(selectedBooking.payment_amount || 0).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Restant à payer</span>
                  <span className="font-bold text-green-800">
                    {(selectedBooking.total_amount - (selectedBooking.payment_amount || 0)).toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Statut</span>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    selectedBooking.payment_status === 'completed' 
                      ? 'bg-green-100 text-green-700'
                      : selectedBooking.payment_status === 'partial'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedBooking.payment_status === 'completed' ? '✅ Payé' :
                     selectedBooking.payment_status === 'partial' ? '⏳ Acompte' : '❌ Non payé'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.open(`tel:${selectedBooking.client_phone}`, '_self')}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                Appeler le client
              </button>
              <button
                onClick={() => window.open(`mailto:${selectedBooking.client_email}`, '_blank')}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                Envoyer un email
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}