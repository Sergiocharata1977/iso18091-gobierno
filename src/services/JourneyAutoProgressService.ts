import type { PhaseProgress, PhaseStatus } from '@/features/journey/types/journey';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ISO_9001_PHASES } from '@/lib/iso/phases';
import { JourneyService } from '@/services/JourneyService';

const JOURNEY_DOC_ID = 'progress';
const REQUIRED_TASK_IDS_BY_PHASE = new Map(
  ISO_9001_PHASES.map(phase => [
    phase.id,
    new Set(phase.tareas.filter(task => task.esRequerida).map(task => task.id)),
  ])
);

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
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

function normalizePhaseStatus(value: unknown): PhaseStatus {
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

function normalizeExistingProgress(raw: unknown): PhaseProgress[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      phaseId: Number(item.phaseId),
      status: normalizePhaseStatus(item.status),
      porcentaje:
        typeof item.porcentaje === 'number'
          ? Math.max(0, Math.min(100, item.porcentaje))
          : 0,
      tareasCompletadas: Array.isArray(item.tareasCompletadas)
        ? item.tareasCompletadas.filter(
            (taskId): taskId is string => typeof taskId === 'string'
          )
        : [],
      fechaInicio: toDateValue(item.fechaInicio),
      fechaCompletado: toDateValue(item.fechaCompletado),
    }))
    .filter(item => Number.isFinite(item.phaseId));
}

function getManualTaskIds(progress: PhaseProgress[]): Map<number, Set<string>> {
  return new Map(
    progress.map(item => [
      item.phaseId,
      new Set(item.tareasCompletadas.filter(taskId => typeof taskId === 'string')),
    ])
  );
}

function includesAnyKeyword(value: unknown, keywords: string[]): boolean {
  const normalized = normalizeString(value);
  return keywords.some(keyword => normalized.includes(keyword));
}

function getKeywordCandidates(data: Record<string, unknown>): string[] {
  const keywords = Array.isArray(data.keywords)
    ? data.keywords.filter((item): item is string => typeof item === 'string')
    : [];

  return [
    data.type,
    data.category,
    data.title,
    data.nombre,
    data.description,
    data.descripcion,
    data.code,
    data.codigo,
    ...keywords,
  ]
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.toLowerCase());
}

function isApprovedStatus(value: unknown): boolean {
  return ['approved', 'aprobado'].includes(normalizeString(value));
}

function isCompletedStatus(value: unknown): boolean {
  return ['completed', 'completada', 'closed', 'cerrada', 'cerrado'].includes(
    normalizeString(value)
  );
}

function isQualityPolicyDocument(data: Record<string, unknown>): boolean {
  if (hasText(data.politica_calidad)) return true;

  return getKeywordCandidates(data).some(candidate =>
    [
      'politica',
      'política',
      'quality policy',
      'politica de calidad',
      'política de calidad',
    ].some(keyword => candidate.includes(keyword))
  );
}

function isProcedureDocument(data: Record<string, unknown>): boolean {
  return getKeywordCandidates(data).some(candidate =>
    ['procedimiento', 'instructivo', 'procedure', 'procedural'].some(keyword =>
      candidate.includes(keyword)
    )
  );
}

function hasProcessMapEvidence(data: Record<string, unknown>): boolean {
  return Boolean(
    data.flujograma ||
      data.flowchart ||
      data.flowchart_id ||
      data.flowchartId ||
      data.mapa_procesos ||
      data.mapaProcesos ||
      data.mapa_de_procesos ||
      data.diagram ||
      hasText(data.flujograma_url) ||
      hasText(data.flowchart_url) ||
      includesAnyKeyword(data.tipo, ['mapa', 'flujograma']) ||
      includesAnyKeyword(data.nombre, ['mapa de procesos', 'flujograma']) ||
      includesAnyKeyword(data.title, ['mapa de procesos', 'flujograma'])
  );
}

function isAnnualAuditProgram(data: Record<string, unknown>): boolean {
  return Boolean(
    data.programa_anual ||
      data.programaAnual ||
      data.es_programa_anual ||
      includesAnyKeyword(data.tipo, ['programa_19011', 'programa_anual', 'programa']) ||
      includesAnyKeyword(data.title, ['programa anual', 'audit program']) ||
      includesAnyKeyword(data.nombre, ['programa anual', 'audit program']) ||
      includesAnyKeyword(data.description, ['programa anual', 'audit program']) ||
      includesAnyKeyword(data.descripcion, ['programa anual', 'audit program'])
  );
}

