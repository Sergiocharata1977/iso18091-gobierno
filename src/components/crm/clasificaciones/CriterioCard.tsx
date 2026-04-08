'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CriterioClasificacion } from '@/types/crm-clasificacion';
import { Pencil, Power, Shapes } from 'lucide-react';

interface CriterioCardProps {
  criterio: CriterioClasificacion;
  onEdit: (criterio: CriterioClasificacion) => void;
  onDeactivate: (criterio: CriterioClasificacion) => void;
  disabled?: boolean;
}

function getTipoLabel(tipo: CriterioClasificacion['tipo']) {
  return tipo === 'multiselect' ? 'Selección múltiple' : 'Selección única';
}

export function CriterioCard({
  criterio,
  onEdit,
  onDeactivate,
  disabled = false,
}: CriterioCardProps) {
  return (
    <Card className="border-zinc-200 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg text-zinc-900">
                {criterio.nombre}
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100"
              >
                {getTipoLabel(criterio.tipo)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {criterio.aplica_a_clientes && (
                <Badge
                  variant="outline"
                  className="border-zinc-300 text-zinc-700"
                >
                  Clientes
                </Badge>
              )}
              {criterio.aplica_a_oportunidades && (
                <Badge
                  variant="outline"
                  className="border-zinc-300 text-zinc-700"
                >
                  Oportunidades
                </Badge>
              )}
              <Badge
                className={
                  criterio.activo
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-200'
                }
              >
                {criterio.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(criterio)}
              disabled={disabled}
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onDeactivate(criterio)}
              disabled={disabled}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Power className="mr-2 h-4 w-4" />
              Desactivar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Shapes className="h-4 w-4 text-zinc-400" />
          <span>{criterio.opciones.length} opciones configuradas</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {criterio.opciones.map(opcion => (
            <span
              key={opcion.id}
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-white shadow-sm"
              style={{
                backgroundColor: opcion.color || '#71717a',
                borderColor: opcion.color || '#71717a',
              }}
            >
              {opcion.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
