// Ola 1+3 — Context Builder para el Centro de Inteligencia Gerencial
// Consolida datos del tenant desde el core ISO 9001 y plugins activos.
// Ola 3: plugin readers condicionales (crm, accounting, hse, sgsi, audit19011)

import { getAdminFirestore } from '@/lib/firebase/admin';
import { GovernancePhase3Service } from '@/services/governance/GovernancePhase3Service';
import { readAccountingContext } from '@/services/strategic-analysis/pluginReaders/accountingReader';
import { readAudit19011Context } from '@/services/strategic-analysis/pluginReaders/audit19011Reader';
import { readCrmContext } from '@/services/strategic-analysis/pluginReaders/crmReader';
import { readHseContext } from '@/services/strategic-analysis/pluginReaders/hseReader';
import { readSgsiContext } from '@/services/strategic-analysis/pluginReaders/sgsiReader';
import type {
  StrategicAnalysisContext,
  StrategicAnalysisScope,
} from '@/types/strategic-analysis';

interface BuildContextOptions {
  organizationId: string;
  userId: string;
  userRole: string;
  scope: StrategicAnalysisScope;
  targetId?: string;
  targetType?: 'organization' | 'process' | 'role' | 'person';
  includePlugins?: boolean;
}

export class StrategicAnalysisContextBuilder {
  static async build(opts: BuildContextOptions): Promise<StrategicAnalysisContext> {
    const { organizationId, userId, userRole, scope, targetId, targetType } = opts;
    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const sourceRefs: StrategicAnalysisContext['sourceRefs'] = [];

    // --- 1. Datos de la organización ---
    let orgName: string | undefined;
    let orgEdition: string | undefined;
    let orgSector: string | undefined;
    let orgEmployeeCount: number | undefined;
    let installedPlugins: string[] = [];

    try {
      const orgDoc = await db.collection('organizations').doc(organizationId).get();
      if (orgDoc.exists) {
        const d = orgDoc.data() ?? {};
        orgName = d.name ?? d.razon_social ?? undefined;
        orgEdition = d.edition ?? undefined;
        orgSector = d.sector ?? undefined;
        orgEmployeeCount = typeof d.employee_count === 'number' ? d.employee_count : undefined;
        const caps: unknown = d.capabilities ?? d.installedPlugins ?? d.installed_plugins ?? [];
        installedPlugins = Array.isArray(caps) ? (caps as string[]) : [];
      }
      sourceRefs.push({ source: 'organizations', collection: 'organizations', count: 1 });
    } catch {
      // Non-blocking — continúa con datos vacíos
    }

    // --- 2. Métricas operativas (auditorías / hallazgos / acciones) ---
    let evidenceSummary: StrategicAnalysisContext['evidenceSummary'] = {};
    let operationalMetrics: Record<string, unknown> = {};

    try {
      const metrics = await GovernancePhase3Service.generateOperationalMetrics(
        organizationId,
        30
      );
      evidenceSummary = {
        auditsOpen: metrics.audits.open,
        auditsTotal: metrics.audits.total,
        auditsOverdue: metrics.audits.overdue_open,
        findingsOpen: metrics.findings.open,
        findingsOverdueSla: metrics.findings.overdue_sla,
        actionsOpen: metrics.actions.open,
        actionsOverdue: metrics.actions.overdue,
      };
      operationalMetrics = {
        audits: metrics.audits,
        findings: metrics.findings,
        actions: metrics.actions,
        exceptions_open: metrics.exceptions_open,
        alerts: metrics.alerts,
      };
      sourceRefs.push({ source: 'governance_metrics', collection: 'audits/findings/actions' });
    } catch {
      // Non-blocking
    }

    // --- 3. Procesos ---
    let processesTotal = 0;

    try {
      const processesSnap = await db
        .collection('processDefinitions')
        .where('organization_id', '==', organizationId)
        .limit(30)
        .get();
      processesTotal = processesSnap.size;
      evidenceSummary.processesTotal = processesTotal;
      sourceRefs.push({ source: 'processDefinitions', collection: 'processDefinitions', count: processesTotal });
    } catch {
      // Non-blocking
    }

    // --- 4. Objetivos e indicadores ---
    let objectivesTotal = 0;
    let indicatorsTotal = 0;

    try {
      const [objSnap, indSnap] = await Promise.all([
        db.collection('objetivos_calidad').where('organization_id', '==', organizationId).limit(20).get(),
        db.collection('indicadores_calidad').where('organization_id', '==', organizationId).limit(20).get(),
      ]);
      objectivesTotal = objSnap.size;
      indicatorsTotal = indSnap.size;
      evidenceSummary.objectivesTotal = objectivesTotal;
      evidenceSummary.indicatorsTotal = indicatorsTotal;
      sourceRefs.push(
        { source: 'objetivos_calidad', collection: 'objetivos_calidad', count: objectivesTotal },
        { source: 'indicadores_calidad', collection: 'indicadores_calidad', count: indicatorsTotal }
      );
    } catch {
      // Non-blocking
    }

    // --- 5. Contexto específico por scope ---
    let processContext: StrategicAnalysisContext['processContext'];

    if (scope === 'process' && targetId) {
      try {
        const procDoc = await db.collection('processDefinitions').doc(targetId).get();
        if (procDoc.exists) {
          const p = procDoc.data() ?? {};

          // Hallazgos y acciones vinculados al proceso
          const [findingsSnap, actionsSnap] = await Promise.all([
            db.collection('findings')
              .where('organization_id', '==', organizationId)
              .where('process_id', '==', targetId)
              .where('status', '!=', 'closed')
              .limit(20)
              .get()
              .catch(() => null),
            db.collection('actions')
              .where('organization_id', '==', organizationId)
              .where('process_id', '==', targetId)
              .where('estado', '==', 'open')
              .limit(20)
              .get()
              .catch(() => null),
          ]);

          const now = new Date();
          const overdueActions = actionsSnap?.docs.filter(d => {
            const due = d.data().due_date;
            if (!due) return false;
            const dueDate = due?.toDate ? due.toDate() : new Date(due);
            return dueDate < now;
          }).length ?? 0;

          processContext = {
            processId: targetId,
            processName: p.nombre ?? p.name ?? undefined,
            processCode: p.codigo ?? p.code ?? undefined,
            ownerId: p.responsable_id ?? p.owner_id ?? undefined,
            ownerName: p.responsable_nombre ?? undefined,
            openFindings: findingsSnap?.size ?? 0,
            openActions: actionsSnap?.size ?? 0,
            overdueActions,
          };
        }
      } catch {
        // Non-blocking
      }
    }

    // --- 6. Compliance — intentar cargar scoring de cumplimiento normativo ---
    // Busca en la colección compliance_scores del tenant; si no existe, queda null
    // (no undefined) para que ConfidenceService lo detecte como fuente ausente.
    let compliance: StrategicAnalysisContext['compliance'] | null = null;

    try {
      const complianceSnap = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('compliance_scores')
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (!complianceSnap.empty) {
        const d = complianceSnap.docs[0].data();
        compliance = {
          globalPercentage:
            typeof d.global_percentage === 'number' ? d.global_percentage : undefined,
          mandatoryPending:
            typeof d.mandatory_pending === 'number' ? d.mandatory_pending : undefined,
          highPriorityPending:
            typeof d.high_priority_pending === 'number'
              ? d.high_priority_pending
              : undefined,
        };
        sourceRefs.push({ source: 'compliance_scores', collection: 'compliance_scores', count: 1 });
      }
      // Si no hay documentos → compliance permanece null (fuente ausente)
    } catch {
      // Non-blocking — no hay datos de compliance disponibles
    }

    // --- 7. Maturity — intentar cargar scoring de madurez del SGC ---
    // Busca en la colección maturity_scores del tenant; si no existe, queda null.
    let maturity: StrategicAnalysisContext['maturity'] | null = null;

    try {
      const maturitySnap = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('maturity_scores')
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (!maturitySnap.empty) {
        const d = maturitySnap.docs[0].data();
        maturity = {
          globalScore:
            typeof d.global_score === 'number' ? d.global_score : undefined,
          byDimension: Array.isArray(d.by_dimension) ? d.by_dimension : undefined,
        };
        sourceRefs.push({ source: 'maturity_scores', collection: 'maturity_scores', count: 1 });
      }
      // Si no hay documentos → maturity permanece null (fuente ausente)
    } catch {
      // Non-blocking — no hay datos de madurez disponibles
    }

    return {
      organizationId,
      generatedAt: now,
      generatedForUserId: userId,
      generatedForRole: userRole,
      analysisScope: scope,
      targetEntity: targetId
        ? {
            type: targetType ?? 'organization',
            id: targetId,
          }
        : undefined,
      installedPlugins,
      organization: {
        name: orgName,
        edition: orgEdition,
        sector: orgSector,
        employeeCount: orgEmployeeCount,
      },
      // null = consultado pero sin datos disponibles; undefined = no consultado
      compliance: compliance ?? undefined,
      maturity: maturity ?? undefined,
      executiveIndicators: {
        processesTotal,
        objectivesTotal,
        indicatorsTotal,
      },
      operationalMetrics,
      processContext,
      roleContext: undefined,   // Ola futura
      personContext: undefined, // Ola futura
      pluginContexts: await buildPluginContexts(organizationId, installedPlugins),
      evidenceSummary,
      sourceRefs,
    };
  }
}

