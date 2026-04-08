'use client';

import { CalendarEvent } from '@/types/calendar';
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { EventCard } from './EventCard';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function CalendarWeekView({
  events,
  onEventClick,
  onDateClick,
}: CalendarWeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Lunes
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Domingo
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Horas del día (8am - 8pm)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Obtener eventos para un día específico
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = getEventDate(event.date);
      if (!eventDate) return false;

      // Si tiene endDate, verificar si el día está en el rango
      if (event.endDate) {
        const endDate = getEventDate(event.endDate);
        if (endDate) {
          return day >= eventDate && day <= endDate;
        }
      }

      return isSameDay(eventDate, day);
    });
  };

  // Obtener eventos para una hora específica de un día
  const getEventsForHour = (day: Date, hour: number): CalendarEvent[] => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.filter(event => {
      const eventDate = getEventDate(event.date);
      if (!eventDate) return false;
      return eventDate.getHours() === hour;
    });
  };

  // Obtener eventos sin hora específica (todo el día)
  const getAllDayEvents = (day: Date): CalendarEvent[] => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.filter(event => {
      const eventDate = getEventDate(event.date);
      if (!eventDate) return false;
      // Eventos a las 00:00 o con endDate se consideran de todo el día
      return eventDate.getHours() === 0 || event.endDate !== null;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header con navegación */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekStart, 'd MMM', { locale: es })} -{' '}
            {format(weekEnd, 'd MMM yyyy', { locale: es })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            onClick={handlePreviousWeek}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid de semana */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Header de días */}
          <div className="grid grid-cols-8 border-b sticky top-0 bg-white z-10">
            <div className="p-2 text-xs font-medium text-gray-500 border-r">
              Hora
            </div>
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center border-r ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-xs font-medium text-gray-500">
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Eventos de todo el día */}
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="p-2 text-xs font-medium text-gray-500 border-r">
              Todo el día
            </div>
            {weekDays.map(day => {
              const allDayEvents = getAllDayEvents(day);
              return (
                <div
                  key={`allday-${day.toISOString()}`}
                  className="p-1 border-r min-h-[60px]"
                >
                  {allDayEvents.length > 0 && (
                    <div className="space-y-1">
                      {allDayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className="cursor-pointer"
                        >
                          <EventCard event={event} variant="compact" />
                        </div>
                      ))}
                      {allDayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{allDayEvents.length - 2} más
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid de horas */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b">
              <div className="p-2 text-xs font-medium text-gray-500 border-r text-right">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map(day => {
                const hourEvents = getEventsForHour(day, hour);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`p-1 border-r min-h-[80px] ${
                      isToday ? 'bg-blue-50/30' : 'hover:bg-gray-50'
                    } cursor-pointer`}
                    onClick={() =>
                      onDateClick?.(new Date(day.setHours(hour, 0, 0, 0)))
                    }
                  >
                    {hourEvents.length > 0 && (
                      <div className="space-y-1">
                        {hourEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={e => {
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                            className="cursor-pointer"
                          >
                            <EventCard event={event} variant="compact" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper para obtener fecha del evento
function getEventDate(date: unknown): Date | null {
  if (!date) return null;

  // Si es un Timestamp de Firestore serializado
  if (typeof date === 'object' && date !== null && 'seconds' in date) {
    const timestamp = date as { seconds: number; nanoseconds?: number };
    return new Date(timestamp.seconds * 1000);
  }

  // Si es un objeto Date
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  // Si es un string ISO
  if (typeof date === 'string') {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  }

  return null;
}
