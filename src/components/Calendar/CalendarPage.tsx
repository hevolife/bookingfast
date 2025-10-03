import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { BookingsList } from './BookingsList';
import { ClientsPage } from '../Clients/ClientsPage';
import BookingModal from '../BookingModal/BookingModal';
import { useBookings } from '../../hooks/useBookings';
import { useTeam } from '../../hooks/useTeam';
import { PermissionGate, UsageLimitIndicator } from '../UI/PermissionGate';
import { Booking } from '../../types';

interface CalendarPageProps {
  view?: 'calendar' | 'list' | 'clients';
}

export function CalendarPage({ view = 'calendar' }: CalendarPageProps) {
  const [currentDate] = useState(new Date());
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
      <div>
        <PermissionGate permission="view_calendar">
          {view === 'calendar' ? (
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
          onSuccess={handleCloseModal}
        />
      )}
    </div>
  );
}
