import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { getBusinessTimezone, getCurrentDateInTimezone, isPastDateInTimezone, formatInBusinessTimezone } from '../../lib/timezone';
import { isDateAvailableForBooking, getNextAvailableDateTime } from '../../lib/bookingValidation';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function DatePicker({ value, onChange, disabled, required }: DatePickerProps) {
  const { settings } = useBusinessSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialiser avec la date du jour si aucune valeur n'est fournie
  useEffect(() => {
    const timezone = getBusinessTimezone(settings);
    if (!value) {
      if (settings) {
        const { date: nextAvailableDate } = getNextAvailableDateTime(settings);
        onChange(nextAvailableDate);
        setSelectedDate(new Date(nextAvailableDate));
        setCurrentMonth(new Date(nextAvailableDate));
      } else {
        const todayString = getCurrentDateInTimezone(timezone);
        onChange(todayString);
        setSelectedDate(new Date(todayString));
        setCurrentMonth(new Date(todayString));
      }
    } else {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentMonth(date);
    }
  }, [value, onChange, settings]);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const timezone = getBusinessTimezone(settings);
    return formatInBusinessTimezone(new Date(dateString), timezone, {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0

    const days = [];
    
    // Jours du mois précédent
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      days.push({ date: dayDate, isCurrentMonth: true });
    }
    
    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length; // 6 semaines × 7 jours
    for (let day = 1; day <= remainingDays; day++) {
      const dayDate = new Date(year, month + 1, day);
      days.push({ date: dayDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    // Utiliser la date locale pour éviter les décalages de fuseau horaire
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    onChange(dateString);
    setSelectedDate(date);
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const goToToday = () => {
    if (settings) {
      const { date: nextAvailableDate } = getNextAvailableDateTime(settings);
      const nextAvailable = new Date(nextAvailableDate);
      setCurrentMonth(nextAvailable);
      handleDateSelect(nextAvailable);
    } else {
      const timezone = getBusinessTimezone(settings);
      const todayString = getCurrentDateInTimezone(timezone);
      const today = new Date(todayString);
      setCurrentMonth(today);
      handleDateSelect(today);
    }
  };

  // Fonction pour centrer sur la date actuelle sans la sélectionner
  const centerOnToday = () => {
    if (settings) {
      const { date: nextAvailableDate } = getNextAvailableDateTime(settings);
      const nextAvailable = new Date(nextAvailableDate);
      setCurrentMonth(nextAvailable);
    } else {
      const timezone = getBusinessTimezone(settings);
      const todayString = getCurrentDateInTimezone(timezone);
      const today = new Date(todayString);
      setCurrentMonth(today);
    }
  };

  // Centrer sur la date actuelle quand le composant se réinitialise
  useEffect(() => {
    if (!value) {
      centerOnToday();
    }
  }, [value, settings]);

  // Écouter l'événement de reset pour recentrer le calendrier
  useEffect(() => {
    const handleReset = () => {
      centerOnToday();
    };

    window.addEventListener('resetDatePicker', handleReset);
    return () => window.removeEventListener('resetDatePicker', handleReset);
  }, [settings]);

  const isToday = (date: Date) => {
    // Utiliser la date locale réelle
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return today.getTime() === compareDate.getTime();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const isPastDate = (date: Date) => {
    // Désactiver complètement le blocage des dates passées
    return false;
  };

  const days = getDaysInMonth();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Date {required && '*'}
      </label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 text-left ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
            : isOpen
            ? 'border-blue-500 bg-blue-50 shadow-lg'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
            value ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {value ? formatDisplayDate(value) : 'Sélectionner une date'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Calendrier dropdown */}
      {isOpen && (
        <>
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[100000] overflow-hidden">
            {/* Header du calendrier */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <h3 className="text-lg font-bold">
                  {currentMonth.toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                
                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <button
                type="button"
                onClick={goToToday}
                className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-colors font-medium"
              >
                {settings && settings.minimum_booking_delay_hours > 0 ? 'Prochaine date disponible' : 'Aujourd\'hui'}
              </button>
            </div>

            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {weekDays.map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 p-2">
              {days.map((day, index) => {
                const isCurrentMonth = day.isCurrentMonth;
                const isTodayDate = isToday(day.date);
                const isSelectedDate = isSelected(day.date);
                const isNotAvailable = isPastDate(day.date);
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDateSelect(day.date)}
                    disabled={!isCurrentMonth}
                    className={`aspect-square m-1 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-110 animate-fadeIn ${
                      isSelectedDate
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : isTodayDate
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : isCurrentMonth
                        ? isNotAvailable
                          ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        : 'bg-transparent text-gray-300 cursor-not-allowed'
                    }`}
                    style={{ animationDelay: `${index * 20}ms` }}
                    title={isNotAvailable && settings ? `Délai minimum: ${settings.minimum_booking_delay_hours}h` : ''}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-[99999]" 
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
