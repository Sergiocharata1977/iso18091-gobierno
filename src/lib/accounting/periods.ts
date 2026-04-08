import type { AuthContext } from '@/lib/api/withAuth';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import type { AccountingAuditLog } from '@/types/accounting';
import type {
  SystemActivityActionType,
  SystemActivityActorType,
  SystemActivityChannel,
  SystemActivityRelatedEntity,
  SystemActivitySeverity,
} from '@/types/system-activity-log';

export const ACCOUNTING_PERIODS_COLLECTION = 'acc_periods';
export const ACCOUNTING_CLOSURES_COLLECTION = 'acc_closures';
export const ACCOUNTING_AUDIT_COLLECTION = 'acc_audit_log';
export const ACCOUNTING_ENTRIES_COLLECTION = 'acc_entries';

const ACCOUNTING_SOURCE_MODULE = 'accounting';

function mapAccountingEntityType(
  entityType: AccountingAuditLog['entity_type']
): string {
  switch (entityType) {
    case 'entry':
      return 'journal_entry';
    case 'event':
      return 'accounting_event';
    case 'plugin_config':
      return 'accounting_plugin_config';
    default:
      return entityType;
  }
}

function mapAccountingActionType(
  auditLog: Omit<AccountingAuditLog, 'id'>
): SystemActivityActionType {
  switch (auditLog.action) {
    case 'entry_created':
    case 'rule_created':
    case 'period_opened':
    case 'closure_started':
    case 'snapshot_generated':
      return auditLog.previous_state ? 'update' : 'create';
    default:
      return 'update';
  }
}

function mapAccountingSeverity(
  auditLog: Omit<AccountingAuditLog, 'id'>
): SystemActivitySeverity {
  switch (auditLog.action) {
    case 'entry_cancelled':
    case 'period_closed':
      return 'medium';
    default:
      return 'info';
  }
}

function buildAccountingActionLabel(
  auditLog: Omit<AccountingAuditLog, 'id'>
): string {
  switch (auditLog.action) {
    case 'entry_created':
      return 'Journal Entry Created';
    case 'entry_posted':
      return 'Journal Entry Posted';
    case 'entry_cancelled':
      return 'Journal Entry Cancelled';
    case 'period_opened':
      return auditLog.previous_state ? 'Accounting Period Reopened' : 'Accounting Period Opened';
    case 'period_closed':
      return 'Accounting Period Closed';
    case 'closure_started':
      return 'Accounting Closure Started';
    case 'closure_completed':
      return 'Accounting Closure Completed';
    case 'snapshot_generated':
      return 'Accounting Snapshot Generated';
    default:
      return `Accounting ${auditLog.action}`;
  }
}

function buildAccountingDescription(
  auditLog: Omit<AccountingAuditLog, 'id'>
): string {
  const details = auditLog.details || {};
  const periodo =
    typeof details.periodo === 'string' && details.periodo.trim()
      ? details.periodo
      : null;

  switch (auditLog.action) {
    case 'entry_created':
      return 'Se genero un asiento contable.';
    case 'entry_posted':
      return 'Se confirmo un asiento contable en borrador.';
    case 'entry_cancelled':
      return 'Se anulo un asiento contable.';
    case 'period_opened':
      return periodo
        ? `Se habilito el periodo contable ${periodo}.`
        : 'Se habilito un periodo contable.';
    case 'period_closed':
      return periodo
        ? `Se cerro el periodo contable ${periodo}.`
        : 'Se cerro un periodo contable.';
    case 'closure_started':
      return periodo
        ? `Se inicio el cierre del periodo ${periodo}.`
        : 'Se inicio un cierre contable.';
    case 'closure_completed':
      return periodo
        ? `Se completo el cierre del periodo ${periodo}.`
        : 'Se completo un cierre contable.';
    case 'snapshot_generated':
      return periodo
        ? `Se regenero el snapshot del periodo ${periodo}.`
        : 'Se genero un snapshot contable.';
    default:
      return `Se registro la accion contable ${auditLog.action}.`;
  }
}

