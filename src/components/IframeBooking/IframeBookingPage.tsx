import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, User, Mail, Phone, CreditCard, Package, MapPin, Star, ArrowRight, ArrowLeft, Check, Building2, Euro, Users, Timer, ChevronRight, Sparkles } from 'lucide-react';
import { Service, BusinessSettings, Booking } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getBusinessTimezone, getCurrentDateInTimezone, formatInBusinessTimezone } from '../../lib/timezone';
import { validateBookingDateTime, getNextAvailableDateTime } from '../../lib/bookingValidation';
import { DatePicker } from './DatePicker';

interface PublicBookingData {
  user: any;
  services: Service[];
  settings: BusinessSettings;
  bookings: Booking[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function IframeBookingPage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<PublicBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [clientData, setClientData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Récupérer les services autorisés depuis l'URL
  const allowedServices = searchParams.get('services')?.split(',').filter(Boolean) || [];

  const fetchPublicData = async () => {
    if (!userId) {
      setError('ID utilisateur manquant');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      if (!isSupabaseConfigured()) {
        console.log('🎭 Mode démo - données par défaut');
        const demoData: PublicBookingData = {
          user: { id: userId, email: 'demo@example.com', full_name: 'Démo Utilisateur' },
          services: [
            {
              id: 'demo-1',
              name: 'Massage relaxant',
              price_ttc: 80.00,
              image_url: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg',
              description: 'Massage de détente de 60 minutes pour évacuer le stress',
              duration_minutes: 60,
              capacity: 1,
              price_ht: 66.67
            },
            {
              id: 'demo-2',
              name: 'Soin du visage',
              price_ttc: 50.00,
              image_url: 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg',
              description: 'Soin complet du visage avec nettoyage et hydratation',
              duration_minutes: 45,
              capacity: 1,
              price_ht: 41.67
            }
          ],
          settings: {
            id: 'demo',
            business_name: 'Salon de Beauté Démo',
            primary_color: '#3B82F6',
            secondary_color: '#8B5CF6',
            opening_hours: {
              monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
              saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
              sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
            },
            buffer_minutes: 15,
            default_deposit_percentage: 30,
            minimum_booking_delay_hours: 24,
            payment_link_expiry_minutes: 30,
            deposit_type: 'percentage',
            deposit_fixed_amount: 20,
            email_notifications: true,
            brevo_enabled: false,
            brevo_api_key: '',
            brevo_sender_email: '',
            brevo_sender_name: 'BookingFast',
            stripe_enabled: false,
            stripe_public_key: '',
            stripe_secret_key: '',
            stripe_webhook_secret: '',
            timezone: 'Europe/Paris'
          },
          bookings: []
        };
        setData(demoData);
        setLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/public-booking-data?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        console.warn(`⚠️ Erreur HTTP ${response.status} - utilisation des données par défaut`);
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des données');
      }

      // Filtrer les services selon la configuration iframe
      let filteredServices = result.services || [];
      
      if (allowedServices.length > 0) {
        // Si des services spécifiques sont demandés via l'URL
        filteredServices = filteredServices.filter(service => 
          allowedServices.includes(service.id)
        );
        console.log('🎯 Services filtrés par URL:', filteredServices.length, 'sur', result.services?.length || 0);
      } else if (result.settings?.iframe_services && result.settings.iframe_services.length > 0) {
        // Si des services sont configurés dans les paramètres
        filteredServices = filteredServices.filter(service => 
          result.settings.iframe_services.includes(service.id)
        );
        console.log('⚙️ Services filtrés par paramètres:', filteredServices.length, 'sur', result.services?.length || 0);
      }
      // Sinon, afficher tous les services
      
      setData({
        ...result,
        services: filteredServices
      });
    } catch (err) {
      console.error('❌ Erreur chargement données publiques:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, [userId]);

  // Initialize date when data is loaded
  useEffect(() => {
    if (data?.settings && !selectedDate) {
      const { date } = getNextAvailableDateTime(data.settings);
      setSelectedDate(date);
    }
  }, [data?.settings, selectedDate]);

  const generateTimeSlots = (date: string): TimeSlot[] => {
    if (!data?.settings) return [];
    
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySettings = data.settings.opening_hours[dayName];
    
    if (!daySettings || daySettings.closed) return [];
    
    const slots: TimeSlot[] = [];
    const ranges = daySettings.ranges || [];
    
    ranges.forEach(range => {
      if (!range.start || !range.end) return;
      
      const [startHour, startMinute] = range.start.split(':').map(Number);
      const [endHour, endMinute] = range.end.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const time = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Vérifier si le créneau est disponible pour le service sélectionné
        const isAvailable = isTimeSlotAvailable(time, selectedService);
        
        slots.push({ time, available: isAvailable });
        
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    });
    
    return slots.sort((a, b) => a.time.localeCompare(b.time));
  };

  // Fonction pour vérifier si un créneau est disponible pour un service donné
  const isTimeSlotAvailable = (time: string, service: Service | null): boolean => {
    if (!service || !selectedDate) return false;
    
    // Vérifier le délai minimum pour les réservations publiques
    const validation = validateBookingDateTime(selectedDate, time, data.settings, true);
    if (!validation.isValid) {
      return false;
    }
    
    // Calculer l'heure de fin du service sélectionné
    const [startHour, startMinute] = time.split(':').map(Number);
    const startTime = startHour * 60 + startMinute; // en minutes
    const endTime = startTime + service.duration_minutes; // en minutes
    
    // Vérifier les conflits avec les réservations existantes
    const dayBookings = data.bookings.filter(booking => booking.date === selectedDate);
    
    for (const booking of dayBookings) {
      const [bookingHour, bookingMinute] = booking.time.split(':').map(Number);
      const bookingStartTime = bookingHour * 60 + bookingMinute;
      const bookingEndTime = bookingStartTime + booking.duration_minutes;
      
      // Vérifier s'il y a chevauchement
      const hasOverlap = (startTime < bookingEndTime && endTime > bookingStartTime);
      
      if (hasOverlap) {
        // Si c'est le même service, vérifier la capacité
        if (booking.service_id === service.id) {
          // Compter les participants déjà réservés pour ce créneau et ce service
          const existingParticipants = dayBookings
            .filter(b => 
              b.service_id === service.id && 
              b.time === booking.time && 
              b.booking_status !== 'cancelled'
            )
            .reduce((sum, b) => sum + b.quantity, 0);
          
          // Vérifier s'il reste de la place (on assume quantity = 1 pour la vérification)
          if (existingParticipants >= service.capacity) {
            return false; // Plus de place pour ce service
          }
        } else {
          // Services différents qui se chevauchent = conflit
          return false;
        }
      }
    }
    
    return true;
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Réinitialiser la sélection de temps quand on change de service
    setSelectedTime('');
    setCurrentStep(2);
  };

  const handleDateTimeSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientData.email) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // 🔒 PROTECTION ABSOLUE CONTRE LES SOUMISSIONS MULTIPLES
    if (submitting) {
      console.log('🔒 SOUMISSION DÉJÀ EN COURS - BLOQUÉE IMMÉDIATEMENT');
      alert('Une réservation est déjà en cours de traitement. Veuillez patienter.');
      return;
    }
    
    // 🆔 Générer un ID unique pour cette tentative AVANT tout traitement
    const attemptId = `${Date.now()}_${crypto.randomUUID()}`;
    const attemptKey = `booking_attempt_${attemptId}`;
    const uniqueKey = `booking_${selectedService.id}_${selectedDate}_${selectedTime}_${clientData.email}_${Date.now()}`;
    
    // 🔍 Vérifier si une tentative similaire est déjà en cours (plus strict)
    const existingAttempt = sessionStorage.getItem(uniqueKey.replace(`_${Date.now()}`, ''));
    if (existingAttempt) {
      const attemptTime = parseInt(existingAttempt);
      const timeDiff = Date.now() - attemptTime;
      
      // Si une tentative a été faite il y a moins de 5 minutes, bloquer
      if (timeDiff < 5 * 60 * 1000) {
        console.log('🔒 TENTATIVE RÉCENTE DÉTECTÉE - BLOQUÉE DÉFINITIVEMENT');
        alert('Une réservation identique a déjà été effectuée récemment. Veuillez attendre 5 minutes ou changer les détails.');
        return;
      }
    }
    
    // 🏷️ Marquer cette tentative IMMÉDIATEMENT
    sessionStorage.setItem(uniqueKey, Date.now().toString());
    sessionStorage.setItem(attemptKey, 'in_progress');
    
    // 🔒 Désactiver le bouton immédiatement
    setSubmitting(true);
    
    // 🛡️ Protection supplémentaire - empêcher les clics multiples
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.style.pointerEvents = 'none';
    }
    
    try {
      // 💳 PAIEMENT OBLIGATOIRE - Rediriger directement vers Stripe SANS créer la réservation
      const totalAmount = selectedService.price_ttc * quantity;
      const depositPercentage = data.settings?.default_deposit_percentage || 30;
      const depositAmount = data.settings?.deposit_type === 'fixed_amount' 
        ? data.settings.deposit_fixed_amount || 20
        : (totalAmount * depositPercentage) / 100;
      
      if (isSupabaseConfigured()) {
        // Vérifier que Stripe est configuré
        if (!data.settings?.stripe_enabled || !data.settings?.stripe_public_key || !data.settings?.stripe_secret_key) {
          throw new Error('Le paiement en ligne n\'est pas configuré. Contactez l\'établissement.');
        }
        
        console.log('💳 REDIRECTION UNIQUE vers Stripe pour paiement acompte...');
        
        console.log('🆔 ID tentative UNIQUE:', attemptId);
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            amount: depositAmount,
            service_name: `Acompte - ${selectedService.name}`,
            customer_email: clientData.email,
            success_url: `${window.location.origin}/payment-success`,
            cancel_url: `${window.location.origin}/payment-cancel`,
            metadata: {
              // 🔑 Données pour créer la réservation APRÈS paiement UNIQUEMENT
              reservation_attempt_id: attemptId,
              unique_key: uniqueKey,
              user_id: userId,
              service_id: selectedService.id,
              service_name: selectedService.name,
              date: selectedDate,
              time: selectedTime,
              duration_minutes: selectedService.duration_minutes.toString(),
              quantity: quantity.toString(),
              client_name: clientData.lastname,
              client_firstname: clientData.firstname,
              client: `${clientData.firstname} ${clientData.lastname}`,
              email: clientData.email,
              phone: clientData.phone,
              booking_date: selectedDate,
              booking_time: selectedTime,
              is_deposit: 'true',
              total_amount: totalAmount.toString(),
              deposit_amount: depositAmount.toString(),
              create_booking_after_payment: 'true',
              attempt_timestamp: Date.now().toString(),
              prevent_duplicates: 'true'
            },
          }),
        });

        if (response.ok) {
          const { url } = await response.json();
          if (url) {
            console.log('🔄 REDIRECTION UNIQUE vers Stripe - réservation créée APRÈS paiement UNIQUEMENT');
            window.open(url, '_blank');
            // 🏷️ Marquer cette tentative comme envoyée à Stripe
            sessionStorage.setItem(attemptKey, 'sent_to_stripe');
            
            // 🚀 Ouvrir Stripe dans nouvel onglet
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
        }
      } else {
        // 🎭 Mode démo - simuler la redirection Stripe
        console.log('🎭 Mode démo - simulation paiement unique...');
        
        // Simuler un délai de redirection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 🎭 Simuler le retour de Stripe avec succès
        console.log('🎭 Mode démo - simulation paiement réussi UNIQUE');
        setCurrentStep(5);
      }
    } catch (err) {
      console.error('Erreur création réservation:', err);
      alert(`Erreur lors du processus de paiement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      
      // 🧹 Nettoyer les tentatives en cas d'erreur
      sessionStorage.removeItem(uniqueKey);
      sessionStorage.removeItem(attemptKey);
    } finally {
      // 🔓 Réactiver le bouton en cas d'erreur
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.style.pointerEvents = 'auto';
      }
      setSubmitting(false);
    }
  };

  const getAvailableDates = () => {
    if (!data?.settings) return [];
    
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySettings = data.settings.opening_hours[dayName];
      
      if (daySettings && !daySettings.closed) {
        const validation = validateBookingDateTime(dateString, '09:00', data.settings, true);
        if (validation.isValid) {
          dates.push({
            date: dateString,
            label: date.toLocaleDateString('fr-FR', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            }),
            isToday: i === 0
          });
        }
      }
    }
    
    return dates;
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];
  const availableDates = getAvailableDates();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent mx-auto"></div>
          <p className="text-gray-600 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service indisponible</h2>
          <p className="text-gray-600">{error || 'Impossible de charger les données'}</p>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, title: 'Service', icon: Package, description: 'Choisissez votre service' },
    { id: 2, title: 'Date & Heure', icon: Calendar, description: 'Sélectionnez un créneau' },
    { id: 3, title: 'Informations', icon: User, description: 'Vos coordonnées' },
    { id: 4, title: 'Confirmation', icon: Check, description: 'Récapitulatif' }
  ];

  return (
    <div className="min-h-screen bg-transparent">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Progress Indicator - Compact */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((step) => (
              <div key={step.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                currentStep >= step.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : currentStep === step.id
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
            ))}
          </div>
          
          {/* Business name - Compact */}
        </div>

        {/* Step 1: Service Selection */}
        {currentStep === 1 && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Choisissez votre service
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Sélectionnez le service qui vous intéresse
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.services.map((service, index) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="group bg-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] overflow-hidden animate-fadeIn"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Service Image */}
                  <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center" style={{ display: service.image_url ? 'none' : 'flex' }}>
                      <Package className="w-16 h-16 text-white" />
                    </div>
                    
                    {/* Price Badge */}
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-xl font-bold text-sm sm:text-base shadow-lg">
                      {service.price_ttc.toFixed(2)}€
                    </div>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Select Button */}
                    <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button className="w-full bg-white text-gray-900 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                        <Sparkles className="w-5 h-5" />
                        Sélectionner
                      </button>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-2">
                      {service.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Timer className="w-4 h-4" />
                          <span>{service.duration_minutes}min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>Max {service.capacity} {service.unit_name || 'pers.'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <Euro className="w-4 h-4" />
                        <span>{service.price_ttc.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {data.services.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Aucun service disponible</h3>
                <p className="text-gray-500">Aucun service n'est actuellement proposé</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {currentStep === 2 && selectedService && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Choisissez votre créneau
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Pour {selectedService.name}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Date Selection */}
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 relative">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  Sélectionnez une date
                </h3>
                
                <DatePicker
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  availableDates={availableDates}
                  settings={data.settings}
                />
              </div>

              {/* Time Selection */}
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  Choisissez l'heure
                </h3>
                
                {selectedDate ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 sm:max-h-80 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && handleDateTimeSelect(selectedDate, slot.time)}
                        disabled={!slot.available}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                          slot.available
                            ? selectedTime === slot.time
                              ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`text-base sm:text-lg font-bold ${
                            slot.available
                              ? selectedTime === slot.time ? 'text-purple-600' : 'text-gray-900'
                              : 'text-gray-400'
                          }`}>
                            {slot.time}
                          </div>
                          <div className={`text-xs ${
                            slot.available ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {slot.available ? 'Libre' : 'Occupé'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>Sélectionnez d'abord une date</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              
              {selectedDate && selectedTime && (
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Client Information */}
        {currentStep === 3 && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Vos informations
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Nous avons besoin de quelques informations pour finaliser votre réservation
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={clientData.firstname}
                      onChange={(e) => setClientData(prev => ({ ...prev, firstname: e.target.value }))}
                      className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                      placeholder="Votre prénom"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={clientData.lastname}
                      onChange={(e) => setClientData(prev => ({ ...prev, lastname: e.target.value }))}
                      className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                      placeholder="Votre nom"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={clientData.email}
                        onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-12 pr-4 p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                        placeholder="votre@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={clientData.phone}
                        onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-12 pr-4 p-3 sm:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-base"
                        placeholder="06 12 34 56 78"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity Selection */}
                {selectedService && selectedService.capacity > 1 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Nombre de {selectedService.unit_name || 'participants'}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-2xl font-bold text-gray-900">{quantity}</div>
                        <div className="text-sm text-gray-500">
                          {selectedService.unit_name || 'participant'}{quantity > 1 && !selectedService.unit_name ? 's' : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(selectedService.capacity, quantity + 1))}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between max-w-2xl mx-auto">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              
              <button
                onClick={() => setCurrentStep(4)}
                disabled={!clientData.firstname || !clientData.lastname || !clientData.email || !clientData.phone}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && selectedService && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Confirmation de réservation
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Vérifiez les détails de votre réservation
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden">
                {/* Service Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 sm:p-8 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0">
                      {selectedService.image_url ? (
                        <img
                          src={selectedService.image_url}
                          alt={selectedService.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <Package className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedService.name}</h3>
                      <p className="text-gray-600 text-sm sm:text-base">{selectedService.description}</p>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-sm text-gray-600">Date</div>
                        <div className="font-bold text-gray-900">
                          {new Date(selectedDate).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="text-sm text-gray-600">Heure</div>
                        <div className="font-bold text-gray-900">{selectedTime}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Timer className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-600">Durée</div>
                        <div className="font-bold text-gray-900">{selectedService.duration_minutes} min</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <Users className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="text-sm text-gray-600">Participants</div>
                        <div className="font-bold text-gray-900">
                          {quantity} {selectedService?.unit_name || 'personne'}{quantity > 1 && !selectedService?.unit_name ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
                    <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Vos informations
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-green-700">Nom complet:</span>
                        <div className="font-medium text-green-800">{clientData.firstname} {clientData.lastname}</div>
                      </div>
                      <div>
                        <span className="text-green-700">Email:</span>
                        <div className="font-medium text-green-800">{clientData.email}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-green-700">Téléphone:</span>
                        <div className="font-medium text-green-800">{clientData.phone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-medium text-gray-700">💳 Acompte obligatoire</div>
                        <div className="text-sm text-gray-500">
                          {data.settings?.deposit_type === 'fixed_amount' 
                            ? `Montant fixe de ${data.settings.deposit_fixed_amount}€`
                            : `${data.settings?.default_deposit_percentage || 30}% du total`
                          }
                        </div>
                      </div>
                      <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                        {(() => {
                          const totalAmount = selectedService.price_ttc * quantity;
                          const depositPercentage = data.settings?.default_deposit_percentage || 30;
                          const depositAmount = data.settings?.deposit_type === 'fixed_amount' 
                            ? data.settings.deposit_fixed_amount || 20
                            : (totalAmount * depositPercentage) / 100;
                          return depositAmount.toFixed(2);
                        })()}€
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200 text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>Montant total du service :</span>
                        <span className="font-medium">{(selectedService.price_ttc * quantity).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Solde restant après acompte :</span>
                        <span className="font-medium">
                          {(() => {
                            const totalAmount = selectedService.price_ttc * quantity;
                            const depositPercentage = data.settings?.default_deposit_percentage || 30;
                            const depositAmount = data.settings?.deposit_type === 'fixed_amount' 
                              ? data.settings.deposit_fixed_amount || 20
                              : (totalAmount * depositPercentage) / 100;
                            return (totalAmount - depositAmount).toFixed(2);
                          })()}€
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex items-center gap-2 text-blue-800 font-medium">
                          <CreditCard className="w-4 h-4" />
                          <span>Paiement sécurisé par Stripe</span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          🔒 Vos données bancaires sont protégées et cryptées
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between max-w-2xl mx-auto">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg font-bold text-lg"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création de la réservation...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Payer l'acompte et confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {currentStep === 5 && (
          <div className="text-center space-y-6 sm:space-y-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Réservation confirmée !
              </h2>
              <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
                Votre réservation a été créée avec succès. Vous recevrez un email de confirmation sous peu.
              </p>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 max-w-md mx-auto">
              <h3 className="font-bold text-gray-900 mb-4">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(selectedDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heure:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-green-600">
                    {selectedService ? (selectedService.price_ttc * quantity).toFixed(2) : '0.00'}€
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}