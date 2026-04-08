'use client';

import { ClasificacionesSection } from '@/components/crm/clasificaciones/ClasificacionesSection';
import { CreditWorkflowCanvas } from '@/components/crm/CreditWorkflowCanvas';
import { OpportunityCreditPanelCard } from '@/components/crm/OpportunityCreditPanelCard';
import { OpportunitySubflowBadge } from '@/components/crm/OpportunitySubflowBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationCapability } from '@/hooks/useOrganizationCapability';
import {
  CRM_RISK_SCORING_CAPABILITY_ID,
  CRM_RISK_SCORING_DISABLED_MESSAGE,
} from '@/lib/plugins/crmRiskScoringShared';
import type { CreditWorkflow } from '@/types/crm-credit-workflow';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CircleDollarSign,
  Clock3,
  History,
  Loader2,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatCurrency(amount?: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toProjection(
  workflow: CreditWorkflow
): NonNullable<NonNullable<OportunidadCRM['subprocesos']>['crediticio']> {
  return {
    workflow_id: workflow.id,
    activo: workflow.activo,
    status: workflow.status,
    resolution: workflow.resolution,
    updated_at: workflow.updated_at,
  };
}

export default function CrmOpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const [oportunidad, setOportunidad] = useState<OportunidadCRM | null>(null);
  const [workflow, setWorkflow] = useState<CreditWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const {
    enabled: scoringEnabled,
    loading: capabilityLoading,
    error: capabilityError,
  } = useOrganizationCapability({
    organizationId,
    capabilityId: CRM_RISK_SCORING_CAPABILITY_ID,
  });

  useEffect(() => {
    if (!params.id || !organizationId) {
      return;
    }

    const loadOpportunity = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/crm/oportunidades/${params.id}`);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'No se pudo cargar la oportunidad');
        }

        setOportunidad(payload.data);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la oportunidad'
        );
      } finally {
        setLoading(false);
      }
    };

    void loadOpportunity();
  }, [organizationId, params.id]);

  useEffect(() => {
    if (!params.id || !organizationId || capabilityLoading || !scoringEnabled) {
      if (!capabilityLoading && !scoringEnabled) {
        setWorkflow(null);
      }
      return;
    }

    const loadWorkflow = async () => {
      try {
        setWorkflowLoading(true);
        const response = await fetch(
          `/api/crm/credit-workflows/by-opportunity/${params.id}?organization_id=${organizationId}`
        );
        const payload = await response.json();

        if (response.status === 404) {
          setWorkflow(null);
          return;
        }

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'No se pudo cargar el workflow');
        }

        setWorkflow(payload.data);
      } catch (loadError) {
        console.error('Error loading workflow:', loadError);
        setWorkflow(null);
      } finally {
        setWorkflowLoading(false);
      }
    };

    void loadWorkflow();
  }, [capabilityLoading, organizationId, params.id, scoringEnabled]);

  const handleWorkflowUpdated = (updatedWorkflow: CreditWorkflow) => {
    setWorkflow(updatedWorkflow);
    setOportunidad(current =>
      current
        ? {
            ...current,
            subprocesos: {
              ...(current.subprocesos || {}),
              crediticio: toProjection(updatedWorkflow),
            },
          }
        : current
    );
  };

  const diasEnPipeline = oportunidad
    ? Math.floor(
        (Date.now() - new Date(oportunidad.created_at).getTime()) / 86400000
      )
    : 0;
  const ultimaFechaEtapa =
    oportunidad?.historial_estados?.length
      ? oportunidad.historial_estados[oportunidad.historial_estados.length - 1]
          ?.fecha_cambio
      : oportunidad?.created_at;
  const diasEnEtapa = ultimaFechaEtapa
    ? Math.floor((Date.now() - new Date(ultimaFechaEtapa).getTime()) / 86400000)
    : 0;

  if (loading || capabilityLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !oportunidad) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <p className="font-medium text-rose-600">
          {error || 'Oportunidad no encontrada'}
        </p>
        <Link href="/crm">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al CRM
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link href="/crm">
                <Button variant="ghost" className="px-0 text-slate-600">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al pipeline
                </Button>
              </Link>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                    {oportunidad.nombre}
                  </h1>
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: `${oportunidad.estado_kanban_color}20`,
                      borderColor: oportunidad.estado_kanban_color,
                      color: oportunidad.estado_kanban_color,
                    }}
                  >
                    {oportunidad.estado_kanban_nombre}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {oportunidad.organizacion_nombre}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <OpportunitySubflowBadge
                    creditWorkflow={oportunidad.subprocesos?.crediticio}
                  />
                  <Badge variant="secondary">
                    {diasEnPipeline} dias en pipeline
                  </Badge>
                  <Badge variant="secondary">{diasEnEtapa} dias en etapa</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
                    <CircleDollarSign className="h-4 w-4" />
                    Monto
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-800">
                    {formatCurrency(oportunidad.monto_estimado)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-sky-200 bg-sky-50">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-sky-700">
                    <TrendingUp className="h-4 w-4" />
                    Probabilidad
                  </p>
                  <p className="mt-2 text-2xl font-bold text-sky-800">
                    {oportunidad.probabilidad || 0}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-violet-200 bg-violet-50">
                <CardContent className="p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
                    <Clock3 className="h-4 w-4" />
                    Actualizada
                  </p>
                  <p className="mt-2 text-sm font-semibold text-violet-900">
                    {formatDate(oportunidad.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <OpportunityCreditPanelCard
            creditWorkflow={oportunidad.subprocesos?.crediticio}
            assignedTo={workflow?.assigned_to_user_name}
            stageOriginName={workflow?.stage_origin_name}
            openedAt={workflow?.opened_at}
            slaDueAt={workflow?.sla_due_at}
            capabilityEnabled={scoringEnabled}
            capabilityMessage={
              capabilityError || CRM_RISK_SCORING_DISABLED_MESSAGE
            }
            onOpen={() => setIsCanvasOpen(true)}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-violet-600" />
                  Resumen comercial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                {oportunidad.descripcion ? (
                  <p className="leading-6 text-slate-600">{oportunidad.descripcion}</p>
                ) : (
                  <p className="text-slate-500">
                    Sin descripcion cargada para esta oportunidad.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Vendedor
                    </p>
                    <p className="mt-2 flex items-center gap-2 font-medium text-slate-900">
                      <UserRound className="h-4 w-4 text-violet-500" />
                      {oportunidad.vendedor_nombre}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Contacto
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {oportunidad.contacto_nombre || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-sky-600" />
                  Cliente y fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Organizacion
                  </p>
                  <p className="mt-1 font-medium text-slate-900">
                    {oportunidad.organizacion_nombre}
                  </p>
                  {oportunidad.organizacion_cuit && (
                    <p className="text-slate-500">{oportunidad.organizacion_cuit}</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Alta
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {formatDate(oportunidad.created_at)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Cierre estimado
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {formatDate(oportunidad.fecha_cierre_estimada)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-slate-600" />
                Historial de estados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oportunidad.historial_estados?.length ? (
                <div className="space-y-3">
                  {oportunidad.historial_estados.map((item, index) => (
                    <div
                      key={`${item.fecha_cambio}-${index}`}
                      className="rounded-xl border bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="font-medium text-slate-900">
                          {item.estado_anterior_nombre} → {item.estado_nuevo_nombre}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(item.fecha_cambio)}
                        </p>
                      </div>
                      {item.motivo && (
                        <p className="mt-2 text-sm italic text-slate-600">
                          {item.motivo}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Todavia no hay movimientos historicos registrados.
                </p>
              )}
            </CardContent>
          </Card>

          <ClasificacionesSection
            entidadTipo="oportunidad"
            entidadId={oportunidad.id}
            classifications={oportunidad.classifications}
            onUpdated={classifications =>
              setOportunidad(current =>
                current ? { ...current, classifications } : current
              )
            }
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexto rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Workflow crediticio
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {workflowLoading
                    ? 'Cargando...'
                    : workflow
                      ? `ID ${workflow.id}`
                      : 'Sin workflow activo'}
                </p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Resolucion crediticia
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {oportunidad.subprocesos?.crediticio?.resolution || '-'}
                </p>
              </div>
              <Link href={`/crm/clientes/${oportunidad.crm_organizacion_id}`}>
                <Button variant="outline" className="w-full">
                  Abrir ficha del cliente
                </Button>
              </Link>
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700"
                onClick={() => setIsCanvasOpen(true)}
                disabled={!workflow && scoringEnabled}
              >
                Abrir panel crediticio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreditWorkflowCanvas
        open={isCanvasOpen}
        onOpenChange={setIsCanvasOpen}
        workflow={workflow}
        opportunity={oportunidad}
        organizationId={organizationId || ''}
        capabilityEnabled={scoringEnabled}
        capabilityMessage={capabilityError || CRM_RISK_SCORING_DISABLED_MESSAGE}
        onUpdated={handleWorkflowUpdated}
      />
    </div>
  );
}
