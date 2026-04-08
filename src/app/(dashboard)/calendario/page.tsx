'use client';

import { CalendarAgendaView } from '@/components/calendar/CalendarAgendaView';
import {
  CalendarFilters,
  type FilterState,
} from '@/components/calendar/CalendarFilters';
import { CalendarKanbanView } from '@/components/calendar/CalendarKanbanView';
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView';
import { EventCard } from '@/components/calendar/EventCard';
import type { CalendarEvent } from '@/types/calendar';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type ViewMode = 'month' | 'week' | 'agenda' | 'kanban';

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    modules: [],
    statuses: [],
    priorities: [],
  });

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth(currentDate);

  // Cargar eventos del mes actual
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener organizationId
        const organizationId =
          sessionStorage.getItem('organization_id') || 'default-org';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        // Usar la nueva API de eventos unificados
        const response = await fetch(
          `/api/events/range?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&organizationId=${encodeURIComponent(organizationId)}`
        );

        if (!response.ok) {
          throw new Error('Error al cargar eventos');
        }

        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error('Error loading events:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [currentDate]);

  // Aplicar filtros a los eventos
  useEffect(() => {
    let filtered = [...events];

    // Filtrar por tipo
    if (filters.types.length > 0) {
      filtered = filtered.filter(event => filters.types.includes(event.type));
    }

    // Filtrar por módulo
    if (filters.modules.length > 0) {
      filtered = filtered.filter(event =>
        filters.modules.includes(event.sourceModule)
      );
    }

    // Filtrar por estado
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(event => {
        try {
          const now = new Date();

          if (!event.date) {
            return false;
          }

          let eventDate: Date;

          // Verificar si tiene método toDate (Timestamp de Firestore)
          if (
            typeof event.date === 'object' &&
            event.date !== null &&
            'toDate' in event.date &&
            typeof event.date.toDate === 'function'
          ) {
            eventDate = event.date.toDate();
          }
          // Verificar si tiene propiedad seconds (Timestamp serializado)
          else if (
            typeof event.date === 'object' &&
            event.date !== null &&
            'seconds' in event.date
          ) {
            const timestamp = event.date as {
              seconds: number;
              nanoseconds: number;
            };
            eventDate = new Date(timestamp.seconds * 1000);
          }
          // String o número
          else if (
            typeof event.date === 'string' ||
            typeof event.date === 'number'
          ) {
            eventDate = new Date(event.date);
          }
          // Ya es un Date
          else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            eventDate = new Date(event.date as any);
          }

          // Validar que eventDate sea válido
          if (isNaN(eventDate.getTime())) {
            return false;
          }

          const isOverdue = eventDate < now && event.status !== 'completed';
          const status = isOverdue ? 'overdue' : event.status;
          return filters.statuses.includes(status);
        } catch (error) {
          console.error('Error filtrando por estado:', error, event);
          return false;
        }
      });
    }

    // Filtrar por prioridad
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(event =>
        filters.priorities.includes(event.priority)
      );
    }

    setFilteredEvents(filtered);
  }, [events, filters]);

  // Obtener eventos de un día específico
  const getEventsForDay = (day: number) => {
    return filteredEvents.filter(event => {
      try {
        // Convertir Timestamp de Firestore a Date
        if (!event.date) {
          return false;
        }

        let eventDate: Date;

        // Verificar si tiene método toDate (Timestamp de Firestore)
        if (
          typeof event.date === 'object' &&
          event.date !== null &&
          'toDate' in event.date &&
          typeof event.date.toDate === 'function'
        ) {
          eventDate = event.date.toDate();
        }
        // Verificar si tiene propiedad seconds (Timestamp serializado)
        else if (
          typeof event.date === 'object' &&
          event.date !== null &&
          'seconds' in event.date
        ) {
          // Timestamp serializado de Firestore
          const timestamp = event.date as {
            seconds: number;
            nanoseconds: number;
          };
          eventDate = new Date(timestamp.seconds * 1000);
        }
        // String o número
        else if (
          typeof event.date === 'string' ||
          typeof event.date === 'number'
        ) {
          eventDate = new Date(event.date);
        }
        // Ya es un Date
        else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eventDate = new Date(event.date as any);
        }

        // Validar que eventDate sea válido
        if (isNaN(eventDate.getTime())) {
          console.warn('Fecha inválida:', event.date);
          return false;
        }

        return (
          eventDate.getDate() === day &&
          eventDate.getMonth() === currentDate.getMonth() &&
          eventDate.getFullYear() === currentDate.getFullYear()
        );
      } catch (error) {
        console.error('Error procesando fecha del evento:', error, event);
        return false;
      }
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
        </div>
        <p className="text-gray-600">
          Vista unificada de eventos de auditorías, documentos y acciones
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Header del calendario */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              {/* Toggle de vista */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('month')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Mes
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Semana
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'agenda'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Agenda
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Columns3 className="h-4 w-4" />
                  Kanban
                </button>
              </div>

              <CalendarFilters
                onFiltersChange={setFilters}
                initialFilters={filters}
              />

              {viewMode === 'month' && (
                <>
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contenido del calendario */}
        <div className="p-6">
          {viewMode === 'month' ? (
            <>
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {daysOfWeek.map(day => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-2 border rounded-lg ${
                        day
                          ? 'bg-white hover:bg-gray-50 cursor-pointer'
                          : 'bg-gray-50'
                      } ${isToday(day) ? 'border-emerald-500 border-2' : 'border-gray-200'}`}
                    >
                      {day && (
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-medium ${
                                isToday(day)
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-gray-700'
                              }`}
                            >
                              {day}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                              <EventCard
                                key={event.id}
                                event={event}
                                variant="compact"
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{dayEvents.length - 3} más
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : viewMode === 'week' ? (
            <CalendarWeekView events={filteredEvents} />
          ) : viewMode === 'kanban' ? (
            <CalendarKanbanView events={filteredEvents} />
          ) : (
            <CalendarAgendaView events={filteredEvents} loading={loading} />
          )}
        </div>

        {/* Info de estado */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {loading && (
            <div className="text-center text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
              <p className="text-sm">Cargando eventos...</p>
            </div>
          )}
          {error && (
            <div className="text-center text-red-600">
              <p className="text-sm">Error: {error}</p>
            </div>
          )}
          {!loading && !error && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{filteredEvents.length}</span>{' '}
                  {filteredEvents.length !== events.length && (
                    <span className="text-gray-500">de {events.length}</span>
                  )}{' '}
                  eventos en {monthNames[currentDate.getMonth()]}
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Backend activo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Integración con Auditorías</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Integración con Documentos</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
