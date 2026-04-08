import { getAdminFirestore } from '@/lib/firebase/admin';
import { CoreLedgerService } from '@/lib/accounting/CoreLedgerService';
import { CustomerLedgerService } from '@/services/finance/CustomerLedgerService';
import { FrenchAmortizationService } from '@/services/finance/FrenchAmortizationService';
import { InstallmentPlanService } from '@/services/finance/InstallmentPlanService';
import type { CreateFinancedSaleInput, FinancedSale, FinancedSaleLine } from '@/types/finance';

const COLLECTION = 'sales_financed';

function nowIso(): string {
  return new Date().toISOString();
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildLines(input: CreateFinancedSaleInput): FinancedSaleLine[] {
  return input.lines.map(line => {
    const discountAmount = line.discount_amount || 0;
    const lineTotal = round2(line.quantity * line.unit_price - discountAmount);
    return {
      product_id: line.product_id,
      sku: line.sku,
      description: line.description || line.product_id,
      quantity: line.quantity,
      unit_price: line.unit_price,
      discount_amount: discountAmount,
      line_total: lineTotal,
      stock_cost: line.stock_cost,
    };
  });
}

export class FinancedSaleService {
  static async getById(id: string): Promise<FinancedSale | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as FinancedSale;
  }

  static async listByOrganization(
    organizationId: string,
    filters?: { customer_id?: string; status?: FinancedSale['status'] }
  ): Promise<FinancedSale[]> {
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
    })) as FinancedSale[];
  }

  static async create(input: CreateFinancedSaleInput): Promise<{
    sale: FinancedSale;
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
        sale: existing,
        plan_id: existing.plan_id || '',
        journal_entry_ids: existing.journal_entry_ids || [],
      };
    }

    const createdAt = nowIso();
    const productLines = buildLines(input);
    const subtotal = round2(productLines.reduce((sum, line) => sum + line.line_total, 0));
    const discountTotal = round2(
      productLines.reduce((sum, line) => sum + line.discount_amount, 0)
    );
    const totalAmount = round2(subtotal);
    const downPaymentAmount = round2(input.down_payment_amount || 0);
    const financedPrincipal = round2(totalAmount - downPaymentAmount);

    if (financedPrincipal <= 0) {
      throw new Error('El saldo financiado debe ser mayor a cero');
    }

    const ref = db.collection(COLLECTION).doc();
    const sale: FinancedSale = {
      id: ref.id,
      organization_id: input.organization_id,
      customer_id: input.customer_id,
      currency: input.currency,
      status: 'active',
      product_lines: productLines,
      subtotal,
      discount_total: discountTotal,
      total_amount: totalAmount,
      down_payment_amount: downPaymentAmount,
      financed_principal: financedPrincipal,
      interest_rate_nominal: input.interest_rate_nominal,
      installments_count: input.installments_count,
      installment_system: 'frances',
      first_due_date: input.first_due_date,
      stock_impact_posted: false,
      accounting_posted: false,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: input.created_by,
      updated_by: input.created_by,
    };

    await ref.set({
      ...sale,
      idempotency_key: input.idempotency_key || null,
    });

    const schedule = FrenchAmortizationService.buildSchedule({
      principal: financedPrincipal,
      annual_rate: input.interest_rate_nominal,
      installments_count: input.installments_count,
      first_due_date: input.first_due_date,
    });

    const { plan } = await InstallmentPlanService.createFromFinancedSale({
      sale,
      schedule,
      createdBy: input.created_by,
    });

    const ledgerEntry = await CustomerLedgerService.postEntry({
      organization_id: input.organization_id,
      customer_id: input.customer_id,
      entry_date: createdAt,
      origin_type: 'venta_financiada',
      origin_id: sale.id,
      movement_type: 'debit',
      concept_type: 'sale',
      description: 'Venta financiada',
      debit_amount: financedPrincipal,
      credit_amount: 0,
      created_by: input.created_by,
      updated_by: input.created_by,
    });

    const journalEntryIds: string[] = [];

    const saleEntryId = await CoreLedgerService.postEntry({
      organization_id: input.organization_id,
      source_module: 'finance',
      source_type: 'financed_sale',
      source_id: sale.id,
      entry_date: new Date(createdAt),
      description: 'Venta financiada',
      currency: input.currency,
      lines: [
        {
          account_code: '113201',
          account_name: 'Creditos por ventas financiadas',
          debit: financedPrincipal,
          credit: 0,
          metadata: { sale_id: sale.id, ledger_entry_id: ledgerEntry.id },
        },
        {
          account_code: '411101',
          account_name: 'Ventas financiadas',
          debit: 0,
          credit: financedPrincipal,
          metadata: { sale_id: sale.id },
        },
      ],
      created_by: input.created_by,
      idempotency_key: input.idempotency_key
        ? `${input.idempotency_key}:sale`
        : `${sale.id}:sale`,
    });
    journalEntryIds.push(saleEntryId);

    if (downPaymentAmount > 0) {
      const downPaymentEntryId = await CoreLedgerService.postEntry({
        organization_id: input.organization_id,
        source_module: 'finance',
        source_type: 'financed_sale',
        source_id: sale.id,
        entry_date: new Date(createdAt),
        description: 'Anticipo de venta financiada',
        currency: input.currency,
        lines: [
          {
            account_code: '111101',
            account_name: 'Caja',
            debit: downPaymentAmount,
            credit: 0,
            metadata: { sale_id: sale.id },
          },
          {
            account_code: '113201',
            account_name: 'Creditos por ventas financiadas',
            debit: 0,
            credit: downPaymentAmount,
            metadata: { sale_id: sale.id },
          },
        ],
        created_by: input.created_by,
        idempotency_key: input.idempotency_key
          ? `${input.idempotency_key}:down-payment`
          : `${sale.id}:down-payment`,
      });
      journalEntryIds.push(downPaymentEntryId);
    }

    await ref.update({
      plan_id: plan.id,
      journal_entry_ids: journalEntryIds,
      accounting_posted: true,
      updated_at: nowIso(),
      updated_by: input.created_by,
    });

    return {
      sale: {
        ...sale,
        plan_id: plan.id,
        journal_entry_ids: journalEntryIds,
        accounting_posted: true,
      },
      plan_id: plan.id,
      journal_entry_ids: journalEntryIds,
    };
  }

  private static async findByIdempotency(
    organizationId: string,
    idempotencyKey?: string
  ): Promise<FinancedSale | null> {
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
    return { id: doc.id, ...doc.data() } as FinancedSale;
  }
}
