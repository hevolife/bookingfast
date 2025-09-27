import React from 'react';
import { useBookings } from '../../hooks/useBookings';
import { Booking } from '../../types';

interface DayViewProps {
  date: Date;
  onTimeSlotClick: (date: string, time: string) => void;
}

export function DayView({ date, onTimeSlotClick }: DayViewProps) {
  const dateString = date.toISOString().split('T')[0];
  const { bookings, loading } = useBookings(dateString);

  // Generate time slots from 8h to 20h (every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Check if a time slot is occupied by a booking
  const getBookingForSlot = (time: string): Booking | null => {
    return bookings.find(booking => {
      const bookingStart = booking.time;
      const bookingEndTime = new Date(`2000-01-01T${bookingStart}`);
      bookingEndTime.setMinutes(bookingEndTime.getMinutes() + booking.duration_minutes);
      const bookingEnd = bookingEndTime.toTimeString().slice(0, 5);
      
      return time >= bookingStart && time < bookingEnd;
    }) || null;
  };

  // Check if this is the start of a booking
  const isBookingStart = (time: string, booking: Booking): boolean => {
    return booking.time === time;
  };

  // Calculate how many slots a booking spans
  const getBookingSpan = (booking: Booking): number => {
    return Math.ceil(booking.duration_minutes / 30);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Planning - {date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })}
      </h3>
      
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-gray-100">
          {timeSlots.map((time, index) => {
            const booking = getBookingForSlot(time);
            const isAvailable = !booking;
            const isStart = booking && isBookingStart(time, booking);
            const span = booking ? getBookingSpan(booking) : 1;

            // Skip rendering if this slot is part of a booking but not the start
            if (booking && !isStart) {
              return null;
            }

            return (
              <div
                key={time}
                className={`relative transition-all duration-200 ${
                  booking ? 'row-span-' + span : ''
                }`}
                style={booking ? { gridRowEnd: `span ${span}` } : {}}
              >
                <button
                  onClick={() => isAvailable && onTimeSlotClick(dateString, time)}
                  disabled={!isAvailable}
                  className={`w-full p-4 text-left transition-all duration-200 hover:shadow-md ${
                    isAvailable
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-l-4 border-green-400 cursor-pointer'
                      : 'bg-gradient-to-r from-rose-50 to-pink-50 border-l-4 border-rose-400 cursor-not-allowed'
                  }`}
                  style={booking ? { minHeight: `${span * 60}px` } : { minHeight: '60px' }}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-4">
                      <div className={`text-lg font-bold ${
                        isAvailable ? 'text-green-700' : 'text-rose-700'
                      }`}>
                        {time}
                      </div>
                      
                      {booking && (
                        <div className="flex-1">
                          <div className={`font-semibold text-rose-800`}>
                            {booking.client_firstname} {booking.client_name}
                          </div>
                          <div className="text-sm text-rose-600 mt-1">
                            {booking.service?.name}
                          </div>
                          <div className="text-xs text-rose-500 mt-1">
                            Durée: {booking.duration_minutes}min
                          </div>
                          {booking.quantity > 1 && (
                            <div className="text-xs text-rose-500">
                              {booking.quantity} participant(s)
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isAvailable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {isAvailable ? 'Disponible' : 'Réservé'}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}