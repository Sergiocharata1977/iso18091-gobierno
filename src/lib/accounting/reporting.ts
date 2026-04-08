import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  AccountingAccount,
  AccountingAccountNature,
  AccountingEntry,
  AccountingEntryLine,
  AccountingEntryStatus,
  AccountingSnapshot,
} from '@/types/accounting';

const ACCOUNTS_COLLECTION = 'acc_accounts';
const ENTRIES_COLLECTION = 'acc_entries';
const LINES_COLLECTION = 'acc_entry_lines';
const SNAPSHOTS_COLLECTION = 'acc_snapshots';
const IN_QUERY_BATCH = 30;

export interface ReportingFilters {
  organizationId: string;
  periodo?: string | null;
  desde?: string | null;
  hasta?: string | null;
  pluginId?: string | null;
  status?: AccountingEntryStatus | null;
  terceroId?: string | null;
}

export interface AccountingEntryWithLines extends AccountingEntry {
  lines: AccountingEntryLine[];
}

export interface BalanceTrialRow {
  account_id?: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  naturaleza: AccountingAccountNature;
  tipo: AccountingAccount['tipo'];
  total_debe: number;
  total_haber: number;
  saldo: number;
}

export interface BalanceTrialResult {
  rows: BalanceTrialRow[];
  source: 'snapshot' | 'lines';
  snapshot_periodo?: string;
}

export interface LedgerRow {
  line_id: string;
  entry_id: string;
  fecha: string;
  periodo: string;
  descripcion: string;
  plugin_id: string;
  status: AccountingEntryStatus;
  documento_tipo?: string;
  documento_id: string;
  tercero_id?: string;
  lado: AccountingEntryLine['lado'];
  importe: number;
  referencia?: string;
  line_description?: string;
}

export interface FinancialStatementSection {
  naturaleza: AccountingAccountNature;
  label: string;
  total: number;
  accounts: BalanceTrialRow[];
}

export function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isCreditNature(nature: AccountingAccountNature): boolean {
  return (
    nature === 'pasivo' ||
    nature === 'patrimonio_neto' ||
    nature === 'ingreso' ||
    nature === 'resultado_positivo'
  );
}

export function calculateAccountBalance(
  nature: AccountingAccountNature,
  totalDebe: number,
  totalHaber: number
): number {
  return roundAmount(
    isCreditNature(nature) ? totalHaber - totalDebe : totalDebe - totalHaber
  );
}

function isDateInRange(
  value: string,
  desde?: string | null,
  hasta?: string | null
): boolean {
  if (desde && value < desde) {
    return false;
  }

  if (hasta && value > hasta) {
    return false;
  }

  return true;
}

function matchesEntryFilters(
  entry: AccountingEntry,
  filters: ReportingFilters
): boolean {
  if (filters.periodo && entry.periodo !== filters.periodo) {
    return false;
  }

  if (filters.pluginId && entry.plugin_id !== filters.pluginId) {
    return false;
  }

  if (filters.status && entry.status !== filters.status) {
    return false;
  }

  if (filters.terceroId && entry.tercero_id !== filters.terceroId) {
    return false;
  }

  if (!isDateInRange(entry.fecha, filters.desde, filters.hasta)) {
    return false;
  }

  return true;
}

function sortEntriesDesc(left: AccountingEntry, right: AccountingEntry): number {
  return (
    right.fecha.localeCompare(left.fecha) ||
    (right.created_at || '').localeCompare(left.created_at || '') ||
    right.id.localeCompare(left.id)
  );
}

function sortLedgerAsc(left: LedgerRow, right: LedgerRow): number {
  return (
    left.fecha.localeCompare(right.fecha) ||
    left.entry_id.localeCompare(right.entry_id) ||
    left.line_id.localeCompare(right.line_id)
  );
}

export async function getAccountingAccounts(
  organizationId: string
): Promise<AccountingAccount[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(ACCOUNTS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .get();

  return snapshot.docs.map(
    doc =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as AccountingAccount
  );
}

export async function getAccountingAccountById(
  organizationId: string,
  accountId: string
): Promise<AccountingAccount | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(ACCOUNTS_COLLECTION).doc(accountId).get();

  if (!doc.exists) {
    return null;
  }

  const account = {
    id: doc.id,
    ...doc.data(),
  } as AccountingAccount;

  if (account.organization_id !== organizationId) {
    return null;
  }

  return account;
}

