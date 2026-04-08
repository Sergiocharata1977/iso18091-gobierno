'use client';

import { ActionTypeBadge } from '@/components/crm/actions/ActionTypeBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CRMAccion } from '@/types/crmAcciones';
import { Calendar, ClipboardList, Trash2, User } from 'lucide-react';

interface AccionesGridProps {
  acciones: CRMAccion[];
  onDelete: (id: string) => void;
}

export function AccionesGrid({ acciones, onDelete }: AccionesGridProps) {
  if (acciones.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No hay acciones registradas</p>
        <p className="text-sm">Creá una nueva acción para comenzar.</p>
      </div>
    );
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
            Realizada
          </Badge>
        );
      case 'vencida':
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return (
          <Badge variant="outline" className="text-gray-600">
            Pendiente
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {acciones.map(acc => (
        <Card key={acc.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <ActionTypeBadge tipo={acc.tipo} />
              {getEstadoBadge(acc.estado)}
            </div>

            <h3 className="font-semibold text-sm mb-1 line-clamp-2">
              {acc.titulo}
            </h3>

            {acc.descripcion && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {acc.descripcion}
              </p>
            )}

            {acc.cliente_nombre && (
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Cliente:</span>{' '}
                {acc.cliente_nombre}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(
                  acc.fecha_programada || acc.createdAt
                ).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {acc.vendedor_nombre || 'Usuario'}
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                onClick={() => onDelete(acc.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
