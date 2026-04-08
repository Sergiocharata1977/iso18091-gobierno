import { BadgeCheck, Laptop, Mail, Shield, UserRound, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  AgenticCenterPersonCanal,
  AgenticCenterPersonTarget,
} from '@/types/agentic-center';

interface CaseTargetPanelProps {
  target: AgenticCenterPersonTarget | null;
  className?: string;
}

const channelLabel: Record<AgenticCenterPersonCanal, string> = {
  whatsapp: 'WhatsApp',
  terminal: 'Terminal Sentinel',
  email: 'Email',
};

function channelIcon(canal: AgenticCenterPersonCanal) {
  switch (canal) {
    case 'terminal':
      return Laptop;
    case 'email':
      return Mail;
    default:
      return Workflow;
  }
}

export function CaseTargetPanel({
  target,
  className,
}: CaseTargetPanelProps) {
  if (!target) {
    return (
      <Card className={cn('border-border/70', className)}>
        <CardHeader className="pb-4">
          <Badge variant="outline" className="mb-2 w-fit border-cyan-200 bg-cyan-50 text-cyan-700">
            Persona / Terminal
          </Badge>
          <CardTitle className="text-lg">Caso sin destino explicito</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          El caso todavia no identifica una persona o terminal objetivo para ejecutar la accion.
        </CardContent>
      </Card>
    );
  }

  const ChannelIcon = channelIcon(target.canal);

  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-2 w-fit border-cyan-200 bg-cyan-50 text-cyan-700">
              Persona / Terminal
            </Badge>
            <CardTitle className="text-lg">{target.nombre}</CardTitle>
          </div>
          <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
            {channelLabel[target.canal]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Rol operativo
            </div>
            <div className="text-sm font-medium text-foreground">{target.puesto}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ChannelIcon className="h-3.5 w-3.5" />
              Canal de ejecucion
            </div>
            <div className="text-sm font-medium text-foreground">{channelLabel[target.canal]}</div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/70 bg-background p-3">
          {target.terminal_nombre ? (
            <div className="flex items-start gap-3">
              <Laptop className="mt-0.5 h-4 w-4 text-cyan-700" />
              <div>
                <div className="text-sm font-medium text-foreground">
                  {target.terminal_nombre}
                </div>
                <div className="text-sm text-muted-foreground">
                  Estado actual: {target.estado_terminal ?? 'Sin senal reciente'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No hay terminal Sentinel asociada a este caso.
            </div>
          )}

          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 text-cyan-700" />
            <div>
              <div className="text-sm font-medium text-foreground">
                {target.requiere_aprobacion
                  ? 'La accion requiere aprobacion humana'
                  : 'La accion puede ejecutarse sin aprobacion adicional'}
              </div>
              <div className="text-sm text-muted-foreground">
                {target.politica_aplicada
                  ? `Politica aplicada: ${target.politica_aplicada}`
                  : 'No se informo una politica Sentinel especifica para este caso.'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5" />
            Lectura operativa
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Este panel conecta la decision del Centro Agentico con la persona impactada y, cuando aplica, con la terminal Sentinel donde se ejecutara o aprobara la accion.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
