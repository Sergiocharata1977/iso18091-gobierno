'use client';

import { DonCandidoAvatar } from '@/components/ui/DonCandidoAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { ProactiveSuggestionsCard } from '@/features/chat/components/ProactiveSuggestionsCard';
import {
  OperationalSnapshot,
  ProactiveHintsService,
} from '@/features/chat/services/ProactiveHintsService';
import {
  FASES_ISO_9001,
  getDefaultJourneyProgress,
  PhaseProgress,
  PhaseStatus,
} from '@/features/journey/types/journey';
import { cn } from '@/lib/utils';
import { JourneyService } from '@/services/JourneyService';
import type { JourneyPhaseBadge } from '@/services/JourneyStrategicBadgeService';
import {
  Bot,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Lock,
  Sparkles,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type BadgesByPhase = Record<number, JourneyPhaseBadge>;

const EMPTY_SNAPSHOT: OperationalSnapshot = {
  hallazgosAbiertos: 0,
  accionesPendientes: 0,
  accionesVencidas: 0,
  auditoriasPlaneadas: 0,
  capacitacionesPendientes: 0,
  directActionsPendientes: 0,
  diasSinAnalisisEstrategico: null,
  faseActual: 1,
  porcentajeFaseActual: 0,
  nombreOrg: '',
  nombreUsuario: '',
};

function getUserDisplayName(user: ReturnType<typeof useAuth>['user']): string {
  const candidates = [
    (user as Record<string, unknown> | null)?.['nombre'],
    (user as Record<string, unknown> | null)?.['nombres'],
    (user as Record<string, unknown> | null)?.['display_name'],
    (user as Record<string, unknown> | null)?.['full_name'],
  ];

  const namedCandidate = candidates.find(
    value => typeof value === 'string' && value.trim().length > 0
  );
  if (typeof namedCandidate === 'string') {
    return namedCandidate.trim().split(' ')[0] || 'equipo';
  }

  if (user?.email) {
    return user.email.split('@')[0] || 'equipo';
  }

  return 'equipo';
}

function normalizeProgressResponse(payload: unknown): PhaseProgress[] | null {
  const raw = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { fases?: unknown[] }).fases)
      ? (payload as { fases: unknown[] }).fases
      : payload &&
          typeof payload === 'object' &&
          Array.isArray((payload as { progress?: unknown[] }).progress)
        ? (payload as { progress: unknown[] }).progress
        : null;

  if (!raw) return null;

  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null
    )
    .map(item => {
      const status: PhaseStatus =
        item.status === 'locked' ||
        item.status === 'available' ||
        item.status === 'in_progress' ||
        item.status === 'completed'
          ? item.status
          : 'locked';

      return {
        phaseId: Number(item.phaseId),
        status,
        porcentaje:
          typeof item.porcentaje === 'number'
            ? Math.max(0, Math.min(100, item.porcentaje))
            : 0,
        tareasCompletadas: Array.isArray(item.tareasCompletadas)
          ? item.tareasCompletadas.filter(
              (taskId): taskId is string => typeof taskId === 'string'
            )
          : [],
        fechaInicio:
          item.fechaInicio instanceof Date ? item.fechaInicio : undefined,
        fechaCompletado:
          item.fechaCompletado instanceof Date ? item.fechaCompletado : undefined,
      };
    })
    .filter(item => Number.isFinite(item.phaseId));
}

function normalizeBadgesResponse(payload: unknown): BadgesByPhase {
  const raw = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { badges?: unknown[] }).badges)
      ? (payload as { badges: unknown[] }).badges
      : [];

  return raw
    .filter(
      (item): item is JourneyPhaseBadge =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as JourneyPhaseBadge).phaseId === 'number'
    )
    .reduce<BadgesByPhase>((acc, badge) => {
      acc[badge.phaseId] = badge;
      return acc;
    }, {});
}

function getCurrentPhase(progress: PhaseProgress[]): PhaseProgress | undefined {
  return (
    progress.find(phase => phase.status === 'in_progress') ||
    progress.find(phase => phase.status === 'available')
  );
}

function getPendingCount(progress: PhaseProgress[]): number {
  const currentPhase = getCurrentPhase(progress);
  if (!currentPhase) return 0;

  const phaseDefinition = FASES_ISO_9001.find(
    phase => phase.id === currentPhase.phaseId
  );
  if (!phaseDefinition) return 0;

  const requiredTasks = phaseDefinition.tareas.filter(task => task.esRequerida);
  const completedRequiredCount = requiredTasks.filter(task =>
    currentPhase.tareasCompletadas.includes(task.id)
  ).length;

  return Math.max(0, requiredTasks.length - completedRequiredCount);
}

