'use client';

import { Badge } from '@/components/ui/badge';
import type {
  CreditWorkflowProjection,
  CreditWorkflowResolution,
  CreditWorkflowStatus,
} from '@/types/crm-credit-workflow';
import { CheckCircle2, Clock3, FileClock, Landmark, ShieldAlert } from 'lucide-react';

interface OpportunitySubflowBadgeProps {
  creditWorkflow?: CreditWorkflowProjection;
  compact?: boolean;
}

const STATUS_META: Record<
  CreditWorkflowStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  pendiente: {
    label: 'Pendiente',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: Clock3,
  },
  en_analisis: {
    label: 'En analisis',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: ShieldAlert,
  },
  documentacion_pendiente: {
    label: 'Doc. pendiente',
    className: 'border-orange-200 bg-orange-50 text-orange-800',
    icon: FileClock,
  },
  comite: {
    label: 'Comite',
    className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
    icon: Landmark,
  },
  aprobado: {
    label: 'Aprobado',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
  },
  rechazado: {
    label: 'Rechazado',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: ShieldAlert,
  },
  cerrado: {
    label: 'Cerrado',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: CheckCircle2,
  },
};

const RESOLUTION_LABEL: Record<CreditWorkflowResolution, string> = {
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  condicional: 'Condicional',
};

export function OpportunitySubflowBadge({
  creditWorkflow,
  compact = false,
}: OpportunitySubflowBadgeProps) {
  if (!creditWorkflow) {
    return null;
  }

  const statusMeta = STATUS_META[creditWorkflow.status];
  const StatusIcon = statusMeta.icon;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'pt-1'}`}>
      <Badge
        variant="outline"
        className={`gap-1.5 border ${creditWorkflow.activo ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
      >
        <ShieldAlert className="h-3 w-3" />
        {creditWorkflow.activo ? 'Credito activo' : 'Credito cerrado'}
      </Badge>
      <Badge variant="outline" className={`gap-1.5 border ${statusMeta.className}`}>
        <StatusIcon className="h-3 w-3" />
        {statusMeta.label}
      </Badge>
      {creditWorkflow.resolution && !compact && (
        <Badge variant="secondary" className="bg-white text-slate-700">
          {RESOLUTION_LABEL[creditWorkflow.resolution]}
        </Badge>
      )}
      {creditWorkflow.tier && !compact && (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
          Tier {creditWorkflow.tier}
        </Badge>
      )}
    </div>
  );
}
