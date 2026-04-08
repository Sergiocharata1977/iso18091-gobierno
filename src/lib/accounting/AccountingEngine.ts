import {
  getAccountsByCodes,
} from '@/lib/accounting/repositories/accounts';
import {
  findPostedEntryByIdempotencyKey,
  getPeriodByCode,
  writeEntryBundle,
} from '@/lib/accounting/repositories/entries';
import { getActiveRuleByOperation } from '@/lib/accounting/repositories/rules';
import {
  resolvePeriod,
  validateAccountPosting,
  validateBalancedLines,
  validateEventCurrency,
  validatePeriodOpen,
} from '@/lib/accounting/validators';
import type {
  AccountingAccount,
  AccountingEntry,
  AccountingEntryLine,
  AccountingEvent,
  AccountingRuleLine,
} from '@/types/accounting';

interface FormulaContext {
  importe: number;
  importe_total: number;
  importe_capital: number;
  importe_interes: number;
  importe_iva: number;
  importe_otro: number;
  tipo_cambio: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function resolveBaseAmount(line: AccountingRuleLine, event: AccountingEvent): number {
  switch (line.amount_source) {
    case 'importe_total':
      return Number(event.importe_total || 0);
    case 'importe_capital':
      return Number(event.importe_capital || 0);
    case 'importe_interes':
      return Number(event.importe_interes || 0);
    case 'importe_iva':
      return Number(event.importe_iva || 0);
    case 'importe_otro':
      return Number(event.importe_otro || 0);
    case 'porcentaje':
      return Number(event.importe_total || 0);
    default:
      return 0;
  }
}

function evaluateFormula(
  formula: string | undefined,
  context: FormulaContext
): number {
  if (!formula) {
    return round2(context.importe);
  }

  const trimmed = formula.trim();
  if (!trimmed) {
    return round2(context.importe);
  }

  if (!/^[0-9a-zA-Z_+\-*/().\s]+$/.test(trimmed)) {
    throw new Error(`Formula invalida: ${trimmed}`);
  }

  const evaluator = new Function(
    'ctx',
    `const { importe, importe_total, importe_capital, importe_interes, importe_iva, importe_otro, tipo_cambio } = ctx; return (${trimmed});`
  ) as (ctx: FormulaContext) => number;

  const result = Number(evaluator(context));
  if (!Number.isFinite(result)) {
    throw new Error(`La formula no produjo un numero valido: ${trimmed}`);
  }

  return round2(result);
}

function resolveAccountCode(
  line: AccountingRuleLine,
  event: AccountingEvent
): string {
  if (line.cuenta_codigo) {
    return line.cuenta_codigo;
  }

  if (line.cuenta_semantica) {
    const semanticCode = event.payload?.[line.cuenta_semantica];
    if (typeof semanticCode === 'string' && semanticCode.trim()) {
      return semanticCode.trim();
    }
  }

  throw new Error(`La regla ${line.id} no resolvio una cuenta contable`);
}

function buildEntryLine(params: {
  event: AccountingEvent;
  entryId: string;
  account: AccountingAccount;
  ruleLine: AccountingRuleLine;
  importe: number;
  period: string;
}): AccountingEntryLine {
  return {
    id: `${params.entryId}:${params.ruleLine.id}`,
    organization_id: params.event.organization_id,
    entry_id: params.entryId,
    cuenta_codigo: params.account.codigo,
    cuenta_nombre: params.account.nombre,
    lado: params.ruleLine.lado,
    importe: params.importe,
    tercero_id:
      params.ruleLine.tercero_source === 'fijo'
        ? params.ruleLine.tercero_id
        : params.event.tercero_id,
    centro_costo:
      params.ruleLine.centro_costo || params.event.dimensiones?.centro_costo,
    unidad_negocio:
      params.ruleLine.unidad_negocio ||
      params.event.dimensiones?.unidad_negocio,
    sucursal: params.ruleLine.sucursal || params.event.dimensiones?.sucursal,
    actividad: params.ruleLine.actividad || params.event.dimensiones?.actividad,
    moneda: params.ruleLine.currency || params.event.moneda,
    tipo_cambio: params.event.tipo_cambio,
    descripcion:
      params.ruleLine.descripcion_template || params.event.descripcion,
    referencia: params.event.documento_id,
    metadata: {
      rule_line_id: params.ruleLine.id,
      event_id: params.event.id,
    },
  };
}

export const AccountingEngine = {
  async process(event: AccountingEvent) {
    if (!event.organization_id) {
      throw new Error('organization_id es requerido');
    }
    if (!event.idempotency_key?.trim()) {
      throw new Error('idempotency_key es requerido');
    }

    validateEventCurrency(event.moneda);

    const existing = await findPostedEntryByIdempotencyKey(
      event.organization_id,
      event.idempotency_key
    );
    if (existing) {
      return {
        entry_id: existing.id,
        total_debe: existing.total_debe,
        total_haber: existing.total_haber,
      };
    }

    const period = event.periodo || resolvePeriod(event.fecha);
    const periodDoc = await getPeriodByCode(event.organization_id, period);
    validatePeriodOpen(periodDoc);

    const rule = await getActiveRuleByOperation({
      organizationId: event.organization_id,
      pluginId: event.plugin_id,
      operationType: event.operation_type,
      fecha: event.fecha,
    });

    const accountCodes = rule.lines.map(line => resolveAccountCode(line, event));
    const accountsByCode = await getAccountsByCodes(
      event.organization_id,
      accountCodes
    );

    const entryId = [
      event.plugin_id,
      event.operation_type,
      event.documento_id,
      event.idempotency_key,
    ].join(':');

    const lines = rule.lines.map((ruleLine, index) => {
      const accountCode = accountCodes[index];
      const account = accountsByCode.get(accountCode);
      if (!account) {
        throw new Error(`No existe la cuenta ${accountCode}`);
      }

      validateAccountPosting(account, event);

      const baseAmount = resolveBaseAmount(ruleLine, event);
      const formulaContext: FormulaContext = {
        importe: baseAmount,
        importe_total: Number(event.importe_total || 0),
        importe_capital: Number(event.importe_capital || 0),
        importe_interes: Number(event.importe_interes || 0),
        importe_iva: Number(event.importe_iva || 0),
        importe_otro: Number(event.importe_otro || 0),
        tipo_cambio: Number(event.tipo_cambio || 1),
      };

      let amount = evaluateFormula(ruleLine.formula, formulaContext);
      if (ruleLine.amount_source === 'porcentaje') {
        amount = round2(baseAmount * Number(ruleLine.porcentaje || 0) / 100);
      }
      if (typeof ruleLine.importe_fijo === 'number') {
        amount = round2(ruleLine.importe_fijo);
      }

      return buildEntryLine({
        event,
        entryId,
        account,
        ruleLine,
        importe: amount,
        period,
      });
    });

    const { totalDebe, totalHaber } = validateBalancedLines(lines);
    const timestamp = nowIso();

    const entry: Omit<AccountingEntry, 'id'> = {
      organization_id: event.organization_id,
      fecha: event.fecha,
      periodo: period,
      origen: event.operation_type,
      plugin_id: event.plugin_id,
      documento_tipo: event.documento_tipo,
      documento_id: event.documento_id,
      descripcion:
        event.descripcion ||
        rule.nombre ||
        `${event.plugin_id}:${event.operation_type}`,
      status: 'posted',
      moneda: event.moneda,
      tipo_cambio: event.tipo_cambio,
      total_debe: totalDebe,
      total_haber: totalHaber,
      tercero_id: event.tercero_id,
      idempotency_key: event.idempotency_key,
      external_reference: event.id,
      metadata: {
        event_payload: event.payload || {},
        rule_id: rule.id,
        event_id: event.id,
      },
      created_at: timestamp,
      updated_at: timestamp,
      created_by: event.created_by,
      posted_at: timestamp,
    };

    const persistedLines = lines.map(line => ({
      ...line,
      entry_id: entryId,
    }));

    return writeEntryBundle({
      entry,
      lines: persistedLines,
      auditLog: {
        organization_id: event.organization_id,
        action: 'entry_created',
        entity_type: 'entry',
        entity_id: entryId,
        performed_by: event.created_by,
        performed_at: timestamp,
        details: {
          plugin_id: event.plugin_id,
          operation_type: event.operation_type,
          documento_id: event.documento_id,
        },
        previous_state: null,
        next_state: {
          status: 'posted',
          total_debe: totalDebe,
          total_haber: totalHaber,
        },
        trace_id: event.idempotency_key,
      },
    });
  },
};
