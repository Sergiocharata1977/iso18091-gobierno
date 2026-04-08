import type {
  AllocationComponent,
  Installment,
  InstallmentAllocationPlan,
} from '@/types/finance';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function remainingForComponent(
  installment: Installment,
  component: AllocationComponent
): number {
  switch (component) {
    case 'late_fee':
      return round2(installment.late_fee_amount - installment.late_fee_paid);
    case 'interest':
      return round2(installment.interest_amount - installment.interest_paid);
    case 'tax':
      return round2(installment.tax_amount - installment.tax_paid);
    case 'capital':
      return round2(installment.capital_amount - installment.capital_paid);
  }
}

export class AllocationService {
  static buildInstallmentAllocationPlan(params: {
    amount: number;
    installments: Installment[];
  }): InstallmentAllocationPlan[] {
    let remainingAmount = round2(params.amount);
    const plans: InstallmentAllocationPlan[] = [];
    const sorted = [...params.installments].sort((a, b) => {
      const aOverdue = a.status === 'overdue' ? 0 : 1;
      const bOverdue = b.status === 'overdue' ? 0 : 1;
      if (aOverdue !== bOverdue) {
        return aOverdue - bOverdue;
      }
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    for (const installment of sorted) {
      if (remainingAmount <= 0) {
        break;
      }

      const allocations: InstallmentAllocationPlan['allocations'] = [];

      for (const component of [
        'late_fee',
        'interest',
        'tax',
        'capital',
      ] as AllocationComponent[]) {
        if (remainingAmount <= 0) {
          break;
        }

        const componentRemaining = remainingForComponent(installment, component);
        if (componentRemaining <= 0) {
          continue;
        }

        const applied = round2(Math.min(componentRemaining, remainingAmount));
        if (applied <= 0) {
          continue;
        }

        allocations.push({ component, amount: applied });
        remainingAmount = round2(remainingAmount - applied);
      }

      if (allocations.length > 0) {
        plans.push({
          installment_id: installment.id,
          installment_number: installment.installment_number,
          allocations,
        });
      }
    }

    return plans;
  }
}
