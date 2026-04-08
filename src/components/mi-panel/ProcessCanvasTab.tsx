'use client';

import { ProcessKanban } from '@/components/procesos/ProcessKanban';
import Link from 'next/link';

interface ProcessCanvasTabProps {
  processId: string;
  processName: string;
  stats: {
    totalRecords: number;
    pendingRecords: number;
    completedRecords: number;
    overdueRecords: number;
  };
  hasSystemModule: boolean;
  systemModuleHref?: string;
}

export function ProcessCanvasTab({
  processId,
  processName,
  stats,
  hasSystemModule,
  systemModuleHref = '/procesos/registros',
}: ProcessCanvasTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {`📋 ${stats.totalRecords} total | ✅ ${stats.completedRecords} completados | ⚠ ${stats.overdueRecords} vencidos`}
      </div>

      {hasSystemModule ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
          <p>Este proceso tiene su propio módulo en el sistema</p>
          <Link
            href={systemModuleHref}
            className="mt-2 inline-flex font-medium text-amber-900 underline-offset-4 hover:underline"
          >
            Ver registro del sistema →
          </Link>
        </div>
      ) : (
        <ProcessKanban
          processId={processId}
          processName={processName}
          showHeader={false}
        />
      )}

      <Link
        href="/procesos/registros"
        className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
      >
        ↗ Abrir módulo completo de Procesos
      </Link>
    </div>
  );
}
