export interface JournalLineInput {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  cost_center_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateJournalEntryInput {
  organization_id: string;
  source_module: 'quality' | 'agro' | 'finance' | 'manufacturing' | 'other';
  source_type: string;
  source_id: string;
  entry_date: Date;
  description: string;
  currency?: string;
  lines: JournalLineInput[];
  created_by: string;
  idempotency_key?: string;
}

export interface JournalEntry {
  id: string;
  organization_id: string;
  source_module: string;
  source_type: string;
  source_id: string;
  entry_date: Date;
  description: string;
  currency: string;
  total_debit: number;
  total_credit: number;
  lines: JournalLineInput[];
  status: 'posted' | 'reversed';
  idempotency_key?: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
