import React, { useState, useEffect } from 'react';
import { Calendar, User, Euro, Package, Search, Mail, Phone, X, FileText, AlertCircle } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useBookings } from '../../hooks/useBookings';
import { useServices } from '../../hooks/useServices';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { usePlugins } from '../../hooks/usePlugins';
import { useBookingLimit } from '../../hooks/useBookingLimit';
import { Booking, Service, Client, Transaction } from '../../types';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { PaymentSection } from './PaymentSection';
import { TimeSlotPicker } from './TimeSlotPicker';
import { DatePicker } from './DatePicker';
import { ParticipantSelector } from './ParticipantSelector';
import { ClientSearch } from './ClientSearch';
import { TeamMemberSelector } from './TeamMemberSelector';
import { useAuth } from '../../contexts/AuthContext';
import { bookingEvents } from '../../lib/bookingEvents';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedTime: string;
  editingBooking?: Booking | null;
  onSuccess: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  editingBooking,
  onSuccess
}: BookingModalProps) {
  const { services, loading: servicesLoading, addService } = useServices();
  const { clients } = useClients();
  const { getOrCreateClient } = useClients();
  const { bookings, addBooking, updateBooking, deleteBooking } = useBookings();
  const { user } = useAuth();
  const { settings } = useBusinessSettings();
  const { ensureCustomServiceExists } = useServices();
  const { userPlugins } = usePlugins();
  const { limitInfo, canCreateBooking, isUnlimited, refetch: refetchLimit } = useBookingLimit();
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isCustomService, setIsCustomService] = useState(false);
  const [customServiceData, setCustomServiceData] = useState({
    name: '',
    price: 0,
    duration: 60
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState(selectedTime);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const hasMultiUserPlugin = userPlugins.some(p => p.plugin_slug === 'multi-user');

  const occupiedSlots = bookings
    .filter(booking => booking.date === date && (!editingBooking || booking.id !== editingBooking.id))
    .map(booking => booking.time);

  useEffect(() => {
    if (editingBooking) {
      const service = services.find(s => s.id === editingBooking.service_id);
      const isCustom = !service || service.description === 'Service personnalisé';
      
      setSelectedService(isCustom ? null : service);
      setIsCustomService(isCustom);
      
      if (isCustom) {
        let serviceName = 'Service personnalisé';
        
        if (editingBooking.custom_service_data?.name) {
          serviceName = editingBooking.custom_service_data.name;
        } else if (service?.name && service.name !== 'Service personnalisé') {
          serviceName = service.name;
        } else if (editingBooking.service?.name && editingBooking.service.name !== 'Service personnalisé') {
          serviceName = editingBooking.service.name;
        }
        
        const servicePrice = editingBooking.total_amount / editingBooking.quantity;
        
        setCustomServiceData({
          name: serviceName,
          price: servicePrice,
          duration: editingBooking.custom_service_data?.duration || editingBooking.duration_minutes
        });
      }
      setSelectedClient({
        id: '',
        firstname: editingBooking.client_firstname,
        lastname: editingBooking.client_name,
        email: editingBooking.client_email,
        phone: editingBooking.client_phone
      });
      setQuantity(editingBooking.quantity);
      setDate(editingBooking.date);
      setTime(editingBooking.time);
      setTransactions(editingBooking.transactions || []);
      setBookingStatus(editingBooking.booking_status || 'pending');
      setAssignedUserId(editingBooking.assigned_user_id || null);
      setNotes(editingBooking.notes || '');
    } else {
      setSelectedService(null);
      setIsCustomService(false);
      setCustomServiceData({ name: '', price: 0, duration: 60 });
      setSelectedClient(null);
      setQuantity(1);
      setDate(selectedDate);
      setTime(selectedTime);
      setTransactions([]);
      setBookingStatus('confirmed');
      setAssignedUserId(null);
      setNotes('');
    }
  }, [editingBooking, services, selectedDate, selectedTime]);

  const handleClose = () => {
    setSelectedClient(null);
    setSelectedService(null);
    setIsCustomService(false);
    setCustomServiceData({ name: '', price: 0, duration: 60 });
    setAssignedUserId(null);
    setNotes('');
    
    setTimeout(() => {
      const event = new CustomEvent('resetDatePicker');
      window.dispatchEvent(event);
    }, 100);
    
    onClose();
  };

  const calculateTotalAmount = () => {
    if (isCustomService) {
      return customServiceData.price * quantity;
    }
    if (!selectedService) return 0;
    return selectedService.price_ttc * quantity;
  };

  const calculateCurrentPaid = () => {
    return transactions
      .filter(transaction => transaction.status !== 'pending' && transaction.status !== 'cancelled')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const handleAddTransaction = (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      status: transaction.status || 'completed',
      created_at: new Date().toISOString()
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleGeneratePaymentLink = async (amount: number) => {
    if (!selectedClient || !selectedService) return;

    try {
      const expiryMinutes = settings?.payment_link_expiry_minutes || 30;
      const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);
      const paymentUrl = new URL('/payment', window.location.origin);
      
      paymentUrl.searchParams.set('amount', amount.toString());
      paymentUrl.searchParams.set('service', isCustomService ? customServiceData.name : selectedService.name);
      paymentUrl.searchParams.set('client', `${selectedClient.firstname} ${selectedClient.lastname}`);
      paymentUrl.searchParams.set('email', selectedClient.email);
      paymentUrl.searchParams.set('date', date);
      paymentUrl.searchParams.set('time', time);
      paymentUrl.searchParams.set('expires', expiresAt.toString());
      
      if (user?.id) {
        paymentUrl.searchParams.set('user_id', user.id);
      }

      const pendingTransaction = {
        amount: amount,
        method: 'stripe' as const,
        note: `Lien de paiement généré (expire dans ${expiryMinutes}min) - En attente - Lien: ${paymentUrl.toString()}`,
        status: 'pending' as const
      };
      
      setTransactions(prev => [...prev, {
        ...pendingTransaction,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }]);
      
      try {
        await navigator.clipboard.writeText(paymentUrl.toString());
      } catch (clipboardError) {
        console.warn('⚠️ Impossible de copier automatiquement:', clipboardError);
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération du lien:', error);
      
      let errorMessage = 'Erreur lors de la génération du lien de paiement';
      if (error instanceof Error) {
        errorMessage += `\n\nDétails: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 BookingModal - handleSubmit appelé');
    console.log('📋 Données du formulaire:', {
      selectedService,
      isCustomService,
      customServiceData,
      selectedClient,
      date,
      time,
      quantity,
      bookingStatus,
      assignedUserId,
      notes
    });
    
    if ((!selectedService && !isCustomService) || !selectedClient) {
      console.error('❌ Validation échouée: service ou client manquant');
      alert('Veuillez sélectionner un service et un client');
      return;
    }
    
    if (isCustomService && (!customServiceData.name || customServiceData.price <= 0)) {
      console.error('❌ Validation échouée: données service personnalisé invalides');
      alert('Veuillez remplir le nom et le prix du service personnalisé');
      return;
    }

    // Vérifier la limite uniquement pour les nouvelles réservations
    if (!editingBooking && !canCreateBooking) {
      console.error('❌ Limite de réservations atteinte');
      alert(
        `Limite de réservations atteinte !\n\n` +
        `Vous avez utilisé ${limitInfo?.current}/${limitInfo?.limit} réservations ce mois-ci.\n\n` +
        `Passez au plan Pro pour des réservations illimitées.`
      );
      return;
    }

    console.log('✅ Validation passée, début de la sauvegarde...');
    setSaving(true);
    
    try {
      console.log('🔍 Récupération/création du client...');
      const client = await getOrCreateClient({
        firstname: selectedClient.firstname,
        lastname: selectedClient.lastname,
        email: selectedClient.email,
        phone: selectedClient.phone
      });
      console.log('✅ Client récupéré:', client);

      const totalAmount = calculateTotalAmount();
      console.log('💰 Montant total calculé:', totalAmount);
      
      let serviceId: string | null = null;
      let serviceDuration;
      
      if (isCustomService) {
        console.log('🔧 Service personnalisé détecté');
        let customServiceTemplate = services.find(s => s.description === 'Service personnalisé');
        
        if (!customServiceTemplate) {
          console.log('⚠️ Template service personnalisé non trouvé, création...');
          try {
            customServiceTemplate = await ensureCustomServiceExists();
            console.log('✅ Template créé:', customServiceTemplate);
          } catch (error) {
            console.error('❌ Erreur création service personnalisé:', error);
            throw new Error('Impossible de créer le service personnalisé');
          }
        }
        
        serviceId = customServiceTemplate.id;
        serviceDuration = customServiceData.duration;
      } else {
        console.log('📦 Service standard sélectionné');
        serviceId = selectedService!.id;
        serviceDuration = selectedService!.duration_minutes;
      }
      
      const bookingData = {
        service_id: serviceId,
        date,
        time,
        duration_minutes: serviceDuration,
        quantity,
        client_name: client.lastname,
        client_firstname: client.firstname,
        client_email: client.email,
        client_phone: client.phone,
        total_amount: totalAmount,
        payment_status: 'pending' as const,
        payment_amount: calculateCurrentPaid(),
        transactions,
        booking_status: bookingStatus,
        assigned_user_id: assignedUserId,
        notes: notes.trim() || null,
        custom_service_data: isCustomService ? {
          name: customServiceData.name,
          price: customServiceData.price,
          duration: customServiceData.duration
        } : null
      };

      console.log('📝 Données de réservation préparées:', bookingData);

      if (editingBooking) {
        console.log('🔄 Mise à jour de la réservation existante:', editingBooking.id);
        const updatedBooking = await updateBooking(editingBooking.id, bookingData);
        console.log('✅ Réservation mise à jour:', updatedBooking);
        
        if (updatedBooking) {
          console.log('🔔 Émission événement bookingUpdated');
          bookingEvents.emit('bookingUpdated', updatedBooking);
        }
      } else {
        console.log('➕ Création d\'une nouvelle réservation');
        const newBooking = await addBooking(bookingData);
        console.log('✅ Nouvelle réservation créée:', newBooking);
        
        if (newBooking) {
          console.log('🔔 Émission événement bookingCreated');
          bookingEvents.emit('bookingCreated', newBooking);
          // Rafraîchir les limites après création
          console.log('🔄 Rafraîchissement des limites');
          refetchLimit();
        } else {
          console.error('❌ addBooking a retourné null/undefined');
        }
      }

      console.log('✅ Sauvegarde terminée avec succès');
      console.log('🎉 Appel de onSuccess()');
      onSuccess();
      console.log('🚪 Fermeture du modal');
      handleClose();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      console.log('🏁 Fin du processus de sauvegarde');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBooking) return;
    
    setSaving(true);
    try {
      await deleteBooking(editingBooking.id);
      
      bookingEvents.emit('bookingDeleted', editingBooking.id);
      
      // Rafraîchir les limites après suppression
      refetchLimit();
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = calculateTotalAmount();
  const currentPaid = calculateCurrentPaid();

  const getUnitName = () => {
    if (isCustomService) {
      return 'participants';
    }
    if (selectedService?.unit_name && selectedService.unit_name !== 'personnes') {
      return selectedService.unit_name;
    }
    return 'participants';
  };

  const getPluralUnitName = (qty: number) => {
    const unitName = getUnitName();
    if (qty <= 1) {
      return `${unitName.replace(/s$/, '')}(s)`;
    }
    return `${unitName}(s)`;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={editingBooking ? 'Modifier la réservation' : 'Nouvelle réservation'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 touch-action-pan-y">
          {/* Afficher l'alerte de limite si applicable */}
          {!editingBooking && limitInfo && !isUnlimited && (
            <div className={`rounded-xl p-4 ${
              canCreateBooking 
                ? limitInfo.remaining! <= 10
                  ? 'bg-yellow-50 border-2 border-yellow-300'
                  : 'bg-blue-50 border-2 border-blue-300'
                : 'bg-red-50 border-2 border-red-300'
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${
                  canCreateBooking
                    ? limitInfo.remaining! <= 10
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                    : 'text-red-600'
                }`} />
                <div className="flex-1">
                  <h4 className={`font-bold mb-1 ${
                    canCreateBooking
                      ? limitInfo.remaining! <= 10
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                      : 'text-red-800'
                  }`}>
                    {canCreateBooking 
                      ? `${limitInfo.remaining} réservation${limitInfo.remaining! > 1 ? 's' : ''} restante${limitInfo.remaining! > 1 ? 's' : ''} ce mois-ci`
                      : 'Limite de réservations atteinte !'
                    }
                  </h4>
                  <p className={`text-sm ${
                    canCreateBooking
                      ? limitInfo.remaining! <= 10
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                      : 'text-red-700'
                  }`}>
                    {canCreateBooking
                      ? `Vous avez utilisé ${limitInfo.current}/${limitInfo.limit} réservations. ${
                          limitInfo.remaining! <= 10 
                            ? 'Pensez à passer au plan Pro pour des réservations illimitées !' 
                            : ''
                        }`
                      : `Vous avez atteint votre limite de ${limitInfo.limit} réservations pour ce mois. Passez au plan Pro pour continuer !`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4 sm:space-y-6 touch-action-pan-y">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Service
                </label>
                
                <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomService(false);
                      setSelectedService(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-300 text-sm ${
                      !isCustomService
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Services standards
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomService(true);
                      setSelectedService(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all duration-300 text-sm ${
                      isCustomService
                        ? 'bg-white text-purple-600 shadow-md'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Service personnalisé
                  </button>
                </div>
                
                {servicesLoading ? (
                  <div className="flex items-center justify-center p-6 sm:p-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : !isCustomService ? (
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    {services.filter(service => service.description !== 'Service personnalisé').map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedService(service)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.02] text-left ${
                          selectedService?.id === service.id
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
                            selectedService?.id === service.id
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-sm sm:text-base">{service.name}</div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-1 sm:line-clamp-none">{service.description}</div>
                            <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
                              <span className="font-medium text-green-600">{service.price_ttc.toFixed(2)}€</span>
                              <span className="text-gray-500">{service.duration_minutes}min</span>
                              <span className="text-gray-500">Max {service.capacity} {service.unit_name || 'pers.'}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-purple-800">Service personnalisé</h3>
                        <p className="text-purple-600 text-xs sm:text-sm">Créez un service sur mesure</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Nom du service *
                        </label>
                        <input
                          type="text"
                          value={customServiceData.name}
                          onChange={(e) => setCustomServiceData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full pl-12 pr-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-base bg-white"
                          placeholder="Ex: Consultation spécialisée"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Prix (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={customServiceData.price || ''}
                            onChange={(e) => setCustomServiceData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-base bg-white"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Durée (min) *
                          </label>
                          <input
                            type="number"
                            min="15"
                            step="15"
                            value={customServiceData.duration || ''}
                            onChange={(e) => setCustomServiceData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                            className="w-full p-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-base bg-white"
                            placeholder="60"
                            required
                          />
                        </div>
                      </div>
                      
                      {customServiceData.name && customServiceData.price > 0 && (
                        <div className="bg-white border border-purple-300 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-gray-900 text-sm">{customServiceData.name}</div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                <span className="font-medium text-green-600">{customServiceData.price.toFixed(2)}€</span>
                                <span className="text-gray-500">{customServiceData.duration}min</span>
                                <span className="text-gray-500">Capacité illimitée</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <ClientSearch
                selectedClient={selectedClient}
                onClientSelect={setSelectedClient}
              />

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  required
                />

                <TimeSlotPicker
                  selectedDate={date}
                  selectedTime={time}
                  onTimeSelect={setTime}
                  occupiedSlots={occupiedSlots}
                  serviceDuration={isCustomService ? customServiceData.duration : selectedService?.duration_minutes || 60}
                />
              </div>

              {(selectedService || (isCustomService && customServiceData.name && customServiceData.price > 0)) && (
                <ParticipantSelector
                  quantity={quantity}
                  maxCapacity={isCustomService ? 10 : selectedService?.capacity || 1}
                  onQuantityChange={setQuantity}
                  unitName={getUnitName()}
                />
              )}

              {hasMultiUserPlugin && (
                <TeamMemberSelector
                  value={assignedUserId}
                  onChange={setAssignedUserId}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Notes internes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base resize-none"
                  rows={3}
                  placeholder="Ajoutez des notes ou commentaires sur cette réservation..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ces notes sont visibles uniquement par vous et votre équipe
                </p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {selectedClient && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Informations client</h3>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-600">Nom complet</div>
                      <div className="font-medium text-gray-900">
                        {selectedClient.firstname} {selectedClient.lastname}
                      </div>
                    </div>
                    {selectedClient.email && (
                      <div>
                        <div className="text-xs sm:text-sm text-gray-600">Email</div>
                        <div className="font-medium text-gray-900">{selectedClient.email}</div>
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div>
                        <div className="text-xs sm:text-sm text-gray-600">Téléphone</div>
                        <div className="font-medium text-gray-900">{selectedClient.phone}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selectedService || (isCustomService && customServiceData.name && customServiceData.price > 0)) && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                      <Euro className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Récapitulatif</h3>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service</span>
                      <span className="font-medium text-right">
                        {isCustomService ? customServiceData.name : selectedService?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix unitaire</span>
                      <span className="font-medium">
                        {isCustomService ? customServiceData.price.toFixed(2) : selectedService?.price_ttc.toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantité</span>
                      <span className="font-medium">{quantity} {getPluralUnitName(quantity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée</span>
                      <span className="font-medium">
                        {isCustomService ? customServiceData.duration : selectedService?.duration_minutes} minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date et heure</span>
                      <span className="font-medium">
                        {new Date(date).toLocaleDateString('fr-FR')} à {time.slice(0, 5)}
                      </span>
                    </div>
                    <hr className="border-green-200" />
                    <div className="flex justify-between text-base sm:text-lg font-bold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-green-600">{totalAmount.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              )}

              {(selectedService || (isCustomService && customServiceData.name && customServiceData.price > 0)) && selectedClient && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Statut de la réservation</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingStatus('pending')}
                      className={`p-3 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        bookingStatus === 'pending'
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-500 text-yellow-700 shadow-lg'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-yellow-300 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-xl mb-1">⏳</div>
                        <div className="text-xs font-bold">En attente</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStatus('confirmed')}
                      className={`p-3 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        bookingStatus === 'confirmed'
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 text-green-700 shadow-lg'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-xl mb-1">✅</div>
                        <div className="text-xs font-bold">Confirmée</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStatus('cancelled')}
                      className={`p-3 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        bookingStatus === 'cancelled'
                          ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500 text-red-700 shadow-lg'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-xl mb-1">❌</div>
                        <div className="text-xs font-bold">Annulée</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {(selectedService || (isCustomService && customServiceData.name && customServiceData.price > 0)) && selectedClient && (
                <PaymentSection
                  totalAmount={totalAmount}
                  currentPaid={currentPaid}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onGeneratePaymentLink={handleGeneratePaymentLink}
                  clientEmail={selectedClient?.email || ''}
                  serviceName={isCustomService ? customServiceData.name : selectedService?.name || ''}
                  bookingDate={date}
                  bookingTime={time}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto sm:min-w-[120px] bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || (!selectedService && (!isCustomService || !customServiceData.name || customServiceData.price <= 0)) || 
                !selectedClient?.firstname || !selectedClient?.lastname || !selectedClient?.email || !selectedClient?.phone ||
                (!editingBooking && !canCreateBooking)}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 px-6 py-3 text-sm sm:text-base"
              style={{
                background: 'rgb(13 163 26)',
                borderColor: 'rgb(20 221 76)',
                color: 'white'
              }}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Sauvegarde...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  {editingBooking ? 'Modifier' : 'Créer'}
                </span>
              )}
            </button>
          </div>
        </form>

        {editingBooking && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium text-sm sm:text-base"
            >
              Supprimer la réservation
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer cette réservation ? Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium text-sm sm:text-base"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Suppression...</span>
                </div>
              ) : (
                'Supprimer'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default BookingModal;