function toFlatMetadata(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, candidate]) => {
      if (candidate === null) {
        return true;
      }

      const kind = typeof candidate;
      return kind === 'string' || kind === 'number' || kind === 'boolean';
    })
  );
}

function buildAccountingRelatedEntities(
  auditLog: Omit<AccountingAuditLog, 'id'>
): SystemActivityRelatedEntity[] {
  const details = auditLog.details || {};
  const relatedEntities: SystemActivityRelatedEntity[] = [];

  if (typeof details.plugin_id === 'string' && details.plugin_id.trim()) {
    relatedEntities.push({
      entity_type: 'plugin',
      entity_id: details.plugin_id,
      relation: 'origin',
    });
  }

  if (typeof details.closure_id === 'string' && details.closure_id.trim()) {
    relatedEntities.push({
      entity_type: 'closure',
      entity_id: details.closure_id,
      relation: 'parent_closure',
    });
  }

  if (typeof details.documento_id === 'string' && details.documento_id.trim()) {
    relatedEntities.push({
      entity_type: 'document',
      entity_id: details.documento_id,
      relation: 'source_document',
    });
  }

  return relatedEntities;
}

export async function mirrorAccountingAuditLogToSystemActivity(params: {
  auditLog: Omit<AccountingAuditLog, 'id'>;
  channel?: SystemActivityChannel;
  actorType?: SystemActivityActorType;
}): Promise<void> {
  const { auditLog } = params;
  const actorUserId = auditLog.performed_by ?? null;
  const actorType =
    params.actorType ?? (actorUserId ? 'user' : 'system');
  const metadata = {
    audit_action: auditLog.action,
    trace_id: auditLog.trace_id ?? null,
    previous_status:
      typeof auditLog.previous_state?.status === 'string'
        ? auditLog.previous_state.status
        : null,
    next_status:
      typeof auditLog.next_state?.status === 'string'
        ? auditLog.next_state.status
        : null,
    ...toFlatMetadata(auditLog.details),
    ...toFlatMetadata(auditLog.next_state),
  };

  try {
    await SystemActivityLogService.log({
      organization_id: auditLog.organization_id,
      occurred_at: new Date(auditLog.performed_at),
      source_module: ACCOUNTING_SOURCE_MODULE,
      source_submodule: auditLog.entity_type,
      channel:
        params.channel ??
        (typeof auditLog.details?.plugin_id === 'string' ? 'integration' : 'api'),
      entity_type: mapAccountingEntityType(auditLog.entity_type),
      entity_id: auditLog.entity_id,
      entity_code: null,
      action_type: mapAccountingActionType(auditLog),
      action_label: buildAccountingActionLabel(auditLog),
      description: buildAccountingDescription(auditLog),
      status: 'success',
      severity: mapAccountingSeverity(auditLog),
      related_entities: buildAccountingRelatedEntities(auditLog),
      evidence_refs: [],
      correlation_id: auditLog.trace_id ?? null,
      metadata,
      actor_type: actorType,
      actor_user_id: actorUserId,
      actor_display_name: null,
      actor_role: null,
      actor_department_id: null,
      actor_department_name: null,
    });
  } catch (error) {
    console.error(
      '[accounting] Error mirroring audit log to system activity log:',
      error
    );
  }
}

export function resolveScopedOrganizationId(
  requestedOrgId: string | undefined,
  auth: AuthContext
): string {
  return auth.role === 'super_admin'
    ? requestedOrgId || auth.organizationId
    : auth.organizationId;
}

export function resolvePeriodRange(periodo: string): {
  fecha_inicio: string;
  fecha_fin: string;
} {
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error('El periodo debe tener formato YYYY-MM');
  }

  const [year, month] = periodo.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    fecha_inicio: start.toISOString().slice(0, 10),
    fecha_fin: end.toISOString().slice(0, 10),
  };
}

export function serializeFirestoreDate(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
}
