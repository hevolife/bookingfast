import React from 'react';
import { useBookings } from '../../hooks/useBookings';
import { Booking } from '../../types';

interface WeekViewProps {
  date: Date;
  onTimeSlotClick: (date: string, time: string) => void;
}

export function WeekView({ date, onTimeSlotClick }: WeekViewProps) {
  const { bookings, loading } = useBookings();

  const getWeekDays = () => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      week.push(current);
    }
    return week;
  };

  const weekDays = getWeekDays();
  
  // Generate time slots (every 30 minutes from 8h to 20h)
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

  const getBookingForSlot = (date: Date, time: string): Booking | null => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.find(booking => {
      if (booking.date !== dateString) return false;
      
      const bookingStart = booking.time;
      const bookingEndTime = new Date(`2000-01-01T${bookingStart}`);
      bookingEndTime.setMinutes(bookingEndTime.getMinutes() + booking.duration_minutes);
      const bookingEnd = bookingEndTime.toTimeString().slice(0, 5);
      
      return time >= bookingStart && time < bookingEnd;
    }) || null;
  };

  const isBookingStart = (booking: Booking, time: string): boolean => {
    return booking.time === time;
  };

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
    <div className="overflow-x-auto">
      <div className="min-w-[900px] bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Days header */}
        <div className="grid grid-cols-8 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="p-4 font-semibold text-gray-600">Horaires</div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-4 text-center border-l border-gray-200">
              <div className="font-semibold text-gray-800">
                {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {day.getDate()}/{day.getMonth() + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div className="divide-y divide-gray-100">
          {timeSlots.map((time, timeIndex) => (
            <div key={time} className="grid grid-cols-8 min-h-[60px]">
              {/* Time label */}
              <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center">
                <span className="font-medium text-gray-700">{time}</span>
              </div>
              
              {/* Day slots */}
              {weekDays.map((day, dayIndex) => {
                const booking = getBookingForSlot(day, time);
                const isAvailable = !booking;
                const isStart = booking && isBookingStart(booking, time);
                const dateString = day.toISOString().split('T')[0];

                // Skip rendering if this slot is part of a booking but not the start
                if (booking && !isStart) {
                  return <div key={dayIndex} className="border-l border-gray-200"></div>;
                }

                return (
                  <button
                    key={dayIndex}
                    onClick={() => isAvailable && onTimeSlotClick(dateString, time)}
                    disabled={!isAvailable}
                    className={`border-l border-gray-200 p-2 text-xs transition-all duration-200 hover:shadow-md ${
                      isAvailable
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 cursor-pointer'
                        : 'bg-gradient-to-br from-rose-50 to-pink-50 cursor-not-allowed'
                    }`}
                  >
                    {booking ? (
                      <div className="text-left">
                        <div className="font-semibold text-rose-700 truncate">
                          {booking.client_firstname} {booking.client_name}
                        </div>
                        <div className="text-rose-600 truncate mt-1">
                          {booking.service?.name}
                        </div>
                        <div className="text-rose-500 mt-1">
                          {booking.duration_minutes}min
                        </div>
                      </div>
                    ) : (
                      <div className="text-green-600 font-medium">
                        Libre
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}