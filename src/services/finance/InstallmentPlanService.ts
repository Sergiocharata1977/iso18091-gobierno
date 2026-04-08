import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  AllocationBreakdown,
  AuditableDoc,
  FinancedSale,
  FrenchInstallmentItem,
  Installment,
  InstallmentPlan,
  PersonalLoan,
} from '@/types/finance';

const PLAN_COLLECTION = 'installment_plans';
const INSTALLMENT_COLLECTION = 'installments';

function nowIso(): string {
  return new Date().toISOString();
}

function docBase(
  organizationId: string,
  userId: string
): Omit<AuditableDoc, 'id'> {
  const now = nowIso();
  return {
    organization_id: organizationId,
    created_at: now,
    updated_at: now,
    created_by: userId,
    updated_by: userId,
  };
}

export class InstallmentPlanService {
  static async createFromFinancedSale(params: {
    sale: FinancedSale;
    schedule: FrenchInstallmentItem[];
    createdBy: string;
  }): Promise<{ plan: InstallmentPlan; installments: Installment[] }> {
    return this.createPlanAndInstallments({
      organizationId: params.sale.organization_id,
      originType: 'venta_financiada',
      originId: params.sale.id,
      customerId: params.sale.customer_id,
      principalAmount: params.sale.financed_principal,
      annualRate: params.sale.interest_rate_nominal,
      installmentsCount: params.sale.installments_count,
      firstDueDate: params.sale.first_due_date,
      createdBy: params.createdBy,
      schedule: params.schedule,
    });
  }

  static async createFromPersonalLoan(params: {
    loan: PersonalLoan;
    schedule: FrenchInstallmentItem[];
    createdBy: string;
  }): Promise<{ plan: InstallmentPlan; installments: Installment[] }> {
    return this.createPlanAndInstallments({
      organizationId: params.loan.organization_id,
      originType: 'prestamo_personal',
      originId: params.loan.id,
      customerId: params.loan.customer_id,
      principalAmount: params.loan.principal_amount,
      annualRate: params.loan.interest_rate_nominal,
      installmentsCount: params.loan.installments_count,
      firstDueDate: params.loan.first_due_date,
      createdBy: params.createdBy,
      schedule: params.schedule,
    });
  }

  private static async createPlanAndInstallments(params: {
    organizationId: string;
    originType: InstallmentPlan['origin_type'];
    originId: string;
    customerId: string;
    principalAmount: number;
    annualRate: number;
    installmentsCount: number;
    firstDueDate: string;
    createdBy: string;
    schedule: FrenchInstallmentItem[];
  }): Promise<{ plan: InstallmentPlan; installments: Installment[] }> {
    const db = getAdminFirestore();
    const base = docBase(params.organizationId, params.createdBy);
    const planRef = db.collection(PLAN_COLLECTION).doc();

    const plan: InstallmentPlan = {
      id: planRef.id,
      ...base,
      origin_type: params.originType,
      origin_id: params.originId,
      customer_id: params.customerId,
      principal_amount: params.principalAmount,
      annual_rate: params.annualRate,
      installments_count: params.installmentsCount,
      system: 'frances',
      start_date: base.created_at,
      first_due_date: params.firstDueDate,
      status: 'active',
    };

    const batch = db.batch();
    batch.set(planRef, plan);

    const installments: Installment[] = params.schedule.map(item => {
      const ref = db.collection(INSTALLMENT_COLLECTION).doc();
      const installment: Installment = {
        id: ref.id,
        ...base,
        plan_id: plan.id,
        origin_type: params.originType,
        origin_id: params.originId,
        customer_id: params.customerId,
        installment_number: item.installment_number,
        due_date: item.due_date,
        opening_balance: item.opening_balance,
        capital_amount: item.capital_amount,
        interest_amount: item.interest_amount,
        tax_amount: 0,
        late_fee_amount: 0,
        capital_paid: 0,
        interest_paid: 0,
        tax_paid: 0,
        late_fee_paid: 0,
        total_scheduled: item.installment_amount,
        total_paid: 0,
        pending_amount: item.installment_amount,
        days_past_due: 0,
        status: 'pending',
      };
      batch.set(ref, installment);
      return installment;
    });

    await batch.commit();
    return { plan, installments };
  }

  static async getOpenInstallmentsByCustomer(
    organizationId: string,
    customerId: string
  ): Promise<Installment[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(INSTALLMENT_COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('customer_id', '==', customerId)
      .where('status', 'in', ['pending', 'partially_paid', 'overdue'])
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as Installment)
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
  }

  static async applyAllocation(
    organizationId: string,
    installmentId: string,
    allocations: AllocationBreakdown[]
  ): Promise<Installment> {
    const db = getAdminFirestore();
    const ref = db.collection(INSTALLMENT_COLLECTION).doc(installmentId);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new Error('Cuota no encontrada');
    }

    const current = { id: snap.id, ...snap.data() } as Installment;
    if (current.organization_id !== organizationId) {
      throw new Error('Acceso denegado');
    }

    const next: Installment = {
      ...current,
      updated_at: nowIso(),
    };

    for (const allocation of allocations) {
      switch (allocation.component) {
        case 'capital':
          next.capital_paid += allocation.amount;
          break;
        case 'interest':
          next.interest_paid += allocation.amount;
          break;
        case 'tax':
          next.tax_paid += allocation.amount;
          break;
        case 'late_fee':
          next.late_fee_paid += allocation.amount;
          break;
      }
    }

    const appliedAmount = allocations.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    next.total_paid = Number((next.total_paid + appliedAmount).toFixed(2));
    next.pending_amount = Number(
      Math.max(0, next.total_scheduled + next.late_fee_amount - next.total_paid).toFixed(2)
    );
    next.status =
      next.pending_amount === 0
        ? 'paid'
        : next.total_paid > 0
          ? 'partially_paid'
          : current.status;
    next.paid_at = next.pending_amount === 0 ? nowIso() : current.paid_at;

    await ref.set(next);
    return next;
  }
}
