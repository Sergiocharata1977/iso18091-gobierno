'use client';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import {
  Action,
  ACTION_PRIORITY_COLORS,
  ACTION_PRIORITY_LABELS,
  ACTION_STATUS_COLORS,
  ACTION_STATUS_LABELS,
  ACTION_TYPE_COLORS,
  ACTION_TYPE_LABELS,
} from '@/types/actions';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActionCardProps {
  action: Action;
  onEdit?: (action: Action) => void;
  onDelete?: (action: Action) => void;
}

export function ActionCard({ action, onEdit, onDelete }: ActionCardProps) {
  const router = useRouter();
  // Helper para convertir fechas
  const toDate = (
    timestamp: Date | { toDate?: () => Date; seconds?: number } | string | null
  ): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof timestamp.toDate === 'function'
    ) {
      return timestamp.toDate();
    }
    if (
      typeof timestamp === 'object' &&
      'seconds' in timestamp &&
      timestamp.seconds
    ) {
      return new Date(timestamp.seconds * 1000);
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date();
  };

  const plannedDate = toDate(action.planning.plannedDate);

  const isOverdue =
    plannedDate < new Date() &&
    action.status !== 'completada' &&
    action.status !== 'cancelada';

  const isVerified = action.controlExecution !== null;
  const isEffective = action.controlExecution?.isEffective === true;

  return (
    <div
      onClick={() => router.push(`/acciones/${action.id}`)}
      className="bg-white rounded-xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all p-6 border border-slate-200 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-slate-500">
              {action.actionNumber}
            </span>
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">
                <AlertCircle className="w-3 h-3" />
                Vencida
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
            {action.title}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2">
            {action.description}
          </p>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={e => {
                e.stopPropagation();
                onEdit(action);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={e => {
                e.stopPropagation();
                onDelete(action);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_TYPE_COLORS[action.actionType]}`}
        >
          {ACTION_TYPE_LABELS[action.actionType]}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_PRIORITY_COLORS[action.priority]}`}
        >
          {ACTION_PRIORITY_LABELS[action.priority]}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_STATUS_COLORS[action.status]}`}
        >
          {ACTION_STATUS_LABELS[action.status]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600">Progreso</span>
          <span className="text-xs font-semibold text-slate-900">
            {action.progress}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all"
            style={{ width: `${action.progress}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <User className="w-4 h-4" />
          <span>{action.planning.responsiblePersonName}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>Planificada: {formatDate(plannedDate)}</span>
        </div>
        {action.processName && (
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4" />
            <span>{action.processName}</span>
          </div>
        )}
      </div>

      {/* Verification Status */}
      {isVerified && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              isEffective ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {isEffective
                ? 'Verificada - Efectiva'
                : 'Verificada - No Efectiva'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
