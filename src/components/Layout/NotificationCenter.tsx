import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, CreditCard, AlertTriangle, CheckCircle, Calendar, CreditCard as Edit, Plus } from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { useServices } from '../../hooks/useServices';
import { bookingEvents } from '../../lib/bookingEvents';
import { notificationEvents } from '../../lib/notificationEvents';
import { Booking } from '../../types';

interface Notification {
  id: string;
  type: 'expired_payment' | 'pending_payment' | 'success' | 'new_booking' | 'booking_updated' | 'payment_link_expired' | 'payment_completed' | 'affiliate_conversion' | 'affiliate_commission';
  title: string;
  message: string;
  booking: Booking;
  timestamp: Date;
  read: boolean;
}

export function NotificationCenter() {
  const { bookings } = useBookings();
  const { services } = useServices();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Demander la permission pour les notifications système
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
            console.log('✅ Permission notifications accordée');
          }
        });
      }
    }
  }, []);

  // Écouter les événements de réservations
  useEffect(() => {
    const handlePaymentLinkExpired = (data: { booking: Booking; transaction: any; expiredAt: Date }) => {
      console.log('🔔 Lien de paiement expiré détecté:', data.booking.client_email);
      
      const notification: Notification = {
        id: `payment_expired_${data.booking.id}_${data.transaction.id}_${Date.now()}`,
        type: 'payment_link_expired',
        title: '⏰ Lien de paiement expiré',
        message: `Le lien de paiement de ${data.booking.client_firstname} ${data.booking.client_name} (${data.transaction.amount.toFixed(2)}€) vient d'expirer`,
        booking: data.booking,
        timestamp: data.expiredAt,
        read: false
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      // Notification système si supportée
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💳 Lien de paiement expiré', {
          body: `${data.booking.client_firstname} ${data.booking.client_name} - ${data.transaction.amount.toFixed(2)}€`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `payment-expired-${data.booking.id}`,
          requireInteraction: true
        });
      }
    };

    const handleNewBooking = (booking: Booking) => {
      console.log('🔔 Nouvelle réservation détectée:', booking.client_email);
      
      // Récupérer le nom du service depuis les services disponibles ou la réservation
      let serviceName = 'Service inconnu';
      
      // Essayer d'abord depuis l'objet service de la réservation
      if (booking.service?.name) {
        serviceName = booking.service.name;
      } else {
        // Sinon chercher dans la liste des services par service_id
        const service = services.find(s => s.id === booking.service_id);
        if (service?.name) {
          serviceName = service.name;
        }
      }
      
      const notification: Notification = {
        id: `new_booking_${booking.id}_${Date.now()}`,
        type: 'new_booking',
        title: 'Nouvelle réservation',
        message: `${booking.client_firstname} ${booking.client_name} a réservé ${serviceName} le ${new Date(booking.date).toLocaleDateString('fr-FR')} à ${booking.time}`,
        booking,
        timestamp: new Date(),
        read: false
      };
      
      setNotifications(prev => [notification, ...prev]);
    };

    const handleBookingUpdated = (booking: Booking) => {
      console.log('🔔 Réservation modifiée détectée:', booking.client_email);
      
      // Récupérer le nom du service depuis les services disponibles ou la réservation
      let serviceName = 'Service inconnu';
      
      // Essayer d'abord depuis l'objet service de la réservation
      if (booking.service?.name) {
        serviceName = booking.service.name;
      } else {
        // Sinon chercher dans la liste des services par service_id
        const service = services.find(s => s.id === booking.service_id);
        if (service?.name) {
          serviceName = service.name;
        }
      }
      
      // Vérifier si c'est un paiement qui vient d'être complété
      const hasCompletedPayment = booking.transactions?.some(t => 
        t.method === 'stripe' && 
        t.status === 'completed' && 
        t.created_at &&
        (Date.now() - new Date(t.created_at).getTime()) < 60000 // Moins d'1 minute
      );
      
      if (hasCompletedPayment) {
        // Vérifier si c'est un paiement d'acompte (pas le montant total)
        const isDepositPayment = (booking.payment_amount || 0) < booking.total_amount;
        const paymentType = isDepositPayment ? 'acompte' : 'solde';
        
        // Notification spécifique pour paiement complété
        const paymentNotification: Notification = {
          id: `payment_completed_${booking.id}_${Date.now()}`,
          type: 'payment_completed',
          title: `💰 ${paymentType === 'acompte' ? 'Acompte' : 'Paiement'} reçu !`,
          message: `${booking.client_firstname} ${booking.client_name} a payé ${paymentType === 'acompte' ? 'son acompte' : 'le solde'} (${(booking.payment_amount || 0).toFixed(2)}€) pour ${serviceName}`,
          booking,
          timestamp: new Date(),
          read: false
        };
        
        setNotifications(prev => [paymentNotification, ...prev]);
        
        // Notification système si supportée
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💰 ${paymentType === 'acompte' ? 'Acompte' : 'Paiement'} reçu !`, {
            body: `${booking.client_firstname} ${booking.client_name} - ${(booking.payment_amount || 0).toFixed(2)}€`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `payment-completed-${booking.id}`,
            requireInteraction: true
          });
        }
        
        return; // Ne pas créer la notification de modification standard
      }
      
      const notification: Notification = {
        id: `booking_updated_${booking.id}_${Date.now()}`,
        type: 'booking_updated',
        title: 'Réservation modifiée',
        message: `La réservation de ${booking.client_firstname} ${booking.client_name} (${serviceName}) a été mise à jour`,
        booking,
        timestamp: new Date(),
        read: false
      };
      
      setNotifications(prev => [notification, ...prev]);
    };

    bookingEvents.on('bookingCreated', handleNewBooking);
    bookingEvents.on('bookingUpdated', handleBookingUpdated);
    notificationEvents.on('paymentLinkExpired', handlePaymentLinkExpired);

    return () => {
      bookingEvents.off('bookingCreated', handleNewBooking);
      bookingEvents.off('bookingUpdated', handleBookingUpdated);
      notificationEvents.off('paymentLinkExpired', handlePaymentLinkExpired);
    };
  }, [services]);

  // Vérifier les liens de paiement expirés
  useEffect(() => {
    const checkExpiredPayments = () => {
      const now = Date.now();
      const newNotifications: Notification[] = [];

      bookings.forEach(booking => {
        // Vérifier si la réservation a des transactions en attente
        const pendingTransactions = booking.transactions?.filter(t => 
          t.method === 'stripe' && 
          t.status === 'pending' &&
          t.created_at
        ) || [];

        pendingTransactions.forEach(transaction => {
          const transactionTime = new Date(transaction.created_at).getTime();
          const expirationTime = transactionTime + (30 * 60 * 1000); // 30 minutes
          
          // Si le lien a expiré et le paiement n'est pas complété
          if (now > expirationTime && booking.payment_status !== 'completed') {
            const notificationId = `expired_${booking.id}_${transaction.id}`;
            
            // Vérifier si cette notification n'existe pas déjà
            const existingNotification = notifications.find(n => n.id === notificationId);
            if (!existingNotification) {
              newNotifications.push({
                id: notificationId,
                type: 'expired_payment',
                title: 'Lien de paiement expiré',
                message: `Le lien de paiement de ${booking.client_firstname} ${booking.client_name} (${transaction.amount.toFixed(2)}€) a expiré`,
                booking,
                timestamp: new Date(expirationTime),
                read: false
              });
            }
          }
        });

        // Notification pour paiements en attente (non expirés)
        if (booking.payment_status === 'pending' && pendingTransactions.length > 0) {
          const notificationId = `pending_${booking.id}`;
          const existingNotification = notifications.find(n => n.id === notificationId);
          
          if (!existingNotification) {
            newNotifications.push({
              id: notificationId,
              type: 'pending_payment',
              title: 'Paiement en attente',
              message: `${booking.client_firstname} ${booking.client_name} n'a pas encore payé (${(booking.total_amount - (booking.payment_amount || 0)).toFixed(2)}€)`,
              booking,
              timestamp: new Date(booking.created_at || Date.now()),
              read: false
            });
          }
        }
      });

      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev]);
      }
    };

    checkExpiredPayments();
    const interval = setInterval(checkExpiredPayments, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, [bookings, notifications]);

  // Calculer le nombre de notifications non lues
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_link_expired':
        return <Clock className="w-5 h-5 text-red-500" />;
      case 'payment_completed':
        return <CreditCard className="w-5 h-5 text-green-500" />;
      case 'affiliate_conversion':
        return <Gift className="w-5 h-5 text-purple-500" />;
      case 'affiliate_commission':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'new_booking':
        return <Plus className="w-5 h-5 text-green-500" />;
      case 'booking_updated':
        return <Edit className="w-5 h-5 text-blue-500" />;
      case 'expired_payment':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'pending_payment':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_link_expired':
        return 'from-red-50 to-pink-50 border-red-200';
      case 'payment_completed':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'affiliate_conversion':
        return 'from-purple-50 to-pink-50 border-purple-200';
      case 'affiliate_commission':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'new_booking':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'booking_updated':
        return 'from-blue-50 to-cyan-50 border-blue-200';
      case 'expired_payment':
        return 'from-red-50 to-pink-50 border-red-200';
      case 'pending_payment':
        return 'from-orange-50 to-yellow-50 border-orange-200';
      case 'success':
        return 'from-green-50 to-emerald-50 border-green-200';
      default:
        return 'from-blue-50 to-cyan-50 border-blue-200';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `il y a ${hours}h`;
    if (minutes > 0) return `il y a ${minutes}min`;
    return 'À l\'instant';
  };

  return (
    <div className="relative">
      {/* Bouton de notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-110"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown des notifications */}
      {isOpen && (
        <>
          <div className="fixed sm:absolute top-20 sm:top-full left-1/2 sm:left-auto sm:right-0 transform -translate-x-1/2 sm:translate-x-0 sm:translate-y-0 sm:mt-2 w-96 max-w-[90vw] sm:max-w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100000] max-h-96 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  <h3 className="font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-white/80 hover:text-white mt-2 underline"
                >
                  Marquer tout comme lu
                </button>
              )}
              
              {/* Indicateur permission notifications */}
              {notificationPermission !== 'granted' && (
                <div className="mt-2 text-xs text-white/60">
                  💡 Activez les notifications pour être alerté
                </div>
              )}
            </div>

            {/* Liste des notifications */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.slice(0, 10).map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors animate-fadeIn ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                            
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Marquer comme lu
                              </button>
                            )}
                          </div>
                          
                          {/* Informations de la réservation */}
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-600">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-3 h-3" />
                                <span>
                                  {notification.booking.service?.name} - {new Date(notification.booking.date).toLocaleDateString('fr-FR')} à {notification.booking.time.slice(0, 5)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-[99999] bg-black/20 sm:bg-transparent" 
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}