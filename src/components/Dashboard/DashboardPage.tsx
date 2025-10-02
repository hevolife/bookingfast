import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  Euro, 
  AlertCircle, 
  CheckCircle,
  Star,
  Activity,
  BarChart3,
  ArrowUp,
  Eye,
  Phone,
  Mail,
  Shield,
  Award,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { useServices } from '../../hooks/useServices';
import { useTeam } from '../../hooks/useTeam';
import { PermissionGate } from '../UI/PermissionGate';
import { Booking, Service } from '../../types';
import { getBusinessTimezone, getCurrentDateInTimezone, formatInBusinessTimezone } from '../../lib/timezone';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { Modal } from '../UI/Modal';

interface DashboardStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  upcomingBookings: Booking[];
  pendingPayments: Booking[];
  completedPayments: Booking[];
  popularServices: Array<{ service: Service; count: number; revenue: number }>;
}

export function DashboardPage() {
  const { bookings, loading: bookingsLoading } = useBookings();
  const { services, loading: servicesLoading } = useServices();
  const { hasPermission, getUserRoleInfo, getUsageLimits, canViewFinancialData } = useTeam();
  const { settings } = useBusinessSettings();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  const userRole = getUserRoleInfo();
  const usageLimits = getUsageLimits();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayBookings: 0,
    weekBookings: 0,
    monthBookings: 0,
    upcomingBookings: [],
    pendingPayments: [],
    completedPayments: [],
    popularServices: []
  });

  useEffect(() => {
    // Éviter les recalculs multiples avec un debounce
    let mounted = true;
    
    const calculateStatsDebounced = () => {
      if (mounted && bookings.length > 0 && services.length > 0 && settings) {
        calculateStats();
      }
    };
    
    const timer = setTimeout(calculateStatsDebounced, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [bookings.length, services.length, settings?.id]); // Dépendances optimisées

  const calculateStats = () => {
    const timezone = getBusinessTimezone(settings);
    const today = getCurrentDateInTimezone(timezone);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filtrer les réservations par période
    const todayBookings = bookings.filter(b => b.date === today);
    const weekBookings = bookings.filter(b => new Date(b.date) >= startOfWeek);
    const monthBookings = bookings.filter(b => new Date(b.date) >= startOfMonth);

    // Calculer les revenus basés sur le montant total des réservations
    const todayRevenue = todayBookings.reduce((sum, b) => sum + b.total_amount, 0);
    const weekRevenue = weekBookings.reduce((sum, b) => sum + b.total_amount, 0);
    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.total_amount, 0);

    // Réservations à venir (dans les 24h)
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const upcomingBookings = bookings
      .filter(b => {
        const bookingDate = new Date(b.date);
        const bookingDateTime = new Date(`${b.date}T${b.time}`);
        return bookingDateTime >= now && bookingDate <= tomorrow && b.booking_status !== 'cancelled';
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      })
      .slice(0, 5);

    // Paiements en attente
    const pendingPayments = bookings
      .filter(b => (b.payment_status === 'pending' || (b.payment_amount || 0) < b.total_amount) && b.booking_status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    // Paiements complétés récemment
    const completedPayments = bookings
      .filter(b => b.payment_status === 'completed' && b.booking_status !== 'cancelled')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    // Services populaires
    const serviceStats = new Map<string, { count: number; revenue: number; service: Service }>();
    
    monthBookings.forEach(booking => {
      const service = services.find(s => s.id === booking.service_id);
      if (service) {
        const current = serviceStats.get(service.id) || { count: 0, revenue: 0, service };
        serviceStats.set(service.id, {
          count: current.count + booking.quantity,
          revenue: current.revenue + booking.total_amount,
          service
        });
      }
    });

    const popularServices = Array.from(serviceStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      todayRevenue,
      weekRevenue,
      monthRevenue,
      todayBookings: todayBookings.length,
      weekBookings: weekBookings.length,
      monthBookings: monthBookings.length,
      upcomingBookings,
      pendingPayments,
      completedPayments,
      popularServices
    });
  };

  const getRevenueForPeriod = () => {
    switch (selectedPeriod) {
      case 'today': return stats.todayRevenue;
      case 'week': return stats.weekRevenue;
      case 'month': return stats.monthRevenue;
      default: return stats.todayRevenue;
    }
  };

  const getBookingsForPeriod = () => {
    switch (selectedPeriod) {
      case 'today': return stats.todayBookings;
      case 'week': return stats.weekBookings;
      case 'month': return stats.monthBookings;
      default: return stats.todayBookings;
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const formatDate = (date: string) => {
    const timezone = getBusinessTimezone(settings);
    return formatInBusinessTimezone(new Date(date), timezone, {
      day: 'numeric',
      month: 'short'
    });
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const handleCallClient = (booking: Booking) => {
    const phoneNumber = booking.client_phone.replace(/\s/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
  };
  
  if (bookingsLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Header avec informations de rôle */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Vue d'ensemble de votre activité</p>
            </div>
            
            <div className={`bg-gradient-to-r ${userRole.color.replace('500', '50')} border-2 ${userRole.color.replace('500', '200').replace('from-', 'border-').replace(' to-', ' ')} rounded-xl p-3`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 bg-gradient-to-r ${userRole.color} rounded-lg flex items-center justify-center text-white`}>
                  {userRole.level === 4 ? <Crown className="w-4 h-4" /> :
                   userRole.level === 3 ? <Shield className="w-4 h-4" /> :
                   userRole.level === 2 ? <Star className="w-4 h-4" /> :
                   <Award className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{userRole.name}</div>
                  <div className="text-xs text-gray-600">Niveau {userRole.level}</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Sélecteur de période */}
        <div className="mb-4 sm:mb-6">
          <div className="flex gap-1 sm:gap-2 bg-white rounded-2xl p-2 shadow-lg w-full sm:w-fit overflow-x-auto">
            {[
              { key: 'today', label: 'Aujourd\'hui' },
              { key: 'week', label: 'Semaine' },
              { key: 'month', label: 'Ce mois' }
            ].map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key as any)}
                className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
                  selectedPeriod === period.key
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Chiffre d'affaires - Conditionnel selon permissions */}
          <PermissionGate permission="view_revenue" showMessage={false} 
            alternative={
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">***</div>
                <div className="text-gray-200 text-xs sm:text-sm">Accès restreint</div>
              </div>
            }
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Euro className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-200" />
              </div>
              <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
                {getRevenueForPeriod().toFixed(2)}€
              </div>
              <div className="text-green-100 text-xs sm:text-sm">
                CA {selectedPeriod === 'today' ? 'jour' : selectedPeriod === 'week' ? 'semaine' : 'mois'}
              </div>
            </div>
          </PermissionGate>

          {/* Réservations */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
            </div>
            <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
              {getBookingsForPeriod()}
            </div>
            <div className="text-blue-100 text-xs sm:text-sm">
              RDV {selectedPeriod === 'today' ? 'jour' : selectedPeriod === 'week' ? 'semaine' : 'mois'}
            </div>
          </div>

          {/* Paiements en attente - Conditionnel selon permissions */}
          <PermissionGate permission="view_payments" showMessage={false}
            alternative={
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">***</div>
                <div className="text-gray-200 text-xs sm:text-sm">Accès restreint</div>
              </div>
            }
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-200" />
              </div>
              <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
                {stats.pendingPayments.length}
              </div>
              <div className="text-orange-100 text-xs sm:text-sm">
                En attente
              </div>
            </div>
          </PermissionGate>

          {/* Paiements complétés - Conditionnel selon permissions */}
          <PermissionGate permission="view_payments" showMessage={false}
            alternative={
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">***</div>
                <div className="text-gray-200 text-xs sm:text-sm">Accès restreint</div>
              </div>
            }
          >
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Star className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-200" />
              </div>
              <div className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
                {stats.completedPayments.length}
              </div>
              <div className="text-purple-100 text-xs sm:text-sm">
                Complétés
              </div>
            </div>
          </PermissionGate>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Réservations à venir */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Prochaines réservations</h2>
                  <p className="text-gray-600 text-xs sm:text-sm">Dans les 24 prochaines heures</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {stats.upcomingBookings.length > 0 ? (
                  stats.upcomingBookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl border border-blue-200 hover:shadow-md transition-all duration-300 animate-fadeIn"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base">
                        {booking.client_firstname.charAt(0)}{booking.client_name.charAt(0)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-sm sm:text-base">
                          {booking.client_firstname} {booking.client_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 sm:hidden">
                          {booking.booking_status === 'confirmed' ? '✅ Confirmée' : '⏳ En attente'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {services.find(s => s.id === booking.service_id)?.name}
                        </div>
                      </div>
                      
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <div className="font-bold text-blue-600 text-sm sm:text-base">
                          {formatDate(booking.date)} à {formatTime(booking.time)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {booking.duration_minutes}min • {booking.quantity} pers.
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 sm:hidden">
                          {booking.booking_status === 'confirmed' ? '✅ Confirmée' : '⏳ En attente'}
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleViewBooking(booking)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors transform hover:scale-110 mobile-tap-target"
                          title="Voir les détails">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCallClient(booking)}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors transform hover:scale-110 mobile-tap-target"
                          title={`Appeler ${booking.client_phone}`}>
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm sm:text-base">Aucune réservation dans les 24h</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar droite */}
          <div className="space-y-4 sm:space-y-6">
            {/* Services populaires */}
            <PermissionGate permission="view_services">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Services populaires</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">Ce mois</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {stats.popularServices.map((item, index) => (
                    <div key={item.service.id} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs sm:text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">{item.service.name}</div>
                        <div className="text-xs text-gray-500">{item.count} réservations</div>
                      </div>
                      <PermissionGate permission="view_revenue" showMessage={false}>
                        <div className="text-right">
                          <div className="font-bold text-green-600 text-xs sm:text-sm">{item.revenue.toFixed(0)}€</div>
                        </div>
                      </PermissionGate>
                    </div>
                  ))}
                </div>
              </div>
            </PermissionGate>

            {/* Paiements en attente */}
            <PermissionGate permission="view_payments">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Paiements en attente</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">{stats.pendingPayments.length} en attente</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {stats.pendingPayments.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="flex items-center gap-2 sm:gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        {booking.client_firstname.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">
                          {booking.client_firstname} {booking.client_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(booking.date)} • {(booking.total_amount - (booking.payment_amount || 0)).toFixed(2)}€
                        </div>
                      </div>
                      <PermissionGate permission="create_payment_link" showMessage={false}>
                        <button className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors mobile-tap-target">
                          <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  ))}
                </div>
              </div>
            </PermissionGate>
          </div>
        </div>
      </div>
      
      {/* Modal de détails de réservation */}
      {showBookingModal && selectedBooking && (
        <Modal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
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
                    onClick={() => handleCallClient(selectedBooking)}
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
                     selectedBooking.payment_status === 'partial' ? '💵 Partiellement' : '❌ Non payé'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleCallClient(selectedBooking)}
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