// ---------------------------------------------------------------------------
// Ola 3 — Plugin readers condicionales
// ---------------------------------------------------------------------------

async function buildPluginContexts(
  orgId: string,
  installedPlugins: string[]
): Promise<StrategicAnalysisContext['pluginContexts']> {
  const has = (id: string) =>
    installedPlugins.some(p => p === id || p.startsWith(id));

  const readers: Array<Promise<void>> = [];
  const contexts: StrategicAnalysisContext['pluginContexts'] = {};

  if (has('crm')) {
    readers.push(
      readCrmContext(orgId).then(r => {
        contexts['crm'] = r as unknown as Record<string, unknown>;
      }).catch(() => undefined)
    );
  }

  if (has('contabilidad_central')) {
    readers.push(
      readAccountingContext(orgId).then(r => {
        contexts['accounting'] = r as unknown as Record<string, unknown>;
      }).catch(() => undefined)
    );
  }

  if (has('pack_hse') || has('iso_environment_14001') || has('iso_sst_45001')) {
    readers.push(
      readHseContext(orgId).then(r => {
        contexts['hse'] = r as unknown as Record<string, unknown>;
      }).catch(() => undefined)
    );
  }

  if (has('iso_sgsi_27001')) {
    readers.push(
      readSgsiContext(orgId).then(r => {
        contexts['sgsi'] = r as unknown as Record<string, unknown>;
      }).catch(() => undefined)
    );
  }

  if (has('iso_audit_19011')) {
    readers.push(
      readAudit19011Context(orgId).then(r => {
        contexts['audit_program'] = r as unknown as Record<string, unknown>;
      }).catch(() => undefined)
    );
  }

  await Promise.allSettled(readers);
  return contexts;
}
