import { contabilidadCentralManifest } from '@/config/plugins/contabilidad_central.manifest';
import type { AuthContext } from '@/lib/api/withAuth';
import { getAccountsByCodes } from '@/lib/accounting/repositories/accounts';
import {
  findEntryByIdempotencyKey,
  getPeriodByCode,
  writeEntryBundle,
} from '@/lib/accounting/repositories/entries';
import {
  resolvePeriod,
  validateAccountPosting,
  validateBalancedLines,
  validateEventCurrency,
  validatePeriodOpen,
} from '@/lib/accounting/validators';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  AccountingCurrency,
  AccountingEntry,
  AccountingEntryLine,
  AccountingEvent,
  AccountingLineSide,
} from '@/types/accounting';
import { z } from 'zod';

const ACCOUNTING_PLUGIN_ID = 'contabilidad_central';

export const accountingEventSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().min(1).optional(),
  idempotency_key: z.string().min(1),
  plugin_id: z.string().min(1),
  operation_type: z.string().min(1),
  fecha: z.string().min(10),
  periodo: z.string().min(7).optional(),
  moneda: z.enum(['ARS', 'USD']),
  tipo_cambio: z.number().positive().optional(),
  importe_total: z.number().nonnegative(),
  importe_capital: z.number().nonnegative().optional(),
  importe_interes: z.number().nonnegative().optional(),
  importe_iva: z.number().nonnegative().optional(),
  importe_otro: z.number().nonnegative().optional(),
  documento_tipo: z.string().min(1).optional(),
  documento_id: z.string().min(1),
  tercero_id: z.string().min(1).optional(),
  descripcion: z.string().min(1).optional(),
  dimensiones: z
    .object({
      centro_costo: z.string().min(1).optional(),
      unidad_negocio: z.string().min(1).optional(),
      sucursal: z.string().min(1).optional(),
      actividad: z.string().min(1).optional(),
    })
    .optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  occurred_at: z.string().optional(),
  created_at: z.string().optional(),
  created_by: z.string().min(1).optional(),
});