function isCorrectiveAction(data: Record<string, unknown>): boolean {
  return Boolean(
    includesAnyKeyword(data.actionType, ['correctiva', 'corrective']) ||
      includesAnyKeyword(data.tipo, ['correctiva', 'corrective']) ||
      includesAnyKeyword(data.sourceType, ['hallazgo', 'finding']) ||
      hasText(data.findingId) ||
      hasText(data.finding_id)
  );
}

export class JourneyAutoProgressService {
  static async computeProgress(organizationId: string): Promise<PhaseProgress[]> {
    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    const db = getAdminFirestore();
    const orgRef = db.collection('organizations').doc(organizationId);

    const [
      organizationSnap,
      journeySnap,
      procesosSnap,
      procesosTopLevelSnap,
      processDefinitionsSnap,
      flujogramasSnap,
      documentsOrgSnap,
      documentsTopLevelSnap,
      auditOrgSnap,
      auditTopLevelSnap,
      auditProgramsSnap,
      hallazgosOrgSnap,
      hallazgosTopLevelSnap,
      accionesOrgSnap,
      accionesTopLevelSnap,
      personalOrgSnap,
      personalTopLevelSnap,
    ] = await Promise.all([
      orgRef.get(),
      orgRef.collection('journey').doc(JOURNEY_DOC_ID).get(),
      orgRef.collection('procesos').limit(50).get().catch(() => null),
      db
        .collection('procesos')
        .where('organization_id', '==', organizationId)
        .limit(50)
        .get()
        .catch(() => null),
      Promise.any([
        db
          .collection('processDefinitions')
          .where('organization_id', '==', organizationId)
          .limit(50)
          .get(),
        db
          .collection('process_definitions')
          .where('organization_id', '==', organizationId)
          .limit(50)
          .get(),
      ]).catch(() => null),
      db
        .collection('flujogramas')
        .where('organization_id', '==', organizationId)
        .where('isActive', '==', true)
        .limit(50)
        .get()
        .catch(() => null),
      orgRef
        .collection('documents')
        .where('status', 'in', ['approved', 'aprobado'])
        .limit(50)
        .get()
        .catch(() => null),
      db
        .collection('documents')
        .where('organization_id', '==', organizationId)
        .where('status', 'in', ['approved', 'aprobado'])
        .limit(50)
        .get()
        .catch(() => null),
      orgRef.collection('auditorias').limit(50).get().catch(() => null),
      db
        .collection('auditorias')
        .where('organization_id', '==', organizationId)
        .limit(50)
        .get()
        .catch(() => null),
      db
        .collection('audit_programs')
        .where('organization_id', '==', organizationId)
        .limit(20)
        .get()
        .catch(() => null),
      orgRef.collection('hallazgos').limit(50).get().catch(() => null),
      db
        .collection('hallazgos')
        .where('organization_id', '==', organizationId)
        .limit(50)
        .get()
        .catch(() => null),
      orgRef.collection('acciones').limit(50).get().catch(() => null),
      Promise.any([
        db
          .collection('acciones')
          .where('organization_id', '==', organizationId)
          .limit(50)
          .get(),
        db
          .collection('actions')
          .where('organization_id', '==', organizationId)
          .limit(50)
          .get(),
      ]).catch(() => null),
      orgRef.collection('personal').limit(50).get().catch(() => null),
      Promise.any([
        db
          .collection('personal')
          .where('organization_id', '==', organizationId)
          .limit(50)
          .get(),
        db
          .collection('personnel')
          .where('organization_id', '==', organizationId)
          .limit(50)
          .get(),
      ]).catch(() => null),
    ]);

    const organizationData = organizationSnap.exists ? organizationSnap.data() || {} : {};
    const rawExistingProgress =
      journeySnap.exists && journeySnap.data()
        ? journeySnap.data()?.fases || journeySnap.data()?.progress || []
        : [];
    const existingProgress = normalizeExistingProgress(rawExistingProgress);
    const manualTaskIdsByPhase = getManualTaskIds(existingProgress);
    const evidenceTaskIds = new Set<string>();

    if (hasText(organizationData.alcance_sgc)) {
      evidenceTaskIds.add('1.2');
    }

    if (hasText(organizationData.politica_calidad)) {
      evidenceTaskIds.add('2.1');
    }

    const processDocs = [
      ...(procesosSnap?.docs ?? []),
      ...(procesosTopLevelSnap?.docs ?? []),
      ...(processDefinitionsSnap?.docs ?? []),
    ].map(doc => doc.data() as Record<string, unknown>);

    if (processDocs.length > 0) {
      evidenceTaskIds.add('3.2');
    }

    if (processDocs.some(hasProcessMapEvidence)) {
      evidenceTaskIds.add('3.1');
    }

    if ((flujogramasSnap?.size ?? 0) > 0) {
      evidenceTaskIds.add('3.1');
    }

    const approvedDocuments = [
      ...(documentsOrgSnap?.docs ?? []),
      ...(documentsTopLevelSnap?.docs ?? []),
    ]
      .map(doc => doc.data() as Record<string, unknown>)
      .filter(doc => isApprovedStatus(doc.status));

    if (approvedDocuments.some(isQualityPolicyDocument)) {
      evidenceTaskIds.add('2.1');
    }

    if (approvedDocuments.some(isProcedureDocument)) {
      evidenceTaskIds.add('3.3');
    }

    const audits = [
      ...(auditOrgSnap?.docs ?? []),
      ...(auditTopLevelSnap?.docs ?? []),
    ].map(doc => doc.data() as Record<string, unknown>);

    if (audits.some(audit => isCompletedStatus(audit.estado ?? audit.status))) {
      evidenceTaskIds.add('5.3');
    }

    if (
      (auditProgramsSnap?.size ?? 0) > 0 ||
      audits.some(isAnnualAuditProgram)
    ) {
      evidenceTaskIds.add('5.2');
    }

    const findings = [
      ...(hallazgosOrgSnap?.docs ?? []),
      ...(hallazgosTopLevelSnap?.docs ?? []),
    ].map(doc => doc.data() as Record<string, unknown>);

    const actions = [
      ...(accionesOrgSnap?.docs ?? []),
      ...(accionesTopLevelSnap?.docs ?? []),
    ].map(doc => doc.data() as Record<string, unknown>);

    const correctiveActions = actions.filter(isCorrectiveAction);
    const hasCorrectiveActionCreated =
      correctiveActions.length > 0 ||
      findings.some(finding =>
        Boolean(
          finding.rootCauseAnalysis ||
            finding.immediateActionPlanning ||
            finding.immediateActionExecution ||
            finding.requiresAction
        )
      );

    if (hasCorrectiveActionCreated) {
      evidenceTaskIds.add('6.1');
    }

    if (
      correctiveActions.some(action =>
        isCompletedStatus(action.estado ?? action.status)
      )
    ) {
      evidenceTaskIds.add('6.2');
    }

    const totalPersonnel =
      (personalOrgSnap?.size ?? 0) + (personalTopLevelSnap?.size ?? 0);
    if (totalPersonnel > 0) {
      evidenceTaskIds.add('4.1');
    }

    const now = new Date();
    let previousPhasePercentage = 100;

    const phases = ISO_9001_PHASES.map((phase, index) => {
      const requiredTaskIds =
        REQUIRED_TASK_IDS_BY_PHASE.get(phase.id) || new Set<string>();
      const allKnownTaskIds = new Set(phase.tareas.map(task => task.id));
      const manualTaskIds = manualTaskIdsByPhase.get(phase.id) || new Set<string>();
      const completedTaskIds = new Set<string>();

      allKnownTaskIds.forEach(taskId => {
        if (evidenceTaskIds.has(taskId) || manualTaskIds.has(taskId)) {
          completedTaskIds.add(taskId);
        }
      });

      const completedRequiredCount = [...requiredTaskIds].filter(taskId =>
        completedTaskIds.has(taskId)
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

      const previous = existingProgress.find(item => item.phaseId === phase.id);
      const hasAnyProgress = completedTaskIds.size > 0;
      previousPhasePercentage = porcentaje;

      return {
        phaseId: phase.id,
        status,
        porcentaje,
        tareasCompletadas: [...completedTaskIds],
        fechaInicio: previous?.fechaInicio || (hasAnyProgress ? now : undefined),
        fechaCompletado:
          status === 'completed' ? previous?.fechaCompletado || now : undefined,
      } satisfies PhaseProgress;
    });

    await JourneyService.saveJourneyProgress(organizationId, phases);

    return phases;
  }
}
