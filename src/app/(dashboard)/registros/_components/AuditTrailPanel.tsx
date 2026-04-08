'use client';

import { CheckCircle, Edit2, ArrowRight, Plus } from 'lucide-react';
import type { RegisterAuditEvent } from '@/types/registers';

const ACTION_META: Record<RegisterAuditEvent['action'], { label: string; color: string; Icon: React.ElementType }> = {
  created:       { label: 'Creado',           color: 'text-emerald-400', Icon: Plus },
  updated:       { label: 'Actualizado',       color: 'text-blue-400',    Icon: Edit2 },
  field_changed: { label: 'Campo modificado',  color: 'text-blue-400',    Icon: Edit2 },
  stage_changed: { label: 'Etapa movida',      color: 'text-amber-400',   Icon: ArrowRight },
  approved:      { label: 'Aprobado',          color: 'text-violet-400',  Icon: CheckCircle },
};

interface AuditTrailPanelProps {
  events: RegisterAuditEvent[];
}

export function AuditTrailPanel({ events }: AuditTrailPanelProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-500">Sin eventos registrados.</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map(event => {
        const meta = ACTION_META[event.action] ?? ACTION_META.updated;
        const Icon = meta.Icon;
        return (
          <div key={event.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
              <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-200">
                <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                {event.field_id && <span className="text-slate-400"> — campo: {event.field_id}</span>}
              </p>
              {event.action === 'stage_changed' && event.old_value !== undefined && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {String(event.old_value)} → {String(event.new_value)}
                </p>
              )}
              {event.action === 'field_changed' && event.old_value !== undefined && (
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="line-through">{String(event.old_value)}</span>
                  {' → '}
                  {String(event.new_value)}
                </p>
              )}
              {event.note && (
                <p className="text-xs text-slate-500 mt-0.5 italic">{event.note}</p>
              )}
              <p className="text-xs text-slate-600 mt-1">
                {new Date(event.changed_at).toLocaleString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
                {' · '}
                <span className="font-mono text-xs text-slate-600">{event.changed_by.slice(0, 8)}…</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
