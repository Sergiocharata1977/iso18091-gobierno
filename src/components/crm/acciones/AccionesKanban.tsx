'use client';

import { ActionTypeBadge } from '@/components/crm/actions/ActionTypeBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CRMAccion, CRMAccionEstado } from '@/types/crmAcciones';
import {
  KANBAN_DEFAULTS,
  type KanbanColumnConfig,
} from '@/types/kanbanSchema';
import { Calendar, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AccionesKanbanProps {
  acciones: CRMAccion[];
  onDelete: (id: string) => void;
}

type AccionesKanbanColumn = {
  key: CRMAccionEstado;
  label: string;
  color: string;
};

function mapColumns(columns: KanbanColumnConfig[]): AccionesKanbanColumn[] {
  return columns.map(column => ({
    key: column.id as CRMAccionEstado,
    label: column.title,
    color: column.color,
  }));
}

export function AccionesKanban({ acciones }: AccionesKanbanProps) {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [columns, setColumns] = useState<AccionesKanbanColumn[]>(() =>
    mapColumns(KANBAN_DEFAULTS.crm_acciones)
  );

  useEffect(() => {
    if (!orgId) return;

    let isMounted = true;

    const loadColumns = async () => {
      try {
        const response = await fetch(
          `/api/kanban-schemas/crm_acciones?organization_id=${orgId}`
        );

        if (!response.ok) return;

        const payload = await response.json();
        const remoteColumns = payload?.data?.columns;

        if (isMounted && Array.isArray(remoteColumns)) {
          setColumns(mapColumns(remoteColumns));
        }
      } catch {
        // Fallback silencioso a defaults
      }
    };

    void loadColumns();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  const getAccionesByEstado = (estado: CRMAccionEstado) => {
    return acciones.filter(acc => acc.estado === estado);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(column => {
        const columnAcciones = getAccionesByEstado(column.key);

        return (
          <div key={column.key} className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {columnAcciones.length}
              </span>
            </div>

            <div className="flex-1 space-y-2 bg-muted/50 rounded-lg p-2 min-h-[200px]">
              {columnAcciones.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">
                  Sin acciones
                </div>
              ) : (
                columnAcciones.map(acc => (
                  <Card
                    key={acc.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="p-3 pb-2">
                      <div className="flex justify-between items-start">
                        <ActionTypeBadge tipo={acc.tipo} />
                      </div>
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {acc.titulo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      {acc.cliente_nombre && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {acc.cliente_nombre}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(
                            acc.fecha_programada || acc.createdAt
                          ).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-700" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
