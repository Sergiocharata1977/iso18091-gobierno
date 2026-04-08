'use client';

import { OpportunitySubflowBadge } from '@/components/crm/OpportunitySubflowBadge';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import { Building2, DollarSign, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OportunidadesListProps {
  oportunidades: OportunidadCRM[];
}

export function OportunidadesList({ oportunidades }: OportunidadesListProps) {
  const router = useRouter();

  if (oportunidades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No se encontraron oportunidades
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Oportunidad</TableHead>
            <TableHead>Organización</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Probabilidad</TableHead>
            <TableHead>Vendedor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {oportunidades.map(op => (
            <TableRow
              key={op.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/crm/oportunidades/${op.id}`)}
            >
              <TableCell className="font-medium">
                <div>
                  <p className="font-semibold">{op.nombre}</p>
                  <OpportunitySubflowBadge
                    creditWorkflow={op.subprocesos?.crediticio}
                    compact
                  />
                  {op.descripcion && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {op.descripcion}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>{op.organizacion_nombre || '-'}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  style={{
                    backgroundColor: `${op.estado_kanban_color}20`,
                    color: op.estado_kanban_color,
                    borderColor: op.estado_kanban_color,
                  }}
                  className="border"
                >
                  {op.estado_kanban_nombre}
                </Badge>
              </TableCell>
              <TableCell>
                {op.monto_estimado && op.monto_estimado > 0 ? (
                  <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <DollarSign className="h-4 w-4" />$
                    {op.monto_estimado.toLocaleString('es-AR')}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {op.probabilidad ? (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-blue-500" />
                    <span className="font-medium text-blue-600">
                      {op.probabilidad}%
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {op.vendedor_nombre ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {op.vendedor_nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{op.vendedor_nombre}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
