import React, { useState, useEffect } from 'react';
import { Calendar, User, Euro, Package, Search, Mail, Phone, X } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useBookings } from '../../hooks/useBookings';
import { useServices } from '../../hooks/useServices';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { Booking, Service, Client, Transaction } from '../../types';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { PaymentSection } from './PaymentSection';
import { TimeSlotPicker } from './TimeSlotPicker';
import { DatePicker } from './DatePicker';
import { ParticipantSelector } from './ParticipantSelector';
import { ClientSearch } from './ClientSearch';
import { useAuth } from '../../contexts/AuthContext';
import { bookingEvents } from '../../lib/bookingEvents';
import { triggerWorkflow, sendConfirmationEmail } from '../../lib/workflowEngine';

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

  // Calculer les créneaux occupés pour la date sélectionnée
  const occupiedSlots = bookings
    .filter(booking => booking.date === date && (!editingBooking || booking.id !== editingBooking.id))
    .map(booking => booking.time);

  // Initialiser les données lors de l'édition
  useEffect(() => {
    if (editingBooking) {
      const service = services.find(s => s.id === editingBooking.service_id);
      
      // Vérifier si c'est un service personnalisé
      const isCustom = !service || service.description === 'Service personnalisé';
      
      setSelectedService(isCustom ? null : service);
      setIsCustomService(isCustom);
      
      if (isCustom) {
        // Reconstituer les données du service personnalisé
        let serviceName = 'Service personnalisé';
        
        // Priorité 1: custom_service_data (données stockées dans la réservation)
        if (editingBooking.custom_service_data?.name) {
          serviceName = editingBooking.custom_service_data.name;
        }
        // Priorité 2: service.name si disponible
        else if (service?.name && service.name !== 'Service personnalisé') {
          serviceName = service.name;
        }
        // Priorité 3: editingBooking.service?.name
        else if (editingBooking.service?.name && editingBooking.service.name !== 'Service personnalisé') {
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
    } else {
      // Réinitialiser pour une nouvelle réservation
      setSelectedService(null);
      setIsCustomService(false);
      setCustomServiceData({ name: '', price: 0, duration: 60 });
      setSelectedClient(null);
      setQuantity(1);
      setDate(selectedDate);
      setTime(selectedTime);
      setTransactions([]);
      setBookingStatus('confirmed');
    }
  }, [editingBooking, services, selectedDate, selectedTime]);

  const handleClose = () => {
    setSelectedClient(null);
    setSelectedService(null);
    setIsCustomService(false);
    setCustomServiceData({ name: '', price: 0, duration: 60 });
    
    // Réinitialiser la date pour forcer le recentrage du calendrier
    setTimeout(() => {
      // Déclencher un événement pour recentrer le calendrier
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
      console.log('🔄 Début génération lien de paiement:', {
        amount,
        client: selectedClient.email,
        service: isCustomService ? customServiceData.name : selectedService.name
      });

      // Créer l'URL du lien de paiement
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
      
      // Ajouter l'user_id pour la cohérence
      if (user?.id) {
        paymentUrl.searchParams.set('user_id', user.id);
      }

      console.log('✅ URL de paiement générée:', paymentUrl.toString());

      // Ajouter une transaction "en attente" pour le lien de paiement
      const pendingTransaction = {
        amount: amount,
        method: 'stripe' as const,
        note: `Lien de paiement généré (expire dans ${expiryMinutes}min) - En attente`,
        status: 'pending' as const
      };
      
      // Ajouter la transaction à l'état local
      setTransactions(prev => [...prev, {
        ...pendingTransaction,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }]);

      // Préparer les données de réservation pour le workflow
      const bookingDataForWorkflow = {
        id: editingBooking?.id || crypto.randomUUID(),
        service_id: isCustomService ? 'custom' : selectedService.id,
        date,
        time,
        duration_minutes: isCustomService ? customServiceData.duration : selectedService.duration_minutes,
        quantity,
        client_name: selectedClient.lastname,
        client_firstname: selectedClient.firstname,
        client_email: selectedClient.email,
        client_phone: selectedClient.phone,
        total_amount: calculateTotalAmount(),
        payment_status: 'pending' as const,
        payment_amount: calculateCurrentPaid(),
        payment_link: paymentUrl.toString(),
        transactions: [...transactions, {
          ...pendingTransaction,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        }],
        booking_status: bookingStatus,
        service: isCustomService ? {
          id: 'custom',
          name: customServiceData.name,
          price_ttc: customServiceData.price,
          duration_minutes: customServiceData.duration,
          description: 'Service personnalisé'
        } : selectedService,
        custom_service_data: isCustomService ? customServiceData : null
      };

      // Déclencher le workflow pour lien de paiement créé
      if (user?.id) {
        console.log('🚀 Déclenchement workflow payment_link_created pour:', selectedClient.email);
        
        try {
          await triggerWorkflow('payment_link_created', bookingDataForWorkflow, user.id);
          console.log('✅ Workflow payment_link_created déclenché avec succès');
        } catch (error) {
          console.error('❌ Erreur déclenchement workflow payment_link_created:', error);
          // Ne pas faire échouer la génération du lien pour une erreur de workflow
        }
      }
      
      // Copier le lien dans le presse-papiers
      try {
        await navigator.clipboard.writeText(paymentUrl.toString());
        console.log('✅ Lien copié dans le presse-papiers');
      } catch (clipboardError) {
        console.warn('⚠️ Impossible de copier automatiquement:', clipboardError);
        // Continuer même si la copie échoue
      }
      
      console.log('✅ Lien de paiement généré avec succès');
      
    } catch (error) {
      console.error('Erreur lors de la génération du lien:', error);
      
      // Message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de la génération du lien de paiement';
      if (error instanceof Error) {
        errorMessage += `\n\nDétails: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!selectedService && !isCustomService) || !selectedClient) {
      alert('Veuillez sélectionner un service et un client');
      return;
    }
    
    if (isCustomService && (!customServiceData.name || customServiceData.price <= 0)) {
      alert('Veuillez remplir le nom et le prix du service personnalisé');
      return;
    }

    setSaving(true);
    
    try {
      // Créer ou récupérer le client
      const client = await getOrCreateClient({
        firstname: selectedClient.firstname,
        lastname: selectedClient.lastname,
        email: selectedClient.email,
        phone: selectedClient.phone
      });

      const totalAmount = calculateTotalAmount();
      
      let serviceId: string | null = null;
      let serviceDuration;
      
      if (isCustomService) {
        // Pour les services personnalisés, créer ou récupérer le service template
        let customServiceTemplate = services.find(s => s.description === 'Service personnalisé');
        
        if (!customServiceTemplate) {
          // Créer le service personnalisé s'il n'existe pas
          try {
            customServiceTemplate = await ensureCustomServiceExists();
          } catch (error) {
            console.error('Erreur création service personnalisé:', error);
            throw new Error('Impossible de créer le service personnalisé');
          }
        }
        
        serviceId = customServiceTemplate.id;
        serviceDuration = customServiceData.duration;
      } else {
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
        // Stocker les données du service personnalisé directement dans la réservation
        custom_service_data: isCustomService ? {
          name: customServiceData.name,
          price: customServiceData.price,
          duration: customServiceData.duration
        } : null
      };

      if (editingBooking) {
        const updatedBooking = await updateBooking(editingBooking.id, bookingData);
        
        // Émettre l'événement de modification immédiatement
        if (updatedBooking) {
          bookingEvents.emit('bookingUpdated', updatedBooking);
        }
      } else {
        const newBooking = await addBooking(bookingData);
        
        // Émettre l'événement de création seulement si pas de lien de paiement en attente
        if (newBooking) {
          // Vérifier s'il y a des transactions Stripe en attente
          const hasPendingStripeTransaction = newBooking.transactions?.some(t => 
            t.method === 'stripe' && t.status === 'pending'
          );
          
          if (!hasPendingStripeTransaction) {
            // Pas de lien de paiement en attente → déclencher le workflow immédiatement
            console.log('✅ Réservation créée sans lien de paiement - déclenchement workflow immédiat');
            bookingEvents.emit('bookingCreated', newBooking);
          } else {
            // Lien de paiement en attente → attendre le paiement
            console.log('⏳ Réservation créée avec lien de paiement - workflow en attente du paiement');
          }
        }
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBooking) return;
    
    setSaving(true);
    try {
      await deleteBooking(editingBooking.id);
      
      // Émettre l'événement de suppression
      bookingEvents.emit('bookingDeleted', editingBooking.id);
      
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={editingBooking ? 'Modifier la réservation' : 'Nouvelle réservation'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 touch-action-pan-y">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Colonne gauche - Informations principales */}
            <div className="space-y-4 sm:space-y-6 touch-action-pan-y">
              {/* Sélection du service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Service
                </label>
                
                {/* Toggle Service Standard/Personnalisé */}
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
                              <span className="text-gray-500">Max {service.capacity} pers.</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Formulaire Service Personnalisé */
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
                      
                      {/* Aperçu du service personnalisé */}
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

              {/* Sélection client */}
              <ClientSearch
                selectedClient={selectedClient}
                onClientSelect={setSelectedClient}
              />

              {/* Date et heure côte à côte */}
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

              {/* Participants */}
              {(selectedService || (isCustomService && customServiceData.name && customServiceData.price > 0)) && (
                <ParticipantSelector
                  quantity={quantity}
                  maxCapacity={isCustomService ? 10 : selectedService?.capacity || 1}
                  onQuantityChange={setQuantity}
                />
              )}

            </div>

            {/* Colonne droite - Informations client et récapitulatif */}
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
                      <span className="font-medium">{quantity} participant(s)</span>
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

              {/* Section Paiement */}
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

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving || (!selectedService && (!isCustomService || !customServiceData.name || customServiceData.price <= 0)) || 
                !selectedClient?.firstname || !selectedClient?.lastname || !selectedClient?.email || !selectedClient?.phone}
              className="inline-flex items-center justify-center gap-1 sm:gap-2 font-medium rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 px-4 sm:px-6 py-3 text-sm sm:text-base min-h-[44px] flex-1"
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
            </Button>
          </div>
        </form>

        {/* Bouton de suppression - en dehors du formulaire */}
        {editingBooking && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Supprimer la réservation
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal de confirmation de suppression */}
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Suppression...</span>
                </div>
              ) : (
                'Supprimer'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default BookingModal;