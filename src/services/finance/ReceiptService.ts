import { getAdminFirestore } from '@/lib/firebase/admin';
import { CoreLedgerService } from '@/lib/accounting/CoreLedgerService';
import { AllocationService } from '@/services/finance/AllocationService';
import { CustomerLedgerService } from '@/services/finance/CustomerLedgerService';
import { InstallmentPlanService } from '@/services/finance/InstallmentPlanService';
import type {
  AllocationComponent,
  CreateReceiptInput,
  Receipt,
  ReceiptAllocation,
} from '@/types/finance';

const RECEIPT_COLLECTION = 'receipts';
const ALLOCATION_COLLECTION = 'receipt_allocations';

function nowIso(): string {
  return new Date().toISOString();
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addComponentSummary(
  summary: Record<AllocationComponent, number>,
  component: AllocationComponent,
  amount: number
) {
  summary[component] = round2((summary[component] || 0) + amount);
}

export class ReceiptService {
  static async create(input: CreateReceiptInput): Promise<{
    receipt: Receipt;
    allocations: ReceiptAllocation[];
    journal_entry_id: string;
  }> {
    const existing = await this.findByIdempotency(
      input.organization_id,
      input.idempotency_key
    );
    if (existing) {
      return {
        receipt: existing,
        allocations: await this.listAllocations(existing.id),
        journal_entry_id: existing.journal_entry_id || '',
      };
    }

    const db = getAdminFirestore();
    const createdAt = nowIso();
    const ref = db.collection(RECEIPT_COLLECTION).doc();
    const receipt: Receipt = {
      id: ref.id,
      organization_id: input.organization_id,
      customer_id: input.customer_id,
      receipt_date: input.receipt_date,
      payment_channel: input.payment_channel,
      payment_reference: input.payment_reference,
      gross_amount: input.gross_amount,
      applied_amount: 0,
      unapplied_amount: input.gross_amount,
      status: 'confirmed',
      source: input.source,
      payment_intent_id: input.payment_intent_id,
      provider: input.provider,
      provider_reference: input.provider_reference,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: input.created_by,
      updated_by: input.created_by,
    };

    await ref.set({
      ...receipt,
      idempotency_key: input.idempotency_key || null,
    });

    const installments = await InstallmentPlanService.getOpenInstallmentsByCustomer(
      input.organization_id,
      input.customer_id
    );
    const plan = AllocationService.buildInstallmentAllocationPlan({
      amount: input.gross_amount,
      installments,
    });

    const allocations: ReceiptAllocation[] = [];
    const componentSummary: Record<AllocationComponent, number> = {
      capital: 0,
      interest: 0,
      tax: 0,
      late_fee: 0,
    };

    let allocationOrder = 1;
    for (const item of plan) {
      await InstallmentPlanService.applyAllocation(
        input.organization_id,
        item.installment_id,
        item.allocations
      );

      for (const allocation of item.allocations) {
        const allocRef = db.collection(ALLOCATION_COLLECTION).doc();
        const doc: ReceiptAllocation = {
          id: allocRef.id,
          organization_id: input.organization_id,
          receipt_id: receipt.id,
          customer_id: input.customer_id,
          target_type: 'installment',
          target_id: item.installment_id,
          installment_id: item.installment_id,
          applied_to: allocation.component,
          amount: allocation.amount,
          allocation_order: allocationOrder++,
          created_at: createdAt,
          updated_at: createdAt,
          created_by: input.created_by,
          updated_by: input.created_by,
        };

        await allocRef.set(doc);
        allocations.push(doc);
        addComponentSummary(
          componentSummary,
          allocation.component,
          allocation.amount
        );
      }
    }

    const appliedAmount = round2(
      allocations.reduce((sum, item) => sum + item.amount, 0)
    );
    const unappliedAmount = round2(input.gross_amount - appliedAmount);

    const journalEntryId = await CoreLedgerService.postEntry({
      organization_id: input.organization_id,
      source_module: 'finance',
      source_type: 'receipt',
      source_id: receipt.id,
      entry_date: new Date(input.receipt_date),
      description: 'Cobro de cuota / recibo',
      currency: 'ARS',
      lines: [
        {
          account_code: '111101',
          account_name: 'Caja',
          debit: input.gross_amount,
          credit: 0,
          metadata: { receipt_id: receipt.id },
        },
        ...(componentSummary.late_fee > 0
          ? [
              {
                account_code: '412201',
                account_name: 'Punitorios a cobrar',
                debit: 0,
                credit: componentSummary.late_fee,
                metadata: { receipt_id: receipt.id, component: 'late_fee' },
              },
            ]
          : []),
        ...(componentSummary.interest > 0
          ? [
              {
                account_code: '412101',
                account_name: 'Intereses a cobrar',
                debit: 0,
                credit: componentSummary.interest,
                metadata: { receipt_id: receipt.id, component: 'interest' },
              },
            ]
          : []),
        ...(componentSummary.tax > 0
          ? [
              {
                account_code: '213101',
                account_name: 'Impuestos cobrados',
                debit: 0,
                credit: componentSummary.tax,
                metadata: { receipt_id: receipt.id, component: 'tax' },
              },
            ]
          : []),
        ...(componentSummary.capital > 0
          ? [
              {
                account_code: '113101',
                account_name: 'Creditos a cobrar',
                debit: 0,
                credit: componentSummary.capital,
                metadata: { receipt_id: receipt.id, component: 'capital' },
              },
            ]
          : []),
        ...(unappliedAmount > 0
          ? [
              {
                account_code: '212101',
                account_name: 'Anticipos de clientes',
                debit: 0,
                credit: unappliedAmount,
                metadata: { receipt_id: receipt.id, component: 'unapplied' },
              },
            ]
          : []),
      ],
      created_by: input.created_by,
      idempotency_key: input.idempotency_key
        ? `${input.idempotency_key}:receipt`
        : `${receipt.id}:receipt`,
    });

    await CustomerLedgerService.postEntry({
      organization_id: input.organization_id,
      customer_id: input.customer_id,
      entry_date: input.receipt_date,
      origin_type: 'receipt',
      origin_id: receipt.id,
      movement_type: 'credit',
      concept_type: 'receipt',
      description: 'Cobro recibido',
      debit_amount: 0,
      credit_amount: appliedAmount,
      journal_entry_id: journalEntryId,
      created_by: input.created_by,
      updated_by: input.created_by,
    });

    const finalReceipt: Receipt = {
      ...receipt,
      applied_amount: appliedAmount,
      unapplied_amount: unappliedAmount,
      status:
        unappliedAmount > 0 ? 'partially_allocated' : 'allocated',
      journal_entry_id: journalEntryId,
      updated_at: nowIso(),
      updated_by: input.created_by,
    };

    await ref.set(finalReceipt);

    return {
      receipt: finalReceipt,
      allocations,
      journal_entry_id: journalEntryId,
    };
  }

  static async listAllocations(receiptId: string): Promise<ReceiptAllocation[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(ALLOCATION_COLLECTION)
      .where('receipt_id', '==', receiptId)
      .orderBy('allocation_order', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ReceiptAllocation[];
  }

  private static async findByIdempotency(
    organizationId: string,
    idempotencyKey?: string
  ): Promise<Receipt | null> {
    if (!idempotencyKey) {
      return null;
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection(RECEIPT_COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('idempotency_key', '==', idempotencyKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Receipt;
  }
}
