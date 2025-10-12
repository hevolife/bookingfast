import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Search, Filter, ChevronLeft, ChevronRight, CreditCard as Edit, Eye, Trash2, Plus, Calendar, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useBookings } from '../../hooks/useBookings';
import { useTeam } from '../../hooks/useTeam';
import { Client, Booking } from '../../types';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { PermissionGate } from '../UI/PermissionGate';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';

interface ClientsPageProps {
  onEditClient?: (client: Client) => void;
}

export function ClientsPage({ onEditClient }: ClientsPageProps) {
  const { t } = useTranslation();
  const { clients, loading, deleteClient } = useClients();
  const { bookings } = useBookings();
  const { hasPermission } = useTeam();
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'phone' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const itemsPerPage = 12;

  useEffect(() => {
    let filtered = [...clients];

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.firstname + ' ' + a.lastname).localeCompare(b.firstname + ' ' + b.lastname);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'phone':
          comparison = a.phone.localeCompare(b.phone);
          break;
        case 'created':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredClients(filtered);
    setCurrentPage(1);
  }, [clients, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(t('common.language') === 'Français' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      await deleteClient(clientToDelete.id);
      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (error) {
      alert(`${t('common.error')}: ${error instanceof Error ? error.message : t('common.error')}`);
    }
  };

  const getClientBookings = (clientEmail: string): Booking[] => {
    return bookings.filter(booking => booking.client_email === clientEmail);
  };

  const getClientStats = (client: Client) => {
    const clientBookings = getClientBookings(client.email);
    const totalBookings = clientBookings.length;
    const totalSpent = clientBookings.reduce((sum, booking) => sum + booking.total_amount, 0);
    const lastBooking = clientBookings
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    return {
      totalBookings,
      totalSpent,
      lastBooking
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hasPermission('view_clients')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-800 mb-2">{t('clients.accessDenied.title')}</h3>
          <p className="text-red-600">{t('clients.accessDenied.message')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mobile-optimized">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t('clients.title')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {t('clients.subtitle')} ({filteredClients.length})
          </p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('clients.search')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm"
              />
            </div>

            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm"
              >
                <option value="created-desc">{t('clients.sortBy.newest')}</option>
                <option value="created-asc">{t('clients.sortBy.oldest')}</option>
                <option value="name-asc">{t('clients.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('clients.sortBy.nameDesc')}</option>
                <option value="email-asc">{t('clients.sortBy.emailAsc')}</option>
                <option value="email-desc">{t('clients.sortBy.emailDesc')}</option>
              </select>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-purple-600">{clients.length}</div>
              <div className="text-xs text-purple-700">{t('clients.totalClients')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
          {currentClients.length > 0 ? (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-purple-600 transition-colors"
                        >
                          {t('clients.name')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('email')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-purple-600 transition-colors"
                        >
                          {t('clients.email')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">{t('clients.bookings')}</th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('created')}
                          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-purple-600 transition-colors"
                        >
                          {t('clients.clientSince')}
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">{t('clients.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentClients.map((client, index) => {
                      const stats = getClientStats(client);
                      
                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-gray-50 transition-colors animate-fadeIn"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold">
                                {client.firstname.charAt(0)}{client.lastname.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">
                                  {client.firstname} {client.lastname}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {t('clients.clientSince')} {formatDate(client.created_at)}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Mail className="w-4 h-4 text-blue-500" />
                                <a 
                                  href={`mailto:${client.email}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                  {client.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-500" />
                                <a
                                  href={`tel:${client.phone}`}
                                  className="text-green-600 hover:text-green-800 hover:underline font-medium"
                                >
                                  {client.phone}
                                </a>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-purple-600">{stats.totalBookings} {t('clients.bookings')}</div>
                              <div className="text-sm text-gray-600">
                                {t('clients.totalSpent')}: {stats.totalSpent.toFixed(2)}€
                              </div>
                              {stats.lastBooking && (
                                <div className="text-xs text-gray-500">
                                  {t('clients.lastBooking')}: {formatDate(stats.lastBooking.date)}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDate(client.created_at)}</div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDetails(client)}
                                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors transform hover:scale-110"
                                title={t('clients.viewDetails')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <PermissionGate permission="manage_clients" showMessage={false}>
                                {onEditClient && (
                                  <button
                                    onClick={() => onEditClient(client)}
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors transform hover:scale-110"
                                    title={t('clients.edit')}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                              </PermissionGate>
                              <PermissionGate permission="manage_clients" showMessage={false}>
                                <button
                                  onClick={() => handleDeleteClick(client)}
                                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors transform hover:scale-110"
                                  title={t('clients.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden space-y-4 p-4">
                {currentClients.map((client, index) => {
                  const stats = getClientStats(client);
                  
                  return (
                    <div
                      key={client.id}
                      className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border border-purple-200 p-4 hover:shadow-md transition-all duration-300 animate-fadeIn"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {client.firstname.charAt(0)}{client.lastname.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">
                              {client.firstname} {client.lastname}
                            </div>
                            <div className="text-xs text-gray-600">{formatDate(client.created_at)}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(client)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mobile-tap-target"
                            title={t('clients.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <PermissionGate permission="manage_clients" showMessage={false}>
                            {onEditClient && (
                              <button
                                onClick={() => onEditClient(client)}
                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mobile-tap-target"
                                title={t('clients.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </PermissionGate>
                          <PermissionGate permission="manage_clients" showMessage={false}>
                            <button
                              onClick={() => handleDeleteClick(client)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors mobile-tap-target"
                              title={t('clients.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGate>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-500" />
                          <a 
                            href={`mailto:${client.email}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                          >
                            {client.email}
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-green-500" />
                          <a
                            href={`tel:${client.phone}`}
                            className="text-green-600 hover:text-green-800 hover:underline font-medium text-sm"
                          >
                            {client.phone}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-gray-600">{t('clients.bookings')}</div>
                          <div className="font-bold text-purple-600">{stats.totalBookings}</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-gray-600">{t('clients.totalSpent')}</div>
                          <div className="font-bold text-green-600">{stats.totalSpent.toFixed(2)}€</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {t('clients.showing')} {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} {t('clients.of')} {filteredClients.length}
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
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
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
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? t('clients.noResults') : t('clients.noClients')}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? t('clients.noResultsDesc') : t('clients.noClientsDesc')}
              </p>
            </div>
          )}
        </div>
      </div>

      {showDetailsModal && selectedClient && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={t('clients.details.title')}
          size="md"
        >
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {selectedClient.firstname.charAt(0)}{selectedClient.lastname.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedClient.firstname} {selectedClient.lastname}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {t('clients.details.since')} {formatDate(selectedClient.created_at)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <a 
                    href={`mailto:${selectedClient.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {selectedClient.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-500" />
                  <a
                    href={`tel:${selectedClient.phone}`}
                    className="text-green-600 hover:text-green-800 hover:underline font-medium"
                  >
                    {selectedClient.phone}
                  </a>
                </div>
              </div>
            </div>

            {(() => {
              const stats = getClientStats(selectedClient);
              return (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('clients.details.history')}
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{stats.totalBookings}</div>
                      <div className="text-xs text-blue-700">{t('clients.details.totalBookings')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{stats.totalSpent.toFixed(2)}€</div>
                      <div className="text-xs text-green-700">{t('clients.details.totalSpent')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.totalBookings > 0 ? (stats.totalSpent / stats.totalBookings).toFixed(2) : '0.00'}€
                      </div>
                      <div className="text-xs text-purple-700">{t('clients.details.averageBasket')}</div>
                    </div>
                  </div>

                  {stats.lastBooking && (
                    <div className="bg-white border border-blue-300 rounded-xl p-3">
                      <div className="text-sm text-blue-800 font-medium mb-1">{t('clients.details.lastBooking')}</div>
                      <div className="text-xs text-blue-700">
                        {stats.lastBooking.service?.name} - {formatDate(stats.lastBooking.date)} {t('common.at')} {stats.lastBooking.time.slice(0, 5)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              const clientBookings = getClientBookings(selectedClient.email)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

              return clientBookings.length > 0 ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('clients.details.recentBookings')} ({clientBookings.length})
                  </h4>
                  
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {clientBookings.map((booking, index) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-green-300"
                      >
                        <div>
                          <div className="font-medium text-green-800 text-sm">
                            {booking.service?.name}
                          </div>
                          <div className="text-xs text-green-600">
                            {formatDate(booking.date)} {t('common.at')} {booking.time.slice(0, 5)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{booking.total_amount.toFixed(2)}€</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            booking.payment_status === 'completed' 
                              ? 'bg-green-100 text-green-700'
                              : booking.payment_status === 'partial'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {booking.payment_status === 'completed' ? t('clients.details.paid') :
                             booking.payment_status === 'partial' ? t('clients.details.partial') : t('clients.details.unpaid')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{t('clients.details.noBookings')}</h4>
                  <p className="text-gray-500">{t('clients.details.noBookingsDesc')}</p>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDetailsModal(false)}
                className="flex-1"
              >
                {t('clients.details.close')}
              </Button>
              <PermissionGate permission="manage_clients" showMessage={false}>
                {onEditClient && (
                  <Button
                    onClick={() => {
                      setShowDetailsModal(false);
                      onEditClient(selectedClient);
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4" />
                    {t('clients.edit')}
                  </Button>
                )}
              </PermissionGate>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteModal && clientToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={t('clients.deleteConfirm.title')}
          size="sm"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">{t('clients.delete')}</h4>
              <p className="text-gray-600">
                {t('clients.deleteConfirm.message')}{' '}
                <strong>{clientToDelete.firstname} {clientToDelete.lastname}</strong> ?
              </p>
              <p className="text-red-600 text-sm mt-2 font-medium">
                {t('clients.deleteConfirm.warning')}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                {t('clients.deleteConfirm.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4" />
                {t('clients.deleteConfirm.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
