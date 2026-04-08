import type { OperationalSnapshot } from '@/features/chat/services/ProactiveHintsService';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type UnknownRecord = Record<string, unknown>;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    isObject(value) &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime())
      ? parsed
      : null;
  }
  if (
    isObject(value) &&
    typeof value.seconds === 'number' &&
    typeof value.nanoseconds === 'number'
  ) {
    const parsed = new Date(
      value.seconds * 1000 + Math.floor(value.nanoseconds / 1_000_000)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function getField<T = unknown>(
  data: UnknownRecord,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    if (key in data) {
      return data[key] as T;
    }
  }
  return undefined;
}

function getNestedDate(data: UnknownRecord, path: string[]): Date | null {
  let current: unknown = data;
  for (const segment of path) {
    if (!isObject(current) || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }
  return toDate(current);
}

function isClosedFinding(data: UnknownRecord): boolean {
  const status = normalizeString(getField(data, 'status', 'estado'));
  return status === 'cerrado' || status === 'closed' || status === 'completado';
}

function isPendingAction(data: UnknownRecord): boolean {
  const status = normalizeString(getField(data, 'status', 'estado'));
  return [
    'pending',
    'pendiente',
    'in_progress',
    'en_progreso',
    'planificada',
    'ejecutada',
    'en_control',
  ].includes(status);
}

function isCompletedAction(data: UnknownRecord): boolean {
  const status = normalizeString(getField(data, 'status', 'estado'));
  return ['completada', 'completed', 'cancelada', 'cancelled'].includes(status);
}

function isPlannedAudit(data: UnknownRecord): boolean {
  const status = normalizeString(getField(data, 'status', 'estado'));
  return status === 'planificada' || status === 'planned';
}

function isPendingTraining(data: UnknownRecord): boolean {
  const completed = getField(data, 'completada');
  if (typeof completed === 'boolean') {
    return completed === false;
  }

  const status = normalizeString(getField(data, 'status', 'estado'));
  return !['completada', 'completed', 'cancelada', 'cancelled'].includes(
    status
  );
}

function getActionDueDate(data: UnknownRecord): Date | null {
  return (
    toDate(getField(data, 'fecha_vencimiento', 'fecha_objetivo', 'plannedExecutionDate')) ||
    getNestedDate(data, ['planning', 'plannedDate']) ||
    getNestedDate(data, ['controlPlanning', 'plannedDate'])
  );
}

function getTrainingDueDate(data: UnknownRecord): Date | null {
  return toDate(getField(data, 'fecha_vencimiento', 'fecha_fin', 'fechaFin'));
}

function getDaysSince(date: Date | null): number | null {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  return diffMs < 0 ? 0 : Math.floor(diffMs / 86_400_000);
}

function getDisplayUserName(email: string): string {
  const base = email.split('@')[0]?.trim();
  return base && base.length > 0 ? base : 'Usuario';
}

async function safeValue<T>(factory: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await factory();
  } catch {
    return fallback;
  }
}

async function collectTenantDocs(
  orgId: string,
  options: {
    subcollections?: string[];
    topLevel?: string[];
  }
): Promise<Array<QueryDocumentSnapshot<DocumentData>>> {
  const db = getAdminFirestore();
  const orgRef = db.collection('organizations').doc(orgId);
  const merged = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  const tasks: Array<Promise<void>> = [];

  for (const name of options.subcollections ?? []) {
    tasks.push(
      orgRef
        .collection(name)
        .get()
        .then(snapshot => {
          snapshot.docs.forEach(doc => {
            merged.set(`${name}:${doc.id}`, doc);
          });
        })
    );
  }

  for (const name of options.topLevel ?? []) {
    tasks.push(
      db
        .collection(name)
        .where('organization_id', '==', orgId)
        .get()
        .then(snapshot => {
          snapshot.docs.forEach(doc => {
            merged.set(`${name}:${doc.id}`, doc);
          });
        })
    );
  }

  await Promise.all(tasks);
  return [...merged.values()];
}

type PhaseCandidate = {
  phaseId: number;
  porcentaje: number;
  status: string;
};

function normalizeJourneyCandidates(
  data: UnknownRecord | undefined
): PhaseCandidate[] {
  const raw =
    (Array.isArray(data?.fases) ? data?.fases : undefined) ||
    (Array.isArray(data?.progress) ? data?.progress : undefined) ||
    [];

  return raw
    .filter((item): item is UnknownRecord => isObject(item))
    .map(item => ({
      phaseId: Number(item.phaseId),
      porcentaje:
        typeof item.porcentaje === 'number'
          ? Math.max(0, Math.min(100, item.porcentaje))
          : 0,
      status: normalizeString(item.status),
    }))
    .filter(item => Number.isFinite(item.phaseId));
}

function resolveJourneySnapshot(
  journeyDoc: DocumentSnapshot<DocumentData> | null
): Pick<OperationalSnapshot, 'faseActual' | 'porcentajeFaseActual'> {
  const data =
    journeyDoc?.exists && typeof journeyDoc.data === 'function'
      ? (journeyDoc.data() as UnknownRecord)
      : undefined;
  const phases = normalizeJourneyCandidates(data);
  const unlocked = phases.filter(phase => phase.status !== 'locked');

  const best = unlocked.sort((a, b) => {
    if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje;
    return a.phaseId - b.phaseId;
  })[0];

  if (best) {
    return {
      faseActual: best.phaseId,
      porcentajeFaseActual: best.porcentaje,
    };
  }

  const fallbackPhase =
    typeof data?.faseActual === 'number' && Number.isFinite(data.faseActual)
      ? data.faseActual
      : 1;

  return {
    faseActual: fallbackPhase,
    porcentajeFaseActual: 0,
  };
}

async function getOrganizationInfo(
  orgId: string
): Promise<{ nombreOrg: string }> {
  const db = getAdminFirestore();
  const orgDoc = await db.collection('organizations').doc(orgId).get();
  const data = (orgDoc.exists ? orgDoc.data() : null) as UnknownRecord | null;

  return {
    nombreOrg:
      (typeof data?.organization_name === 'string' && data.organization_name) ||
      (typeof data?.nombre === 'string' && data.nombre) ||
      (typeof data?.name === 'string' && data.name) ||
      orgId,
  };
}

export const GET = withAuth(async (_request, _context, auth) => {
  const orgScope = await resolveAuthorizedOrganizationId(auth, undefined, {
    requireOrg: true,
  });

  if (!orgScope.ok || !orgScope.organizationId) {
    const apiError = toOrganizationApiError(orgScope);
    return NextResponse.json(
      { error: apiError.error, errorCode: apiError.errorCode },
      { status: apiError.status }
    );
  }

  const orgId = orgScope.organizationId;
  const db = getAdminFirestore();
  const now = new Date();

  const [
    hallazgosAbiertos,
    accionesPendientes,
    accionesVencidas,
    auditoriasPlaneadas,
    capacitacionesPendientes,
    directActionsPendientes,
    diasSinAnalisisEstrategico,
    journeySnapshot,
    organizationInfo,
  ] = await Promise.all([
    safeValue(async () => {
      const docs = await collectTenantDocs(orgId, {
        subcollections: ['hallazgos'],
        topLevel: ['hallazgos', 'findings'],
      });
      return docs.filter(doc => {
        const data = doc.data() as UnknownRecord;
        return data.isActive !== false && !isClosedFinding(data);
      }).length;
    }, 0),
    safeValue(async () => {
      const docs = await collectTenantDocs(orgId, {
        subcollections: ['acciones'],
        topLevel: ['acciones', 'actions'],
      });
      return docs.filter(doc => {
        const data = doc.data() as UnknownRecord;
        return data.isActive !== false && isPendingAction(data);
      }).length;
    }, 0),
    safeValue(async () => {
      const docs = await collectTenantDocs(orgId, {
        subcollections: ['acciones'],
        topLevel: ['acciones', 'actions'],
      });
      return docs.filter(doc => {
        const data = doc.data() as UnknownRecord;
        const dueDate = getActionDueDate(data);
        return (
          data.isActive !== false &&
          !isCompletedAction(data) &&
          !!dueDate &&
          dueDate < now
        );
      }).length;
    }, 0),
    safeValue(async () => {
      const docs = await collectTenantDocs(orgId, {
        subcollections: ['auditorias'],
        topLevel: ['auditorias'],
      });
      return docs.filter(doc => isPlannedAudit(doc.data() as UnknownRecord))
        .length;
    }, 0),
    safeValue(async () => {
      const docs = await collectTenantDocs(orgId, {
        subcollections: ['capacitaciones'],
        topLevel: ['capacitaciones', 'trainings'],
      });
      return docs.filter(doc => {
        const data = doc.data() as UnknownRecord;
        const dueDate = getTrainingDueDate(data);
        return isPendingTraining(data) && !!dueDate && dueDate < now;
      }).length;
    }, 0),
    safeValue(async () => {
      const snapshot = await db
        .collection('direct_action_confirmations')
        .where('organization_id', '==', orgId)
        .where('status', '==', 'pending')
        .get();
      return snapshot.size;
    }, 0),
    safeValue(async () => {
      const snapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('strategic_analysis_reports')
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const latest = snapshot.docs[0].data() as UnknownRecord;
      return getDaysSince(toDate(latest.created_at));
    }, null as number | null),
    safeValue(async () => {
      const journeyDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('journey')
        .doc('progress')
        .get();
      return resolveJourneySnapshot(journeyDoc);
    }, { faseActual: 1, porcentajeFaseActual: 0 }),
    safeValue(() => getOrganizationInfo(orgId), { nombreOrg: orgId }),
  ]);

  const snapshot: OperationalSnapshot = {
    hallazgosAbiertos,
    accionesPendientes,
    accionesVencidas,
    auditoriasPlaneadas,
    capacitacionesPendientes,
    directActionsPendientes,
    diasSinAnalisisEstrategico,
    faseActual: journeySnapshot.faseActual,
    porcentajeFaseActual: journeySnapshot.porcentajeFaseActual,
    nombreOrg: organizationInfo.nombreOrg,
    nombreUsuario: getDisplayUserName(auth.user.email || auth.email),
  };

  return NextResponse.json({ snapshot });
});
