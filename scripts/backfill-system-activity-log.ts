/**
 * Backfill script - System Activity Log (Plan 92)
 *
 * Reads historical records from:
 * - audit_logs
 * - direct_action_audit_logs
 * - organizations/{orgId}/capability_audit_log
 * - acc_audit_log
 * - organizations/{orgId}/terminal_action_log
 *
 * Usage:
 *   npx tsx scripts/backfill-system-activity-log.ts --dry-run
 *   npx tsx scripts/backfill-system-activity-log.ts --org <orgId> --limit 200
 */

import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import * as process from 'process';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ORG_FILTER = (() => {
  const index = args.indexOf('--org');
  return index >= 0 ? args[index + 1] : null;
})();
const LIMIT = (() => {
  const index = args.indexOf('--limit');
  return index >= 0 ? Number(args[index + 1]) || 500 : 500;
})();
const MIGRATION_BATCH_ID = `system-activity-log-${new Date().toISOString()}`;

type FirestoreData = Record<string, unknown>;
type ActivityStatus =
  | 'pending'
  | 'success'
  | 'failure'
  | 'blocked'
  | 'denied'
  | 'cancelled';
type ActivitySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
type ActivityActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'ai_action_requested'
  | 'ai_action_confirmed'
  | 'ai_action_rejected'
  | 'ai_action_executed'
  | 'ai_action_failed'
  | 'terminal_tool_executed'
  | 'terminal_tool_blocked'
  | 'capability_installed'
  | 'capability_enabled'
  | 'capability_disabled'
  | 'capability_uninstalled'
  | 'security_login'
  | 'security_logout'
  | 'security_access_denied'
  | 'security_permission_changed';
type ActivityChannel =
  | 'web'
  | 'api'
  | 'automation'
  | 'ai'
  | 'terminal'
  | 'capability'
  | 'integration'
  | 'security';
type ActivityActorType =
  | 'user'
  | 'system'
  | 'ai_agent'
  | 'terminal'
  | 'integration';

interface SystemActivityPayload {
  organization_id: string;
  occurred_at: admin.firestore.Timestamp;
  recorded_at: admin.firestore.Timestamp;
  actor_type: ActivityActorType;
  actor_user_id: string | null;
  actor_display_name: string | null;
  actor_role: string | null;
  actor_department_id: string | null;
  actor_department_name: string | null;
  source_module: string;
  source_submodule: string | null;
  channel: ActivityChannel;
  entity_type: string;
  entity_id: string | null;
  entity_code: string | null;
  action_type: ActivityActionType;
  action_label: string;
  description: string;
  status: ActivityStatus;
  severity: ActivitySeverity;
  related_entities: Array<Record<string, unknown>>;
  evidence_refs: Array<Record<string, unknown>>;
  correlation_id: string | null;
  metadata: Record<string, unknown>;
}

const userOrgCache = new Map<string, string | null>();

console.log('=== Backfill System Activity Log ===');
console.log(`Dry run: ${DRY_RUN}`);
console.log(`Org filter: ${ORG_FILTER ?? 'all'}`);
console.log(`Limit per source: ${LIMIT}`);
console.log(`Migration batch: ${MIGRATION_BATCH_ID}`);
console.log('');

function safeDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function getOrgIdFromParent(
  doc: admin.firestore.QueryDocumentSnapshot
): string | null {
  return doc.ref.parent.parent?.id ?? null;
}

async function resolveUserOrganizationId(userId: string | null): Promise<string | null> {
  if (!userId) {
    return null;
  }

  if (userOrgCache.has(userId)) {
    return userOrgCache.get(userId) ?? null;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  const organizationId = userDoc.exists
    ? asString(userDoc.data()?.organization_id)
    : null;

  userOrgCache.set(userId, organizationId);
  return organizationId;
}

function buildBackfillDocId(
  source: string,
  organizationId: string,
  originalLogId: string
): string {
  return createHash('sha1')
    .update(`${source}:${organizationId}:${originalLogId}`)
    .digest('hex');
}

function buildBackfillMetadata(
  source: string,
  originalLogId: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    backfill: true,
    migration_source: source,
    migration_batch_id: MIGRATION_BATCH_ID,
    original_log_id: originalLogId,
    ...extra,
  };
}

