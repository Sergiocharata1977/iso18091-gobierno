import { getAdminFirestore } from '@/lib/firebase/admin';
import { CoreLedgerService } from '@/lib/accounting/CoreLedgerService';
import { CustomerLedgerService } from '@/services/finance/CustomerLedgerService';
import { FrenchAmortizationService } from '@/services/finance/FrenchAmortizationService';
import { InstallmentPlanService } from '@/services/finance/InstallmentPlanService';
import type { CreatePersonalLoanInput, PersonalLoan } from '@/types/finance';

const COLLECTION = 'personal_loans';

function nowIso(): string {
  return new Date().toISOString();
}

export class PersonalLoanService {
  static async getById(id: string): Promise<PersonalLoan | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as PersonalLoan;
  }

  static async listByOrganization(
    organizationId: string,
    filters?: { customer_id?: string; status?: PersonalLoan['status'] }
  ): Promise<PersonalLoan[]> {
    const db = getAdminFirestore();
    let query = db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId);

    if (filters?.customer_id) {
      query = query.where('customer_id', '==', filters.customer_id);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    const snapshot = await query.orderBy('created_at', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PersonalLoan[];
  }

  static async create(input: CreatePersonalLoanInput): Promise<{
    loan: PersonalLoan;
    plan_id: string;
    journal_entry_ids: string[];
  }> {
    const db = getAdminFirestore();
    const existing = await this.findByIdempotency(
      input.organization_id,
      input.idempotency_key
    );

    if (existing) {
      return {
        loan: existing,
        plan_id: existing.plan_id || '',
        journal_entry_ids: existing.journal_entry_ids || [],
      };
    }

    if (input.principal_amount <= 0) {
      throw new Error('El monto principal debe ser mayor a cero');
    }

    const now = nowIso();
    const ref = db.collection(COLLECTION).doc();
    const loan: PersonalLoan = {
      id: ref.id,
      organization_id: input.organization_id,
      customer_id: input.customer_id,
      currency: input.currency || 'ARS',
      status: 'disbursed',
      principal_amount: input.principal_amount,
      disbursement_amount: input.principal_amount,
      administrative_fees: input.administrative_fees || 0,
      insurance_amount: input.insurance_amount || 0,
      interest_rate_nominal: input.interest_rate_nominal,
      installments_count: input.installments_count,
      installment_system: 'frances',
      first_due_date: input.first_due_date,
      disbursement_date: input.disbursement_date,
      credit_evaluation_id: input.credit_evaluation_id,
      accounting_posted: false,
      created_at: now,
      updated_at: now,
      created_by: input.created_by,
      updated_by: input.created_by,
    };

    await ref.set({
      ...loan,
      idempotency_key: input.idempotency_key || null,
    });

    const schedule = FrenchAmortizationService.buildSchedule({
      principal: input.principal_amount,
      annual_rate: input.interest_rate_nominal,
      installments_count: input.installments_count,
      first_due_date: input.first_due_date,
    });

    const { plan } = await InstallmentPlanService.createFromPersonalLoan({
      loan,
      schedule,
      createdBy: input.created_by,
    });

    const ledgerEntry = await CustomerLedgerService.postEntry({
      organization_id: input.organization_id,
      customer_id: input.customer_id,
      entry_date: input.disbursement_date,
      origin_type: 'prestamo_personal',
      origin_id: loan.id,
      movement_type: 'debit',
      concept_type: 'loan_disbursement',
      description: 'Desembolso de prestamo personal',
      debit_amount: input.principal_amount,
      credit_amount: 0,
      created_by: input.created_by,
      updated_by: input.created_by,
    });

    const journalEntryId = await CoreLedgerService.postEntry({
      organization_id: input.organization_id,
      source_module: 'finance',
      source_type: 'personal_loan',
      source_id: loan.id,
      entry_date: new Date(input.disbursement_date),
      description: 'Desembolso de prestamo personal',
      currency: loan.currency,
      lines: [
        {
          account_code: '113101',
          account_name: 'Prestamos a cobrar',
          debit: input.principal_amount,
          credit: 0,
          metadata: { loan_id: loan.id, ledger_entry_id: ledgerEntry.id },
        },
        {
          account_code: '111201',
          account_name: 'Banco cuenta corriente',
          debit: 0,
          credit: input.principal_amount,
          metadata: { loan_id: loan.id },
        },
      ],
      created_by: input.created_by,
      idempotency_key: input.idempotency_key
        ? `${input.idempotency_key}:disbursement`
        : `${loan.id}:disbursement`,
    });

    await ref.update({
      plan_id: plan.id,
      journal_entry_ids: [journalEntryId],
      accounting_posted: true,
      updated_at: nowIso(),
      updated_by: input.created_by,
    });

    return {
      loan: {
        ...loan,
        plan_id: plan.id,
        journal_entry_ids: [journalEntryId],
        accounting_posted: true,
      },
      plan_id: plan.id,
      journal_entry_ids: [journalEntryId],
    };
  }

  private static async findByIdempotency(
    organizationId: string,
    idempotencyKey?: string
  ): Promise<PersonalLoan | null> {
    if (!idempotencyKey) {
      return null;
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('idempotency_key', '==', idempotencyKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as PersonalLoan;
  }
}
