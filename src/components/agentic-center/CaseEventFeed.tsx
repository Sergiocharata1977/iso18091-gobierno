import { Activity, Bot, CalendarClock, MessageSquare, ShieldAlert, TerminalSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate } from '@/lib/utils';
import type {
  AgenticCenterCaseEstado,
  AgenticCenterEvent,
  AgenticCenterEventOrigen,
  AgenticCenterEventPrioridad,
} from '@/types/agentic-center';

interface CaseEventFeedProps {
  event: AgenticCenterEvent;
  caseState?: AgenticCenterCaseEstado;
  className?: string;
}

const originLabel: Record<AgenticCenterEventOrigen, string> = {
  agente: 'Agente IA',
  sistema: 'Sistema',
  terminal: 'Sentinel',
  whatsapp: 'WhatsApp',
};

const priorityClasses: Record<AgenticCenterEventPrioridad, string> = {
  alta: 'border-red-200 bg-red-50 text-red-700',
  media: 'border-amber-200 bg-amber-50 text-amber-700',
  baja: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const caseStateLabel: Record<AgenticCenterCaseEstado, string> = {
  activo: 'En curso',
  esperando: 'Esperando decision',
  completado: 'Cerrado',
};

function originIcon(origen: AgenticCenterEventOrigen) {
  switch (origen) {
    case 'agente':
      return Bot;
    case 'terminal':
      return TerminalSquare;
    case 'whatsapp':
      return MessageSquare;
    default:
      return Activity;
  }
}

export function CaseEventFeed({
  event,
  caseState,
  className,
}: CaseEventFeedProps) {
  const OriginIcon = originIcon(event.origen);

  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
              Deteccion
            </Badge>
            <CardTitle className="text-lg">{event.tipo}</CardTitle>
          </div>
          {caseState && (
            <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
              {caseStateLabel[caseState]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {event.descripcion}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <OriginIcon className="h-3.5 w-3.5" />
              Origen
            </div>
            <div className="text-sm font-medium text-foreground">
              {originLabel[event.origen]}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Momento
            </div>
            <div className="text-sm font-medium text-foreground">
              {formatDate(event.timestamp, {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              Prioridad
            </div>
            <Badge variant="outline" className={cn('w-fit capitalize', priorityClasses[event.prioridad])}>
              {event.prioridad}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border/70 bg-background p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Senal que activo el caso
          </div>
          <div className="mt-2 text-sm font-medium text-foreground">
            Evento {event.id}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            El Centro Agentico tomo esta deteccion como disparador operativo para iniciar el flujo de analisis y accion.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
