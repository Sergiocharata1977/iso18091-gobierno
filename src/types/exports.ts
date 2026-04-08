export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'txt';

export type ExportJobStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled';

export type RestoreMode = 'staging' | 'restore_missing';

export interface ExportDatasetDescriptor {
  key: string;
  label: string;
  description: string;
  module_feature?: string;
  system_ids: string[];
  supported_formats: ExportFormat[];
  date_field?: string | null;
  filter_fields?: string[];
  collection_path_hint: string;
}

export interface ExportFileDescriptor {
  dataset_key: string;
  format: ExportFormat;
  storage_path: string;
  download_url?: string | null;
  row_count: number;
  bytes?: number;
  content_type?: string;
}

export interface ExportJob {
  id: string;
  organization_id: string;
  system_id: string;
  requested_by: string;
  requested_at: Date;
  dataset_key: string;
  format: ExportFormat;
  filters: Record<string, unknown>;
  status: ExportJobStatus;
  progress: number;
  storage_paths: string[];
  row_count: number;
  warnings: string[];
  error?: string | null;
  run_id?: string | null;
}

export interface ExportRun {
  id: string;
  job_id: string;
  organization_id: string;
  system_id: string;
  dataset_key: string;
  format: ExportFormat;
  started_at: Date;
  finished_at?: Date | null;
  status: ExportJobStatus;
  row_count: number;
  warnings: string[];
  files: ExportFileDescriptor[];
  summary?: {
    period_from?: string | null;
    period_to?: string | null;
  };
  error?: string | null;
}

export interface BackupSnapshot {
  id: string;
  organization_id: string;
  system_id: string;
  created_by: string;
  created_at: Date;
  included_datasets: string[];
  files: ExportFileDescriptor[];
  hash_global: string;
  retention_policy: {
    days: number;
    max_backups: number;
  };
  expires_at: Date;
  counts: Record<string, number>;
  mode: 'full' | 'partial';
}

export interface RestoreConflict {
  dataset_key: string;
  doc_id: string;
  reason: string;
}

export interface DataRestoreRun {
  id: string;
  organization_id: string;
  system_id: string;
  snapshot_id: string;
  mode: RestoreMode;
  status: ExportJobStatus;
  progress: number;
  created_docs_count: number;
  skipped_count: number;
  conflicts_count: number;
  conflicts: RestoreConflict[];
  started_at: Date;
  finished_at?: Date | null;
  created_by: string;
}
