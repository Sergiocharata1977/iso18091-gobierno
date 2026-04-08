'use client';

import { AddNormPointsDialog } from '@/components/audits/AddNormPointsDialog';
import { AuditComments } from '@/components/audits/AuditComments';
import { AuditEvidenceManager } from '@/components/audits/AuditEvidenceManager';
import { AuditFindingsList } from '@/components/audits/AuditFindingsList';
import { AuditStatusBadge } from '@/components/audits/AuditStatusBadge';
import { CloseAuditDialog } from '@/components/audits/CloseAuditDialog';
import { ConformityStatusBadge } from '@/components/audits/ConformityStatusBadge';
import { NormPointVerificationDialog } from '@/components/audits/NormPointVerificationDialog';
import { FindingFormDialog } from '@/components/findings/FindingFormDialog';
import { Button } from '@/components/ui/button';
import type { Audit } from '@/types/audits';
import type { NormaISO } from '@/types/sig-core';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  User,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [verificationDialog, setVerificationDialog] = useState<{
    open: boolean;
    normPointCode: string;
  }>({ open: false, normPointCode: '' });
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [showAddNormPointsDialog, setShowAddNormPointsDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const fetchAudit = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/audits/${auditId}`);
      if (!response.ok) throw new Error('Error al cargar la auditoría');
      const result = await response.json();

      if (result.success && result.data) {
        setAudit(result.data);
      } else {
        setAudit(null);
      }
    } catch (error) {
      console.error('Error fetching audit:', error);
      setAudit(null);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    if (auditId) {
      fetchAudit();
    }
  }, [auditId, fetchAudit]);

  // Removed handleStartExecution - evaluation is now direct

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/audits/${auditId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Error al completar auditoría');
      await fetchAudit();
    } catch (error) {
      console.error('Error completing audit:', error);
      alert('Error al completar la auditoría');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyNormPoint = async (data: {
    conformityStatus: string | null;
    processes: string[];
    observations: string | null;
  }) => {
    try {
      const response = await fetch(`/api/audits/${auditId}/verify-norm-point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normPointCode: verificationDialog.normPointCode,
          ...data,
        }),
      });

      if (!response.ok) throw new Error('Error al verificar punto');
      await fetchAudit();
    } catch (error) {
      console.error('Error verifying norm point:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando auditoría...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Auditoría no encontrada</p>
          <Button onClick={() => router.push('/auditorias')} className="mt-4">
            Volver a Auditorías
          </Button>
        </div>
      </div>
    );
  }

  const NORMA_LABELS: Record<NormaISO, string> = {
    ISO_9001: 'ISO 9001',
    ISO_14001: 'ISO 14001',
    ISO_45001: 'ISO 45001',
    ISO_27001: 'ISO 27001',
    ISO_27002: 'ISO 27002',
    ISO_18091: 'ISO 18091',
    ISO_31000: 'ISO 31000',
    PTW: 'PTW',
    CUSTOM: 'Personalizada',
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{audit.title}</h1>
            <AuditStatusBadge status={audit.status} />
          </div>
          <p className="text-gray-600">{audit.scope}</p>
          {audit.normas && audit.normas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {audit.normas.map(norma => (
                <span
                  key={norma}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {NORMA_LABELS[norma] ?? norma}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {audit.status === 'in_progress' && (
            <Button
              onClick={() => setShowCloseDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Cerrar Auditoría
            </Button>
          )}

          <Button variant="outline" onClick={() => router.push('/auditorias')}>
            Volver
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border-0 p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Fecha Planificada</span>
          </div>
          <p className="text-lg font-semibold">
            {audit.plannedDate?.toDate
              ? audit.plannedDate.toDate().toLocaleDateString('es-ES')
              : 'N/A'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border-0 p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <User className="w-4 h-4" />
            <span className="text-sm">Auditor Líder</span>
          </div>
          <p className="text-lg font-semibold">{audit.leadAuditor}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border-0 p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Tipo</span>
          </div>
          <p className="text-lg font-semibold capitalize">
            {audit.auditType === 'complete' ? 'Completa' : 'Parcial'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border-0 p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Progreso</span>
          </div>
          <p className="text-lg font-semibold">
            {audit.normPointsVerification?.filter(
              v => v.conformityStatus !== null
            ).length || 0}{' '}
            / {audit.normPointsVerification?.length || 0}
          </p>
        </div>
      </div>

      {/* Comentarios e Informe */}
      <AuditComments
        auditId={auditId}
        auditStatus={audit.status}
        initialComments={audit.initialComments}
        finalReport={audit.finalReport}
        onSave={fetchAudit}
      />

      {/* Norm Points Verification - Available for planned and in_progress */}
      {(audit.status === 'planned' || audit.status === 'in_progress') && (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Evaluación de Puntos de Norma
          </h2>

          {audit.normPointsVerification &&
          audit.normPointsVerification.length > 0 ? (
            <div className="space-y-3">
              {audit.normPointsVerification.map(verification => (
                <div
                  key={verification.normPointCode}
                  className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {verification.normPointCode}
                    </p>
                    {verification.conformityStatus ? (
                      <div className="mt-2">
                        <ConformityStatusBadge
                          status={verification.conformityStatus}
                        />
                        {verification.observations && (
                          <p className="text-sm text-gray-600 mt-1">
                            {verification.observations}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        Pendiente de verificación
                      </p>
                    )}
                  </div>

                  {!verification.conformityStatus && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setVerificationDialog({
                          open: true,
                          normPointCode: verification.normPointCode,
                        })
                      }
                    >
                      Evaluar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                No hay puntos de norma para verificar en esta auditoría.
              </p>
              <Button
                onClick={() => setShowAddNormPointsDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Puntos de Norma
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Completed Summary */}
      {audit.status === 'completed' && (
        <div className="bg-white rounded-lg shadow-sm border-0 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Resumen de Auditoría
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Crear hallazgos desde las no conformidades
                  const ncCount =
                    audit.normPointsVerification?.filter(
                      v =>
                        v.conformityStatus === 'NCM' ||
                        v.conformityStatus === 'NCm'
                    ).length || 0;

                  if (ncCount > 0) {
                    router.push(`/hallazgos?source=audit&sourceId=${auditId}`);
                  } else {
                    alert('No hay no conformidades para crear hallazgos');
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Crear Hallazgos (
                {audit.normPointsVerification?.filter(
                  v =>
                    v.conformityStatus === 'NCM' || v.conformityStatus === 'NCm'
                ).length || 0}{' '}
                NC)
              </Button>
              <Button
                onClick={() => router.push(`/hallazgos?sourceId=${auditId}`)}
                variant="outline"
              >
                Ver Hallazgos
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {audit.normPointsVerification?.filter(
                  v => v.conformityStatus === 'CF'
                ).length || 0}
              </p>
              <p className="text-sm text-gray-600">Conformes</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {audit.normPointsVerification?.filter(
                  v => v.conformityStatus === 'NCm'
                ).length || 0}
              </p>
              <p className="text-sm text-gray-600">No Conformidades Menores</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {audit.normPointsVerification?.filter(
                  v => v.conformityStatus === 'NCM'
                ).length || 0}
              </p>
              <p className="text-sm text-gray-600">No Conformidades Mayores</p>
            </div>
          </div>

          {audit.normPointsVerification &&
            audit.normPointsVerification.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Puntos Verificados
                </h3>
                {audit.normPointsVerification.map(verification => (
                  <div
                    key={verification.normPointCode}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">
                        {verification.normPointCode}
                      </p>
                      {verification.conformityStatus && (
                        <ConformityStatusBadge
                          status={verification.conformityStatus}
                        />
                      )}
                    </div>
                    {verification.observations && (
                      <p className="text-sm text-gray-600">
                        {verification.observations}
                      </p>
                    )}
                    {verification.processes &&
                      verification.processes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Procesos:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {verification.processes.map((proc, idx) => (
                              <li key={idx}>{proc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Evidencias Section */}
      <AuditEvidenceManager
        auditId={auditId}
        auditStatus={audit.status}
        onEvidenceChange={fetchAudit}
      />

      {/* Hallazgos Section - Visible en todos los estados */}
      <div className="bg-white rounded-lg shadow-sm border-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Hallazgos de esta Auditoría
          </h2>
          <Button
            onClick={() => setShowFindingForm(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Hallazgo
          </Button>
        </div>

        {/* Lista de hallazgos compacta */}
        <AuditFindingsList auditId={auditId} />
      </div>

      {/* Verification Dialog */}
      <NormPointVerificationDialog
        open={verificationDialog.open}
        onClose={() =>
          setVerificationDialog({ open: false, normPointCode: '' })
        }
        onSubmit={handleVerifyNormPoint}
        normPointCode={verificationDialog.normPointCode}
        auditId={auditId}
      />

      {/* Finding Form Dialog */}
      <FindingFormDialog
        open={showFindingForm}
        onOpenChange={setShowFindingForm}
        onSuccess={() => {
          setShowFindingForm(false);
          // Recargar la página para mostrar el nuevo hallazgo
          window.location.reload();
        }}
        initialData={{
          sourceType: 'auditoria' as const,
          sourceId: auditId,
          sourceName: audit.auditNumber || audit.title,
        }}
      />

      {/* Add Norm Points Dialog */}
      <AddNormPointsDialog
        open={showAddNormPointsDialog}
        onOpenChange={setShowAddNormPointsDialog}
        auditId={auditId}
        onSuccess={fetchAudit}
      />

      {/* Close and Archive Dialog */}
      <CloseAuditDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        audit={audit}
        onSuccess={fetchAudit}
      />
    </div>
  );
}