function getCompletedRequiredTasks(progress: PhaseProgress[]): number {
  return progress.reduce((acc, phaseProgress) => {
    const phaseDefinition = FASES_ISO_9001.find(
      phase => phase.id === phaseProgress.phaseId
    );
    if (!phaseDefinition) return acc;

    const completedRequiredCount = phaseDefinition.tareas.filter(
      task =>
        task.esRequerida && phaseProgress.tareasCompletadas.includes(task.id)
    ).length;

    return acc + completedRequiredCount;
  }, 0);
}

function formatGreeting(greeting: string) {
  const parts = greeting.split('**');

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={`${part}-${index}`} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function getModuleLabel(path: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();

  const lastSegment = path.split('/').filter(Boolean).pop();
  if (!lastSegment) return 'módulo';

  return lastSegment.replace(/-/g, ' ');
}

function recalculateProgress(
  currentProgress: PhaseProgress[],
  phaseId: number,
  taskId: string,
  checked: boolean
): PhaseProgress[] {
  const now = new Date();
  const byPhaseId = new Map(
    currentProgress.map(phase => [phase.phaseId, phase] as const)
  );
  const targetPhase = byPhaseId.get(phaseId);

  if (!targetPhase) {
    return currentProgress;
  }

  const updatedTasks = new Set(targetPhase.tareasCompletadas);
  if (checked) {
    updatedTasks.add(taskId);
  } else {
    updatedTasks.delete(taskId);
  }

  byPhaseId.set(phaseId, {
    ...targetPhase,
    tareasCompletadas: [...updatedTasks],
  });

  let previousPhasePercentage = 100;

  return FASES_ISO_9001.map((phase, index) => {
    const previous = byPhaseId.get(phase.id) || {
      phaseId: phase.id,
      status: index === 0 ? 'available' : 'locked',
      porcentaje: 0,
      tareasCompletadas: [],
    };
    const requiredTaskIds = new Set(
      phase.tareas.filter(task => task.esRequerida).map(task => task.id)
    );
    const validCompletedTasks = previous.tareasCompletadas.filter(task =>
      phase.tareas.some(phaseTask => phaseTask.id === task)
    );
    const completedRequiredCount = validCompletedTasks.filter(task =>
      requiredTaskIds.has(task)
    ).length;
    const porcentaje =
      requiredTaskIds.size > 0
        ? Math.round((completedRequiredCount / requiredTaskIds.size) * 100)
        : 0;

    let status: PhaseStatus;
    if (index === 0) {
      status =
        porcentaje === 100
          ? 'completed'
          : porcentaje > 0
            ? 'in_progress'
            : 'available';
    } else if (previousPhasePercentage < 60) {
      status = 'locked';
    } else if (porcentaje === 100) {
      status = 'completed';
    } else if (porcentaje > 0) {
      status = 'in_progress';
    } else {
      status = 'available';
    }

    previousPhasePercentage = porcentaje;

    return {
      phaseId: phase.id,
      status,
      porcentaje,
      tareasCompletadas: validCompletedTasks,
      fechaInicio:
        previous.fechaInicio ||
        (validCompletedTasks.length > 0 ? now : undefined),
      fechaCompletado:
        status === 'completed'
          ? previous.fechaCompletado || now
          : undefined,
    };
  });
}

export default function RoadmapTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<PhaseProgress[]>(
    getDefaultJourneyProgress()
  );
  const [loading, setLoading] = useState(true);
  const [expandedPhaseId, setExpandedPhaseId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<OperationalSnapshot | null>(null);
  const [badgesByPhase, setBadgesByPhase] = useState<BadgesByPhase>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadJourneyProgress = async () => {
      if (!user?.organization_id) {
        if (!cancelled) {
          setProgress(getDefaultJourneyProgress());
          setLoading(false);
        }
        return;
      }

      try {
        const journeyProgress = await JourneyService.getJourneyProgress(
          user.organization_id
        );

        if (!cancelled) {
          setProgress(journeyProgress);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadJourneyProgress();

    return () => {
      cancelled = true;
    };
  }, [user?.organization_id]);

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      try {
        const response = await fetch('/api/journey/snapshot');
        if (!response.ok) {
          throw new Error('snapshot request failed');
        }

        const payload = (await response.json()) as
          | Partial<OperationalSnapshot>
          | { snapshot?: Partial<OperationalSnapshot> };
        const data =
          payload && typeof payload === 'object' && 'snapshot' in payload
            ? payload.snapshot
            : payload;
        if (!cancelled) {
          setSnapshot({
            ...EMPTY_SNAPSHOT,
            ...data,
          });
        }
      } catch {
        if (!cancelled) {
          setSnapshot(EMPTY_SNAPSHOT);
        }
      }
    };

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.organization_id) return;

    let cancelled = false;

    const triggerAutoProgress = async () => {
      try {
        const response = await fetch('/api/journey/auto-progress', {
          method: 'POST',
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const normalized = normalizeProgressResponse(data);
        if (!cancelled && normalized && normalized.length > 0) {
          setProgress(normalized);
        }
      } catch {
        // Ignore background refresh failures.
      }
    };

    triggerAutoProgress();

    return () => {
      cancelled = true;
    };
  }, [user?.organization_id]);

  useEffect(() => {
    if (!user?.organization_id) return;

    let cancelled = false;

    const loadStrategicBadges = async () => {
      try {
        const response = await fetch('/api/journey/strategic-badges');
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setBadgesByPhase(normalizeBadgesResponse(data));
        }
      } catch {
        if (!cancelled) {
          setBadgesByPhase({});
        }
      }
    };

    loadStrategicBadges();

    return () => {
      cancelled = true;
    };
  }, [user?.organization_id]);

  const totalTareas = useMemo(
    () =>
      FASES_ISO_9001.reduce(
        (acc, phase) => acc + phase.tareas.filter(task => task.esRequerida).length,
        0
      ),
    []
  );

  const tareasCompletadas = useMemo(
    () => getCompletedRequiredTasks(progress),
    [progress]
  );

  const progresoGlobal = useMemo(
    () =>
      totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0,
    [tareasCompletadas, totalTareas]
  );

  const faseActual = useMemo(() => getCurrentPhase(progress), [progress]);
  const pendingCount = useMemo(() => getPendingCount(progress), [progress]);

  const effectiveSnapshot = useMemo<OperationalSnapshot>(() => {
    const currentPhase = getCurrentPhase(progress);
    const fallbackName = getUserDisplayName(user);

    return {
      ...EMPTY_SNAPSHOT,
      ...snapshot,
      faseActual: snapshot?.faseActual || currentPhase?.phaseId || 1,
      porcentajeFaseActual:
        snapshot?.porcentajeFaseActual ?? currentPhase?.porcentaje ?? 0,
      nombreUsuario: snapshot?.nombreUsuario || fallbackName,
    };
  }, [progress, snapshot, user]);

  const greeting = useMemo(
    () =>
      ProactiveHintsService.getContextualGreeting(
        effectiveSnapshot.nombreUsuario || getUserDisplayName(user),
        effectiveSnapshot.faseActual,
        new Date().getHours(),
        pendingCount
      ),
    [effectiveSnapshot, pendingCount, user]
  );

  const suggestions = useMemo(
    () =>
      ProactiveHintsService.getSuggestionsByOperationalSnapshot(effectiveSnapshot),
    [effectiveSnapshot]
  );

  const handleToggleTask = async (
    phaseId: number,
    taskId: string,
    checked: boolean
  ) => {
    const previousProgress = progress;
    const updatedProgress = recalculateProgress(progress, phaseId, taskId, checked);

    setProgress(updatedProgress);
    setSavingTaskId(taskId);

    if (!user?.organization_id) {
      setSavingTaskId(null);
      return;
    }

    try {
      await JourneyService.saveJourneyProgress(user.organization_id, updatedProgress);
    } catch (error) {
      console.error('[RoadmapTab] Error saving journey progress:', error);
      setProgress(previousProgress);
    } finally {
      setSavingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-full p-2 flex-shrink-0">
            <DonCandidoAvatar mood="saludo" className="w-full h-full" />
          </div>
          <div className="flex-1 text-white">
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              Tu Camino hacia ISO 9001
            </h2>
            <p className="text-emerald-100 text-sm">
              6 fases para implementar tu Sistema de Gestion de Calidad
            </p>
            {loading && (
              <p className="text-emerald-50 text-xs mt-1">
                Cargando progreso real...
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 bg-black/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
                Don Cándido
              </p>
              <p className="mt-1 text-sm leading-6 text-white">
                {formatGreeting(greeting)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <ProactiveSuggestionsCard suggestions={suggestions} />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm text-white/80 mb-2">
            <span>Progreso Global</span>
            <span className="font-bold text-white">{progresoGlobal}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progresoGlobal}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/60 mt-2">
            <span>
              {tareasCompletadas} de {totalTareas} tareas
            </span>
            {faseActual && (
              <span>
                Fase actual:{' '}
                {FASES_ISO_9001.find(phase => phase.id === faseActual.phaseId)
                  ?.nombreCorto || ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {FASES_ISO_9001.map(fase => {
          const faseProgress = progress.find(phase => phase.phaseId === fase.id);
          const status = faseProgress?.status || 'locked';
          const porcentaje = faseProgress?.porcentaje || 0;
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';
          const isActive = status === 'in_progress' || status === 'available';
          const badge = badgesByPhase[fase.id];

          return (
            <div
              key={fase.id}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all',
                isLocked && 'opacity-60',
                isActive && 'ring-2 ring-emerald-500'
              )}
            >
              <div className={cn('p-5 bg-gradient-to-r', fase.colorPrimario)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{fase.icono}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white/70 text-xs font-medium">
                          FASE {fase.id}
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-xs">
                            Completada
                          </span>
                        )}
                        {isActive && !isCompleted && (
                          <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-xs animate-pulse">
                            En progreso
                          </span>
                        )}
                        {badge && (
                          <span
                            title={badge.topFinding}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              badge.level === 'critical'
                                ? 'bg-red-500/90 text-white'
                                : 'bg-orange-400/90 text-white'
                            )}
                          >
                            {badge.level === 'critical'
                              ? `🔴 ${badge.count} críticos`
                              : `⚠ ${badge.count} hallazgos`}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {fase.nombre}
                      </h3>
                    </div>
                  </div>
                  {!isLocked ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPhaseId(prev =>
                          prev === fase.id ? null : fase.id
                        )
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Ver
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 transition-transform',
                          expandedPhaseId === fase.id && 'rotate-90'
                        )}
                      />
                    </button>
                  ) : (
                    <Lock className="w-5 h-5 text-white/50" />
                  )}
                </div>
                {isActive && (
                  <div className="mt-3">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <p className="text-white/80 text-xs mt-1">
                      {porcentaje}% completado
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  {fase.descripcion}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {fase.clausulasISO.map(c => (
                    <span
                      key={c}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                    >
                      Clausula {c}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>
                      {fase.tareas.filter(task => task.esRequerida).length} tareas
                      requeridas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>~2-3 semanas</span>
                  </div>
                </div>
                {expandedPhaseId === fase.id && (
                  <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30 space-y-4">
                    {fase.tareas.length > 0 || fase.clausulasISO.length > 0 ? (
                      <>
                        {fase.tareas.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                              Tareas de la fase
                            </h4>
                            <ul className="space-y-2">
                              {fase.tareas.map(tarea => {
                                const completed =
                                  faseProgress?.tareasCompletadas.includes(
                                    tarea.id
                                  ) || false;
                                const moduleLabel = tarea.rutaModulo
                                  ? getModuleLabel(
                                      tarea.rutaModulo,
                                      tarea.moduloVinculado
                                    )
                                  : null;

                                return (
                                  <li
                                    key={tarea.id}
                                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/70 p-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                                        checked={completed}
                                        disabled={isLocked}
                                        onChange={event =>
                                          handleToggleTask(
                                            fase.id,
                                            tarea.id,
                                            event.target.checked
                                          )
                                        }
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={cn(
                                              'text-sm font-medium text-gray-800 dark:text-gray-100',
                                              completed &&
                                                'line-through text-gray-400 dark:text-gray-500'
                                            )}
                                          >
                                            {tarea.titulo}
                                          </span>
                                          {tarea.esRequerida && (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                              Requerida
                                            </span>
                                          )}
                                          {!tarea.esRequerida && (
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                              Opcional
                                            </span>
                                          )}
                                          {completed && (
                                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                              <span className="inline-flex items-center gap-1">
                                                <Check className="h-3 w-3" />
                                                Hecha
                                              </span>
                                            </span>
                                          )}
                                        </div>
                                        <p
                                          className={cn(
                                            'mt-1 text-sm text-gray-600 dark:text-gray-300',
                                            completed &&
                                              'text-gray-400 dark:text-gray-500'
                                          )}
                                        >
                                          {tarea.descripcion}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                          {tarea.rutaModulo && moduleLabel && (
                                            <Link
                                              href={tarea.rutaModulo}
                                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                                            >
                                              <ExternalLink className="h-3.5 w-3.5" />
                                              {`→ ${moduleLabel}`}
                                            </Link>
                                          )}
                                          {tarea.puedeGenerarseConIA && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                router.push(
                                                  `/don-candido?task=${encodeURIComponent(
                                                    tarea.id
                                                  )}&phase=${encodeURIComponent(
                                                    String(fase.id)
                                                  )}`
                                                )
                                              }
                                              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                                            >
                                              <Sparkles className="h-3.5 w-3.5" />
                                              ✨ Generar
                                            </button>
                                          )}
                                          {savingTaskId === tarea.id && (
                                            <span className="text-xs text-gray-500">
                                              Guardando...
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        {fase.clausulasISO.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                              Clausulas ISO asociadas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {fase.clausulasISO.map(c => (
                                <span
                                  key={`detail-${fase.id}-${c}`}
                                  className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                                >
                                  Clausula {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-3 bg-white/70 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Detalle de esta fase en construccion. Progreso:{' '}
                          {porcentaje}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
