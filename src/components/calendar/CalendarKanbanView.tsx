'use client';

import { CalendarEvent, EventStatus } from '@/types/calendar';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useMemo } from 'react';

interface CalendarKanbanViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  scheduled: {
    label: 'Programado',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  in_progress: {
    label: 'En Progreso',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  completed: {
    label: 'Completado',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  overdue: {
    label: 'Vencido',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
};

const EVENT_TYPE_EMOJI: Record<string, string> = {
  // Inglés (legacy)
  audit: '🔍',
  document_expiry: '📄',
  action_deadline: '⚡',
  finding_deadline: '🔎',
  training: '📚',
  evaluation: '📋',
  meeting: '👥',
  general: '📅',
  // Español (colección events unificada)
  auditoria: '🔍',
  capacitacion: '📚',
  evaluacion: '📋',
  hallazgo: '🔎',
  accion_correctiva: '⚡',
  accion_preventiva: '✅',
  mantenimiento: '🔧',
  reunion: '👥',
  otro: '📅',
};

export function CalendarKanbanView({
  events,
  onEventClick,
}: CalendarKanbanViewProps) {
  // Mapeo de estados español -> inglés para compatibilidad
  const mapStatus = (status: string): EventStatus => {
    const statusMap: Record<string, EventStatus> = {
      // Español
      programado: 'scheduled',
      en_progreso: 'in_progress',
      completado: 'completed',
      cancelado: 'cancelled',
      vencido: 'overdue',
      // Inglés (ya correctos)
      scheduled: 'scheduled',
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
      overdue: 'overdue',
    };
    return statusMap[status] || 'scheduled';
  };

  const groupedEvents = useMemo(() => {
    const groups: Record<EventStatus, CalendarEvent[]> = {
      scheduled: [],
      in_progress: [],
      completed: [],
      cancelled: [],
      overdue: [],
    };

    events.forEach(event => {
      const mappedStatus = mapStatus(event.status);
      if (groups[mappedStatus]) {
        groups[mappedStatus].push(event);
      }
    });

    return groups;
  }, [events]);

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate?.() || new Date(timestamp);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {(Object.keys(STATUS_CONFIG) as EventStatus[]).map(status => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const statusEvents = groupedEvents[status] || [];

        return (
          <div key={status} className="flex flex-col">
            {/* Column Header */}
            <div
              className={`${config.bgColor} rounded-t-lg p-3 border-b-2 border-${config.color.replace('text-', '')}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <h3 className="font-semibold text-gray-900">
                    {config.label}
                  </h3>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {statusEvents.length}
                </span>
              </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
              {statusEvents.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  Sin eventos
                </div>
              ) : (
                statusEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                  >
                    {/* Event Title */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg">
                        {EVENT_TYPE_EMOJI[event.type] || '📅'}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                        {event.title}
                      </h4>
                    </div>

                    {/* Event Date */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(event.date)}</span>
                    </div>

                    {/* Responsible User */}
                    {event.responsibleUserName && (
                      <div className="text-xs text-gray-500 truncate">
                        👤 {event.responsibleUserName}
                      </div>
                    )}

                    {/* Priority Badge */}
                    {event.priority === 'critical' && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          🔥 Crítico
                        </span>
                      </div>
                    )}
                    {event.priority === 'high' && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          ⚠️ Alta
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
