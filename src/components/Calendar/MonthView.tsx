import React from 'react';
import { useBookings } from '../../hooks/useBookings';

interface MonthViewProps {
  date: Date;
  onTimeSlotClick: (date: string, time: string) => void;
}

export function MonthView({ date, onTimeSlotClick }: MonthViewProps) {
  const { bookings, loading } = useBookings();

  const getDaysInMonth = () => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days = [];
    
    // Previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      days.push({ date: dayDate, isCurrentMonth: true });
    }
    
    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 weeks × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const dayDate = new Date(year, month + 1, day);
      days.push({ date: dayDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const days = getDaysInMonth();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getBookingsForDay = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateString);
  };

  const getBookingColor = (index: number) => {
    const colors = [
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-teal-100 text-teal-700 border-teal-200',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Weekdays header */}
      <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        {weekDays.map(day => (
          <div key={day} className="p-4 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 divide-x divide-gray-200">
        {days.map((day, index) => {
          const dayBookings = getBookingsForDay(day.date);
          const dateString = day.date.toISOString().split('T')[0];
          const hasBookings = dayBookings.length > 0;
          
          return (
            <button
              key={index}
              onClick={() => onTimeSlotClick(dateString, '09:00')}
              className={`aspect-square p-2 transition-all duration-200 hover:shadow-lg border-b border-gray-200 ${
                day.isCurrentMonth
                  ? hasBookings
                    ? 'bg-gradient-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100'
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="h-full flex flex-col">
                {/* Day number */}
                <div className={`font-semibold text-sm mb-2 ${
                  day.isCurrentMonth 
                    ? hasBookings 
                      ? 'text-rose-700' 
                      : 'text-green-700'
                    : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </div>
                
                {/* Bookings */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayBookings.slice(0, 3).map((booking, idx) => (
                    <div
                      key={idx}
                      className={`text-xs rounded px-2 py-1 border truncate ${getBookingColor(idx)}`}
                    >
                      <div className="font-medium truncate">
                        {booking.time} - {booking.client_firstname}
                      </div>
                      <div className="truncate opacity-75">
                        {booking.service?.name}
                      </div>
                    </div>
                  ))}
                  
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium text-center">
                      +{dayBookings.length - 3} autres
                    </div>
                  )}
                  
                  {dayBookings.length === 0 && day.isCurrentMonth && (
                    <div className="text-xs text-green-600 font-medium text-center mt-4">
                      Disponible
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}