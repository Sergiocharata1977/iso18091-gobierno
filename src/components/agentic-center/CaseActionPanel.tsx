'use client';

import { Bot, CheckCheck, FileCog, ShieldCheck } from 'lucide-react';
import { DirectActionConfirmation } from '@/components/direct-actions/DirectActionConfirmation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  AgenticCenterActionCard,
  AgenticCenterActionEstado,
} from '@/types/agentic-center';
import type { DirectActionConfirmation as DirectActionConfirmationType } from '@/types/direct-actions';

interface CaseActionPanelProps {
  action: AgenticCenterActionCard | null;
  confirmation?: DirectActionConfirmationType | null;
  onConfirm?: (actionId: string) => Promise<void>;
  onCancel?: (actionId: string) => Promise<void>;
  className?: string;
}

const actionStateClasses: Record<AgenticCenterActionEstado, string> = {
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
  aprobada: 'border-sky-200 bg-sky-50 text-sky-700',
  rechazada: 'border-rose-200 bg-rose-50 text-rose-700',
  ejecutada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function CaseActionPanel({
  action,
  confirmation,
  onConfirm,
  onCancel,
  className,
}: CaseActionPanelProps) {
  if (!action) {
    return (
      <Card className={cn('border-border/70', className)}>
        <CardHeader className="pb-4">
          <Badge variant="outline" className="mb-2 w-fit border-amber-200 bg-amber-50 text-amber-700">
            Accion
          </Badge>
          <CardTitle className="text-lg">Sin accion propuesta</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          El caso todavia no llego a una propuesta operativa concreta.
        </CardContent>
      </Card>
    );
  }

  const canRenderConfirmation =
    confirmation && onConfirm && onCancel && confirmation.actionId === action.actionId;

  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-2 w-fit border-amber-200 bg-amber-50 text-amber-700">
              DirectAction
            </Badge>
            <CardTitle className="text-lg">{action.titulo}</CardTitle>
          </div>
          <Badge variant="outline" className={actionStateClasses[action.estado]}>
            {action.estado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {action.descripcion_negocio}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <FileCog className="h-3.5 w-3.5" />
              Entidad
            </div>
            <div className="text-sm font-medium text-foreground">{action.entidad}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              Operacion
            </div>
            <div className="text-sm font-medium text-foreground">{action.tipo_operacion}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Trazabilidad
            </div>
            <div className="text-sm font-medium text-foreground">{action.actionId}</div>
          </div>
        </div>

        {canRenderConfirmation ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-background p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <CheckCheck className="h-3.5 w-3.5" />
              Confirmacion embebida
            </div>
            <DirectActionConfirmation
              confirmation={confirmation}
              onConfirm={onConfirm}
              onCancel={onCancel}
              variant="embedded"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            Este panel deja lista la accion para aprobar o ejecutar dentro del dashboard del Centro Agentico.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
