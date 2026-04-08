import { ISO_9001_PHASES } from '@/lib/iso/phases';
import { db } from '@/firebase/config';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';
import type {
  PhaseProgress,
  PhaseStatus,
} from '@/features/journey/types/journey';

const JOURNEY_DOC_ID = 'progress';

function buildDefaultProgress(): PhaseProgress[] {
  return ISO_9001_PHASES.map((fase, index) => ({
    phaseId: fase.id,
    status: index === 0 ? 'available' : 'locked',
    porcentaje: 0,
    tareasCompletadas: [],
  }));
}

function normalizeStatus(value: unknown): PhaseStatus {
  if (
    value === 'locked' ||
    value === 'available' ||
    value === 'in_progress' ||
    value === 'completed'
  ) {
    return value;
  }
  return 'locked';
}

function toDateValue(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function normalizePhaseProgress(item: DocumentData): PhaseProgress {
  return {
    phaseId: Number(item.phaseId),
    status: normalizeStatus(item.status),
    porcentaje:
      typeof item.porcentaje === 'number'
        ? Math.min(100, Math.max(0, item.porcentaje))
        : 0,
    tareasCompletadas: Array.isArray(item.tareasCompletadas)
      ? item.tareasCompletadas.filter(
          (taskId: unknown) => typeof taskId === 'string'
        )
      : [],
    fechaInicio: toDateValue(item.fechaInicio),
    fechaCompletado: toDateValue(item.fechaCompletado),
  };
}

function mergeWithDefaults(progress: PhaseProgress[]): PhaseProgress[] {
  const defaults = buildDefaultProgress();
  const byPhaseId = new Map(progress.map(item => [item.phaseId, item]));

  return defaults.map(base => {
    const incoming = byPhaseId.get(base.phaseId);
    if (!incoming) return base;
    return {
      ...base,
      ...incoming,
      tareasCompletadas: incoming.tareasCompletadas || [],
    };
  });
}

export class JourneyService {
  static async getJourneyProgress(
    organizationId: string
  ): Promise<PhaseProgress[]> {
    if (!organizationId) {
      return buildDefaultProgress();
    }

    const ref = doc(
      db,
      'organizations',
      organizationId,
      'journey',
      JOURNEY_DOC_ID
    );

    try {
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        return buildDefaultProgress();
      }

      const data = snapshot.data();
      const rawProgress = Array.isArray(data?.fases)
        ? data.fases
        : Array.isArray(data?.progress)
          ? data.progress
          : [];

      if (rawProgress.length === 0) {
        return buildDefaultProgress();
      }

      const normalized = rawProgress
        .filter((item: unknown) => typeof item === 'object' && item !== null)
        .map(item => normalizePhaseProgress(item as DocumentData))
        .filter(item => Number.isFinite(item.phaseId));

      if (normalized.length === 0) {
        return buildDefaultProgress();
      }

      return mergeWithDefaults(normalized);
    } catch (error) {
      console.error('[JourneyService] Error getting journey progress:', error);
      return buildDefaultProgress();
    }
  }

  static async saveJourneyProgress(
    organizationId: string,
    fases: PhaseProgress[]
  ): Promise<void> {
    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    const ref = doc(
      db,
      'organizations',
      organizationId,
      'journey',
      JOURNEY_DOC_ID
    );

    const faseActual =
      fases.find(fase => fase.status === 'in_progress')?.phaseId ||
      fases.find(fase => fase.status === 'available')?.phaseId ||
      1;
    const progresoGlobal =
      fases.length > 0
        ? Math.round(
            fases.reduce((acc, fase) => acc + (fase.porcentaje || 0), 0) /
              fases.length
          )
        : 0;

    await setDoc(
      ref,
      {
        fases,
        faseActual,
        progresoGlobal,
        organization_id: organizationId,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  }
}
