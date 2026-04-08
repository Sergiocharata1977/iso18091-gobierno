'use client';

import { ActionTypeBadge } from '@/components/crm/actions/ActionTypeBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CRMAccion } from '@/types/crmAcciones';
import { Trash2 } from 'lucide-react';

interface AccionesListProps {
  acciones: CRMAccion[];
  onDelete: (id: string) => void;
}

export function AccionesList({ acciones, onDelete }: AccionesListProps) {
  if (acciones.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No se encontraron acciones registradas
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Asunto / Descripción</TableHead>
            <TableHead>Cliente / Oportunidad</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {acciones.map(acc => (
            <TableRow key={acc.id}>
              <TableCell>
                <ActionTypeBadge tipo={acc.tipo} />
              </TableCell>
              <TableCell className="max-w-[300px]">
                <div className="font-medium truncate">{acc.titulo}</div>
                {acc.descripcion && (
                  <div className="text-xs text-gray-500 truncate">
                    {acc.descripcion}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {acc.cliente_nombre || '-'}
                  </span>
                  {acc.oportunidad_titulo && (
                    <span className="text-xs text-gray-400">
                      Op: {acc.oportunidad_titulo}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span className="font-medium">
                    {new Date(
                      acc.fecha_programada || acc.createdAt
                    ).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(
                      acc.fecha_programada || acc.createdAt
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-bold">
                    {(acc.vendedor_nombre || 'U').charAt(0)}
                  </div>
                  <span className="text-sm">
                    {acc.vendedor_nombre || 'Usuario'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {acc.estado === 'completada' ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                    Realizada
                  </Badge>
                ) : acc.estado === 'vencida' ? (
                  <Badge variant="destructive">Vencida</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600">
                    Pendiente
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500"
                  onClick={() => onDelete(acc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
