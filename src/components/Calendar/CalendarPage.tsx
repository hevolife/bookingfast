import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { BookingsList } from './BookingsList';
import { ClientsPage } from '../Clients/ClientsPage';
import BookingModal from '../BookingModal/BookingModal';
import { useBookings } from '../../hooks/useBookings';
import { useTeam } from '../../hooks/useTeam';
import { PermissionGate, UsageLimitIndicator } from '../UI/PermissionGate';
import { Booking } from '../../types';

export function CalendarPage() {
  const [currentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'clients'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  const { bookings, loading, addBooking, updateBooking, deleteBooking, refetch } = useBookings();
  const { hasPermission, canEditBooking, canDeleteBooking, getUsageLimits } = useTeam();

  const usageLimits = getUsageLimits();
  const todayBookingsCount = bookings.filter(b => 
    b.date === new Date().toISOString().split('T')[0]
  ).length;

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
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && !canDeleteBooking(booking)) {
      alert('Vous n\'avez pas la permission de supprimer cette réservation');
      return;
    }
    
    await deleteBooking(bookingId);
  };

  return (
    <div className="h-full overflow-auto">
      {/* Navigation des vues */}
      <div className="sticky top-0 z-10 p-4 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <PermissionGate permission="view_calendar" showMessage={false}>
            <button
              onClick={() => setActiveView('calendar')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'calendar'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Planning
            </button>
          </PermissionGate>
          
          <PermissionGate permission="view_calendar" showMessage={false}>
            <button
              onClick={() => setActiveView('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'list'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Liste des réservations
            </button>
          </PermissionGate>
          
          <PermissionGate permission="view_clients" showMessage={false}>
            <button
              onClick={() => setActiveView('clients')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                activeView === 'clients'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Clients
            </button>
          </PermissionGate>
        </div>
      </div>
      
      {/* Contenu selon la vue active */}
      <PermissionGate permission="view_calendar">
        {activeView === 'calendar' ? (
          <UsageLimitIndicator currentUsage={todayBookingsCount} permission="create_booking">
            <CalendarGrid
              currentDate={currentDate}
              onTimeSlotClick={handleTimeSlotClick}
              onBookingClick={handleBookingClick}
              bookings={bookings}
              loading={loading}
              onDeleteBooking={handleDeleteBooking}
            />
          </UsageLimitIndicator>
        ) : activeView === 'list' ? (
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
      
      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          editingBooking={editingBooking}
          onSuccess={handleCloseModal}
        />
      )}
    </div>
  );
}