async function writeEntry(
  source: string,
  organizationId: string,
  originalLogId: string,
  payload: SystemActivityPayload
): Promise<'written' | 'skipped'> {
  const docId = buildBackfillDocId(source, organizationId, originalLogId);

  if (DRY_RUN) {
    console.log(`[DRY RUN] ${source}/${originalLogId} -> ${docId}`);
    console.log(
      JSON.stringify(
        {
          id: docId,
          ...payload,
        },
        null,
        2
      )
    );
    return 'written';
  }

  const ref = db.collection('system_activity_log').doc(docId);
  const existing = await ref.get();

  if (existing.exists) {
    return 'skipped';
  }

  await ref.set(payload);
  return 'written';
}

function mapAuditAction(action: string): ActivityActionType {
  switch (action) {
    case 'login':
      return 'security_login';
    case 'logout':
      return 'security_logout';
    case 'access_denied':
      return 'security_access_denied';
    case 'permission_change':
      return 'security_permission_changed';
    case 'export':
      return 'read';
    case 'import':
      return 'update';
    case 'create':
    case 'read':
    case 'update':
    case 'delete':
      return action;
    default:
      return 'update';
  }
}

function mapAuditChannel(action: string): ActivityChannel {
  switch (action) {
    case 'login':
    case 'logout':
    case 'access_denied':
    case 'permission_change':
      return 'security';
    default:
      return 'api';
  }
}

function mapAuditSeverity(status: string): ActivitySeverity {
  switch (status) {
    case 'failure':
      return 'high';
    case 'denied':
      return 'medium';
    default:
      return 'info';
  }
}

function mapDirectAction(status: string): {
  action_type: ActivityActionType;
  status: ActivityStatus;
  severity: ActivitySeverity;
} {
  switch (status) {
    case 'pending':
      return {
        action_type: 'ai_action_requested',
        status: 'pending',
        severity: 'info',
      };
    case 'confirmed':
      return {
        action_type: 'ai_action_confirmed',
        status: 'success',
        severity: 'info',
      };
    case 'cancelled':
      return {
        action_type: 'ai_action_rejected',
        status: 'cancelled',
        severity: 'medium',
      };
    case 'executed':
      return {
        action_type: 'ai_action_executed',
        status: 'success',
        severity: 'low',
      };
    case 'failed':
      return {
        action_type: 'ai_action_failed',
        status: 'failure',
        severity: 'high',
      };
    default:
      return {
        action_type: 'ai_action_requested',
        status: 'pending',
        severity: 'info',
      };
  }
}

function mapCapabilityAction(action: string): ActivityActionType {
  switch (action) {
    case 'installed':
      return 'capability_installed';
    case 'enabled':
      return 'capability_enabled';
    case 'disabled':
      return 'capability_disabled';
    case 'uninstalled':
      return 'capability_uninstalled';
    case 'export_requested':
    case 'export_generated':
      return 'read';
    default:
      return 'update';
  }
}

function mapCapabilityStatus(action: string): ActivityStatus {
  return action === 'restore_conflict' ? 'failure' : 'success';
}

function mapCapabilitySeverity(action: string): ActivitySeverity {
  switch (action) {
    case 'disabled':
      return 'medium';
    case 'restore_conflict':
      return 'high';
    default:
      return 'info';
  }
}

function mapAccountingAction(action: string): ActivityActionType {
  switch (action) {
    case 'entry_created':
      return 'create';
    case 'entry_cancelled':
      return 'delete';
    default:
      return 'update';
  }
}

function mapAccountingEntityType(entityType: string | null): string {
  switch (entityType) {
    case 'entry':
      return 'journal_entry';
    case 'event':
      return 'accounting_event';
    case 'plugin_config':
      return 'accounting_plugin_config';
    default:
      return entityType ?? 'accounting_event';
  }
}

