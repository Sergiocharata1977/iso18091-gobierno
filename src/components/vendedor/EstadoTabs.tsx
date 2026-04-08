// src/components/vendedor/EstadoTabs.tsx
// Tabs deslizables para filtrar oportunidades por estado

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EstadoClienteKanban } from '@/types/crm';
import { useRef } from 'react';

interface EstadoTabsProps {
  estados: EstadoClienteKanban[];
  selectedEstado: string;
  onSelectEstado: (estadoId: string) => void;
  counts?: Record<string, number>;
}

export function EstadoTabs({
  estados,
  selectedEstado,
  onSelectEstado,
  counts = {},
}: EstadoTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      {/* Scrollable tabs */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Tab "Todas" */}
        <button
          onClick={() => onSelectEstado('all')}
          className={cn(
            'flex-shrink-0 px-4 py-2.5 rounded-full font-medium text-sm transition-all touch-target snap-start',
            selectedEstado === 'all'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <span>Todas</span>
          {counts['all'] !== undefined && (
            <Badge
              variant="secondary"
              className={cn(
                'ml-2 text-xs',
                selectedEstado === 'all'
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-200 text-gray-700'
              )}
            >
              {counts['all']}
            </Badge>
          )}
        </button>

        {/* Tabs por estado */}
        {estados.map(estado => (
          <button
            key={estado.id}
            onClick={() => onSelectEstado(estado.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2.5 rounded-full font-medium text-sm transition-all touch-target snap-start border-2',
              selectedEstado === estado.id
                ? 'shadow-md'
                : 'bg-white hover:shadow-sm'
            )}
            style={
              selectedEstado === estado.id
                ? {
                    backgroundColor: estado.color,
                    color: 'white',
                    borderColor: estado.color,
                  }
                : {
                    borderColor: estado.color + '40',
                    color: estado.color,
                  }
            }
          >
            <span>{estado.nombre}</span>
            {counts[estado.id] !== undefined && (
              <Badge
                variant="secondary"
                className="ml-2 text-xs"
                style={
                  selectedEstado === estado.id
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                      }
                    : {
                        backgroundColor: estado.color + '20',
                        color: estado.color,
                      }
                }
              >
                {counts[estado.id]}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Gradient fade en los bordes para indicar scroll */}
      <div className="absolute top-0 left-0 bottom-2 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
    </div>
  );
}
