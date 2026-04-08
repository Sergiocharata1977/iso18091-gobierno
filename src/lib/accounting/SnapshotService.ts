import { getAdminFirestore } from '@/lib/firebase/admin';
import { ACCOUNTING_PERIODS_COLLECTION } from '@/lib/accounting/periods';
import type { AccountingEntryLine, AccountingSnapshot } from '@/types/accounting';

const ENTRIES_COLLECTION = 'acc_entries';
const LINES_COLLECTION = 'acc_entry_lines';
const SNAPSHOTS_COLLECTION = 'acc_snapshots';
const BATCH_LIMIT = 400;
const IN_QUERY_BATCH = 30;

interface GenerateSnapshotParams {
  organizationId: string;
  periodo: string;
  generatedBy?: string;
}

interface GenerateMissingSnapshotsParams {
  organizationId?: string;
  generatedBy?: string;
  now?: Date;
  maxPeriods?: number;
}

interface PendingSnapshotPeriod {
  organizationId: string;
  periodo: string;
}

interface SnapshotAggregate {
  cuenta_codigo: string;
  moneda: AccountingSnapshot['moneda'];
  tercero_id?: string;
  centro_costo?: string;
  unidad_negocio?: string;
  sucursal?: string;
  actividad?: string;
  saldo_debe: number;
  saldo_haber: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeOptional(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function buildAggregateKey(line: AccountingEntryLine): string {
  return [
    line.cuenta_codigo,
    line.moneda,
    normalizeOptional(line.tercero_id) || '',
    normalizeOptional(line.centro_costo) || '',
    normalizeOptional(line.unidad_negocio) || '',
    normalizeOptional(line.sucursal) || '',
    normalizeOptional(line.actividad) || '',
  ].join('|');
}

async function getLinesByEntryIds(
  organizationId: string,
  entryIds: string[]
): Promise<AccountingEntryLine[]> {
  if (entryIds.length === 0) {
    return [];
  }

  const db = getAdminFirestore();
  const lines: AccountingEntryLine[] = [];

  for (let index = 0; index < entryIds.length; index += IN_QUERY_BATCH) {
    const batch = entryIds.slice(index, index + IN_QUERY_BATCH);
    const snapshot = await db
      .collection(LINES_COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('entry_id', 'in', batch)
      .get();

    lines.push(
      ...snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as AccountingEntryLine
      )
    );
  }

  return lines;
}

async function deleteExistingSnapshots(
  organizationId: string,
  periodo: string
): Promise<number> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(SNAPSHOTS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('periodo', '==', periodo)
    .get();

  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_LIMIT) {
    const batch = db.batch();
    const docs = snapshot.docs.slice(index, index + BATCH_LIMIT);

    docs.forEach(doc => {
      batch.delete(doc.ref);
      deleted += 1;
    });

    await batch.commit();
  }

  return deleted;
}

async function hasSnapshotForPeriod(
  organizationId: string,
  periodo: string
): Promise<boolean> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(SNAPSHOTS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('periodo', '==', periodo)
    .limit(1)
    .get();

  return !snapshot.empty;
}

function resolveCutoffDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

async function listPendingSnapshotPeriods(
  params: GenerateMissingSnapshotsParams
): Promise<PendingSnapshotPeriod[]> {
  const db = getAdminFirestore();
  let query:
    | FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
    | FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> = db.collection(
    ACCOUNTING_PERIODS_COLLECTION
  );

  if (params.organizationId) {
    query = query.where('organization_id', '==', params.organizationId);
  }

  const cutoffDate = resolveCutoffDate(params.now || new Date());
  const snapshot = await query.where('fecha_fin', '<', cutoffDate).get();
  const pending: PendingSnapshotPeriod[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const organizationId = String(data.organization_id || '').trim();
    const periodo = String(data.periodo || '').trim();

    if (!organizationId || !periodo) {
      continue;
    }

    const alreadyGenerated = await hasSnapshotForPeriod(organizationId, periodo);
    if (!alreadyGenerated) {
      pending.push({ organizationId, periodo });
    }
  }

  pending.sort((left, right) => {
    return (
      left.organizationId.localeCompare(right.organizationId) ||
      left.periodo.localeCompare(right.periodo)
    );
  });

  if (params.maxPeriods && params.maxPeriods > 0) {
    return pending.slice(0, params.maxPeriods);
  }

  return pending;
}

export const SnapshotService = {
  async generateForPeriod(params: GenerateSnapshotParams) {
    const db = getAdminFirestore();
    const entriesSnapshot = await db
      .collection(ENTRIES_COLLECTION)
      .where('organization_id', '==', params.organizationId)
      .where('periodo', '==', params.periodo)
      .where('status', '==', 'posted')
      .get();

    const entryIds = entriesSnapshot.docs.map(doc => doc.id);
    const lines = await getLinesByEntryIds(params.organizationId, entryIds);
    const aggregates = new Map<string, SnapshotAggregate>();

    for (const line of lines) {
      const key = buildAggregateKey(line);
      const current = aggregates.get(key) || {
        cuenta_codigo: line.cuenta_codigo,
        moneda: line.moneda,
        tercero_id: normalizeOptional(line.tercero_id),
        centro_costo: normalizeOptional(line.centro_costo),
        unidad_negocio: normalizeOptional(line.unidad_negocio),
        sucursal: normalizeOptional(line.sucursal),
        actividad: normalizeOptional(line.actividad),
        saldo_debe: 0,
        saldo_haber: 0,
      };

      if (line.lado === 'debe') {
        current.saldo_debe = round2(current.saldo_debe + Number(line.importe || 0));
      } else {
        current.saldo_haber = round2(
          current.saldo_haber + Number(line.importe || 0)
        );
      }

      aggregates.set(key, current);
    }

    const deleted = await deleteExistingSnapshots(
      params.organizationId,
      params.periodo
    );
    const generatedAt = new Date().toISOString();
    const records = [...aggregates.values()];

    for (let index = 0; index < records.length; index += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = records.slice(index, index + BATCH_LIMIT);

      chunk.forEach(item => {
        const ref = db.collection(SNAPSHOTS_COLLECTION).doc();
        batch.set(ref, {
          organization_id: params.organizationId,
          periodo: params.periodo,
          cuenta_codigo: item.cuenta_codigo,
          moneda: item.moneda,
          saldo_debe: round2(item.saldo_debe),
          saldo_haber: round2(item.saldo_haber),
          saldo_neto: round2(item.saldo_debe - item.saldo_haber),
          tercero_id: item.tercero_id,
          centro_costo: item.centro_costo,
          unidad_negocio: item.unidad_negocio,
          sucursal: item.sucursal,
          actividad: item.actividad,
          generated_at: generatedAt,
          generated_by: params.generatedBy,
          metadata: {
            entries_count: entryIds.length,
          },
        } satisfies Omit<AccountingSnapshot, 'id'>);
      });

      await batch.commit();
    }

    return {
      periodo: params.periodo,
      entries_count: entryIds.length,
      lines_count: lines.length,
      deleted_count: deleted,
      generated_count: records.length,
      generated_at: generatedAt,
    };
  },

  async hasSnapshotForPeriod(organizationId: string, periodo: string) {
    return hasSnapshotForPeriod(organizationId, periodo);
  },

  async generateMissingMonthlySnapshots(params: GenerateMissingSnapshotsParams = {}) {
    const periods = await listPendingSnapshotPeriods(params);
    const generated = [];

    for (const period of periods) {
      const result = await this.generateForPeriod({
        organizationId: period.organizationId,
        periodo: period.periodo,
        generatedBy: params.generatedBy,
      });

      generated.push({
        organization_id: period.organizationId,
        ...result,
      });
    }

    return {
      scanned_periods: periods.length,
      generated_count: generated.length,
      generated,
      processed_at: new Date().toISOString(),
    };
  },
};