async function backfillAuditLogs(): Promise<number> {
  console.log('--- Backfilling audit_logs ---');

  let query: admin.firestore.Query = db
    .collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(LIMIT);

  if (ORG_FILTER) {
    query = query.where('organization_id', '==', ORG_FILTER);
  }

  const snapshot = await query.get();
  let written = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const organizationId = asString(data.organization_id);

    if (!organizationId) {
      continue;
    }

    const occurredAt = safeDate(data.timestamp);
    const status = (asString(data.status) ?? 'success') as ActivityStatus;
    const action = asString(data.action) ?? 'update';

    const result = await writeEntry('audit_logs', organizationId, doc.id, {
      organization_id: organizationId,
      occurred_at: admin.firestore.Timestamp.fromDate(occurredAt),
      recorded_at: admin.firestore.Timestamp.fromDate(new Date()),
      actor_type: 'user',
      actor_user_id: asString(data.user_id),
      actor_display_name: asString(data.user_email),
      actor_role: asString(data.user_role),
      actor_department_id: null,
      actor_department_name: null,
      source_module: asString(data.module) ?? 'audit',
      source_submodule: 'audit_logs',
      channel: mapAuditChannel(action),
      entity_type: asString(data.resource_type) ?? 'resource',
      entity_id: asString(data.resource_id),
      entity_code: asString(data.resource_name),
      action_type: mapAuditAction(action),
      action_label: toTitleCase(action),
      description:
        asString(data.resource_name) ??
        `${toTitleCase(action)} sobre ${asString(data.resource_type) ?? 'resource'}`,
      status,
      severity: mapAuditSeverity(status),
      related_entities: [],
      evidence_refs: [],
      correlation_id: null,
      metadata: buildBackfillMetadata('audit_logs', doc.id, {
        details:
          data.details && typeof data.details === 'object'
            ? data.details
            : null,
        ip_address: asString(data.ip_address),
        user_agent: asString(data.user_agent),
      }),
    });

    if (result === 'written') {
      written++;
    }
  }

  console.log(`  Processed ${snapshot.size} records. Wrote ${written}.`);
  return written;
}

async function backfillDirectActionAuditLogs(): Promise<number> {
  console.log('--- Backfilling direct_action_audit_logs ---');

  const snapshot = await db
    .collection('direct_action_audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(LIMIT)
    .get();

  let written = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userId = asString(data.userId);
    const organizationId = await resolveUserOrganizationId(userId);

    if (!organizationId || (ORG_FILTER && organizationId !== ORG_FILTER)) {
      continue;
    }

    const mapped = mapDirectAction(asString(data.status) ?? 'pending');
    const entity = asString(data.entity) ?? 'unknown';
    const entityId = asString(data.entityId);
    const actionId = asString(data.actionId);
    const request =
      data.request && typeof data.request === 'object'
        ? (data.request as FirestoreData)
        : {};

    const result = await writeEntry(
      'direct_action_audit_logs',
      organizationId,
      doc.id,
      {
        organization_id: organizationId,
        occurred_at: admin.firestore.Timestamp.fromDate(safeDate(data.timestamp)),
        recorded_at: admin.firestore.Timestamp.fromDate(new Date()),
        actor_type: 'user',
        actor_user_id: userId,
        actor_display_name: null,
        actor_role: null,
        actor_department_id: null,
        actor_department_name: null,
        source_module: 'direct_actions',
        source_submodule: asString(data.type)?.toLowerCase() ?? null,
        channel: 'ai',
        entity_type: entity,
        entity_id: entityId,
        entity_code: entityId,
        action_type: mapped.action_type,
        action_label: toTitleCase(mapped.action_type),
        description:
          asString(data.summary) ??
          `Direct action ${mapped.action_type} sobre ${entity}`,
        status: mapped.status,
        severity: mapped.severity,
        related_entities: actionId
          ? [
              {
                entity_type: 'direct_action_confirmation',
                entity_id: actionId,
                relation: 'approval_request',
              },
            ]
          : [],
        evidence_refs: actionId
          ? [
              {
                type: 'direct_action_confirmation',
                id: actionId,
                label: asString(data.summary),
              },
            ]
          : [],
        correlation_id: actionId,
        metadata: buildBackfillMetadata('direct_action_audit_logs', doc.id, {
          request,
          result:
            data.result && typeof data.result === 'object'
              ? data.result
              : null,
          error: asString(data.error),
        }),
      }
    );

    if (result === 'written') {
      written++;
    }
  }

  console.log(`  Processed ${snapshot.size} records. Wrote ${written}.`);
  return written;
}

