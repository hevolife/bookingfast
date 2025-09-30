import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, CreditCard, Package, Save, Plus, Trash2, Link, Euro, Calculator, Send, Timer, Copy, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { useClients } from '../../hooks/useClients';
import { useBookings } from '../../hooks/useBookings';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useAuth } from '../../contexts/AuthContext';
import { Service, Client, Booking, Transaction } from '../../types';
import { ClientSearch } from './ClientSearch';
import { DatePicker } from './DatePicker';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ParticipantSelector } from './ParticipantSelector';
import { PaymentSection } from './PaymentSection';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { triggerWorkflow } from '../../lib/workflowEngine';
import { bookingEvents } from '../../lib/bookingEvents';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedTime: string;
  editingBooking?: Booking | null;
  onSuccess?: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  editingBooking,
  onSuccess
}: BookingModalProps) {
  const { user } = useAuth();
  const { services, ensureCustomServiceExists } = useServices();
  const { getOrCreateClient } = useClients();
  const { addBooking, updateBooking } = useBookings();
  const { settings } = useBusinessSettings();

  // Form state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isCustomService, setIsCustomService] = useState(false);
  const [customServiceData, setCustomServiceData] = useState({
    name: '',
    price: 0,
    duration: 60
  });
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState(selectedTime);
  const [quantity, setQuantity] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize form with editing data
  useEffect(() => {
    if (editingBooking) {
      const service = services.find(s => s.id === editingBooking.service_id);
      setSelectedService(service || null);
      setDate(editingBooking.date);
      setTime(editingBooking.time);
      setQuantity(editingBooking.quantity);
      setTransactions(editingBooking.transactions || []);
      
      // Set custom service data if it's a custom service
      if (editingBooking.custom_service_data) {
        setIsCustomService(true);
        setCustomServiceData({
          name: editingBooking.custom_service_data.name,
          price: editingBooking.custom_service_data.price,
          duration: editingBooking.custom_service_data.duration
        });
      }
      
      // Create client object from booking data
      const client: Client = {
        id: `temp-${editingBooking.id}`,
        firstname: editingBooking.client_firstname,
        lastname: editingBooking.client_name,
        email: editingBooking.client_email,
        phone: editingBooking.client_phone
      };
      setSelectedClient(client);
    } else {
      // Reset form for new booking
      setSelectedService(null);
      setIsCustomService(false);
      setCustomServiceData({ name: '', price: 0, duration: 60 });
      setDate(selectedDate);
      setTime(selectedTime);
      setQuantity(1);
      setSelectedClient(null);
      setTransactions([]);
    }
  }, [editingBooking, services, selectedDate, selectedTime]);

  // Reset step when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  const calculateTotalAmount = () => {
    if (isCustomService) {
      return customServiceData.price * quantity;
    }
    return selectedService ? selectedService.price_ttc * quantity : 0;
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
      console.log('🔄 Génération lien de paiement:', {
        amount,
        client: selectedClient.email,
        service: selectedService.name
      });

      // Créer une transaction en attente pour le lien de paiement
      const paymentTransaction: Transaction = {
        id: crypto.randomUUID(),
        amount: amount,
        method: 'stripe',
        status: 'pending',
        note: `Lien de paiement généré - En attente de paiement (${amount.toFixed(2)}€)`,
        created_at: new Date().toISOString()
      };

      setTransactions(prev => [...prev, paymentTransaction]);

      // Générer le lien de paiement
      const expiryMinutes = settings?.payment_link_expiry_minutes || 30;
      const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);
      
      const serviceName = isCustomService ? customServiceData.name : selectedService.name;
      const paymentUrl = new URL('/payment', window.location.origin);
      
      paymentUrl.searchParams.set('amount', amount.toString());
      paymentUrl.searchParams.set('service', serviceName);
      paymentUrl.searchParams.set('client', `${selectedClient.firstname} ${selectedClient.lastname}`);
      paymentUrl.searchParams.set('email', selectedClient.email);
      paymentUrl.searchParams.set('date', date);
      paymentUrl.searchParams.set('time', time);
      paymentUrl.searchParams.set('expires', expiresAt.toString());
      paymentUrl.searchParams.set('user_id', user?.id || '');

      // Copier le lien dans le presse-papiers
      await navigator.clipboard.writeText(paymentUrl.toString());
      alert(`Lien de paiement copié dans le presse-papiers !\n\nMontant: ${amount.toFixed(2)}€\nExpire dans ${expiryMinutes} minutes`);

      console.log('✅ Lien de paiement généré et copié');
    } catch (error) {
      console.error('❌ Erreur génération lien:', error);
      alert('Erreur lors de la génération du lien de paiement');
    }
  };

  const handleSubmit = async () => {
    if (!selectedService && !isCustomService) {
      alert('Veuillez sélectionner un service');
      return;
    }

    if (!selectedClient) {
      alert('Veuillez sélectionner un client');
      return;
    }

    if (!date || !time) {
      alert('Veuillez sélectionner une date et une heure');
      return;
    }

    setSaving(true);

    try {
      // Create or get client
      const client = await getOrCreateClient({
        firstname: selectedClient.firstname,
        lastname: selectedClient.lastname,
        email: selectedClient.email,
        phone: selectedClient.phone
      });

      // Prepare booking data
      const totalAmount = calculateTotalAmount();
      const currentPaid = calculateCurrentPaid();

      let bookingData: any = {
        service_id: selectedService?.id || '',
        date,
        time,
        duration_minutes: isCustomService ? customServiceData.duration : selectedService?.duration_minutes || 60,
        quantity,
        client_name: client.lastname,
        client_firstname: client.firstname,
        client_email: client.email,
        client_phone: client.phone,
        total_amount: totalAmount,
        payment_amount: currentPaid,
        payment_status: currentPaid >= totalAmount ? 'completed' : currentPaid > 0 ? 'partial' : 'pending',
        booking_status: 'pending',
        transactions,
        user_id: user?.id
      };

      // Add custom service data if applicable
      if (isCustomService) {
        bookingData.custom_service_data = customServiceData;
        
        // Ensure custom service exists
        const customService = await ensureCustomServiceExists();
        bookingData.service_id = customService.id;
      }

      let result;
      if (editingBooking) {
        result = await updateBooking(editingBooking.id, bookingData);
        console.log('✅ Réservation modifiée:', result?.id);
      } else {
        result = await addBooking(bookingData);
        console.log('✅ Réservation créée:', result?.id);
      }

      // 🎯 LOGIQUE CONDITIONNELLE DU WORKFLOW
      if (result && !editingBooking) {
        console.log('🔍 Analyse des transactions pour workflow conditionnel...');
        
        // Vérifier s'il y a des transactions Stripe en attente
        const hasPendingStripeTransaction = transactions.some(t => 
          t.method === 'stripe' && t.status === 'pending'
        );
        
        console.log('🔍 Transactions en attente détectées:', hasPendingStripeTransaction);
        console.log('📋 Transactions:', transactions.map(t => ({
          method: t.method,
          status: t.status,
          amount: t.amount
        })));
        
        if (!hasPendingStripeTransaction) {
          // Pas de lien de paiement en attente → déclencher le workflow immédiatement
          console.log('✅ Réservation sans lien de paiement - déclenchement workflow immédiat');
          try {
            await triggerWorkflow('booking_created', result, user?.id);
            console.log('✅ Workflow booking_created déclenché avec succès');
          } catch (workflowError) {
            console.error('❌ Erreur déclenchement workflow:', workflowError);
          }
        } else {
          // Lien de paiement en attente → attendre le paiement
          console.log('⏳ Réservation avec lien de paiement - workflow en attente du paiement');
          console.log('💳 Le workflow sera déclenché par le webhook Stripe après paiement');
        }
      }
      
      // Émettre l'événement normal pour les listeners
      bookingEvents.emit('bookingCreated', result);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedService(null);
    setIsCustomService(false);
    setCustomServiceData({ name: '', price: 0, duration: 60 });
    setQuantity(1);
    setSelectedClient(null);
    setTransactions([]);
    setCurrentStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const totalAmount = calculateTotalAmount();
  const currentPaid = calculateCurrentPaid();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
      <div className="bg-white w-full max-w-4xl modal-height-safe sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 sm:p-6 sm:rounded-t-3xl relative overflow-hidden modal-header modal-safe-top">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {editingBooking ? 'Modifier la réservation' : 'Nouvelle réservation'}
                  </h2>
                  <p className="text-white/80 text-xs sm:text-sm">
                    {editingBooking ? 'Modifiez les détails' : 'Créez une nouvelle réservation'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 sm:p-3 text-white hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-110 mobile-tap-target"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 modal-body modal-safe-bottom">
          {/* Step 1: Service Selection */}
          {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Sélectionner un service</h3>
                <button
                  onClick={() => setIsCustomService(!isCustomService)}
                  className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
                    isCustomService
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Service personnalisé
                </button>
              </div>

              {isCustomService ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
                  <h4 className="font-bold text-purple-800 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Service personnalisé
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom du service *
                      </label>
                      <input
                        type="text"
                        value={customServiceData.name}
                        onChange={(e) => setCustomServiceData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                        placeholder="Ex: Consultation spécialisée"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customServiceData.price || ''}
                        onChange={(e) => setCustomServiceData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durée (minutes) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customServiceData.duration || ''}
                        onChange={(e) => setCustomServiceData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                        placeholder="60"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {services.filter(service => service.description !== 'Service personnalisé').map((service, index) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 transform hover:scale-[1.02] text-left animate-fadeIn ${
                        selectedService?.id === service.id
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                          <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-sm sm:text-base">{service.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">{service.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{service.duration_minutes}min</span>
                          <span className="text-gray-500">Max {service.capacity} pers.</span>
                        </div>
                        <span className="font-bold text-green-600">{service.price_ttc.toFixed(2)}€</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedService && !isCustomService}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg font-medium text-sm sm:text-base"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date, Time & Participants */}
          {currentStep === 2 && (selectedService || isCustomService) && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Date et heure</h3>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-gray-600 hover:text-gray-800 font-medium hover:underline"
                >
                  ← Retour
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  required
                />

                <TimeSlotPicker
                  selectedDate={date}
                  selectedTime={time}
                  onTimeSelect={setTime}
                  serviceDuration={isCustomService ? customServiceData.duration : selectedService?.duration_minutes}
                />
              </div>

              {(selectedService?.capacity || 1) > 1 && (
                <ParticipantSelector
                  quantity={quantity}
                  maxCapacity={selectedService?.capacity || 1}
                  onQuantityChange={setQuantity}
                  unitName={selectedService?.unit_name}
                />
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-gray-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
                >
                  Retour
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!date || !time}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg font-medium text-sm sm:text-base"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Client & Payment */}
          {currentStep === 3 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Client et paiement</h3>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-gray-600 hover:text-gray-800 font-medium hover:underline"
                >
                  ← Retour
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Client Selection */}
                <div className="space-y-4">
                  <ClientSearch
                    onClientSelect={setSelectedClient}
                    selectedClient={selectedClient}
                  />
                </div>

                {/* Payment Section */}
                <div className="space-y-4">
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
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
                <h4 className="font-bold text-green-800 mb-3 sm:mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Récapitulatif
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Service:</span>
                    <span className="font-medium text-green-800">
                      {isCustomService ? customServiceData.name : selectedService?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Date:</span>
                    <span className="font-medium text-green-800">
                      {new Date(date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Heure:</span>
                    <span className="font-medium text-green-800">{time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Durée:</span>
                    <span className="font-medium text-green-800">
                      {isCustomService ? customServiceData.duration : selectedService?.duration_minutes} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Participants:</span>
                    <span className="font-medium text-green-800">{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Total:</span>
                    <span className="font-bold text-green-600 text-base">{totalAmount.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !selectedClient || (!selectedService && !isCustomService)}
                  className="flex-1 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      {editingBooking ? 'Modifier' : 'Créer'} la réservation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}