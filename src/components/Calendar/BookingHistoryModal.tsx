import React, { useState, useEffect } from 'react';
import { X, Clock, User, CreditCard, CheckCircle, XCircle, AlertCircle, FileText, UserCheck, History, Edit, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface HistoryEvent {
  id: string;
  event_type: string;
  event_data: any;
  description: string;
  created_at: string;
  user_email: string | null;
}

interface BookingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  clientName: string;
}

export function BookingHistoryModal({ isOpen, onClose, bookingId, clientName }: BookingHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      loadHistory();
    }
  }, [isOpen, bookingId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase!
        .rpc('get_booking_history', { booking_id_param: bookingId });

      if (rpcError) throw rpcError;

      setHistory(data || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      setError('Impossible de charger l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEventDetails = (eventType: string, eventData: any) => {
    if (!eventData || Object.keys(eventData).length === 0) return null;

    const details: JSX.Element[] = [];

    // Date
    if (eventData.date) {
      details.push(
        <div key="date" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">📅 Date</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.date.old}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.date.new}</span>
          </div>
        </div>
      );
    }

    // Heure
    if (eventData.time) {
      details.push(
        <div key="time" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">🕐 Heure</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.time.old?.substring(0, 5)}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.time.new?.substring(0, 5)}</span>
          </div>
        </div>
      );
    }

    // Service
    if (eventData.service) {
      details.push(
        <div key="service" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">🎯 Service</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.service.old_name}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.service.new_name}</span>
          </div>
        </div>
      );
    }

    // Quantité
    if (eventData.quantity) {
      details.push(
        <div key="quantity" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">👥 Quantité</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.quantity.old}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.quantity.new}</span>
          </div>
        </div>
      );
    }

    // Durée
    if (eventData.duration) {
      details.push(
        <div key="duration" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">⏱️ Durée</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.duration.old} min</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.duration.new} min</span>
          </div>
        </div>
      );
    }

    // Montant total
    if (eventData.total_amount) {
      details.push(
        <div key="total_amount" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">💰 Montant total</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.total_amount.old}€</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.total_amount.new}€</span>
          </div>
        </div>
      );
    }

    // Nom du client
    if (eventData.client_name) {
      details.push(
        <div key="client_name" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">👤 Nom du client</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.client_name.old}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.client_name.new}</span>
          </div>
        </div>
      );
    }

    // Email du client
    if (eventData.client_email) {
      details.push(
        <div key="client_email" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">📧 Email</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through text-sm">{eventData.client_email.old}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold text-sm">{eventData.client_email.new}</span>
          </div>
        </div>
      );
    }

    // Téléphone du client
    if (eventData.client_phone) {
      details.push(
        <div key="client_phone" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">📱 Téléphone</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through">{eventData.client_phone.old}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold">{eventData.client_phone.new}</span>
          </div>
        </div>
      );
    }

    // Transactions
    if (eventData.transactions) {
      const oldTransactions = Array.isArray(eventData.transactions.old) ? eventData.transactions.old : [];
      const newTransactions = Array.isArray(eventData.transactions.new) ? eventData.transactions.new : [];
      
      details.push(
        <div key="transactions" className="py-2">
          <span className="text-gray-600 font-medium block mb-2">💳 Transactions</span>
          <div className="space-y-2 pl-4">
            {oldTransactions.length > 0 && (
              <div className="text-sm">
                <span className="text-red-600 font-medium">Avant:</span>
                <div className="mt-1 space-y-1">
                  {oldTransactions.map((t: any, i: number) => (
                    <div key={i} className="text-gray-600 line-through">
                      • {t.amount}€ - {t.method} ({t.status})
                    </div>
                  ))}
                </div>
              </div>
            )}
            {newTransactions.length > 0 && (
              <div className="text-sm">
                <span className="text-green-600 font-medium">Après:</span>
                <div className="mt-1 space-y-1">
                  {newTransactions.map((t: any, i: number) => (
                    <div key={i} className="text-gray-600 font-semibold">
                      • {t.amount}€ - {t.method} ({t.status})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Service personnalisé
    if (eventData.custom_service) {
      details.push(
        <div key="custom_service" className="py-2">
          <span className="text-gray-600 font-medium block mb-2">🎨 Service personnalisé</span>
          <div className="space-y-2 pl-4 text-sm">
            {eventData.custom_service.old && (
              <div className="text-red-600 line-through">
                Avant: {eventData.custom_service.old.name} - {eventData.custom_service.old.price}€ - {eventData.custom_service.old.duration}min
              </div>
            )}
            {eventData.custom_service.new && (
              <div className="text-green-600 font-semibold">
                Après: {eventData.custom_service.new.name} - {eventData.custom_service.new.price}€ - {eventData.custom_service.new.duration}min
              </div>
            )}
          </div>
        </div>
      );
    }

    // Statut (pour les changements de statut)
    if (eventData.old_status && eventData.new_status) {
      details.push(
        <div key="status" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">📊 Statut</span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 line-through capitalize">{eventData.old_status}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-green-600 font-semibold capitalize">{eventData.new_status}</span>
          </div>
        </div>
      );
    }

    // Notes
    if (eventData.note) {
      details.push(
        <div key="note" className="py-2">
          <span className="text-gray-600 font-medium block mb-2">📝 Note</span>
          <div className="bg-amber-50 rounded-lg p-3 text-sm text-gray-700">
            {eventData.note}
          </div>
        </div>
      );
    }

    // Utilisateur assigné
    if (eventData.assigned_user_email) {
      details.push(
        <div key="assigned_user" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">👤 Assigné à</span>
          <span className="text-indigo-600 font-semibold">{eventData.assigned_user_email}</span>
        </div>
      );
    }

    if (eventData.unassigned_user_email) {
      details.push(
        <div key="unassigned_user" className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 font-medium">👤 Désassigné de</span>
          <span className="text-red-600 font-semibold">{eventData.unassigned_user_email}</span>
        </div>
      );
    }

    return details.length > 0 ? (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <details className="text-sm">
          <summary className="cursor-pointer hover:text-gray-900 font-medium text-gray-700 flex items-center gap-2">
            <span>📋 Voir les détails des modifications</span>
          </summary>
          <div className="mt-3 bg-white rounded-lg p-4 space-y-2 border border-gray-200">
            {details}
          </div>
        </details>
      </div>
    ) : null;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'status_change':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'payment_added':
      case 'payment_updated':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'online_confirmation':
        return <CheckCircle className="w-5 h-5 text-purple-600" />;
      case 'note_added':
      case 'note_updated':
        return <FileText className="w-5 h-5 text-amber-600" />;
      case 'assigned_user_changed':
        return <UserCheck className="w-5 h-5 text-indigo-600" />;
      case 'booking_updated':
        return <Edit className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'status_change':
        return 'from-blue-50 to-cyan-50 border-blue-200';
      case 'payment_added':
      case 'payment_updated':
        return 'from-green-50 to-teal-50 border-green-200';
      case 'online_confirmation':
        return 'from-purple-50 to-pink-50 border-purple-200';
      case 'note_added':
      case 'note_updated':
        return 'from-amber-50 to-yellow-50 border-amber-200';
      case 'assigned_user_changed':
        return 'from-indigo-50 to-blue-50 border-indigo-200';
      case 'booking_updated':
        return 'from-orange-50 to-red-50 border-orange-200';
      default:
        return 'from-gray-50 to-slate-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
      <div className="bg-white w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content">
        {/* Header */}
        <div className="relative overflow-hidden touch-action-none sticky top-0 z-10 modal-header modal-safe-top">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 pr-2">
                <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl items-center justify-center shadow-lg">
                  <History className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-2xl font-bold text-white drop-shadow-lg">
                    Historique de la réservation
                  </h2>
                  <p className="text-xs sm:text-base text-white/80 mt-0.5 sm:mt-1">
                    {clientName}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
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
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun historique disponible</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {/* Ligne verticale */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200"></div>

                {/* Événements */}
                <div className="space-y-6">
                  {history.map((event, index) => (
                    <div key={event.id} className="relative pl-16 animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                      {/* Icône */}
                      <div className="absolute left-3 top-0 w-10 h-10 bg-white rounded-full border-2 border-indigo-200 flex items-center justify-center shadow-lg z-10">
                        {getEventIcon(event.event_type)}
                      </div>

                      {/* Carte d'événement */}
                      <div className={`bg-gradient-to-r ${getEventColor(event.event_type)} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow`}>
                        {/* Heure et date */}
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span className="text-lg font-bold text-gray-900">
                            {formatTime(event.created_at)}
                          </span>
                          <span className="text-sm text-gray-600">
                            - {formatDate(event.created_at)}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-gray-900 font-medium mb-2">
                          {event.description}
                        </p>

                        {/* Utilisateur */}
                        {event.user_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-3 h-3" />
                            <span>{event.user_email}</span>
                          </div>
                        )}

                        {/* Détails formatés */}
                        {formatEventDetails(event.event_type, event.event_data)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bouton fermer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
