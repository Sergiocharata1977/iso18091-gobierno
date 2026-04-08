import { CheckCircle2, CircleDot, Clock3, GitBranchPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate } from '@/lib/utils';
import type {
  AgenticCenterTimelineItem,
  AgenticCenterTimelineItemEstado,
} from '@/types/agentic-center';

interface CaseWorkflowPanelProps {
  steps: AgenticCenterTimelineItem[];
  className?: string;
}

const stepStyles: Record<
  AgenticCenterTimelineItemEstado,
  {
    badge: string;
    line: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  completado: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    line: 'bg-emerald-200',
    icon: CheckCircle2,
    label: 'Completado',
  },
  activo: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    line: 'bg-sky-200',
    icon: CircleDot,
    label: 'Activo',
  },
  pendiente: {
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    line: 'bg-slate-200',
    icon: Clock3,
    label: 'Pendiente',
  },
};

export function CaseWorkflowPanel({
  steps,
  className,
}: CaseWorkflowPanelProps) {
  const completedCount = steps.filter((step) => step.estado === 'completado').length;
  const activeStep = steps.find((step) => step.estado === 'activo');

  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-2 w-fit border-violet-200 bg-violet-50 text-violet-700">
              Workflow
            </Badge>
            <CardTitle className="text-lg">Orquestacion del caso</CardTitle>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Avance
            </div>
            <div className="text-sm font-semibold text-foreground">
              {completedCount}/{steps.length} pasos
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {activeStep && (
          <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-sky-700">
              <GitBranchPlus className="h-3.5 w-3.5" />
              Punto actual
            </div>
            <div className="mt-1 text-sm font-medium text-sky-950">
              Paso {activeStep.paso}: {activeStep.label}
            </div>
          </div>
        )}

        <div className="space-y-0">
          {steps.map((step, index) => {
            const style = stepStyles[step.estado];
            const Icon = style.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={`${step.paso}-${step.label}`} className="grid grid-cols-[32px,1fr] gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border', style.badge)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div className={cn('mt-2 h-full min-h-8 w-px', style.line)} />
                  )}
                </div>
                <div className={cn('pb-5', isLast && 'pb-0')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Paso {step.paso}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {step.label}
                      </div>
                    </div>
                    <Badge variant="outline" className={style.badge}>
                      {style.label}
                    </Badge>
                  </div>
                  {step.timestamp_opcional && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDate(step.timestamp_opcional, {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
