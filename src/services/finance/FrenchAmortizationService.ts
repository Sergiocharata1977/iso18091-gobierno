import type {
  BuildFrenchScheduleInput,
  FrenchInstallmentItem,
} from '@/types/finance';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addMonthsIso(dateIso: string, months: number): string {
  const date = new Date(dateIso);
  const shifted = new Date(date);
  shifted.setMonth(shifted.getMonth() + months);
  return shifted.toISOString();
}

export class FrenchAmortizationService {
  static buildSchedule(
    input: BuildFrenchScheduleInput
  ): FrenchInstallmentItem[] {
    if (input.principal <= 0) {
      throw new Error('El capital debe ser mayor a cero');
    }
    if (input.installments_count <= 0) {
      throw new Error('La cantidad de cuotas debe ser mayor a cero');
    }

    const periodicRate = input.annual_rate / 12 / 100;
    const n = input.installments_count;
    const payment =
      periodicRate === 0
        ? input.principal / n
        : (input.principal * periodicRate) /
          (1 - Math.pow(1 + periodicRate, -n));

    const schedule: FrenchInstallmentItem[] = [];
    let openingBalance = round2(input.principal);

    for (let index = 0; index < n; index++) {
      const dueDate = addMonthsIso(input.first_due_date, index);
      const interestAmount = round2(openingBalance * periodicRate);
      let capitalAmount = round2(payment - interestAmount);
      let installmentAmount = round2(payment);

      if (index === n - 1) {
        capitalAmount = round2(openingBalance);
        installmentAmount = round2(capitalAmount + interestAmount);
      }

      const closingBalance = round2(openingBalance - capitalAmount);

      schedule.push({
        installment_number: index + 1,
        due_date: dueDate,
        opening_balance: openingBalance,
        installment_amount: installmentAmount,
        capital_amount: capitalAmount,
        interest_amount: interestAmount,
        closing_balance: closingBalance < 0 ? 0 : closingBalance,
      });

      openingBalance = closingBalance < 0 ? 0 : closingBalance;
    }

    return schedule;
  }
}
