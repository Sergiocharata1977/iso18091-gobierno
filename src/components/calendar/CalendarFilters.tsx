'use client';

import type { EventType } from '@/types/calendar';
import { Filter, X } from 'lucide-react';
import { useState } from 'react';

interface CalendarFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  types: EventType[];
  modules: string[];
  statuses: string[];
  priorities: string[];
}

const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: 'audit', label: 'Auditorías', color: 'bg-blue-100 text-blue-700' },
  {
    value: 'document_expiry',
    label: 'Vencimiento Documentos',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    value: 'action_deadline',
    label: 'Acciones',
    color: 'bg-red-100 text-red-700',
  },
  {
    value: 'training',
    label: 'Capacitaciones',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    value: 'evaluation',
    label: 'Evaluaciones',
    color: 'bg-purple-100 text-purple-700',
  },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
];

const MODULES = [
  { value: 'audits', label: 'Auditorías' },
  { value: 'documents', label: 'Documentos' },
  { value: 'actions', label: 'Acciones' },
  { value: 'trainings', label: 'Capacitaciones' },
  { value: 'custom', label: 'Eventos Personales' },
];

const STATUSES = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'completed', label: 'Completado' },
  { value: 'overdue', label: 'Vencido' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Crítico', color: 'text-red-600' },
  { value: 'high', label: 'Alto', color: 'text-orange-600' },
  { value: 'medium', label: 'Medio', color: 'text-yellow-600' },
  { value: 'low', label: 'Bajo', color: 'text-gray-600' },
];

export function CalendarFilters({
  onFiltersChange,
  initialFilters,
}: CalendarFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(
    initialFilters || {
      types: [],
      modules: [],
      statuses: [],
      priorities: [],
    }
  );

  const handleFilterChange = (
    category: keyof FilterState,
    value: string,
    checked: boolean
  ) => {
    const newFilters = { ...filters };
    if (checked) {
      newFilters[category] = [...newFilters[category], value] as never[];
    } else {
      newFilters[category] = newFilters[category].filter(
        v => v !== value
      ) as never[];
    }
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      types: [],
      modules: [],
      statuses: [],
      priorities: [],
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const activeFiltersCount =
    filters.types.length +
    filters.modules.length +
    filters.statuses.length +
    filters.priorities.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Filtrar eventos
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Tipo de evento */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Tipo de evento
                </h4>
                <div className="space-y-2">
                  {EVENT_TYPES.map(type => (
                    <label
                      key={type.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type.value)}
                        onChange={e =>
                          handleFilterChange(
                            'types',
                            type.value,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${type.color}`}
                      >
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Módulo origen */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Módulo origen
                </h4>
                <div className="space-y-2">
                  {MODULES.map(module => (
                    <label
                      key={module.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.modules.includes(module.value)}
                        onChange={e =>
                          handleFilterChange(
                            'modules',
                            module.value,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">
                        {module.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Estado
                </h4>
                <div className="space-y-2">
                  {STATUSES.map(status => (
                    <label
                      key={status.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(status.value)}
                        onChange={e =>
                          handleFilterChange(
                            'statuses',
                            status.value,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Prioridad */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Prioridad
                </h4>
                <div className="space-y-2">
                  {PRIORITIES.map(priority => (
                    <label
                      key={priority.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.priorities.includes(priority.value)}
                        onChange={e =>
                          handleFilterChange(
                            'priorities',
                            priority.value,
                            e.target.checked
                          )
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`text-sm font-medium ${priority.color}`}>
                        {priority.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