export async function getAccountingEntries(
  filters: ReportingFilters
): Promise<AccountingEntry[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(ENTRIES_COLLECTION)
    .where('organization_id', '==', filters.organizationId)
    .get();

  return snapshot.docs
    .map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as AccountingEntry
    )
    .filter(entry => matchesEntryFilters(entry, filters))
    .sort(sortEntriesDesc);
}

async function getAccountingLinesByEntryIds(
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

export async function getAccountingEntriesWithLines(
  filters: ReportingFilters
): Promise<AccountingEntryWithLines[]> {
  const entries = await getAccountingEntries(filters);
  const lines = await getAccountingLinesByEntryIds(
    filters.organizationId,
    entries.map(entry => entry.id)
  );
  const linesByEntryId = new Map<string, AccountingEntryLine[]>();

  for (const line of lines) {
    const current = linesByEntryId.get(line.entry_id) || [];
    current.push(line);
    linesByEntryId.set(line.entry_id, current);
  }

  return entries.map(entry => ({
    ...entry,
    lines: linesByEntryId.get(entry.id) || [],
  }));
}

async function getSnapshotsForPeriod(
  organizationId: string,
  periodo: string
): Promise<AccountingSnapshot[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(SNAPSHOTS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('periodo', '==', periodo)
    .get();

  return snapshot.docs.map(
    doc =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as AccountingSnapshot
  );
}

function canUseSnapshots(filters: ReportingFilters): boolean {
  return Boolean(
    filters.periodo &&
      !filters.desde &&
      !filters.hasta &&
      !filters.pluginId &&
      !filters.terceroId &&
      (!filters.status || filters.status === 'posted')
  );
}

export function buildBalanceTrial(
  accounts: AccountingAccount[],
  movements: Array<{
    cuenta_codigo: string;
    total_debe: number;
    total_haber: number;
  }>
): BalanceTrialRow[] {
  const movementByCode = new Map(
    movements.map(item => [
      item.cuenta_codigo,
      {
        total_debe: roundAmount(item.total_debe),
        total_haber: roundAmount(item.total_haber),
      },
    ])
  );

  return accounts
    .filter(account => account.activa)
    .map(account => {
      const movement = movementByCode.get(account.codigo) || {
        total_debe: 0,
        total_haber: 0,
      };

      return {
        account_id: account.id,
        cuenta_codigo: account.codigo,
        cuenta_nombre: account.nombre,
        naturaleza: account.naturaleza,
        tipo: account.tipo,
        total_debe: movement.total_debe,
        total_haber: movement.total_haber,
        saldo: calculateAccountBalance(
          account.naturaleza,
          movement.total_debe,
          movement.total_haber
        ),
      };
    })
    .filter(
      row => row.total_debe !== 0 || row.total_haber !== 0 || row.saldo !== 0
    )
    .sort(
      (left, right) =>
        left.cuenta_codigo.localeCompare(right.cuenta_codigo) ||
        left.cuenta_nombre.localeCompare(right.cuenta_nombre)
    );
}

export async function getBalanceTrialRows(
  filters: ReportingFilters
): Promise<BalanceTrialRow[]> {
  const result = await getBalanceTrialResult(filters);
  return result.rows;
}

export async function getBalanceTrialResult(
  filters: ReportingFilters
): Promise<BalanceTrialResult> {
  const accounts = await getAccountingAccounts(filters.organizationId);

  if (canUseSnapshots(filters) && filters.periodo) {
    const snapshots = await getSnapshotsForPeriod(
      filters.organizationId,
      filters.periodo
    );

    if (snapshots.length > 0) {
      const movementMap = new Map<
        string,
        { cuenta_codigo: string; total_debe: number; total_haber: number }
      >();

      for (const snapshot of snapshots) {
        const current = movementMap.get(snapshot.cuenta_codigo) || {
          cuenta_codigo: snapshot.cuenta_codigo,
          total_debe: 0,
          total_haber: 0,
        };

        current.total_debe += Number(snapshot.saldo_debe || 0);
        current.total_haber += Number(snapshot.saldo_haber || 0);
        movementMap.set(snapshot.cuenta_codigo, current);
      }

      return {
        rows: buildBalanceTrial(accounts, [...movementMap.values()]),
        source: 'snapshot',
        snapshot_periodo: filters.periodo,
      };
    }
  }

  const entries = await getAccountingEntries({
    ...filters,
    status: filters.status || 'posted',
  });
  const lines = await getAccountingLinesByEntryIds(
    filters.organizationId,
    entries.map(entry => entry.id)
  );
  const movementMap = new Map<
    string,
    { cuenta_codigo: string; total_debe: number; total_haber: number }
  >();

  for (const line of lines) {
    if (filters.terceroId && line.tercero_id !== filters.terceroId) {
      continue;
    }

    const current = movementMap.get(line.cuenta_codigo) || {
      cuenta_codigo: line.cuenta_codigo,
      total_debe: 0,
      total_haber: 0,
    };

    if (line.lado === 'debe') {
      current.total_debe += Number(line.importe || 0);
    } else {
      current.total_haber += Number(line.importe || 0);
    }

    movementMap.set(line.cuenta_codigo, current);
  }

  return {
    rows: buildBalanceTrial(accounts, [...movementMap.values()]),
    source: 'lines',
  };
}

export async function getAccountLedger(
  organizationId: string,
  accountId: string,
  desde?: string | null,
  hasta?: string | null
): Promise<{ account: AccountingAccount; rows: LedgerRow[] } | null> {
  const account = await getAccountingAccountById(organizationId, accountId);

  if (!account) {
    return null;
  }

  const entries = await getAccountingEntries({
    organizationId,
    desde,
    hasta,
  });
  const entryMap = new Map(entries.map(entry => [entry.id, entry]));
  const lines = await getAccountingLinesByEntryIds(
    organizationId,
    entries.map(entry => entry.id)
  );

  const rows = lines
    .filter(line => line.cuenta_codigo === account.codigo)
    .map(line => {
      const entry = entryMap.get(line.entry_id);
      if (!entry) {
        return null;
      }

      return {
        line_id: line.id,
        entry_id: entry.id,
        fecha: entry.fecha,
        periodo: entry.periodo,
        descripcion: entry.descripcion,
        plugin_id: entry.plugin_id,
        status: entry.status,
        documento_tipo: entry.documento_tipo,
        documento_id: entry.documento_id,
        tercero_id: line.tercero_id || entry.tercero_id,
        lado: line.lado,
        importe: Number(line.importe || 0),
        referencia: line.referencia,
        line_description: line.descripcion,
      } as LedgerRow;
    })
    .filter((row): row is LedgerRow => Boolean(row))
    .sort(sortLedgerAsc);

  return { account, rows };
}

function buildSection(
  rows: BalanceTrialRow[],
  naturaleza: AccountingAccountNature,
  label: string
): FinancialStatementSection {
  const accounts = rows
    .filter(row => row.naturaleza === naturaleza)
    .sort((left, right) => left.cuenta_codigo.localeCompare(right.cuenta_codigo));

  return {
    naturaleza,
    label,
    total: roundAmount(accounts.reduce((sum, row) => sum + row.saldo, 0)),
    accounts,
  };
}

export async function getBalanceSheet(
  filters: ReportingFilters
): Promise<{
  activo: FinancialStatementSection;
  pasivo: FinancialStatementSection;
  patrimonio_neto: FinancialStatementSection;
  total_pasivo_y_pn: number;
}> {
  const rows = await getBalanceTrialRows(filters);
  const activo = buildSection(rows, 'activo', 'Activo');
  const pasivo = buildSection(rows, 'pasivo', 'Pasivo');
  const patrimonioNeto = buildSection(
    rows,
    'patrimonio_neto',
    'Patrimonio Neto'
  );

  return {
    activo,
    pasivo,
    patrimonio_neto: patrimonioNeto,
    total_pasivo_y_pn: roundAmount(pasivo.total + patrimonioNeto.total),
  };
}

export async function getIncomeStatement(filters: ReportingFilters): Promise<{
  ingresos: FinancialStatementSection;
  egresos: FinancialStatementSection;
  resultado_neto: number;
}> {
  const rows = await getBalanceTrialRows(filters);
  const ingresos = buildSection(rows, 'ingreso', 'Ingresos');
  const gasto = buildSection(rows, 'gasto', 'Gastos');
  const resultadoNegativo = buildSection(
    rows,
    'resultado_negativo',
    'Resultados Negativos'
  );

  const egresosAccounts = [...gasto.accounts, ...resultadoNegativo.accounts].sort(
    (left, right) => left.cuenta_codigo.localeCompare(right.cuenta_codigo)
  );
  const egresos: FinancialStatementSection = {
    naturaleza: 'gasto',
    label: 'Egresos',
    total: roundAmount(gasto.total + resultadoNegativo.total),
    accounts: egresosAccounts,
  };

  return {
    ingresos,
    egresos,
    resultado_neto: roundAmount(ingresos.total - egresos.total),
  };
}
