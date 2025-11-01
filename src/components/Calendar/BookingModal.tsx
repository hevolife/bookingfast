import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Package } from 'lucide-react';
import { Service, Client, Booking } from '../../types';
import { ClientSearchModal } from './ClientSearchModal';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import ReactDOM from 'react-dom';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  services: Service[];
  selectedDate?: string;
  selectedTime?: string;
  selectedServiceId?: string;
  editingBooking?: Booking | null;
}

export function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  services,
  selectedDate,
  selectedTime,
  selectedServiceId,
  editingBooking
}: BookingModalProps) {
  const [formData, setFormData] = useState({
    service_id: selectedServiceId || '',
    client_id: '',
    client_name: '',
    client_firstname: '',
    client_email: '',
    client_phone: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    time: selectedTime || '09:00',
    duration_minutes: 60,
    quantity: 1,
    total_amount: 0,
    payment_amount: 0,
    payment_method: 'cash' as const,
    payment_status: 'pending' as const,
    booking_status: 'confirmed' as const,
    notes: '',
    assigned_user_id: null as string | null
  });

  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { teamMembers } = useTeamMembers();

  useEffect(() => {
    if (editingBooking) {
      setFormData({
        service_id: editingBooking.service_id,
        client_id: editingBooking.client_id || '',
        client_name: editingBooking.client_name,
        client_firstname: editingBooking.client_firstname,
        client_email: editingBooking.client_email,
        client_phone: editingBooking.client_phone,
        date: editingBooking.date,
        time: editingBooking.time,
        duration_minutes: editingBooking.duration_minutes,
        quantity: editingBooking.quantity,
        total_amount: editingBooking.total_amount,
        payment_amount: editingBooking.payment_amount || 0,
        payment_method: editingBooking.payment_method || 'cash',
        payment_status: editingBooking.payment_status || 'pending',
        booking_status: editingBooking.booking_status,
        notes: editingBooking.notes || '',
        assigned_user_id: editingBooking.assigned_user_id || null
      });
    } else if (selectedServiceId) {
      const service = services.find(s => s.id === selectedServiceId);
      if (service) {
        setFormData(prev => ({
          ...prev,
          service_id: selectedServiceId,
          duration_minutes: service.duration_minutes,
          total_amount: service.price,
          date: selectedDate || prev.date,
          time: selectedTime || prev.time
        }));
      }
    }
  }, [editingBooking, selectedServiceId, selectedDate, selectedTime, services]);

  const selectedService = services.find(s => s.id === formData.service_id);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const newTotalAmount = service.price * formData.quantity;
      setFormData(prev => ({
        ...prev,
        service_id: serviceId,
        duration_minutes: service.duration_minutes,
        total_amount: newTotalAmount
      }));
    }
  };

  const handleQuantityChange = (quantity: number) => {
    if (selectedService) {
      const newTotalAmount = selectedService.price * quantity;
      setFormData(prev => ({
        ...prev,
        quantity,
        total_amount: newTotalAmount
      }));
    }
  };

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.name,
      client_firstname: client.firstname,
      client_email: client.email,
      client_phone: client.phone
    }));
    setShowClientSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name || !formData.client_firstname || !formData.client_email || !formData.client_phone) {
      alert('Veuillez sélectionner ou créer un client');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Erreur lors de la création de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getUnitName = () => {
    if (selectedService?.unit_name && selectedService.unit_name !== 'personnes') {
      return selectedService.unit_name;
    }
    return 'participants';
  };

  const getPluralUnitName = () => {
    const unitName = getUnitName();
    if (formData.quantity <= 1) {
      return `${unitName.replace(/s$/, '')}(s)`;
    }
    return `${unitName}(s)`;
  };

  // Contenu du modal pour mobile - VRAIMENT FULLSCREEN
  const mobileModal = (
    <div className="fixed inset-0 z-[999999] sm:hidden" style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'white'
    }}>
      {/* Container principal - VRAIMENT plein écran */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Header fixe avec gradient - COLLÉ EN HAUT */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f43f5e 100%)',
          flexShrink: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transform: 'skewX(-12deg)'
          }}></div>
          <div style={{
            position: 'relative',
            zIndex: 10,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0
                }}>
                  {editingBooking ? 'Modifier' : 'Nouvelle réservation'}
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '12px',
                  margin: 0
                }}>
                  Remplissez le formulaire
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f9fafb',
          padding: '16px',
          WebkitOverflowScrolling: 'touch'
        }}>
          <form id="booking-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Sélection du service */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Service *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceChange(service.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: formData.service_id === service.id ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                      backgroundColor: formData.service_id === service.id ? '#f3e8ff' : 'white',
                      textAlign: 'left',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: formData.service_id === service.id 
                          ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                          : '#f3f4f6'
                      }}>
                        <Package style={{
                          width: '20px',
                          height: '20px',
                          color: formData.service_id === service.id ? 'white' : '#9ca3af'
                        }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{service.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>{service.price.toFixed(2)}€</span>
                          <span style={{ marginLeft: '8px' }}>{service.duration_minutes}min</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection du client */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Client *
              </label>
              <button
                type="button"
                onClick={() => setShowClientSearch(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {formData.client_name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {formData.client_firstname.charAt(0)}{formData.client_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {formData.client_firstname} {formData.client_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{formData.client_email}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280' }}>
                    <User style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontSize: '14px' }}>Sélectionner un client...</span>
                  </div>
                )}
              </button>
            </div>

            {/* Date et heure */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Date et heure *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Calendar style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    color: '#9ca3af',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    style={{
                      width: '100%',
                      paddingLeft: '36px',
                      paddingRight: '8px',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Clock style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    color: '#9ca3af',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    style={{
                      width: '100%',
                      paddingLeft: '36px',
                      paddingRight: '8px',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Assignation */}
            {teamMembers.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Assigner à
                </label>
                <select
                  value={formData.assigned_user_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_user_id: e.target.value || null }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Non assigné</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantité */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Nombre de {getPluralUnitName()} *
              </label>
              <input
                type="number"
                min="1"
                max={selectedService?.max_capacity || 10}
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            {/* Montant total */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'white', fontWeight: '500', fontSize: '14px' }}>Montant total</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                  {formData.total_amount.toFixed(2)}€
                </span>
              </div>
            </div>

            {/* Notes */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Notes internes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  resize: 'none'
                }}
                placeholder="Notes visibles par votre équipe..."
              />
            </div>
          </form>
        </div>

        {/* Footer avec boutons - Fixe en bas */}
        <div style={{
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          padding: '16px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="booking-form"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Contenu du modal pour desktop
  const desktopModal = (
    <div className="hidden sm:flex fixed inset-0 bg-black/60 backdrop-blur-sm items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col">
        
        {/* Header Desktop */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"></div>
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingBooking ? 'Modifier la réservation' : 'Nouvelle réservation'}
                  </h2>
                  <p className="text-white/80 mt-1">
                    {editingBooking ? 'Modifiez les informations' : 'Créez une nouvelle réservation'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 text-white hover:bg-white/20 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu Desktop scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service *
              </label>
              <div className="space-y-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceChange(service.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      formData.service_id === service.id
                        ? 'border-purple-500 bg-purple-50 shadow-lg'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        formData.service_id === service.id
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                          : 'bg-gray-100'
                      }`}>
                        <Package className={`w-6 h-6 ${
                          formData.service_id === service.id ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="text-green-600 font-semibold">{service.price.toFixed(2)}€</span>
                          <span className="ml-3">{service.duration_minutes}min</span>
                          <span className="ml-3">Max {service.max_capacity} {service.unit_name || 'personnes'}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <button
                type="button"
                onClick={() => setShowClientSearch(true)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 text-left"
              >
                {formData.client_name ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {formData.client_firstname.charAt(0)}{formData.client_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {formData.client_firstname} {formData.client_name}
                      </div>
                      <div className="text-sm text-gray-500">{formData.client_email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-500">
                    <User className="w-5 h-5" />
                    <span>Rechercher ou créer un client...</span>
                  </div>
                )}
              </button>
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Assignation */}
            {teamMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigner à un membre
                </label>
                <select
                  value={formData.assigned_user_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_user_id: e.target.value || null }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                >
                  <option value="">Non assigné</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.full_name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de {getPluralUnitName()} *
              </label>
              <input
                type="number"
                min="1"
                max={selectedService?.max_capacity || 10}
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                required
              />
            </div>

            {/* Montant total */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Montant total</span>
                <span className="text-2xl font-bold text-green-600">
                  {formData.total_amount.toFixed(2)}€
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes internes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none"
                placeholder="Notes visibles uniquement par votre équipe"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Utilisation d'un portal pour le rendu du modal
  const modalContent = (
    <>
      {mobileModal}
      {desktopModal}
    </>
  );

  // Rendu via un portal pour garantir que le modal est au-dessus de tout
  return ReactDOM.createPortal(modalContent, document.body);
}
