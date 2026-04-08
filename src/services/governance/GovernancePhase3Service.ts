import { getAdminFirestore } from '@/lib/firebase/admin';

type FirestoreDateLike = {
  toDate?: () => Date;
  _seconds?: number;
};

export interface ControlCatalogItem {
  id?: string;
  organization_id: string;
  control_code: string;
  control_name: string;
  objective: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'event';
  owner: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expected_evidence: string[];
  status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

export interface GovernanceOperationalMetrics {
  generated_at: string;
  organization_id: string;
  sla_days_for_findings: number;
  audits: {
    total: number;
    open: number;
    overdue_open: number;
  };
  findings: {
    total: number;
    open: number;
    overdue_sla: number;
  };
  actions: {
    total: number;
    open: number;
    overdue: number;
  };
  exceptions_open: number;
  alerts: Array<{
    code: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    count: number;
  }>;
}

export interface AuditEvidencePackage {
  package_version: string;
  generated_at: string;
  organization_id: string;
  audit: Record<string, unknown>;
  findings: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  evidence_references: Record<string, unknown>[];
  audit_log: Record<string, unknown>[];
  summary: {
    findings_count: number;
    actions_count: number;
    evidence_files_count: number;
    open_findings_count: number;
    open_actions_count: number;
  };
}

type SerializedEntity = Record<string, unknown> & { id: string };

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null) {
    const maybe = value as FirestoreDateLike;
    if (typeof maybe.toDate === 'function') return maybe.toDate();
    if (typeof maybe._seconds === 'number')
      return new Date(maybe._seconds * 1000);
  }
  return null;
}

function serializeRecord(
  input: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const dt = toDate(value);
    out[key] = dt ? dt.toISOString() : value;
  }
  return out;
}

