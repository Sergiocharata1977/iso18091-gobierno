'use client';

import { EventCard } from '@/components/calendar/EventCard';
import type { CalendarEvent } from '@/types/calendar';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { useMemo } from 'react';

interface CalendarAgendaViewProps {
  events: CalendarEvent[];
  loading?: boolean;
  groupBy?: 'date' | 'type' | 'module';
}

export function CalendarAgendaView({
  events,
  loading = false,
  groupBy = 'date',
}: CalendarAgendaViewProps) {
  // Agrupar eventos según el criterio seleccionado
  const groupedEvents = useMemo(() => {
    if (groupBy === 'date') {
      return groupEventsByDate(events);
    } else if (groupBy === 'type') {
      return groupEventsByType(events);
    } else {
      return groupEventsByModule(events);
    }
  }, [events, groupBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay eventos
        </h3>
        <p className="text-sm text-gray-600">
          No se encontraron eventos para el período seleccionado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([groupKey, groupEvents]) => (
        <div key={groupKey} className="space-y-3">
          <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">
              {formatGroupHeader(groupKey, groupBy)}
            </h3>
            <p className="text-xs text-gray-500">
              {groupEvents.length}{' '}
              {groupEvents.length === 1 ? 'evento' : 'eventos'}
            </p>
          </div>
          <div className="space-y-2 px-4">
            {groupEvents.map(event => (
              <EventCard key={event.id} event={event} variant="detailed" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Funciones auxiliares para agrupar eventos

function groupEventsByDate(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  events.forEach(event => {
    let eventDate: Date;

    if (!event.date) {
      return;
    }

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
      const timestamp = event.date as { seconds: number; nanoseconds: number };
      eventDate = new Date(timestamp.seconds * 1000);
    }
    // String o número
    else if (typeof event.date === 'string' || typeof event.date === 'number') {
      eventDate = new Date(event.date);
    }
    // Ya es un Date
    else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventDate = new Date(event.date as any);
    }

    // Validar que eventDate sea válido
    if (isNaN(eventDate.getTime())) {
      return;
    }

    const dateKey = format(startOfDay(eventDate), 'yyyy-MM-dd');

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });

  // Ordenar por fecha
  const sortedKeys = Object.keys(grouped).sort();
  const sortedGrouped: Record<string, CalendarEvent[]> = {};
  sortedKeys.forEach(key => {
    sortedGrouped[key] = grouped[key].sort((a, b) => {
      const dateA = getEventDate(a);
      const dateB = getEventDate(b);
      return dateA.getTime() - dateB.getTime();
    });
  });

  return sortedGrouped;
}

function groupEventsByType(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  events.forEach(event => {
    const typeKey = event.type;
    if (!grouped[typeKey]) {
      grouped[typeKey] = [];
    }
    grouped[typeKey].push(event);
  });

  // Ordenar eventos dentro de cada grupo por fecha
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const dateA = getEventDate(a);
      const dateB = getEventDate(b);
      return dateA.getTime() - dateB.getTime();
    });
  });

  return grouped;
}

function groupEventsByModule(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  events.forEach(event => {
    const moduleKey = event.sourceModule;
    if (!grouped[moduleKey]) {
      grouped[moduleKey] = [];
    }
    grouped[moduleKey].push(event);
  });

  // Ordenar eventos dentro de cada grupo por fecha
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const dateA = getEventDate(a);
      const dateB = getEventDate(b);
      return dateA.getTime() - dateB.getTime();
    });
  });

  return grouped;
}

function getEventDate(event: CalendarEvent): Date {
  if (!event.date) {
    return new Date();
  }

  // Verificar si tiene método toDate (Timestamp de Firestore)
  if (
    typeof event.date === 'object' &&
    event.date !== null &&
    'toDate' in event.date &&
    typeof event.date.toDate === 'function'
  ) {
    return event.date.toDate();
  }
  // Verificar si tiene propiedad seconds (Timestamp serializado)
  else if (
    typeof event.date === 'object' &&
    event.date !== null &&
    'seconds' in event.date
  ) {
    const timestamp = event.date as { seconds: number; nanoseconds: number };
    return new Date(timestamp.seconds * 1000);
  }
  // String o número
  else if (typeof event.date === 'string' || typeof event.date === 'number') {
    return new Date(event.date);
  }
  // Ya es un Date
  else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Date(event.date as any);
  }
}

function formatGroupHeader(groupKey: string, groupBy: string): string {
  if (groupBy === 'date') {
    const date = parseISO(groupKey);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(date, today)) {
      return 'Hoy - ' + format(date, "EEEE, d 'de' MMMM", { locale: es });
    } else if (isSameDay(date, tomorrow)) {
      return 'Mañana - ' + format(date, "EEEE, d 'de' MMMM", { locale: es });
    } else {
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    }
  } else if (groupBy === 'type') {
    const typeLabels: Record<string, string> = {
      audit: 'Auditorías',
      document_expiry: 'Vencimiento de Documentos',
      action_deadline: 'Acciones',
      training: 'Capacitaciones',
      evaluation: 'Evaluaciones',
      general: 'General',
    };
    return typeLabels[groupKey] || groupKey;
  } else {
    const moduleLabels: Record<string, string> = {
      audits: 'Auditorías',
      documents: 'Documentos',
      actions: 'Acciones',
      trainings: 'Capacitaciones',
      custom: 'Eventos Personales',
    };
    return moduleLabels[groupKey] || groupKey;
  }
}
