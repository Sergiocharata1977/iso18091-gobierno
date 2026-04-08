import type {
  AccountingAccount,
  AccountingCurrency,
  AccountingEntryLine,
  AccountingEvent,
  AccountingPeriod,
} from '@/types/accounting';

export class AccountingPeriodClosedError extends Error {
  readonly code = 'ACCOUNTING_PERIOD_CLOSED';
  readonly status = 409;

  constructor(public readonly periodo: string) {
    super(`El periodo ${periodo} esta cerrado`);
    this.name = 'AccountingPeriodClosedError';
  }
}

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolvePeriod(fecha: string): string {
  const normalized = String(fecha || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    throw new Error('La fecha del evento debe tener formato YYYY-MM-DD');
  }

  return normalized.slice(0, 7);
}

export function validateEventCurrency(moneda: AccountingCurrency): void {
  if (moneda !== 'ARS' && moneda !== 'USD') {
    throw new Error(`Moneda no soportada: ${moneda}`);
  }
}

export function validatePeriodOpen(period: AccountingPeriod | null): void {
  if (!period) {
    return;
  }

  if (period.status === 'cerrado') {
    throw new AccountingPeriodClosedError(period.periodo);
  }
}

export function validateAccountPosting(
  account: AccountingAccount,
  event: AccountingEvent
): void {
  if (!account.activa) {
    throw new Error(`La cuenta ${account.codigo} esta inactiva`);
  }

  if (account.tipo !== 'imputable' || !account.acepta_movimientos) {
    throw new Error(`La cuenta ${account.codigo} no admite imputaciones`);
  }

  if (
    account.moneda &&
    account.moneda !== 'MULTI' &&
    account.moneda !== event.moneda
  ) {
    throw new Error(
      `La cuenta ${account.codigo} no admite movimientos en ${event.moneda}`
    );
  }
}

export function validateBalancedLines(lines: AccountingEntryLine[]): {
  totalDebe: number;
  totalHaber: number;
} {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('El asiento debe contener al menos dos renglones');
  }

  let totalDebe = 0;
  let totalHaber = 0;

  for (const line of lines) {
    const importe = roundCents(Number(line.importe || 0));

    if (importe <= 0) {
      throw new Error('Cada renglon debe tener importe mayor a cero');
    }

    if (line.lado === 'debe') {
      totalDebe += importe;
      continue;
    }

    if (line.lado === 'haber') {
      totalHaber += importe;
      continue;
    }

    throw new Error(`Lado contable invalido: ${String(line.lado)}`);
  }

  const roundedDebe = roundCents(totalDebe);
  const roundedHaber = roundCents(totalHaber);

  if (Math.round(roundedDebe * 100) !== Math.round(roundedHaber * 100)) {
    throw new Error(
      `Asiento desbalanceado. debe=${roundedDebe} haber=${roundedHaber}`
    );
  }

  return {
    totalDebe: roundedDebe,
    totalHaber: roundedHaber,
  };
}
