// src/components/vendedor/OportunidadCard.tsx
// Tarjeta de oportunidad optimizada para móvil

'use client';

import { Badge } from '@/components/ui/badge';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import {
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface OportunidadCardProps {
  oportunidad: OportunidadCRM;
}

export function OportunidadCard({ oportunidad }: OportunidadCardProps) {
  const getProbabilidadColor = (prob: number) => {
    if (prob >= 70) return 'text-green-600 bg-green-50';
    if (prob >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <Link
      href={`/app-vendedor/oportunidades/${oportunidad.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] touch-target">
        {/* Header con nombre y estado */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {oportunidad.nombre}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">
                {oportunidad.organizacion_nombre}
              </span>
            </div>
          </div>
          <Badge
            style={{
              backgroundColor: oportunidad.estado_kanban_color + '20',
              color: oportunidad.estado_kanban_color,
              borderColor: oportunidad.estado_kanban_color,
            }}
            variant="outline"
            className="ml-2 flex-shrink-0 text-xs font-medium"
          >
            {oportunidad.estado_kanban_nombre}
          </Badge>
        </div>

        {/* Contacto (si existe) */}
        {oportunidad.contacto_nombre && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <User className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{oportunidad.contacto_nombre}</span>
          </div>
        )}

        {/* Métricas */}
        <div className="flex items-center gap-4 text-sm">
          {/* Monto */}
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <DollarSign className="h-4 w-4" />
            <span>
              ${oportunidad.monto_estimado?.toLocaleString('es-AR') || '0'}
            </span>
          </div>

          {/* Probabilidad */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${getProbabilidadColor(oportunidad.probabilidad || 0)}`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-medium">
              {oportunidad.probabilidad || 0}%
            </span>
          </div>

          {/* Fecha de cierre */}
          {oportunidad.fecha_cierre_estimada && (
            <div className="flex items-center gap-1.5 text-gray-500 ml-auto">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">
                {new Date(oportunidad.fecha_cierre_estimada).toLocaleDateString(
                  'es-AR',
                  { day: '2-digit', month: '2-digit' }
                )}
              </span>
            </div>
          )}
        </div>

        {/* Descripción (si existe) */}
        {oportunidad.descripcion && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            {oportunidad.descripcion}
          </p>
        )}
      </div>
    </Link>
  );
}
