import { FileCheck2, FileSearch, ScanSearch, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  AgenticCenterActionCard,
  AgenticCenterCaseEstado,
  AgenticCenterTimelineItem,
} from '@/types/agentic-center';

interface CaseEvidencePanelProps {
  evidence: string | null;
  caseState?: AgenticCenterCaseEstado;
  action?: AgenticCenterActionCard | null;
  steps?: AgenticCenterTimelineItem[];
  className?: string;
}

const caseStateLabel: Record<AgenticCenterCaseEstado, string> = {
  activo: 'Ejecucion en curso',
  esperando: 'Esperando cierre',
  completado: 'Caso completado',
};

export function CaseEvidencePanel({
  evidence,
  caseState,
  action,
  steps = [],
  className,
}: CaseEvidencePanelProps) {
  const completedSteps = steps.filter((step) => step.estado === 'completado').length;

  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-2 w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
              Evidencia
            </Badge>
            <CardTitle className="text-lg">
              {evidence ? 'Resultado verificable del caso' : 'Resultado pendiente'}
            </CardTitle>
          </div>
          {caseState && (
            <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
              {caseStateLabel[caseState]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {evidence ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-700">
              <FileCheck2 className="h-3.5 w-3.5" />
              Evidencia final
            </div>
            <div className="mt-2 text-sm leading-6 text-emerald-950">
              {evidence}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <FileSearch className="h-3.5 w-3.5" />
              Proxima evidencia esperada
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {action
                ? `Cuando "${action.titulo}" se apruebe o ejecute, este panel mostrara el resultado consolidado y la evidencia de cierre.`
                : 'El caso todavia no genero una accion que pueda producir evidencia de cierre.'}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ScanSearch className="h-3.5 w-3.5" />
              Trazabilidad
            </div>
            <div className="text-sm font-medium text-foreground">
              {completedSteps}/{steps.length || 0} hitos verificados
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Salida operativa
            </div>
            <div className="text-sm font-medium text-foreground">
              {evidence ? 'Caso explicable de punta a punta' : 'Cierre todavia no disponible'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