const manualLineSchema = z.object({
  cuenta_codigo: z.string().min(1),
  lado: z.enum(['debe', 'haber']),
  importe: z.number().positive(),
  tercero_id: z.string().min(1).optional(),
  centro_costo: z.string().min(1).optional(),
  unidad_negocio: z.string().min(1).optional(),
  sucursal: z.string().min(1).optional(),
  actividad: z.string().min(1).optional(),
  moneda: z.enum(['ARS', 'USD']).optional(),
  tipo_cambio: z.number().positive().optional(),
  descripcion: z.string().min(1).optional(),
  referencia: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const manualEntrySchema = z.object({
  fecha: z.string().min(10),
  periodo: z.string().min(7).optional(),
  moneda: z.enum(['ARS', 'USD']),
  tipo_cambio: z.number().positive().optional(),
  origen: z.string().min(1).default('manual'),
  plugin_id: z.string().min(1).default(ACCOUNTING_PLUGIN_ID),
  documento_tipo: z.string().min(1).optional(),
  documento_id: z.string().min(1).optional(),
  descripcion: z.string().min(1),
  tercero_id: z.string().min(1).optional(),
  external_reference: z.string().min(1).optional(),
  idempotency_key: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  lines: z.array(manualLineSchema).min(2),
});

type ManualEntryInput = z.infer<typeof manualEntrySchema>;

function nowIso(): string {
  return new Date().toISOString();
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function hasAccountingScope(
  auth: AuthContext,
  scope: 'accounting:emit' | 'accounting:write' | 'accounting:admin'
): boolean {
  if (auth.role === 'super_admin') {
    return true;
  }

  if (auth.permissions.includes(scope)) {
    return true;
  }

  if (scope === 'accounting:admin') {
    return auth.role === 'admin';
  }

  return ['admin', 'gerente', 'jefe'].includes(auth.role);
}

export async function getAccountingSettings(organizationId: string) {
  const db = getAdminFirestore();
  const doc = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('installed_plugins')
    .doc(ACCOUNTING_PLUGIN_ID)
    .get();

  const installedSettings =
    doc.exists &&
    doc.data()?.settings_effective &&
    typeof doc.data()?.settings_effective === 'object'
      ? (doc.data()?.settings_effective as Record<string, unknown>)
      : {};

  return {
    ...contabilidadCentralManifest.tenant_settings.defaults,
    ...installedSettings,
  };
}

export async function buildManualEntryPayload(params: {
  organizationId: string;
  input: ManualEntryInput;
  createdBy: string;
  requireApproval: boolean;
}) {
  validateEventCurrency(params.input.moneda);

  const period = params.input.periodo || resolvePeriod(params.input.fecha);
  const periodDoc = await getPeriodByCode(params.organizationId, period);
  validatePeriodOpen(periodDoc);

  const accountCodes = params.input.lines.map(line => line.cuenta_codigo);
  const accountsByCode = await getAccountsByCodes(
    params.organizationId,
    accountCodes
  );

  const pseudoEvent = {
    organization_id: params.organizationId,
    moneda: params.input.moneda,
  } as AccountingEvent;

  const draftEntryId =
    params.input.documento_id ||
    params.input.idempotency_key ||
    `manual:${Date.now()}`;

  const lines: AccountingEntryLine[] = params.input.lines.map((line, index) => {
    const account = accountsByCode.get(line.cuenta_codigo);
    if (!account) {
      throw new Error(`No existe la cuenta ${line.cuenta_codigo}`);
    }

    validateAccountPosting(account, pseudoEvent);

    return {
      id: `${draftEntryId}:line:${index + 1}`,
      organization_id: params.organizationId,
      entry_id: draftEntryId,
      cuenta_codigo: account.codigo,
      cuenta_nombre: account.nombre,
      lado: line.lado as AccountingLineSide,
      importe: round2(line.importe),
      tercero_id: line.tercero_id || params.input.tercero_id,
      centro_costo: line.centro_costo,
      unidad_negocio: line.unidad_negocio,
      sucursal: line.sucursal,
      actividad: line.actividad,
      moneda: (line.moneda || params.input.moneda) as AccountingCurrency,
      tipo_cambio: line.tipo_cambio || params.input.tipo_cambio,
      descripcion: line.descripcion,
      referencia: line.referencia || params.input.documento_id,
      metadata: line.metadata,
    };
  });

  const { totalDebe, totalHaber } = validateBalancedLines(lines);
  const timestamp = nowIso();
  const status = params.requireApproval ? 'draft' : 'posted';

  const entry: Omit<AccountingEntry, 'id'> = {
    organization_id: params.organizationId,
    fecha: params.input.fecha,
    periodo: period,
    origen: params.input.origen,
    plugin_id: params.input.plugin_id,
    documento_tipo: params.input.documento_tipo,
    documento_id:
      params.input.documento_id ||
      params.input.idempotency_key ||
      `manual-${Date.now()}`,
    descripcion: params.input.descripcion,
    status,
    moneda: params.input.moneda,
    tipo_cambio: params.input.tipo_cambio,
    total_debe: totalDebe,
    total_haber: totalHaber,
    tercero_id: params.input.tercero_id,
    idempotency_key: params.input.idempotency_key,
    external_reference: params.input.external_reference,
    metadata: {
      ...(params.input.metadata || {}),
      source: 'manual_api',
      approval_required: params.requireApproval,
    },
    created_at: timestamp,
    updated_at: timestamp,
    created_by: params.createdBy,
    posted_at: params.requireApproval ? undefined : timestamp,
  };

  return {
    entry,
    lines: lines.map(line => {
      const { id: _id, ...rest } = line;
      return rest;
    }),
    auditLog: {
      organization_id: params.organizationId,
      action: 'entry_created' as const,
      entity_type: 'entry' as const,
      entity_id: draftEntryId,
      performed_by: params.createdBy,
      performed_at: timestamp,
      details: {
        source: 'manual_api',
      },
      previous_state: null,
      next_state: {
        status,
        total_debe: totalDebe,
        total_haber: totalHaber,
      },
      trace_id: params.input.idempotency_key,
    },
    status,
    total_debe: totalDebe,
    total_haber: totalHaber,
  };
}

export async function createManualEntry(params: {
  organizationId: string;
  input: ManualEntryInput;
  createdBy: string;
  requireApproval: boolean;
}) {
  if (params.input.idempotency_key) {
    const existing = await findEntryByIdempotencyKey(
      params.organizationId,
      params.input.idempotency_key
    );
    if (existing) {
      return {
        entry_id: existing.id,
        total_debe: existing.total_debe,
        total_haber: existing.total_haber,
        status: existing.status,
      };
    }
  }

  const payload = await buildManualEntryPayload(params);
  const result = await writeEntryBundle({
    entry: payload.entry,
    lines: payload.lines,
    auditLog: payload.auditLog,
  });

  return {
    ...result,
    status: payload.status,
  };
}