async function backfillCapabilityAuditLogs(): Promise<number> {
  console.log('--- Backfilling capability_audit_log ---');

  const snapshot = await db
    .collectionGroup('capability_audit_log')
    .orderBy('performed_at', 'desc')
    .limit(LIMIT)
    .get();

  let written = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const organizationId = getOrgIdFromParent(doc);

    if (!organizationId || (ORG_FILTER && organizationId !== ORG_FILTER)) {
      continue;
    }

    const action = asString(data.action) ?? 'settings_changed';

    const result = await writeEntry('capability_audit_log', organizationId, doc.id, {
      organization_id: organizationId,
      occurred_at: admin.firestore.Timestamp.fromDate(safeDate(data.performed_at)),
      recorded_at: admin.firestore.Timestamp.fromDate(new Date()),
      actor_type: 'user',
      actor_user_id: asString(data.performed_by),
      actor_display_name: null,
      actor_role: null,
      actor_department_id: null,
      actor_department_name: null,
      source_module: 'capabilities',
      source_submodule:
        asString((data.details as FirestoreData | undefined)?.system_id) ?? null,
      channel: 'capability',
      entity_type: 'capability',
      entity_id: asString(data.capability_id),
      entity_code: asString(data.capability_id),
      action_type: mapCapabilityAction(action),
      action_label: toTitleCase(action),
      description: `${toTitleCase(action)} capability ${asString(data.capability_id) ?? ''}`.trim(),
      status: mapCapabilityStatus(action),
      severity: mapCapabilitySeverity(action),
      related_entities: [],
      evidence_refs: [],
      correlation_id: null,
      metadata: buildBackfillMetadata('capability_audit_log', doc.id, {
        details:
          data.details && typeof data.details === 'object'
            ? data.details
            : null,
        previous_state:
          data.previous_state && typeof data.previous_state === 'object'
            ? data.previous_state
            : null,
      }),
    });

    if (result === 'written') {
      written++;
    }
  }

  console.log(`  Processed ${snapshot.size} records. Wrote ${written}.`);
  return written;
}

async function backfillAccountingAuditLogs(): Promise<number> {
  console.log('--- Backfilling acc_audit_log ---');

  let query: admin.firestore.Query = db
    .collection('acc_audit_log')
    .orderBy('performed_at', 'desc')
    .limit(LIMIT);

  if (ORG_FILTER) {
    query = query.where('organization_id', '==', ORG_FILTER);
  }

  const snapshot = await query.get();
  let written = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const organizationId = asString(data.organization_id);

    if (!organizationId) {
      continue;
    }

    const action = asString(data.action) ?? 'update';
    const entityType = asString(data.entity_type);

    const result = await writeEntry('acc_audit_log', organizationId, doc.id, {
      organization_id: organizationId,
      occurred_at: admin.firestore.Timestamp.fromDate(safeDate(data.performed_at)),
      recorded_at: admin.firestore.Timestamp.fromDate(new Date()),
      actor_type: asString(data.performed_by) ? 'user' : 'system',
      actor_user_id: asString(data.performed_by),
      actor_display_name: null,
      actor_role: null,
      actor_department_id: null,
      actor_department_name: null,
      source_module: 'accounting',
      source_submodule: entityType,
      channel: 'api',
      entity_type: mapAccountingEntityType(entityType),
      entity_id: asString(data.entity_id),
      entity_code: null,
      action_type: mapAccountingAction(action),
      action_label: toTitleCase(action),
      description: `Backfill contable: ${action}`,
      status: 'success',
      severity: action === 'entry_cancelled' ? 'medium' : 'info',
      related_entities: [],
      evidence_refs: [],
      correlation_id: asString(data.trace_id),
      metadata: buildBackfillMetadata('acc_audit_log', doc.id, {
        details:
          data.details && typeof data.details === 'object'
            ? data.details
            : null,
        previous_state:
          data.previous_state && typeof data.previous_state === 'object'
            ? data.previous_state
            : null,
        next_state:
          data.next_state && typeof data.next_state === 'object'
            ? data.next_state
            : null,
      }),
    });

    if (result === 'written') {
      written++;
    }
  }

  console.log(`  Processed ${snapshot.size} records. Wrote ${written}.`);
  return written;
}

