'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  GenerateDraftsFromStrategyResponse,
  GetOnboardingStrategyStatusResponse,
} from '@/types/onboarding-strategy';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Rocket,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface StrategyLaunchCardProps {
  organizationId?: string | null;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

async function trackPlan19Metric(
  organizationId: string,
  eventType:
    | 'strategy_checklist_viewed'
    | 'strategy_checklist_completed'
    | 'draft_generation_requested'
) {
  try {
    await fetch('/api/onboarding/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: organizationId,
        system_id: 'iso9001',
        session_id: `plan19-ui-${Date.now()}`,
        event_type: eventType,
      }),
    });
  } catch {
    // best effort
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'complete':
      return 'bg-emerald-100 text-emerald-800';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'strategy_pending':
      return 'Estrategia pendiente';
    case 'strategy_in_progress':
      return 'Estrategia en progreso';
    case 'strategy_complete':
      return 'Estrategia completa';
    case 'draft_generation_running':
      return 'Generando borradores';
    case 'drafts_generated':
      return 'Borradores generados';
    case 'onboarding_completed':
      return 'Onboarding completado';
    case 'pending_assignment':
      return 'Pendiente de responsable';
    default:
      return phase;
  }
}

export function StrategyLaunchCard({
  organizationId,
}: StrategyLaunchCardProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] =
    useState<GetOnboardingStrategyStatusResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] =
    useState<GenerateDraftsFromStrategyResponse | null>(null);

  const onboardingQueryEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      new URLSearchParams(window.location.search).get('onboarding') === '1'
    );
  }, []);

  const shouldShow = useMemo(() => {
    if (!status) return onboardingQueryEnabled;
    const phase = status.onboardingState.onboarding_phase;
    if (onboardingQueryEnabled) return true;
    return (
      status.isOwner &&
      phase !== 'onboarding_completed' &&
      phase !== 'pending_assignment'
    );
  }, [onboardingQueryEnabled, status]);

  const loadStatus = async () => {
    if (!organizationId) return;
    setLoadState('loading');
    setError(null);

    try {
      const params = new URLSearchParams({ organization_id: organizationId });
      const response = await fetch(
        `/api/onboarding/strategy-status?${params}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error || 'No se pudo cargar el estado de onboarding'
        );
      }
      setStatus(payload as GetOnboardingStrategyStatusResponse);
      setLoadState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoadState('error');
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !status) return;
    const viewedKey = `plan19_checklist_viewed_${organizationId}`;
    if (sessionStorage.getItem(viewedKey) !== '1') {
      sessionStorage.setItem(viewedKey, '1');
      void trackPlan19Metric(organizationId, 'strategy_checklist_viewed');
    }

    if (status.checklist.canGenerateDrafts) {
      const completedKey = `plan19_checklist_completed_${organizationId}`;
      if (sessionStorage.getItem(completedKey) !== '1') {
        sessionStorage.setItem(completedKey, '1');
        void trackPlan19Metric(organizationId, 'strategy_checklist_completed');
      }
    }
  }, [organizationId, status]);

  const canGenerate = Boolean(
    status?.isOwner &&
      status?.checklist?.canGenerateDrafts &&
      !isGenerating &&
      status?.onboardingState.onboarding_phase !== 'draft_generation_running'
  );

  const handleGenerateDrafts = async () => {
    if (!status || !organizationId || !canGenerate) return;

    const confirmed = window.confirm(
      'Se generarán procesos base y modelos en borrador. Podrás editarlos antes de activarlos. ¿Continuar?'
    );
    if (!confirmed) return;

    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);
    void trackPlan19Metric(organizationId, 'draft_generation_requested');

    try {
      const response = await fetch(
        '/api/onboarding/generate-drafts-from-strategy',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: organizationId,
            system_id: status.onboardingState.onboarding_system_id || 'iso9001',
            mode: 'draft',
          }),
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo generar borradores');
      }

      setGenerationResult(payload as GenerateDraftsFromStrategyResponse);
      await loadStatus();
      // Redirigir al roadmap después de 2 segundos para que el usuario vea el resultado
      setTimeout(() => router.push('/mi-sgc/roadmap'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!organizationId) return null;
  if (!shouldShow && loadState !== 'loading') return null;

  return (
    <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-col md:flex-row">
          <div>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-emerald-600" />
              Lanzamiento guiado del SGC
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Complete la base estratégica para generar procesos base y modelos
              en borrador.
            </p>
          </div>
          {status && (
            <Badge className="bg-white text-emerald-800 border border-emerald-200">
              {getPhaseLabel(status.onboardingState.onboarding_phase)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadState === 'loading' && (
          <div className="rounded-md border border-emerald-100 bg-white/80 p-3 text-sm text-slate-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analizando completitud estratégica...
          </div>
        )}

        {loadState === 'error' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error || 'No se pudo cargar el onboarding estratégico.'}
          </div>
        )}

        {status && (
          <>
            <div className="rounded-lg border border-white/70 bg-white/80 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Completitud estratégica
                  </p>
                  <p className="text-xs text-slate-600">
                    {status.checklist.progressPercent}% completado
                  </p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  {status.checklist.items.filter(i => i.completed).length}/
                  {status.checklist.items.length} secciones
                </div>
              </div>

              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-2 bg-emerald-500 transition-all"
                  style={{ width: `${status.checklist.progressPercent}%` }}
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {status.checklist.items.map(item => (
                  <div
                    key={item.key}
                    className="rounded-md border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <p className="text-sm font-medium text-slate-900">
                          {item.label}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeClass(item.status)}>
                        {item.status === 'complete'
                          ? 'Completo'
                          : item.status === 'in_progress'
                            ? 'En progreso'
                            : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.detail ||
                        (item.completed ? 'Listo' : 'Faltan datos')}
                    </p>
                    {item.missingFields?.length ? (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        Faltantes: {item.missingFields.join(', ')}
                      </p>
                    ) : null}
                    {!item.completed && (
                      <Link
                        href={`/planificacion-revision-direccion/${item.key}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                      >
                        Completar sección
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!status.isOwner && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Solo el responsable de onboarding/calidad puede ejecutar la
                generación automática.
              </div>
            )}

            {status.isOwner && !status.checklist.canGenerateDrafts && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Complete las secciones faltantes para habilitar la generación de
                borradores.
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="text-xs text-slate-600">
                La generación crea borradores editables. No publica procesos en
                vigencia automáticamente.
              </div>
              <Button
                type="button"
                onClick={handleGenerateDrafts}
                disabled={!canGenerate}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando borradores...
                  </>
                ) : status.checklist.canGenerateDrafts ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar procesos base y modelos (borrador)
                  </>
                ) : (
                  'Completar estrategia para generar'
                )}
              </Button>
            </div>

            {generationResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 space-y-2">
                <p className="font-medium">Generación completada</p>
                <p>
                  Creados: {generationResult.summary.created.length} | Omitidos:{' '}
                  {generationResult.summary.skipped.length} | Errores:{' '}
                  {generationResult.summary.errors.length}
                </p>
                {generationResult.summary.created.length > 0 && (
                  <p className="text-xs">
                    {generationResult.summary.created.slice(0, 6).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-emerald-600">
                  Redirigiendo al roadmap...
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  onClick={() => router.push('/mi-sgc/roadmap')}
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Ir al Roadmap ahora
                </Button>
              </div>
            )}

            {error && loadState !== 'error' && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
