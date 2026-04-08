import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  getAccountingEntries,
  getBalanceTrialRows,
  getIncomeStatement,
  type BalanceTrialRow,
} from '@/lib/accounting/reporting';
import type {
  AccountingEntryStatus,
  AccountingPeriodStatus,
} from '@/types/accounting';

export interface AIAccountingPeriodSummary {
  code: string;
  status: AccountingPeriodStatus;
  startDate?: string;
  endDate?: string;
  totalEntries: number;
  totalDebe: number;
  totalHaber: number;
  balanceMatches: boolean;
  cashBalance?: number;
  billedThisMonth?: number;
}

export interface AIAccountingRecentEntry {
  id: string;
  fecha: string;
  descripcion: string;
  status: AccountingEntryStatus;
  pluginId: string;
  totalDebe: number;
  totalHaber: number;
  documentoTipo?: string;
  documentoId: string;
}

export interface AIAccountingKeyBalance {
  code: string;
  name: string;
  nature: BalanceTrialRow['naturaleza'];
  balance: number;
}

export interface AIAccountingContext {
  organizationId: string;
  currentPeriod?: AIAccountingPeriodSummary;
  recentEntries: AIAccountingRecentEntry[];
  keyBalances: AIAccountingKeyBalance[];
}

const PERIODS_COLLECTION = 'acc_periods';
const MAX_RECENT_ENTRIES = 5;
const MAX_KEY_BALANCES = 6;

function normalizeText(value: string | undefined): string {
  return (value || '').trim().toLocaleLowerCase('es');
}

function roundAmount(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function pickLatestPeriod<T extends { periodo: string; status: AccountingPeriodStatus }>(
  periods: T[]
): T | null {
  if (periods.length === 0) {
    return null;
  }

  const openPeriods = periods
    .filter(period => period.status === 'abierto')
    .sort((left, right) => right.periodo.localeCompare(left.periodo));

  if (openPeriods.length > 0) {
    return openPeriods[0];
  }

  return [...periods].sort((left, right) => right.periodo.localeCompare(left.periodo))[0];
}

function matchesKeywords(
  row: BalanceTrialRow,
  keywords: string[],
  expectedNature?: BalanceTrialRow['naturaleza']
): boolean {
  if (expectedNature && row.naturaleza !== expectedNature) {
    return false;
  }

  const haystack = `${normalizeText(row.cuenta_nombre)} ${normalizeText(row.cuenta_codigo)}`;
  return keywords.some(keyword => haystack.includes(normalizeText(keyword)));
}

function aggregateRows(rows: BalanceTrialRow[]): number | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  return roundAmount(rows.reduce((sum, row) => sum + Number(row.saldo || 0), 0));
}

function buildKeyBalances(rows: BalanceTrialRow[]): AIAccountingKeyBalance[] {
  return rows
    .filter(row => Number(row.saldo || 0) !== 0)
    .sort((left, right) => Math.abs(right.saldo) - Math.abs(left.saldo))
    .slice(0, MAX_KEY_BALANCES)
    .map(row => ({
      code: row.cuenta_codigo,
      name: row.cuenta_nombre,
      nature: row.naturaleza,
      balance: roundAmount(row.saldo),
    }));
}

export async function buildAccountingContext(
  organizationId: string
): Promise<AIAccountingContext | undefined> {
  const db = getAdminFirestore();
  const periodsSnapshot = await db
    .collection(PERIODS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .get();

  const periods = periodsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{
    id: string;
    periodo: string;
    status: AccountingPeriodStatus;
    fecha_inicio?: string;
    fecha_fin?: string;
  }>;

  const currentPeriod = pickLatestPeriod(periods);

  if (!currentPeriod) {
    return undefined;
  }

  const [entries, balanceRows, incomeStatement] = await Promise.all([
    getAccountingEntries({
      organizationId,
      periodo: currentPeriod.periodo,
      status: 'posted',
    }),
    getBalanceTrialRows({
      organizationId,
      periodo: currentPeriod.periodo,
      status: 'posted',
    }),
    getIncomeStatement({
      organizationId,
      periodo: currentPeriod.periodo,
      status: 'posted',
    }),
  ]);

  const totalDebe = roundAmount(
    entries.reduce((sum, entry) => sum + Number(entry.total_debe || 0), 0)
  );
  const totalHaber = roundAmount(
    entries.reduce((sum, entry) => sum + Number(entry.total_haber || 0), 0)
  );

  const cashBalance = aggregateRows(
    balanceRows.filter(row =>
      matchesKeywords(row, ['caja', 'banco', 'efectivo'], 'activo')
    )
  );
  const billedThisMonth = roundAmount(incomeStatement.ingresos.total || 0);

  return {
    organizationId,
    currentPeriod: {
      code: currentPeriod.periodo,
      status: currentPeriod.status,
      startDate: currentPeriod.fecha_inicio,
      endDate: currentPeriod.fecha_fin,
      totalEntries: entries.length,
      totalDebe,
      totalHaber,
      balanceMatches: totalDebe === totalHaber,
      cashBalance,
      billedThisMonth,
    },
    recentEntries: entries.slice(0, MAX_RECENT_ENTRIES).map(entry => ({
      id: entry.id,
      fecha: entry.fecha,
      descripcion: entry.descripcion,
      status: entry.status,
      pluginId: entry.plugin_id,
      totalDebe: roundAmount(entry.total_debe),
      totalHaber: roundAmount(entry.total_haber),
      documentoTipo: entry.documento_tipo,
      documentoId: entry.documento_id,
    })),
    keyBalances: buildKeyBalances(balanceRows),
  };
}
