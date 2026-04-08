'use client';

import { formatDate } from '@/lib/utils';
import type { Finding } from '@/types/findings';
import { FINDING_STATUS_COLORS, FINDING_STATUS_LABELS } from '@/types/findings';
import { Calendar } from 'lucide-react';
import Link from 'next/link';

interface FindingCardCompactProps {
  finding: Finding;
}

const toDate = (timestamp: unknown): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof timestamp.toDate === 'function'
  ) {
    return timestamp.toDate();
  }
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'seconds' in timestamp &&
    typeof timestamp.seconds === 'number'
  ) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date();
};

export function FindingCardCompact({ finding }: FindingCardCompactProps) {
  const createdDate = toDate(finding.createdAt);

  return (
    <Link href={`/hallazgos/${finding.id}`}>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md hover:border-emerald-200 border border-slate-200 cursor-pointer transition-all duration-200 p-5 group h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          {/* Número y Nombre */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {finding.findingNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  FINDING_STATUS_COLORS[finding.status]
                }`}
              >
                {FINDING_STATUS_LABELS[finding.status]}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 truncate text-sm group-hover:text-emerald-700 transition-colors">
              {finding.registration?.name || 'Sin nombre'}
            </h3>
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(createdDate)}</span>
          </div>
        </div>

        {/* Descripción corta */}
        {finding.registration?.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">
            {finding.registration.description}
          </p>
        )}

        {/* Progreso */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Progreso</span>
            <span className="font-mono">{finding.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${finding.progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
