export type CurrencyCode = 'ARS' | 'USD';

export type OriginType =
  | 'venta_financiada'
  | 'prestamo_personal'
  | 'refinanciacion';

export type InstallmentSystem = 'frances';

export type LoanStatus =
  | 'draft'
  | 'approved'
  | 'disbursed'
  | 'active'
  | 'delinquent'
  | 'refinanced'
  | 'cancelled'
  | 'closed'
  | 'written_off';

export type FinancedSaleStatus =
  | 'draft'
  | 'approved'
  | 'delivered'
  | 'active'
  | 'cancelled'
  | 'closed';

export type InstallmentStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'refinanced'
  | 'cancelled';

export type ReceiptStatus =
  | 'pending'
  | 'confirmed'
  | 'partially_allocated'
  | 'allocated'
  | 'failed'
  | 'reversed';

export type PaymentChannel =
  | 'cash'
  | 'transfer'
  | 'card'
  | 'gateway'
  | 'debit';

export type AllocationTargetType = 'installment' | 'customer_ledger_entry';

export type AllocationComponent =
  | 'late_fee'
  | 'interest'
  | 'tax'
  | 'capital';

export type LedgerMovementType = 'debit' | 'credit';

export type LedgerConceptType =
  | 'sale'
  | 'loan_disbursement'
  | 'installment_accrual'
  | 'receipt'
  | 'late_fee'
  | 'refinancing'
  | 'write_off'
  | 'adjustment';

export interface AuditableDoc {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface FinancedSaleLine {
  product_id: string;
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  stock_cost?: number;
}

export interface FinancedSale extends AuditableDoc {
  customer_id: string;
  currency: CurrencyCode;
  status: FinancedSaleStatus;
  product_lines: FinancedSaleLine[];
  subtotal: number;
  discount_total: number;
  total_amount: number;
  down_payment_amount: number;
  financed_principal: number;
  interest_rate_nominal: number;
  installments_count: number;
  installment_system: InstallmentSystem;
  first_due_date: string;
  delivery_date?: string;
  plan_id?: string;
  journal_entry_ids?: string[];
  stock_impact_posted: boolean;
  accounting_posted: boolean;
}

export interface PersonalLoan extends AuditableDoc {
  customer_id: string;
  currency: CurrencyCode;
  status: LoanStatus;
  principal_amount: number;
  disbursement_amount: number;
  administrative_fees: number;
  insurance_amount: number;
  interest_rate_nominal: number;
  installments_count: number;
  installment_system: InstallmentSystem;
  first_due_date: string;
  disbursement_date?: string;
  credit_evaluation_id?: string;
  plan_id?: string;
  journal_entry_ids?: string[];
  accounting_posted: boolean;
}

export interface InstallmentPlan extends AuditableDoc {
  origin_type: OriginType;
  origin_id: string;
  customer_id: string;
  principal_amount: number;
  annual_rate: number;
  installments_count: number;
  system: InstallmentSystem;
  start_date: string;
  first_due_date: string;
  status: 'active' | 'cancelled' | 'completed' | 'refinanced';
}

export interface Installment extends AuditableDoc {
  plan_id: string;
  origin_type: OriginType;
  origin_id: string;
  customer_id: string;
  installment_number: number;
  due_date: string;
  opening_balance: number;
  capital_amount: number;
  interest_amount: number;
  tax_amount: number;
  late_fee_amount: number;
  capital_paid: number;
  interest_paid: number;
  tax_paid: number;
  late_fee_paid: number;
  total_scheduled: number;
  total_paid: number;
  pending_amount: number;
  days_past_due: number;
  status: InstallmentStatus;
  paid_at?: string;
}

export interface Receipt extends AuditableDoc {
  customer_id: string;
  receipt_date: string;
  payment_channel: PaymentChannel;
  payment_reference?: string;
  gross_amount: number;
  applied_amount: number;
  unapplied_amount: number;
  status: ReceiptStatus;
  source: 'backoffice' | 'web_checkout' | 'webhook';
  payment_intent_id?: string;
  provider?: string;
  provider_reference?: string;
  journal_entry_id?: string;
}

export interface ReceiptAllocation extends AuditableDoc {
  receipt_id: string;
  customer_id: string;
  target_type: AllocationTargetType;
  target_id: string;
  installment_id?: string;
  applied_to: AllocationComponent;
  amount: number;
  allocation_order: number;
}

export interface CustomerLedgerEntry extends AuditableDoc {
  customer_id: string;
  entry_date: string;
  origin_type: OriginType | 'receipt' | 'late_fee' | 'write_off' | 'adjustment';
  origin_id: string;
  document_number?: string;
  movement_type: LedgerMovementType;
  concept_type: LedgerConceptType;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance_after: number;
  journal_entry_id?: string;
}

export interface BuildFrenchScheduleInput {
  principal: number;
  annual_rate: number;
  installments_count: number;
  first_due_date: string;
}

export interface FrenchInstallmentItem {
  installment_number: number;
  due_date: string;
  opening_balance: number;
  installment_amount: number;
  capital_amount: number;
  interest_amount: number;
  closing_balance: number;
}

export interface CreateFinancedSaleInput {
  organization_id: string;
  customer_id: string;
  currency: CurrencyCode;
  lines: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    description?: string;
    sku?: string;
    stock_cost?: number;
  }>;
  down_payment_amount?: number;
  interest_rate_nominal: number;
  installments_count: number;
  first_due_date: string;
  created_by: string;
  idempotency_key?: string;
}

export interface CreatePersonalLoanInput {
  organization_id: string;
  customer_id: string;
  principal_amount: number;
  administrative_fees?: number;
  insurance_amount?: number;
  interest_rate_nominal: number;
  installments_count: number;
  first_due_date: string;
  disbursement_date: string;
  credit_evaluation_id?: string;
  currency?: CurrencyCode;
  created_by: string;
  idempotency_key?: string;
}

export interface CreateReceiptInput {
  organization_id: string;
  customer_id: string;
  receipt_date: string;
  payment_channel: PaymentChannel;
  gross_amount: number;
  payment_reference?: string;
  source: 'backoffice' | 'web_checkout' | 'webhook';
  payment_intent_id?: string;
  provider?: string;
  provider_reference?: string;
  created_by: string;
  idempotency_key?: string;
}

export interface AllocationBreakdown {
  component: AllocationComponent;
  amount: number;
}

export interface InstallmentAllocationPlan {
  installment_id: string;
  installment_number: number;
  allocations: AllocationBreakdown[];
}
