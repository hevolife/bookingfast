import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Sparkles, Calendar as CalendarIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Booking } from '../../types';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { ServiceBookingModal } from './ServiceBookingModal';
import { isSupabaseConfigured } from '../../lib/supabase';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { bookingEvents } from '../../lib/bookingEvents';

interface CalendarGridProps {
  currentDate: Date;
  onTimeSlotClick: (date: string, time: string) => void;
  onBookingClick: (booking: Booking) => void;
  bookings: Booking[];
  loading: boolean;
  onDeleteBooking: (bookingId: string) => void;
}

export function CalendarGrid({ currentDate, onTimeSlotClick, onBookingClick, bookings: allBookings, loading, onDeleteBooking }: CalendarGridProps) {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMonth, setViewMonth] = useState<Date>(today);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedServiceBookings, setSelectedServiceBookings] = useState<Booking[]>([]);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const selectedDateString = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

  const getTodayString = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  };

  const isToday = (date: Date): boolean => {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth() === now.getMonth() &&
           date.getDate() === now.getDate();
  };

  const isSelected = (date: Date): boolean => {
    return date.getFullYear() === selectedDate.getFullYear() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getDate() === selectedDate.getDate();
  };

  const generateDaysForMonth = () => {
    const days = [];
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      const dayDateOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      days.push({
        date: day,
        isToday: isToday(day),
        isSelected: isSelected(day),
        isCurrentMonth: false,
        isPast: dayDateOnly < todayDateOnly,
        dateString: `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      days.push({
        date: date,
        isToday: isToday(date),
        isSelected: isSelected(date),
        isCurrentMonth: true,
        isPast: dayDateOnly < todayDateOnly,
        dateString: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dayDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      days.push({
        date: date,
        isToday: isToday(date),
        isSelected: isSelected(date),
        isCurrentMonth: false,
        isPast: dayDateOnly < todayDateOnly,
        dateString: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
      });
    }

    return days;
  };

  const days = generateDaysForMonth();

  useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  useEffect(() => {
    const handleBookingChange = () => {
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBookings'));
      }, 100);
    };

    bookingEvents.on('bookingCreated', handleBookingChange);
    bookingEvents.on('bookingUpdated', handleBookingChange);
    bookingEvents.on('bookingDeleted', handleBookingChange);

    return () => {
      bookingEvents.off('bookingCreated', handleBookingChange);
      bookingEvents.off('bookingUpdated', handleBookingChange);
      bookingEvents.off('bookingDeleted', handleBookingChange);
    };
  }, []);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newViewMonth = new Date(viewMonth);
    if (direction === 'prev') {
      newViewMonth.setMonth(viewMonth.getMonth() - 1);
    } else {
      newViewMonth.setMonth(viewMonth.getMonth() + 1);
    }
    setViewMonth(newViewMonth);
    const newSelectedDate = new Date(newViewMonth.getFullYear(), newViewMonth.getMonth(), 1);
    setSelectedDate(newSelectedDate);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const goToMonth = (monthOffset: number) => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    setViewMonth(targetMonth);
    if (monthOffset === 0) {
      setSelectedDate(now);
    } else {
      setSelectedDate(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1));
    }
  };

  const getQuickNavOptions = () => {
    return [
      { label: 'Ce mois', offset: 0, isCurrent: true },
      { label: 'Mois prochain', offset: 1, isCurrent: false },
      { label: 'Dans 2 mois', offset: 2, isCurrent: false },
      { label: 'Mois dernier', offset: -1, isCurrent: false }
    ];
  };

  const quickNavOptions = getQuickNavOptions();

  const isCurrentMonth = () => {
    const now = new Date();
    return viewMonth.getFullYear() === now.getFullYear() && 
           viewMonth.getMonth() === now.getMonth();
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(viewMonth);
    if (direction === 'prev') {
      newMonth.setMonth(viewMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(viewMonth.getMonth() + 1);
    }
    setViewMonth(newMonth);
    const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
    setSelectedDate(firstDay);
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== viewMonth.getMonth() || date.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const generateTimeSlots = (date: Date) => {
    if (!settings) return [];
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySettings = settings.opening_hours[dayName];
    
    if (!daySettings || daySettings.closed) {
      return [];
    }
    
    let availableRanges;
    if (daySettings.ranges && Array.isArray(daySettings.ranges)) {
      availableRanges = daySettings.ranges;
    } else if (daySettings.start && daySettings.end) {
      availableRanges = [{ start: daySettings.start, end: daySettings.end }];
    } else {
      return [];
    }
    
    const allTimes = availableRanges.flatMap(range => [range.start, range.end]);
    const openingTime = allTimes.reduce((earliest, time) => time < earliest ? time : earliest);
    const closingTime = allTimes.reduce((latest, time) => time > latest ? time : latest);
    
    const allSlots = [];
    const [openHour, openMinute] = openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = closingTime.split(':').map(Number);
    
    let currentHour = openHour;
    let currentMinute = openMinute;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      const isAvailable = availableRanges.some(range => {
        return timeString >= range.start && timeString < range.end;
      });
      
      allSlots.push({
        time: timeString,
        available: isAvailable
      });
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }
    
    return allSlots;
  };

  const timeSlots = generateTimeSlots(selectedDate);

  const isDayClosed = () => {
    if (!settings) return false;
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySettings = settings.opening_hours[dayName];
    return !daySettings || daySettings.closed;
  };

  const scrollToDays = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollToToday = () => {
    const now = new Date();
    if (viewMonth.getMonth() !== now.getMonth() || viewMonth.getFullYear() !== now.getFullYear()) {
      setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setSelectedDate(now);
    if (scrollContainerRef.current) {
      const todayIndex = days.findIndex(day => isToday(day.date));
      if (todayIndex !== -1) {
        const dayWidth = 76;
        const containerWidth = scrollContainerRef.current.clientWidth;
        const scrollPosition = (todayIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2);
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }
  };

  const scrollToSelectedDate = () => {
    if (scrollContainerRef.current) {
      const selectedIndex = days.findIndex(day => isSelected(day.date));
      if (selectedIndex !== -1) {
        const dayWidth = 76;
        const containerWidth = scrollContainerRef.current.clientWidth;
        const scrollPosition = (selectedIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2);
        scrollContainerRef.current.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSelectedDate();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSelectedDate();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getBookingsForDay = (date: Date) => {
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const dayBookings = allBookings.filter(b => b.date === dateString);
    return dayBookings.sort((a, b) => a.time.localeCompare(b.time));
  };

  const groupBookingsByServiceAndTime = (bookings: Booking[]) => {
    const groups: Array<{
      serviceId: string;
      serviceName: string;
      timeIndex: number;
      duration: number;
      bookings: Booking[];
      startTime: string;
    }> = [];

    const serviceTimeGroups = new Map<string, Booking[]>();
    
    bookings.forEach(booking => {
      const normalizedTime = booking.time.slice(0, 5);
      const key = `${booking.service_id}-${normalizedTime}`;
      if (!serviceTimeGroups.has(key)) {
        serviceTimeGroups.set(key, []);
      }
      serviceTimeGroups.get(key)!.push(booking);
    });
    
    serviceTimeGroups.forEach((groupBookings, key) => {
      const firstBooking = groupBookings[0];
      if (!firstBooking) return;
      
      const serviceName = firstBooking.service?.name || `Service ${firstBooking.service_id.slice(0, 8)}`;
      const bookingTime = firstBooking.time.slice(0, 5);
      const timeIndex = timeSlots.findIndex(slot => slot.time === bookingTime);
      
      if (timeIndex !== -1) {
        groups.push({
          serviceId: firstBooking.service_id,
          serviceName: serviceName,
          timeIndex,
          duration: Math.ceil(firstBooking.duration_minutes / 30),
          bookings: groupBookings,
          startTime: bookingTime
        });
      }
    });

    return groups;
  };

  const getBookingColor = (index: number) => {
    const colors = [
      'from-rose-400 to-pink-500',
      'from-blue-400 to-cyan-500',
      'from-purple-400 to-indigo-500',
      'from-orange-400 to-red-500',
      'from-teal-400 to-green-500',
      'from-yellow-400 to-orange-500',
    ];
    return colors[index % colors.length];
  };

  const dayBookings = getBookingsForDay(selectedDate);
  const serviceGroups = timeSlots.length > 0 ? groupBookingsByServiceAndTime(dayBookings) : [];

  const handleServiceBlockClick = (group: any) => {
    setSelectedServiceBookings(group.bookings);
    setSelectedServiceName(group.serviceName);
    setServiceModalOpen(true);
  };

  const getMonthOptions = () => {
    const now = new Date();
    const options = [];
    
    for (let i = 6; i >= 1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        date,
        label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        isCurrentMonth: false
      });
    }
    
    options.push({
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      label: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      isCurrentMonth: true
    });
    
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        date,
        label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        isCurrentMonth: false
      });
    }
    
    return options;
  };

  const monthOptions = getMonthOptions();

  const selectMonth = (date: Date) => {
    setViewMonth(date);
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setShowMonthSelector(false);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Chargement du planning...</p>
        </div>
      </div>
    );
  }

  const MonthDropdown = () => {
    if (!showMonthSelector) return null;

    return createPortal(
      <>
        <div 
          className="fixed inset-0 z-[999998] bg-transparent" 
          onClick={() => setShowMonthSelector(false)}
        />
        <div 
          className="fixed z-[999999] bg-white border border-gray-200 rounded-2xl shadow-2xl min-w-64 max-h-80 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top + 8}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${Math.max(dropdownPosition.width, 256)}px`
          }}
        >
          <div className="p-2">
            {monthOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => selectMonth(option.date)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between ${
                  viewMonth.getMonth() === option.date.getMonth() && 
                  viewMonth.getFullYear() === option.date.getFullYear()
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : option.isCurrentMonth
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:bg-green-100'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {option.isCurrentMonth && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </>,
      document.body
    );
  };

  return (
    <>
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 h-full flex flex-col">
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-lg p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                  Planning
                </h1>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  Gestion des rendez-vous
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                {selectedDate.toLocaleDateString('fr-FR', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'short'
                })}
              </div>
              <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                isDayClosed()
                  ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700'
                  : dayBookings.length > 0 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' 
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600'
              }`}>
                {isDayClosed() ? '🔒 Fermé' : `📅 ${dayBookings.length} rdv`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 transform hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {viewMonth.toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
              
              <button
                onClick={() => changeMonth('next')}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 transform hover:scale-110"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="hidden sm:flex gap-1 mb-2 justify-center flex-wrap">
            {quickNavOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => goToMonth(option.offset)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 ${
                  option.isCurrent && isCurrentMonth()
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                    : 'bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToDays('left')}
              className="p-3 hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-md"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto scrollbar-hide px-2 scroll-smooth mobile-optimized"
              style={{ touchAction: 'pan-x' }}
            >
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {days.map((day, index) => {
                  const dayBookingsCount = getBookingsForDay(day.date).length;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => selectDay(day.date)}
                      className={`relative flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-lg animate-fadeIn ${
                        day.isSelected
                          ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white shadow-xl shadow-purple-200 animate-pulse'
                          : day.isToday
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-2 border-blue-300 shadow-xl shadow-blue-200'
                          : day.isCurrentMonth
                          ? 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 border border-gray-200'
                          : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 border border-gray-200'
                      }`}
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <div className="text-xs font-medium">
                        {day.date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                      </div>
                      <div className="text-sm font-bold">
                        {day.date.getDate()}
                      </div>
                      
                      {day.isToday && (
                        <div className="absolute -bottom-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                      
                      {dayBookingsCount > 0 && !day.isPast && (
                        <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce shadow-lg px-1">
                          {dayBookingsCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => scrollToDays('right')}
              className="p-3 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-md"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24" ref={timeGridRef}>
          {isDayClosed() ? (
            <div className="flex items-center justify-center h-64 animate-fadeIn">
              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Clock className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">🔒 Fermé aujourd'hui</h3>
                <p className="text-gray-600 text-lg">
                  L'établissement est fermé le {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                </p>
              </div>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="flex items-center justify-center h-64 animate-fadeIn">
              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Clock className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">⚙️ Aucun horaire configuré</h3>
                <p className="text-gray-600 text-lg">
                  Configurez les horaires d'ouverture dans les paramètres admin
                </p>
              </div>
            </div>
          ) : (
            <div className="flex">
              <div className="w-20 bg-white/80 backdrop-blur-sm border-r border-gray-100 flex-shrink-0 shadow-lg">
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.time}
                    className={`h-12 flex items-center justify-center border-b border-gray-50 transition-all duration-300 ${
                      slot.available 
                        ? index % 2 === 0 ? 'bg-gradient-to-r from-blue-50/50 to-purple-50/50' : 'bg-white/50'
                        : index % 2 === 0 ? 'bg-gradient-to-r from-gray-100/50 to-gray-200/50' : 'bg-gray-100/30'
                    }`}
                  >
                    <span className={`text-xs font-bold ${
                      slot.available ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {slot.time}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex-1 relative bg-white/60 backdrop-blur-sm" style={{ minHeight: `${timeSlots.length * 48}px` }}>
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.time}
                    className={`absolute left-0 right-0 border-b border-gray-100 transition-all duration-300 ${
                      !slot.available 
                        ? 'bg-gradient-to-r from-gray-100/80 to-gray-200/80' 
                        : index % 2 === 0 
                        ? 'bg-gradient-to-r from-blue-50/30 to-purple-50/30' 
                        : 'bg-white/50'
                    }`}
                    style={{ top: `${index * 48}px`, height: '48px' }}
                  />
                ))}

                {timeSlots.map((slot, index) => (
                  <button
                    key={slot.time}
                    onClick={() => {
                      if (!slot.available) return;
                      const selectedDateString = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
                      onTimeSlotClick(selectedDateString, slot.time);
                    }}
                    disabled={!slot.available}
                    className={`absolute left-0 right-0 transition-all duration-300 group ${
                      slot.available 
                        ? 'hover:bg-gradient-to-r hover:from-green-100/80 hover:to-emerald-100/80 transform hover:scale-[1.02] cursor-pointer'
                        : 'cursor-not-allowed'
                    }`}
                    style={{ 
                      top: `${index * 48}px`, 
                      height: '48px' 
                    }}
                  >
                    {slot.available && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-full transition-all duration-300">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full p-3 shadow-xl transform group-hover:rotate-180 transition-transform duration-300">
                          <Plus className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}

                <div className="absolute inset-0 z-30 pointer-events-none">
                  {serviceGroups.map((group, groupIndex) => {
                    const { bookings, serviceName, startTime } = group;
                    if (!bookings || bookings.length === 0) return null;
                    
                    const timeIndex = timeSlots.findIndex(slot => slot && slot.time === startTime);
                    if (timeIndex === -1) return null;
                    
                    const duration = Math.ceil(bookings[0].duration_minutes / 30);
                    
                    const overlappingGroups = serviceGroups.filter(otherGroup => {
                      const otherStartIndex = timeSlots.findIndex(slot => slot.time === otherGroup.startTime);
                      const otherDuration = Math.ceil(otherGroup.bookings[0].duration_minutes / 30);
                      const otherEnd = otherStartIndex + otherDuration;
                      const currentStart = timeIndex;
                      const currentEnd = timeIndex + duration;
                      return (otherStartIndex < currentEnd && otherEnd > currentStart);
                    });
                    
                    const overlapCount = overlappingGroups.length;
                    const overlapIndex = overlappingGroups.findIndex(g => g === group);
                    
                    const blockWidth = overlapCount > 1 ? `${100 / overlapCount}%` : 'calc(100% - 4px)';
                    const blockLeft = overlapCount > 1 ? `calc(${(overlapIndex * 100) / overlapCount}% + ${overlapIndex * 2}px)` : '2px';

                    const position = {
                      top: `${timeIndex * 48}px`,
                      height: `${duration * 48 - 4}px`,
                    };
                    
                    const colorClass = getBookingColor(groupIndex);
                    const totalParticipants = bookings.reduce((sum, booking) => sum + booking.quantity, 0);
                    
                    return (
                      <div
                        key={`${group.serviceId}-${startTime}`}
                        className={`absolute bg-gradient-to-r ${colorClass} text-white rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:z-50 animate-fadeIn pointer-events-auto`}
                        style={{
                          left: blockLeft,
                          width: blockWidth,
                          ...position,
                          animationDelay: `${groupIndex * 100}ms`,
                          zIndex: 30 + overlapIndex
                        }}
                        onClick={() => handleServiceBlockClick(group)}
                      >
                        <div className={`h-full flex flex-col justify-center relative overflow-hidden ${
                          overlapCount > 1 ? 'p-2' : 'p-3'
                        }`}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"></div>
                          
                          <div className="relative z-10 text-center sm:text-left">
                            <div className={`font-bold break-words ${
                              overlapCount > 1 ? 'text-xs' : 'text-xs sm:text-sm'
                            }`}>
                              {(() => {
                                if (serviceName === 'Service personnalisé' && bookings.length > 0) {
                                  const firstBooking = bookings[0];
                                  if (firstBooking.custom_service_data?.name) {
                                    return firstBooking.custom_service_data.name;
                                  }
                                }
                                return serviceName;
                              })()}
                            </div>
                            <div className={`opacity-90 truncate flex items-center justify-center sm:justify-start gap-1 ${
                              overlapCount > 1 ? 'text-xs' : 'text-xs'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {startTime}
                            </div>
                            <div className="mt-1 flex flex-col items-center sm:items-start">
                              <div className="text-xs font-medium text-white leading-tight">
                                {totalParticipants} sur {bookings[0]?.service?.capacity || 1}
                              </div>
                              <div className="w-10 bg-white/30 rounded-full h-1 overflow-hidden mt-0.5">
                                <div 
                                  className="h-full bg-white rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${Math.min((totalParticipants / (bookings[0]?.service?.capacity || 1)) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={scrollToToday}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-110 shadow-2xl border-2 border-white/20 backdrop-blur-sm"
        title="Aller à aujourd'hui"
        style={{ 
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          right: 'calc(1.5rem + env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      </button>

      <ServiceBookingModal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        bookings={selectedServiceBookings}
        serviceName={selectedServiceName}
        serviceId={selectedServiceBookings[0]?.service_id || ''}
        selectedDate={selectedDateString}
        selectedTime={selectedServiceBookings[0]?.time || '09:00'}
        onEditBooking={(booking) => {
          setServiceModalOpen(false);
          onBookingClick(booking);
        }}
        onDeleteBooking={onDeleteBooking}
        onNewBooking={(date, time, serviceId) => {
          onTimeSlotClick(date, time);
        }}
      />

      <MonthDropdown />
    </>
  );
}