async function backfillTerminalActionLogs(): Promise<number> {
  console.log('--- Backfilling organizations/*/terminal_action_log ---');

  const snapshot = await db
    .collectionGroup('terminal_action_log')
    .orderBy('timestamp', 'desc')
    .limit(LIMIT)
    .get();

  let written = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const organizationId = getOrgIdFromParent(doc);

    if (!organizationId || (ORG_FILTER && organizationId !== ORG_FILTER)) {
      continue;
    }

    const resultValue = asString(data.result) ?? 'success';
    const isBlocked = resultValue === 'blocked' || resultValue === 'denied';
    const status: ActivityStatus =
      resultValue === 'error'
        ? 'failure'
        : isBlocked
          ? 'denied'
          : 'success';

    const tool = asString(data.tool) ?? 'terminal_action';
    const procesoId = asString(data.proceso_id);

    const result = await writeEntry(
      'terminal_action_log',
      organizationId,
      doc.id,
      {
        organization_id: organizationId,
        occurred_at: admin.firestore.Timestamp.fromDate(safeDate(data.timestamp)),
        recorded_at: admin.firestore.Timestamp.fromDate(new Date()),
        actor_type: 'terminal',
        actor_user_id: asString(data.terminal_id),
        actor_display_name: null,
        actor_role: null,
        actor_department_id: asString(data.departamento_id),
        actor_department_name: null,
        source_module: 'terminales',
        source_submodule: 'agent_action_log',
        channel: 'terminal',
        entity_type: 'terminal_action',
        entity_id: doc.id,
        entity_code: procesoId,
        action_type: isBlocked ? 'terminal_tool_blocked' : 'terminal_tool_executed',
        action_label: tool,
        description: procesoId
          ? `Terminal ejecuta ${tool} sobre proceso ${procesoId}`
          : `Terminal ejecuta ${tool}`,
        status,
        severity:
          resultValue === 'error'
            ? 'medium'
            : isBlocked
              ? 'low'
              : 'info',
        related_entities: [
          ...(asString(data.terminal_id)
            ? [
                {
                  entity_type: 'terminal',
                  entity_id: asString(data.terminal_id),
                  relation: 'origin',
                },
              ]
            : []),
          ...(procesoId
            ? [
                {
                  entity_type: 'process',
                  entity_id: procesoId,
                  relation: 'target',
                },
              ]
            : []),
        ],
        evidence_refs: [],
        correlation_id: null,
        metadata: buildBackfillMetadata('terminal_action_log', doc.id, {
          personnel_id: asString(data.personnel_id),
          puesto_id: asString(data.puesto_id),
          params:
            data.params && typeof data.params === 'object'
              ? data.params
              : null,
          duration_ms:
            typeof data.duration_ms === 'number' ? data.duration_ms : null,
          block_reason: asString(data.block_reason),
        }),
      }
    );

    if (result === 'written') {
      written++;
    }
  }

  console.log(`  Processed ${snapshot.size} records. Wrote ${written}.`);
  return written;
}

async function main(): Promise<void> {
  let totalWritten = 0;

  totalWritten += await backfillAuditLogs();
  totalWritten += await backfillDirectActionAuditLogs();
  totalWritten += await backfillCapabilityAuditLogs();
  totalWritten += await backfillAccountingAuditLogs();
  totalWritten += await backfillTerminalActionLogs();

  console.log('');
  console.log(`Backfill completed. Total writes: ${totalWritten}`);
}

void main().catch(error => {
  console.error('Backfill failed:', error);
  process.exitCode = 1;
});
