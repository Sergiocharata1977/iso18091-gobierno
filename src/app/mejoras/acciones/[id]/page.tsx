'use client';

import { ActionControlExecutionForm } from '@/components/actions/ActionControlExecutionForm';
import { ActionControlPlanningForm } from '@/components/actions/ActionControlPlanningForm';
import { ActionExecutionForm } from '@/components/actions/ActionExecutionForm';
import { formatDate } from '@/lib/utils';
import type { Action } from '@/types/actions';
import {
  ACTION_PRIORITY_COLORS,
  ACTION_PRIORITY_LABELS,
  ACTION_SOURCE_TYPE_LABELS,
  ACTION_STATUS_COLORS,
  ACTION_STATUS_LABELS,
  ACTION_TYPE_COLORS,
  ACTION_TYPE_LABELS,
} from '@/types/actions';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Helper para convertir fechas de Firestore
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

export default function ActionDetailPage() {
  const params = useParams();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchAction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/actions/${params.id}`);

      if (!response.ok) {
        throw new Error('Acción no encontrada');
      }

      const data = await response.json();
      setAction(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar la acción'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !action) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Acción no encontrada'}
        </div>
        <Link
          href="/acciones"
          className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a acciones
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/acciones"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {action.actionNumber}
            </h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ACTION_STATUS_COLORS[action.status]}`}
            >
              {ACTION_STATUS_LABELS[action.status]}
            </span>
          </div>
          <p className="text-gray-600">{action.title}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ACTION_TYPE_COLORS[action.actionType]}`}
        >
          {ACTION_TYPE_LABELS[action.actionType]}
        </span>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ACTION_PRIORITY_COLORS[action.priority]}`}
        >
          {ACTION_PRIORITY_LABELS[action.priority]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progreso</span>
          <span className="text-2xl font-bold text-gray-900">
            {action.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-emerald-600 h-4 rounded-full transition-all"
            style={{ width: `${action.progress}%` }}
          />
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
          Información General
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Descripción
            </label>
            <p className="text-gray-900 mt-1">{action.description}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Origen</label>
            <p className="text-gray-900 mt-1">
              {ACTION_SOURCE_TYPE_LABELS[action.sourceType]} -{' '}
              {action.sourceName}
            </p>
          </div>

          {action.processName && (
            <div>
              <label className="text-sm font-medium text-gray-500">
                Proceso
              </label>
              <p className="text-gray-900 mt-1">{action.processName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Planificación */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
          Fase 1: Planificación de la Acción
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Responsable
            </label>
            <p className="text-gray-900 mt-1">
              {action.planning.responsiblePersonName}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Fecha Planificada
            </label>
            <p className="text-gray-900 mt-1">
              {formatDate(toDate(action.planning.plannedDate))}
            </p>
          </div>

          {action.planning.observations && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">
                Observaciones
              </label>
              <p className="text-gray-900 mt-1">
                {action.planning.observations}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ejecución - Formulario o Vista */}
      {action.execution ? (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
            Fase 2: Ejecución de la Acción
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha de Ejecución
              </label>
              <p className="text-gray-900 mt-1">
                {action.execution.executionDate
                  ? formatDate(toDate(action.execution.executionDate))
                  : 'Pendiente'}
              </p>
            </div>

            {action.execution.comments && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">
                  Comentarios
                </label>
                <p className="text-gray-900 mt-1">
                  {action.execution.comments}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        action.status === 'planificada' && (
          <ActionExecutionForm actionId={action.id} onSuccess={fetchAction} />
        )
      )}

      {/* Control Planning - Formulario o Vista */}
      {action.controlPlanning ? (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
            Fase 3: Planificación del Control
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Responsable de Verificación
              </label>
              <p className="text-gray-900 mt-1">
                {action.controlPlanning.responsiblePersonName}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha Planificada
              </label>
              <p className="text-gray-900 mt-1">
                {formatDate(toDate(action.controlPlanning.plannedDate))}
              </p>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">
                Criterio de Efectividad
              </label>
              <p className="text-gray-900 mt-1">
                {action.controlPlanning.effectivenessCriteria}
              </p>
            </div>
          </div>
        </div>
      ) : (
        action.status === 'ejecutada' &&
        action.execution && (
          <ActionControlPlanningForm
            actionId={action.id}
            onSuccess={fetchAction}
          />
        )
      )}

      {/* Control Execution - Formulario o Vista */}
      {action.controlExecution ? (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
            Fase 4: Ejecución del Control
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha de Verificación
              </label>
              <p className="text-gray-900 mt-1">
                {action.controlExecution.executionDate
                  ? formatDate(toDate(action.controlExecution.executionDate))
                  : 'Pendiente'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                ¿Es Efectiva?
              </label>
              <p
                className={`mt-1 font-semibold ${
                  action.controlExecution.isEffective
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {action.controlExecution.isEffective ? 'Sí' : 'No'}
              </p>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">
                Resultado de la Verificación
              </label>
              <p className="text-gray-900 mt-1">
                {action.controlExecution.verificationResult}
              </p>
            </div>

            {action.controlExecution.comments && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">
                  Comentarios
                </label>
                <p className="text-gray-900 mt-1">
                  {action.controlExecution.comments}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        action.status === 'en_control' &&
        action.controlPlanning && (
          <ActionControlExecutionForm
            actionId={action.id}
            onSuccess={fetchAction}
          />
        )
      )}

      {/* Metadatos */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="grid grid-cols-2 gap-2">
          <div>
            Creado por: {action.createdByName} el{' '}
            {formatDate(toDate(action.createdAt))}
          </div>
          {action.updatedBy && (
            <div>
              Actualizado por: {action.updatedByName} el{' '}
              {formatDate(toDate(action.updatedAt))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