export class GovernancePhase3Service {
  static async getOrCreateControlCatalog(
    organizationId: string
  ): Promise<ControlCatalogItem[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('control_catalog')
      .where('organization_id', '==', organizationId)
      .orderBy('control_code', 'asc')
      .get();

    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ControlCatalogItem, 'id'>),
      }));
    }

    const seed: ControlCatalogItem[] = [
      {
        organization_id: organizationId,
        control_code: 'CTRL-AUD-001',
        control_name: 'Cierre de auditoria con evidencia completa',
        objective:
          'Evitar cierres sin trazabilidad de puntos de norma y acciones',
        frequency: 'event',
        owner: 'calidad',
        severity: 'critical',
        expected_evidence: [
          'informe_final_auditor',
          'norm_points_verification',
          'registro_cierre',
        ],
        status: 'active',
      },
      {
        organization_id: organizationId,
        control_code: 'CTRL-FND-002',
        control_name: 'SLA de cierre de hallazgos',
        objective: 'Controlar hallazgos abiertos fuera de plazo',
        frequency: 'weekly',
        owner: 'compliance',
        severity: 'high',
        expected_evidence: ['hallazgos_abiertos', 'tiempo_promedio_cierre'],
        status: 'active',
      },
      {
        organization_id: organizationId,
        control_code: 'CTRL-ACT-003',
        control_name: 'Eficacia de acciones correctivas',
        objective: 'Verificar acciones completadas y efectivas',
        frequency: 'monthly',
        owner: 'proceso',
        severity: 'high',
        expected_evidence: ['control_execution', 'resultado_verificacion'],
        status: 'active',
      },
    ];

    const now = new Date();
    const batch = db.batch();
    const refs = seed.map(item => db.collection('control_catalog').doc());
    refs.forEach((ref, index) => {
      batch.set(ref, {
        ...seed[index],
        created_at: now,
        updated_at: now,
      });
    });
    await batch.commit();

    return seed.map((item, index) => ({ ...item, id: refs[index].id }));
  }

  static async upsertControlCatalogItem(
    organizationId: string,
    payload: Omit<
      ControlCatalogItem,
      'id' | 'organization_id' | 'created_at' | 'updated_at'
    > & {
      id?: string;
    }
  ): Promise<ControlCatalogItem> {
    const db = getAdminFirestore();
    const now = new Date();

    if (payload.id) {
      const ref = db.collection('control_catalog').doc(payload.id);
      await ref.update({
        ...payload,
        organization_id: organizationId,
        updated_at: now,
      });
      const updated = await ref.get();
      return {
        id: updated.id,
        ...(updated.data() as Omit<ControlCatalogItem, 'id'>),
      };
    }

    const ref = await db.collection('control_catalog').add({
      ...payload,
      organization_id: organizationId,
      created_at: now,
      updated_at: now,
    });
    const created = await ref.get();
    return {
      id: created.id,
      ...(created.data() as Omit<ControlCatalogItem, 'id'>),
    };
  }

  static async generateOperationalMetrics(
    organizationId: string,
    slaDaysForFindings: number
  ): Promise<GovernanceOperationalMetrics> {
    const db = getAdminFirestore();
    const now = new Date();
    const slaLimit = new Date(now);
    slaLimit.setDate(slaLimit.getDate() - slaDaysForFindings);

    const [auditsSnap, findingsSnap, actionsSnap] = await Promise.all([
      db
        .collection('audits')
        .where('organization_id', '==', organizationId)
        .get(),
      db
        .collection('findings')
        .where('organization_id', '==', organizationId)
        .get(),
      db
        .collection('actions')
        .where('organization_id', '==', organizationId)
        .get(),
    ]);

    const audits = auditsSnap.docs
      .map(doc => doc.data() as Record<string, unknown>)
      .filter(a => a.isActive !== false);
    const findings = findingsSnap.docs
      .map(doc => doc.data() as Record<string, unknown>)
      .filter(f => f.isActive !== false);
    const actions = actionsSnap.docs
      .map(doc => doc.data() as Record<string, unknown>)
      .filter(a => a.isActive !== false);

    const openAudits = audits.filter(a => a.status !== 'completed');
    const overdueOpenAudits = openAudits.filter(a => {
      const planned = toDate(a.plannedDate);
      return planned ? planned < now : false;
    });

    const openFindings = findings.filter(f => f.status !== 'cerrado');
    const findingsOverdue = openFindings.filter(f => {
      const created = toDate(f.createdAt);
      return created ? created < slaLimit : false;
    });

    const openActions = actions.filter(a => {
      const status = a.status;
      return status !== 'completada' && status !== 'cancelada';
    });

    const overdueActions = openActions.filter(a => {
      const planning = a.planning as Record<string, unknown> | null;
      if (!planning) return false;
      const plannedDate = toDate(planning.plannedDate);
      return plannedDate ? plannedDate < now : false;
    });

    const alerts: GovernanceOperationalMetrics['alerts'] = [];
    if (overdueOpenAudits.length > 0) {
      alerts.push({
        code: 'AUDIT_OVERDUE',
        severity: 'high',
        message: 'Auditorias abiertas fuera de fecha planificada',
        count: overdueOpenAudits.length,
      });
    }
    if (findingsOverdue.length > 0) {
      alerts.push({
        code: 'FINDING_SLA_BREACH',
        severity: 'critical',
        message: 'Hallazgos abiertos fuera del SLA de cierre',
        count: findingsOverdue.length,
      });
    }
    if (overdueActions.length > 0) {
      alerts.push({
        code: 'ACTION_OVERDUE',
        severity: 'high',
        message: 'Acciones vencidas sin completar',
        count: overdueActions.length,
      });
    }

    const metrics: GovernanceOperationalMetrics = {
      generated_at: now.toISOString(),
      organization_id: organizationId,
      sla_days_for_findings: slaDaysForFindings,
      audits: {
        total: audits.length,
        open: openAudits.length,
        overdue_open: overdueOpenAudits.length,
      },
      findings: {
        total: findings.length,
        open: openFindings.length,
        overdue_sla: findingsOverdue.length,
      },
      actions: {
        total: actions.length,
        open: openActions.length,
        overdue: overdueActions.length,
      },
      exceptions_open: alerts.reduce((acc, curr) => acc + curr.count, 0),
      alerts,
    };

    await db.collection('governance_metrics_snapshots').add({
      ...metrics,
      generated_at: now,
    });

    return metrics;
  }

  static async generateAuditEvidencePackage(
    organizationId: string,
    auditId: string
  ): Promise<AuditEvidencePackage> {
    const db = getAdminFirestore();
    const auditDoc = await db.collection('audits').doc(auditId).get();
    if (!auditDoc.exists) {
      throw new Error('Auditoria no encontrada');
    }

    const auditData = auditDoc.data() as Record<string, unknown>;
    if (auditData.organization_id !== organizationId) {
      throw new Error('Acceso denegado por organizacion');
    }

    const findingsSnap = await db
      .collection('findings')
      .where('organization_id', '==', organizationId)
      .where('registration.sourceType', '==', 'auditoria')
      .where('registration.sourceId', '==', auditId)
      .get();
    const findings: SerializedEntity[] = findingsSnap.docs.map(doc => ({
      id: doc.id,
      ...serializeRecord(doc.data() as Record<string, unknown>),
    }));

    const findingIds = new Set(findings.map(f => String(f.id)));
    const actionsSnap = await db
      .collection('actions')
      .where('organization_id', '==', organizationId)
      .get();
    const actions: SerializedEntity[] = actionsSnap.docs
      .map(
        doc =>
          ({
            id: doc.id,
            ...serializeRecord(doc.data() as Record<string, unknown>),
          }) as SerializedEntity
      )
      .filter((action: SerializedEntity) => {
        const sourceType = String(action.sourceType || '');
        const sourceIsAudit =
          sourceType === 'auditoria' &&
          String(action.sourceName || '').includes(auditId);
        const linkedFinding = action.findingId
          ? findingIds.has(String(action.findingId))
          : false;
        return sourceIsAudit || linkedFinding;
      });

    const auditRefsSnap = await db
      .collection('document_references')
      .where('source_module', '==', 'audits')
      .where('linked_record_id', '==', auditId)
      .get();
    const evidenceRefs: SerializedEntity[] = auditRefsSnap.docs.map(doc => ({
      id: doc.id,
      ...serializeRecord(doc.data() as Record<string, unknown>),
    }));

    const logSnap = await db
      .collection('audit_logs')
      .where('organization_id', '==', organizationId)
      .where('resource_type', '==', 'audit')
      .where('resource_id', '==', auditId)
      .limit(200)
      .get();
    const logs: SerializedEntity[] = logSnap.docs.map(doc => ({
      id: doc.id,
      ...serializeRecord(doc.data() as Record<string, unknown>),
    }));

    const pkg: AuditEvidencePackage = {
      package_version: '1.0.0',
      generated_at: new Date().toISOString(),
      organization_id: organizationId,
      audit: {
        id: auditDoc.id,
        ...serializeRecord(auditData),
      },
      findings,
      actions,
      evidence_references: evidenceRefs,
      audit_log: logs,
      summary: {
        findings_count: findings.length,
        actions_count: actions.length,
        evidence_files_count: evidenceRefs.length,
        open_findings_count: findings.filter(f => f.status !== 'cerrado')
          .length,
        open_actions_count: actions.filter(
          a => a.status !== 'completada' && a.status !== 'cancelada'
        ).length,
      },
    };

    await db.collection('evidence_packages').add({
      ...pkg,
      generated_at: new Date(),
      audit_id: auditId,
    });

    return pkg;
  }
}
