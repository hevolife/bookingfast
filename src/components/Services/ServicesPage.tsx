import React, { useState } from 'react';
import { Plus, CreditCard as Edit, Trash2, Package, Save, X, Image, Clock } from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { useTeam } from '../../hooks/useTeam';
import { PermissionGate, UsageLimitIndicator } from '../UI/PermissionGate';
import { Service } from '../../types';

export function ServicesPage() {
  const { services, loading, addService, updateService, deleteService } = useServices();
  const { hasPermission, getUsageLimits } = useTeam();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  
  const usageLimits = getUsageLimits();
  const userServicesCount = services.filter(s => s.description !== 'Service personnalisé').length;
  
  const handleAvailabilityChange = (day: string, field: 'closed', value: any) => {
    setFormData(prev => ({
      ...prev,
      availability_hours: {
        ...prev.availability_hours,
        [day]: {
          ...prev.availability_hours[day],
          closed: !value
        }
      }
    }));
  };

  const handleRangeChange = (day: string, rangeIndex: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      availability_hours: {
        ...prev.availability_hours,
        [day]: {
          ...prev.availability_hours[day],
          ranges: prev.availability_hours[day].ranges.map((range, index) =>
            index === rangeIndex ? { ...range, [field]: value } : range
          )
        }
      }
    }));
  };

  const addTimeRange = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability_hours: {
        ...prev.availability_hours,
        [day]: {
          ...prev.availability_hours[day],
          ranges: [...prev.availability_hours[day].ranges, { start: '09:00', end: '17:00' }]
        }
      }
    }));
  };

  const removeTimeRange = (day: string, rangeIndex: number) => {
    setFormData(prev => ({
      ...prev,
      availability_hours: {
        ...prev.availability_hours,
        [day]: {
          ...prev.availability_hours[day],
          ranges: prev.availability_hours[day].ranges.filter((_, index) => index !== rangeIndex)
        }
      }
    }));
  };

  const [formData, setFormData] = useState({
    name: '',
    price_ht: 0,
    price_ttc: 0,
    image_url: '',
    description: '',
    duration_minutes: 60,
    capacity: 1,
    unit_name: '',
    availability_hours: {
      monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
      tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
      wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
      thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
      friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
      saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
      sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price_ht: 0,
      price_ttc: 0,
      image_url: '',
      description: '',
      duration_minutes: 60,
      capacity: 1,
      unit_name: '',
      availability_hours: {
        monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
        sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
      }
    });
    setEditingService(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
    // Les hooks gèrent automatiquement l'état
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price_ht: service.price_ht,
      price_ttc: service.price_ttc,
      image_url: service.image_url || '',
      description: service.description,
      duration_minutes: service.duration_minutes,
      capacity: service.capacity,
      unit_name: service.unit_name || '',
      availability_hours: service.availability_hours || {
        monday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        tuesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        wednesday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        thursday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        friday: { ranges: [{ start: '08:00', end: '18:00' }], closed: false },
        saturday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
        sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
      }
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Vérifier les limites avant de créer un nouveau service
    if (!editingService && usageLimits.maxServicesCreated && userServicesCount >= usageLimits.maxServicesCreated) {
      alert(`Limite atteinte: ${usageLimits.maxServicesCreated} services maximum pour votre rôle`);
      setSaving(false);
      return;
    }
    
    try {
      if (editingService) {
        await updateService(editingService.id, formData);
      } else {
        await addService(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le service "${service.name}" ?`)) {
      try {
        await deleteService(service.id);
      } catch (error) {
        alert(`Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
  };

  if (loading) {
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
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mobile-optimized">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Services
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Gérez vos services et tarifs</p>
        </div>
        
        <PermissionGate permission="create_service">
          <UsageLimitIndicator currentUsage={userServicesCount} permission="create_service">
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Nouveau service
            </button>
          </UsageLimitIndicator>
        </PermissionGate>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {services.filter(service => service.description !== 'Service personnalisé').map((service, index) => (
          <div
            key={service.id}
            className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Service Image */}
            {service.image_url && (
              <div className="w-full h-32 sm:h-48 bg-gray-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 overflow-hidden">
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Service Info */}
            <div className="mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{service.description}</p>
              
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Prix HT:</span>
                  <span className="font-medium">{service.price_ht.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prix TTC:</span>
                  <span className="font-bold text-green-600">{service.price_ttc.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durée:</span>
                  <span className="font-medium">{service.duration_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacité:</span>
                  <span className="font-medium">{service.capacity} pers.</span>
                </div>
                {service.unit_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Unité:</span>
                    <span className="font-medium">{service.unit_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <PermissionGate permission="edit_service">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
              </PermissionGate>
              <PermissionGate permission="delete_service">
                <button
                  onClick={() => handleDelete(service)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>

      {services.filter(service => service.description !== 'Service personnalisé').length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun service</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6">Commencez par créer votre premier service</p>
          <PermissionGate permission="create_service">
            <UsageLimitIndicator currentUsage={userServicesCount} permission="create_service">
              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                Créer un service
              </button>
            </UsageLimitIndicator>
          </PermissionGate>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn modal-container">
          <div className="bg-white w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:rounded-3xl shadow-2xl transform animate-slideUp modal-content">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 p-4 sm:p-6 sm:rounded-t-3xl relative overflow-hidden modal-header">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        {editingService ? 'Modifier le service' : 'Nouveau service'}
                      </h2>
                      <p className="text-white/80 text-xs sm:text-sm">
                        {editingService ? 'Modifiez les informations' : 'Créez un nouveau service'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-white hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-110 mobile-tap-target"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 modal-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du service
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                    placeholder="Ex: Massage relaxant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix HT (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_ht === 0 ? '' : formData.price_ht}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_ht: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix TTC (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_ttc === 0 ? '' : formData.price_ttc}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_ttc: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes === 0 ? '' : formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value === '' ? 0 : parseInt(e.target.value) || 60 }))}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacité (personnes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity === 0 ? '' : formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value === '' ? 0 : parseInt(e.target.value) || 1 }))}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'unité (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.unit_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                    placeholder="Ex: Jet ski, Vélo, Chambre..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Ce mot remplacera "participants" dans la réservation (ex: "Nombre de Jet ski")
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de l'image (optionnel)
                  </label>
                  <div className="relative">
                    <Image className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                      placeholder="https://exemple.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 mobile-form-input"
                    placeholder="Décrivez votre service..."
                  />
                </div>

                {/* Horaires de disponibilité */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Horaires de disponibilité du service
                  </label>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4">
                    <p className="text-xs sm:text-sm text-blue-700 mb-2">
                      <strong>💡 Conseil :</strong> Configurez des horaires spécifiques pour ce service.
                    </p>
                    <p className="text-xs text-blue-600">
                      Si aucun horaire n'est défini, les horaires généraux de l'entreprise seront utilisés.
                    </p>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(formData.availability_hours).map(([day, hours]) => (
                      <div key={day} className="p-3 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl">
                        <div className="text-sm font-medium text-gray-700 capitalize mb-2">
                          {day === 'monday' ? 'Lundi' :
                           day === 'tuesday' ? 'Mardi' :
                           day === 'wednesday' ? 'Mercredi' :
                           day === 'thursday' ? 'Jeudi' :
                           day === 'friday' ? 'Vendredi' :
                           day === 'saturday' ? 'Samedi' :
                           day === 'sunday' ? 'Dimanche' : day}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={(e) => handleAvailabilityChange(day, 'closed', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-600">Disponible</span>
                        </div>
                        
                        {!hours.closed && (
                          <div className="space-y-2 sm:space-y-3">
                            {hours.ranges.map((range, rangeIndex) => (
                              <div key={rangeIndex} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <input
                                    type="time"
                                    value={range.start}
                                    onChange={(e) => handleRangeChange(day, rangeIndex, 'start', e.target.value)}
                                    className="flex-1 sm:flex-none p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mobile-form-input"
                                  />
                                  <span className="text-gray-500 font-medium">à</span>
                                  <input
                                    type="time"
                                    value={range.end}
                                    onChange={(e) => handleRangeChange(day, rangeIndex, 'end', e.target.value)}
                                    className="flex-1 sm:flex-none p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mobile-form-input"
                                  />
                                </div>
                                
                                {hours.ranges.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTimeRange(day, rangeIndex)}
                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors mobile-tap-target self-end sm:self-center"
                                    title="Supprimer cette plage"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            
                            <button
                              type="button"
                              onClick={() => addTimeRange(day)}
                              className="flex items-center justify-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium w-full sm:w-auto"
                            >
                              <Plus className="w-4 h-4" />
                              Ajouter une plage horaire
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-purple-700 hover:via-pink-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      {editingService ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
