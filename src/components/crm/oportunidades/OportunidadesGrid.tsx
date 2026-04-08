'use client';

import { OpportunitySubflowBadge } from '@/components/crm/OpportunitySubflowBadge';
import { Card, CardContent } from '@/components/ui/card';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import { Building2, DollarSign, Target, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OportunidadesGridProps {
  oportunidades: OportunidadCRM[];
}

export function OportunidadesGrid({ oportunidades }: OportunidadesGridProps) {
  const router = useRouter();

  if (oportunidades.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-lg border">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay oportunidades</h3>
        <p className="text-muted-foreground">
          No se encontraron oportunidades para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {oportunidades.map(op => (
        <Card
          key={op.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/crm/oportunidades/${op.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold line-clamp-2">{op.nombre}</h3>
                <div
                  className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full"
                  style={{
                    backgroundColor: `${op.estado_kanban_color}20`,
                    color: op.estado_kanban_color,
                  }}
                >
                  {op.estado_kanban_nombre}
                </div>
                <OpportunitySubflowBadge
                  creditWorkflow={op.subprocesos?.crediticio}
                  compact
                />
              </div>
            </div>

            {op.descripcion && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {op.descripcion}
              </p>
            )}

            <div className="space-y-2 text-sm">
              {op.organizacion_nombre && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{op.organizacion_nombre}</span>
                </div>
              )}

              {op.monto_estimado && op.monto_estimado > 0 && (
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-emerald-700">
                      ${op.monto_estimado.toLocaleString('es-AR')}
                    </span>
                  </div>
                  {op.probabilidad && (
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="font-medium text-blue-600">
                        {op.probabilidad}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {op.vendedor_nombre && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {op.vendedor_nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {op.vendedor_nombre}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
