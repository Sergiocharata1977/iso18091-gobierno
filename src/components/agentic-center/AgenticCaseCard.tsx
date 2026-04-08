'use client';

import type { AgenticCaseViewModel } from '@/components/agentic-center/agenticCenterPresentation';
import {
  getPriorityClasses,
  getTypeClasses,
  getTypeLabel,
} from '@/components/agentic-center/agenticCenterPresentation';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowUpRight, Clock3, GitBranch, UserRound } from 'lucide-react';

interface AgenticCaseCardProps {
  item: AgenticCaseViewModel;
}

export default function AgenticCaseCard({ item }: AgenticCaseCardProps) {
  return (
    <Link
      href={`/centro-agentico/${item.caseItem.id}`}
      className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={getTypeClasses(item.type)}>
              {getTypeLabel(item.type)}
            </Badge>
            <Badge variant="outline" className={getPriorityClasses(item.priority)}>
              Prioridad {item.priority}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold leading-5 text-slate-950">{item.caseItem.titulo}</h3>
        </div>
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-600">{item.summary}</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Accion propuesta
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900">{item.proposedAction}</p>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <UserRound className="h-3.5 w-3.5" />
          <span>{item.owner}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5" />
          <span>
            {formatDate(item.caseItem.timestamp, {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{item.traceabilityLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
          <span>{item.area}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="inline-flex h-8 items-center rounded-md px-2 text-xs text-slate-600">
          Ver detalle
        </span>
      </div>
    </Link>
  );
}
