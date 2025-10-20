import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { BookingsList } from './BookingsList';
import { ClientsPage } from '../Clients/ClientsPage';
import BookingModal from '../BookingModal/BookingModal';
import { UnavailabilityModal } from './UnavailabilityModal';
import { useBookings } from '../../hooks/useBookings';
import { useUnavailabilities } from '../../hooks/useUnavailabilities';
import { useTeam } from '../../hooks/useTeam';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { usePlugins } from '../../hooks/usePlugins';
import { PermissionGate, UsageLimitIndicator } from '../UI/PermissionGate';
import { Booking } from '../../types';
import { UserCheck, X, Ban } from 'lucide-react';
import { bookingEvents } from '../../lib/bookingEvents';

interface CalendarPageProps {
  view?: 'calendar' | 'list' | 'clients';
}

export function CalendarPage({ view = 'calendar' }: CalendarPageProps) {
  const [currentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnavailabilityModalOpen, setIsUnavailabilityModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  
  const { bookings, loading, addBooking, updateBooking, deleteBooking, refetch } = useBookings();
  const { unavailabilities, addUnavailability, updateUnavailability, deleteUnavailability, refetch: refetchUnavailabilities } = useUnavailabilities();
  
  const { hasPermission, canEditBooking, canDeleteBooking, getUsageLimits, isOwner } = useTeam();
  const { teamMembers, loading: membersLoading } = useTeamMembers();
  const { hasPluginAccess } = usePlugins();

  const [canViewTeamFilter, setCanViewTeamFilter] = useState(false);
  const [isMultiUserActive, setIsMultiUserActive] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const multiUserActive = await hasPluginAccess('multi-user');
      setIsMultiUserActive(multiUserActive);
      
      if (isOwner && multiUserActive) {
        setCanViewTeamFilter(true);
      } else if (multiUserActive) {
        const hasFilterPermission = hasPermission('view_team_filter');
        setCanViewTeamFilter(hasFilterPermission);
      } else {
        setCanViewTeamFilter(false);
      }
    };

    checkAccess();
  }, [hasPluginAccess, isOwner, hasPermission]);

  useEffect(() => {
    const handleBookingChange = (data: any) => {
      refetch();
    };

    const handleUnavailabilityChange = () => {
      refetchUnavailabilities();
    };

    bookingEvents.on('bookingCreated', handleBookingChange);
    bookingEvents.on('bookingUpdated', handleBookingChange);
    bookingEvents.on('bookingDeleted', handleBookingChange);
    
    window.addEventListener('refreshUnavailabilities', handleUnavailabilityChange);

    return () => {
      bookingEvents.off('bookingCreated', handleBookingChange);
      bookingEvents.off('bookingUpdated', handleBookingChange);
      bookingEvents.off('bookingDeleted', handleBookingChange);
      window.removeEventListener('refreshUnavailabilities', handleUnavailabilityChange);
    };
  }, [refetch, refetchUnavailabilities]);

  const usageLimits = getUsageLimits();
  const todayBookingsCount = bookings.filter(b => 
    b.date === new Date().toISOString().split('T')[0]
  ).length;

  const filteredBookings = selectedTeamMember === 'all' 
    ? bookings 
    : bookings.filter(b => {
        if (selectedTeamMember === 'unassigned') {
          return !b.assigned_user_id;
        }
        return b.assigned_user_id === selectedTeamMember;
      });

  const filteredUnavailabilities = selectedTeamMember === 'all'
    ? unavailabilities
    : unavailabilities.filter(u => {
        if (selectedTeamMember === 'unassigned') {
          return !u.assigned_user_id;
        }
        return u.assigned_user_id === selectedTeamMember;
      });

  const handleTimeSlotClick = (date: string, time: string) => {
    if (!hasPermission('create_booking')) {
      alert('Vous n\'avez pas la permission de créer des réservations');
      return;
    }
    
    if (usageLimits.maxBookingsPerDay && todayBookingsCount >= usageLimits.maxBookingsPerDay) {
      alert(`Limite atteinte: ${usageLimits.maxBookingsPerDay} réservations par jour maximum pour votre rôle`);
      return;
    }
    
    setSelectedDate(date);
    setSelectedTime(time);
    setIsModalOpen(true);
  };

  const handleAddUnavailability = (date?: string) => {
    if (date) {
      setSelectedDate(date);
    }
    setIsUnavailabilityModalOpen(true);
  };

  const handleBookingClick = (booking: Booking) => {
    if (!canEditBooking(booking)) {
      alert('Vous n\'avez pas la permission de modifier cette réservation');
      return;
    }
    
    setSelectedDate(booking.date);
    setSelectedTime(booking.time);
    setEditingBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    console.log('🔍 CalendarPage.handleDeleteBooking - ID:', bookingId);
    
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && !canDeleteBooking(booking)) {
      alert('Vous n\'avez pas la permission de supprimer cette réservation');
      return;
    }
    
    console.log('🔄 CalendarPage.handleDeleteBooking - Appel deleteBooking du hook...');
    try {
      await deleteBooking(bookingId);
      console.log('✅ CalendarPage.handleDeleteBooking - Suppression réussie');
      await refetch();
      console.log('✅ CalendarPage.handleDeleteBooking - Rafraîchissement terminé');
    } catch (error) {
      console.error('❌ CalendarPage.handleDeleteBooking - Erreur:', error);
      throw error;
    }
  };

  const handleDeleteUnavailability = async (unavailabilityId: string) => {
    try {
      await deleteUnavailability(unavailabilityId);
      await refetchUnavailabilities();
    } catch (error) {
      console.error('Erreur suppression indisponibilité:', error);
      throw error;
    }
  };

  const handleBookingSuccess = async () => {
    handleCloseModal();
  };

  const handleSaveUnavailability = async (unavailabilityData: any) => {
    await addUnavailability(unavailabilityData);
    await refetchUnavailabilities();
  };

  const getMemberDisplayName = (member: typeof teamMembers[0]) => {
    if (member.firstname && member.lastname) {
      return `${member.firstname} ${member.lastname}`;
    }
    if (member.full_name) {
      return member.full_name;
    }
    if (member.firstname) {
      return member.firstname;
    }
    return member.email || 'Membre sans nom';
  };

  const shouldShowTeamFilter = canViewTeamFilter && isMultiUserActive && teamMembers.length > 0 && view === 'calendar';

  return (
    <div 
      className="h-full flex flex-col overflow-y-auto scrollable-area" 
      style={{ 
        margin: 0, 
        padding: 0,
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      {shouldShowTeamFilter && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-gray-700 flex-shrink-0">
              <UserCheck className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-sm">Filtrer par membre :</span>
            </div>
            
            <div className="flex-1 flex items-center gap-2">
              <select
                value={selectedTeamMember}
                onChange={(e) => setSelectedTeamMember(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={membersLoading}
              >
                <option value="all">
                  {membersLoading ? 'Chargement...' : `Tous les membres (${teamMembers.length})`}
                </option>
                {teamMembers.map(member => {
                  const displayName = getMemberDisplayName(member);
                  return (
                    <option key={member.user_id} value={member.user_id}>
                      {displayName}
                      {member.email && displayName !== member.email ? ` (${member.email})` : ''}
                    </option>
                  );
                })}
                <option value="unassigned">Non assigné</option>
              </select>
              
              {selectedTeamMember !== 'all' && (
                <button
                  onClick={() => setSelectedTeamMember('all')}
                  className="px-3 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-1"
                  title="Réinitialiser le filtre"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden md:inline">Réinitialiser</span>
                </button>
              )}

              <button
                onClick={() => handleAddUnavailability()}
                className="px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1"
                title="Ajouter une indisponibilité"
              >
                <Ban className="w-4 h-4" />
                <span className="hidden md:inline">Indisponibilité</span>
              </button>
            </div>
          </div>
          
          {selectedTeamMember !== 'all' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
              <span className="font-medium">Filtre actif :</span>
              <span>
                {selectedTeamMember === 'unassigned' 
                  ? 'Réservations non assignées'
                  : (() => {
                      const member = teamMembers.find(m => m.user_id === selectedTeamMember);
                      return member ? getMemberDisplayName(member) : 'Membre inconnu';
                    })()
                }
              </span>
              <span className="ml-auto font-bold">
                {filteredBookings.length} réservation(s)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" style={{ margin: 0, padding: 0 }}>
        <PermissionGate permission="view_calendar">
          {view === 'calendar' ? (
            <UsageLimitIndicator currentUsage={todayBookingsCount} permission="create_booking">
              <CalendarGrid
                currentDate={currentDate}
                onTimeSlotClick={handleTimeSlotClick}
                onBookingClick={handleBookingClick}
                bookings={filteredBookings}
                unavailabilities={filteredUnavailabilities}
                loading={loading}
                onDeleteBooking={handleDeleteBooking}
                onAddUnavailability={handleAddUnavailability}
              />
            </UsageLimitIndicator>
          ) : view === 'list' ? (
            <PermissionGate permission="view_calendar">
              <BookingsList
                onEditBooking={handleBookingClick}
              />
            </PermissionGate>
          ) : (
            <PermissionGate permission="view_clients">
              <ClientsPage />
            </PermissionGate>
          )}
        </PermissionGate>
      </div>
      
      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          editingBooking={editingBooking}
          onSuccess={handleBookingSuccess}
        />
      )}

      {isUnavailabilityModalOpen && (
        <UnavailabilityModal
          isOpen={isUnavailabilityModalOpen}
          onClose={() => setIsUnavailabilityModalOpen(false)}
          onSave={handleSaveUnavailability}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
