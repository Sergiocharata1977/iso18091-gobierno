'use client';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { Finding } from '@/types/findings';
import { FINDING_STATUS_COLORS, FINDING_STATUS_LABELS } from '@/types/findings';
import {
  AlertCircle,
  Calendar,
  FileText,
  Pencil,
  Trash2,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FindingCardProps {
  finding: Finding;
  onEdit?: (finding: Finding) => void;
  onDelete?: (finding: Finding) => void;
}

// Helper para convertir fechas de Firestore
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

export function FindingCard({ finding, onEdit, onDelete }: FindingCardProps) {
  const router = useRouter();
  const createdDate = toDate(finding.createdAt);
  const requiresAction = finding.rootCauseAnalysis?.requiresAction === true;

  return (
    <div
      onClick={() => router.push(`/hallazgos/${finding.id}`)}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-500">
              {finding.findingNumber}
            </span>
            {requiresAction && (
              <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                <AlertCircle className="w-3 h-3" />
                Requiere Acción
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
            {finding.registration?.name || 'Sin nombre'}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-2">
            {finding.registration?.description || 'Sin descripción'}
          </p>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={e => {
                e.stopPropagation();
                onEdit(finding);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={e => {
                e.stopPropagation();
                onDelete(finding);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Badge de Estado */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FINDING_STATUS_COLORS[finding.status]}`}
        >
          {FINDING_STATUS_LABELS[finding.status]}
        </span>
      </div>

      {/* Barra de Progreso */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Progreso</span>
          <span className="text-xs font-semibold text-gray-900">
            {finding.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${finding.progress}%` }}
          />
        </div>
      </div>

      {/* Info en Grid de 2 columnas */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Columna 1 */}
        <div className="space-y-2">
          {finding.registration?.origin && (
            <div className="flex items-center gap-1 text-gray-600">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate">{finding.registration.origin}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatDate(createdDate)}</span>
          </div>
        </div>

        {/* Columna 2 */}
        <div className="space-y-2">
          {finding.immediateActionPlanning?.responsiblePersonName && (
            <div className="flex items-center gap-1 text-gray-600">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {finding.immediateActionPlanning.responsiblePersonName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
