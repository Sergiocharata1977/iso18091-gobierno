'use client';

import { PageHeader } from '@/components/design-system/layout/PageHeader';
import { formatDate } from '@/lib/utils';
import { FindingService } from '@/services/findings/FindingService';
import type { Finding } from '@/types/findings';
import { FINDING_STATUS_COLORS, FINDING_STATUS_LABELS } from '@/types/findings';

const NORMA_DISPLAY: Record<string, string> = {
  ISO_9001: 'ISO 9001',
  ISO_14001: 'ISO 14001',
  ISO_45001: 'ISO 45001',
  ISO_27001: 'ISO 27001',
  ISO_27002: 'ISO 27002',
  ISO_18091: 'ISO 18091',
  ISO_31000: 'ISO 31000',
  PTW: 'PTW',
  CUSTOM: 'Custom',
};

const ORIGEN_DISPLAY: Record<string, string> = {
  auditoria: 'Auditoría',
  incidente_sst: 'Incidente SST',
  aspecto_ambiental: 'Aspecto Ambiental',
  ptw: 'Permiso de Trabajo',
  sgsi_control: 'Control SGSI',
  registro_configurable: 'Registro',
  manual: 'Manual',
};
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Target,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFinding = async () => {
      try {
        setLoading(true);
        setError(null);
        const id = params.id as string;
        const data = await FindingService.getById(id);

        if (!data) {
          setError('Hallazgo no encontrado');
          return;
        }

        setFinding(data);
      } catch (err) {
        console.error('Error loading finding:', err);
        setError('Error al cargar el hallazgo');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadFinding();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando hallazgo...</p>
        </div>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Hallazgo no encontrado'}
          </h2>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const createdDate = toDate(finding.createdAt);
  const updatedDate = toDate(finding.updatedAt);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <PageHeader
        title={finding.registration?.name || 'Sin nombre'}
        description={
          finding.registration?.description
            ? `${finding.findingNumber} - ${finding.registration.description.substring(0, 100)}...`
            : finding.findingNumber
        }
        breadcrumbs={[
          { label: 'Mejora', href: '/mejoras' },
          { label: 'Hallazgos', href: '/mejoras/hallazgos' },
          { label: finding.findingNumber },
        ]}
        actions={
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                FINDING_STATUS_COLORS[finding.status]
              }`}
            >
              {FINDING_STATUS_LABELS[finding.status]}
            </span>
            <div className="w-32">
              <div className="flex justify-between text-xs mb-1">
                <span>Progreso</span>
                <span>{finding.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${finding.progress}%` }}
                />
              </div>
            </div>
          </div>
        }
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Descripción
              </h2>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {finding.registration?.description || 'Sin descripción'}
            </p>
          </div>

          {/* Root Cause Analysis */}
          {finding.rootCauseAnalysis && (
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Análisis de Causa Raíz
                </h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {finding.rootCauseAnalysis.analysis}
              </p>
              {finding.rootCauseAnalysis.requiresAction && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Requiere acción correctiva
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Immediate Action Execution */}
          {finding.immediateActionExecution && (
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Corrección Ejecutada
                </h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {finding.immediateActionExecution.correction}
              </p>
              <div className="mt-3 text-sm text-gray-600">
                <p>
                  Ejecutado por:{' '}
                  {finding.immediateActionExecution.executedByName}
                </p>
                <p>
                  Fecha:{' '}
                  {formatDate(
                    toDate(finding.immediateActionExecution.executionDate)
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Immediate Action Planning */}
          {finding.immediateActionPlanning && (
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Acción Inmediata Planificada
                </h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Responsable:</span>{' '}
                  {finding.immediateActionPlanning.responsiblePersonName}
                </p>
                <p>
                  <span className="font-medium">Fecha planificada:</span>{' '}
                  {formatDate(
                    toDate(finding.immediateActionPlanning.plannedDate)
                  )}
                </p>
                {finding.immediateActionPlanning.comments && (
                  <p className="text-gray-700 mt-2">
                    {finding.immediateActionPlanning.comments}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Fecha de creación</span>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-6">
                  {formatDate(createdDate)}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Última actualización</span>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-6">
                  {formatDate(updatedDate)}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  <span>Creado por</span>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-6">
                  {finding.createdByName}
                </p>
              </div>

              {finding.registration?.origin && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Origen</div>
                  <p className="text-sm font-medium text-gray-900">
                    {finding.registration.origin}
                  </p>
                </div>
              )}

              {finding.registration?.processName && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Proceso</div>
                  <p className="text-sm font-medium text-gray-900">
                    {finding.registration.processName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Source Link */}
          {finding.registration?.sourceType === 'auditoria' &&
            finding.registration?.sourceId && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Origen: Auditoría
                  </span>
                </div>
                <Link
                  href={`/auditorias/${finding.registration.sourceId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Ver auditoría relacionada
                </Link>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
