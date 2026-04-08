import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin';
import { AuditLogService } from '@/services/audit/AuditLogService';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type {
  ExportDatasetDescriptor,
  ExportFileDescriptor,
  ExportFormat,
  ExportJob,
  ExportRun,
} from '@/types/exports';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { createHash, randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

type DatasetConfig = ExportDatasetDescriptor & {
  source:
    | { kind: 'top-level'; collection: string; organizationField: string }
    | { kind: 'org-subcollection'; subcollection: string };
  restore_support: boolean;
};

type ExportFilters = {
  from?: string;
  to?: string;
  anonymize?: boolean;
  limit?: number;
  [key: string]: unknown;
};

const MAX_SYNC_ROWS = 5000;
const MAX_EXPORTS_PER_HOUR = 5;
const MAX_ROWS_HARD_LIMIT = 20000;
const DEFAULT_SYSTEM_ID = 'iso9001';

const DATASET_CONFIGS: DatasetConfig[] = [
  {
    key: 'process_definitions',
    label: 'Procesos · Definiciones',
    description: 'Definiciones maestras de procesos del SGC.',
    module_feature: 'procesos',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updated_at',
    filter_fields: ['activo', 'category_id', 'jefe_proceso_id'],
    collection_path_hint: 'processDefinitions',
    source: {
      kind: 'top-level',
      collection: 'processDefinitions',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'process_records',
    label: 'Procesos · Registros',
    description: 'Instancias y registros operativos de procesos.',
    module_feature: 'procesos',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updated_at',
    filter_fields: ['status', 'responsable_id', 'process_definition_id'],
    collection_path_hint: 'processRecords',
    source: {
      kind: 'top-level',
      collection: 'processRecords',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'crm_acciones',
    label: 'CRM · Acciones',
    description: 'Acciones comerciales registradas por organización.',
    module_feature: 'crm',
    system_ids: ['iso9001', 'finanzas'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'createdAt',
    filter_fields: ['estado', 'tipo', 'vendedor_id', 'cliente_id'],
    collection_path_hint: 'organizations/{orgId}/crm_acciones',
    source: {
      kind: 'org-subcollection',
      subcollection: 'crm_acciones',
    },
    restore_support: true,
  },
  {
    key: 'crm_clientes',
    label: 'CRM · Clientes',
    description: 'Clientes y organizaciones del CRM.',
    module_feature: 'crm',
    system_ids: ['iso9001', 'finanzas'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updated_at',
    filter_fields: ['isActive', 'estado_kanban_id'],
    collection_path_hint: 'crm_organizaciones',
    source: {
      kind: 'top-level',
      collection: 'crm_organizaciones',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'quality_indicators',
    label: 'Calidad · Indicadores',
    description: 'Indicadores de calidad.',
    module_feature: 'procesos',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updated_at',
    filter_fields: ['status', 'responsible_user_id'],
    collection_path_hint: 'quality_indicators',
    source: {
      kind: 'top-level',
      collection: 'quality_indicators',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'quality_measurements',
    label: 'Calidad · Mediciones',
    description: 'Mediciones e historiales de indicadores.',
    module_feature: 'procesos',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'measurement_date',
    filter_fields: [
      'validation_status',
      'indicator_id',
      'process_definition_id',
    ],
    collection_path_hint: 'quality_measurements',
    source: {
      kind: 'top-level',
      collection: 'quality_measurements',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'findings',
    label: 'Mejora · Hallazgos',
    description: 'Hallazgos de auditoría y mejora.',
    module_feature: 'mejoras',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updatedAt',
    filter_fields: ['status', 'currentPhase'],
    collection_path_hint: 'findings',
    source: {
      kind: 'top-level',
      collection: 'findings',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'actions',
    label: 'Mejora · Acciones',
    description: 'Acciones correctivas, preventivas y de mejora.',
    module_feature: 'mejoras',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updatedAt',
    filter_fields: ['status', 'priority', 'actionType'],
    collection_path_hint: 'actions',
    source: {
      kind: 'top-level',
      collection: 'actions',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
  {
    key: 'personnel',
    label: 'RRHH · Personal',
    description: 'Personal de la organización.',
    module_feature: 'rrhh',
    system_ids: ['iso9001'],
    supported_formats: ['csv', 'json', 'xlsx', 'txt'],
    date_field: 'updated_at',
    filter_fields: ['estado', 'puestoId', 'supervisorId'],
    collection_path_hint: 'personnel',
    source: {
      kind: 'top-level',
      collection: 'personnel',
      organizationField: 'organization_id',
    },
    restore_support: true,
  },
];

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function flattenObject(
  input: Record<string, unknown>,
  prefix = ''
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(input)) {
    const finalKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      result[finalKey] = null;
      continue;
    }

    if (Array.isArray(value)) {
      result[finalKey] = JSON.stringify(value);
      continue;
    }

    if (typeof value === 'object') {
      if (
        'toDate' in value &&
        typeof (value as { toDate?: () => Date }).toDate === 'function'
      ) {
        result[finalKey] = (value as { toDate: () => Date })
          .toDate()
          .toISOString();
      } else {
        Object.assign(
          result,
          flattenObject(value as Record<string, unknown>, finalKey)
        );
      }
      continue;
    }

    result[finalKey] = value as string | number | boolean;
  }

  return result;
}

function anonymizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 7) {
      return value.replace(/\d(?=\d{2})/g, '*');
    }
  }
  return value;
}

function sanitizeDocument(
  source: Record<string, unknown>,
  anonymize = false
): Record<string, unknown> {
  const blockedKeys =
    /token|secret|password|credential|private|api.?key|session|cookie|authorization/i;

  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(item => walk(item));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, current] of Object.entries(
        value as Record<string, unknown>
      )) {
        if (blockedKeys.test(key)) continue;
        out[key] = walk(current);
      }
      return out;
    }

    return anonymize ? anonymizeValue(value) : value;
  };

  return walk(source) as Record<string, unknown>;
}

function stringifyForText(record: Record<string, unknown>): string {
  return Object.entries(flattenObject(record))
    .map(([key, value]) => `${key}=${value ?? ''}`)
    .join('\n');
}

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/x-ndjson';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
}

function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'json':
      return 'json';
    case 'txt':
      return 'txt';
    case 'xlsx':
      return 'xlsx';
  }
}

async function getSignedDownloadUrl(storagePath: string): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  return url;
}

export class ExportService {
  static getDatasetConfig(datasetKey: string): DatasetConfig {
    const config = DATASET_CONFIGS.find(item => item.key === datasetKey);
    if (!config) {
      throw new Error(`Dataset no soportado: ${datasetKey}`);
    }
    return config;
  }

  static async getEnabledModulesForOrganization(
    organizationId: string,
    systemId = DEFAULT_SYSTEM_ID
  ): Promise<string[] | null> {
    const db = getAdminFirestore();
    const contract = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('contracted_systems')
      .doc(systemId)
      .get();

    if (!contract.exists) return null;
    const modules = contract.data()?.modulesEnabled;
    return Array.isArray(modules) ? (modules as string[]) : null;
  }

  static async listAvailableDatasets(params: {
    organizationId: string;
    systemId?: string;
  }): Promise<ExportDatasetDescriptor[]> {
    const enabledModules = await this.getEnabledModulesForOrganization(
      params.organizationId,
      params.systemId || DEFAULT_SYSTEM_ID
    );

    return DATASET_CONFIGS.filter(dataset => {
      if (!dataset.system_ids.includes(params.systemId || DEFAULT_SYSTEM_ID)) {
        return false;
      }
      if (!dataset.module_feature) return true;
      return !enabledModules || enabledModules.includes(dataset.module_feature);
    }).map(dataset => ({
      key: dataset.key,
      label: dataset.label,
      description: dataset.description,
      module_feature: dataset.module_feature,
      system_ids: dataset.system_ids,
      supported_formats: dataset.supported_formats,
      date_field: dataset.date_field,
      filter_fields: dataset.filter_fields,
      collection_path_hint: dataset.collection_path_hint,
    }));
  }

  static async enforceRateLimit(organizationId: string): Promise<void> {
    const db = getAdminFirestore();
    const oneHourAgo = Timestamp.fromDate(
      new Date(Date.now() - 60 * 60 * 1000)
    );
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('export_jobs')
      .where('requested_at', '>=', oneHourAgo)
      .get();

    if (snapshot.size >= MAX_EXPORTS_PER_HOUR) {
      throw new Error('Se alcanzo el maximo de exportaciones por hora');
    }
  }

  static async createJob(params: {
    organizationId: string;
    systemId?: string;
    userId: string;
    userEmail: string;
    userRole: string;
    datasetKey: string;
    format: ExportFormat;
    filters: ExportFilters;
  }): Promise<ExportJob> {
    await this.enforceRateLimit(params.organizationId);

    const config = this.getDatasetConfig(params.datasetKey);
    if (!config.supported_formats.includes(params.format)) {
      throw new Error('Formato no soportado para el dataset seleccionado');
    }

    const db = getAdminFirestore();
    const now = Timestamp.now();
    const docRef = db
      .collection('organizations')
      .doc(params.organizationId)
      .collection('export_jobs')
      .doc();

    const jobData = {
      organization_id: params.organizationId,
      system_id: params.systemId || DEFAULT_SYSTEM_ID,
      requested_by: params.userId,
      requested_at: now,
      dataset_key: params.datasetKey,
      format: params.format,
      filters: params.filters || {},
      status: 'pending',
      progress: 0,
      storage_paths: [],
      row_count: 0,
      warnings: [],
      error: null,
      run_id: null,
    };

    await docRef.set(jobData);

    await CapabilityService.logCapabilityAudit(params.organizationId, {
      capability_id: 'data-export-backup',
      action: 'export_requested',
      performed_by: params.userId,
      performed_at: new Date(),
      details: {
        dataset_key: params.datasetKey,
        format: params.format,
      },
      previous_state: null,
    });

    await AuditLogService.log({
      user_id: params.userId,
      user_email: params.userEmail,
      user_role: params.userRole,
      organization_id: params.organizationId,
      action: 'export',
      module: 'system',
      resource_type: 'export_job',
      resource_id: docRef.id,
      status: 'success',
      details: {
        dataset_key: params.datasetKey,
        format: params.format,
      },
    });

    return {
      id: docRef.id,
      organization_id: params.organizationId,
      system_id: params.systemId || DEFAULT_SYSTEM_ID,
      requested_by: params.userId,
      requested_at: now.toDate(),
      dataset_key: params.datasetKey,
      format: params.format,
      filters: params.filters || {},
      status: 'pending',
      progress: 0,
      storage_paths: [],
      row_count: 0,
      warnings: [],
      error: null,
      run_id: null,
    };
  }

  static async listJobs(organizationId: string): Promise<{
    jobs: ExportJob[];
    runs: ExportRun[];
  }> {
    const db = getAdminFirestore();
    const [jobsSnap, runsSnap] = await Promise.all([
      db
        .collection('organizations')
        .doc(organizationId)
        .collection('export_jobs')
        .orderBy('requested_at', 'desc')
        .limit(50)
        .get(),
      db
        .collection('organizations')
        .doc(organizationId)
        .collection('export_runs')
        .orderBy('started_at', 'desc')
        .limit(50)
        .get(),
    ]);

    const jobs = jobsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        organization_id: String(data.organization_id),
        system_id: String(data.system_id || DEFAULT_SYSTEM_ID),
        requested_by: String(data.requested_by || ''),
        requested_at: data.requested_at?.toDate() || new Date(),
        dataset_key: String(data.dataset_key),
        format: data.format as ExportFormat,
        filters:
          data.filters && typeof data.filters === 'object'
            ? (data.filters as Record<string, unknown>)
            : {},
        status: data.status as ExportJob['status'],
        progress: Number(data.progress || 0),
        storage_paths: Array.isArray(data.storage_paths)
          ? (data.storage_paths as string[])
          : [],
        row_count: Number(data.row_count || 0),
        warnings: Array.isArray(data.warnings)
          ? (data.warnings as string[])
          : [],
        error: data.error ? String(data.error) : null,
        run_id: data.run_id ? String(data.run_id) : null,
      } as ExportJob;
    });

    const runs = runsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        job_id: String(data.job_id || ''),
        organization_id: String(data.organization_id),
        system_id: String(data.system_id || DEFAULT_SYSTEM_ID),
        dataset_key: String(data.dataset_key),
        format: data.format as ExportFormat,
        started_at: data.started_at?.toDate() || new Date(),
        finished_at: data.finished_at?.toDate() || null,
        status: data.status as ExportRun['status'],
        row_count: Number(data.row_count || 0),
        warnings: Array.isArray(data.warnings)
          ? (data.warnings as string[])
          : [],
        files: Array.isArray(data.files)
          ? (data.files as ExportFileDescriptor[])
          : [],
        summary:
          data.summary && typeof data.summary === 'object'
            ? (data.summary as ExportRun['summary'])
            : undefined,
        error: data.error ? String(data.error) : null,
      } as ExportRun;
    });

    return { jobs, runs };
  }

  static async shouldRunSynchronously(params: {
    organizationId: string;
    datasetKey: string;
    filters: ExportFilters;
  }): Promise<boolean> {
    const rows = await this.fetchDatasetRows({
      organizationId: params.organizationId,
      datasetKey: params.datasetKey,
      filters: params.filters,
      limit: MAX_SYNC_ROWS + 1,
    });
    return rows.length <= MAX_SYNC_ROWS;
  }

  static async runJob(params: {
    organizationId: string;
    jobId: string;
    userEmail?: string;
    userRole?: string;
  }): Promise<ExportRun> {
    const db = getAdminFirestore();
    const jobRef = db
      .collection('organizations')
      .doc(params.organizationId)
      .collection('export_jobs')
      .doc(params.jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      throw new Error('Export job no encontrado');
    }

    const job = jobDoc.data() as Record<string, unknown>;
    const datasetKey = String(job.dataset_key || '');
    const format = job.format as ExportFormat;
    const requestedBy = String(job.requested_by || '');
    const systemId = String(job.system_id || DEFAULT_SYSTEM_ID);
    const filters =
      job.filters && typeof job.filters === 'object'
        ? (job.filters as ExportFilters)
        : {};

    await jobRef.update({
      status: 'running',
      progress: 10,
      updated_at: Timestamp.now(),
    });

    try {
      const rows = await this.fetchDatasetRows({
        organizationId: params.organizationId,
        datasetKey,
        filters,
      });

      if (rows.length > MAX_ROWS_HARD_LIMIT) {
        throw new Error(
          `El dataset supera el limite operativo de ${MAX_ROWS_HARD_LIMIT} filas para este MVP`
        );
      }

      const runRef = db
        .collection('organizations')
        .doc(params.organizationId)
        .collection('export_runs')
        .doc();

      await runRef.set({
        job_id: params.jobId,
        organization_id: params.organizationId,
        system_id: systemId,
        dataset_key: datasetKey,
        format,
        started_at: Timestamp.now(),
        status: 'running',
        row_count: rows.length,
        warnings: [],
        files: [],
      });

      await jobRef.update({
        progress: 35,
        run_id: runRef.id,
      });

      const file = await this.writeDatasetToStorage({
        organizationId: params.organizationId,
        datasetKey,
        format,
        rows,
        storageRoot: `orgs/${params.organizationId}/exports/${params.jobId}`,
      });

      const finishedAt = Timestamp.now();
      await runRef.update({
        status: 'done',
        finished_at: finishedAt,
        row_count: rows.length,
        files: [file],
        summary: {
          period_from: typeof filters.from === 'string' ? filters.from : null,
          period_to: typeof filters.to === 'string' ? filters.to : null,
        },
      });

      await jobRef.update({
        status: 'done',
        progress: 100,
        storage_paths: [file.storage_path],
        row_count: rows.length,
        warnings: [],
        error: null,
        updated_at: finishedAt,
      });

      await CapabilityService.logCapabilityAudit(params.organizationId, {
        capability_id: 'data-export-backup',
        action: 'export_generated',
        performed_by: requestedBy,
        performed_at: new Date(),
        details: {
          dataset_key: datasetKey,
          job_id: params.jobId,
          run_id: runRef.id,
          row_count: rows.length,
        },
        previous_state: null,
      });

      if (params.userEmail && params.userRole) {
        await AuditLogService.log({
          user_id: requestedBy,
          user_email: params.userEmail,
          user_role: params.userRole,
          organization_id: params.organizationId,
          action: 'export',
          module: 'system',
          resource_type: 'export_run',
          resource_id: runRef.id,
          status: 'success',
          details: {
            dataset_key: datasetKey,
            row_count: rows.length,
            format,
          },
        });
      }

      return {
        id: runRef.id,
        job_id: params.jobId,
        organization_id: params.organizationId,
        system_id: systemId,
        dataset_key: datasetKey,
        format,
        started_at: new Date(),
        finished_at: finishedAt.toDate(),
        status: 'done',
        row_count: rows.length,
        warnings: [],
        files: [file],
        summary: {
          period_from: typeof filters.from === 'string' ? filters.from : null,
          period_to: typeof filters.to === 'string' ? filters.to : null,
        },
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      await jobRef.update({
        status: 'failed',
        progress: 100,
        error: message,
        updated_at: Timestamp.now(),
      });
      throw error;
    }
  }

  static async fetchDatasetRows(params: {
    organizationId: string;
    datasetKey: string;
    filters: ExportFilters;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    const db = getAdminFirestore();
    const config = this.getDatasetConfig(params.datasetKey);

    let snapshot;
    if (config.source.kind === 'top-level') {
      snapshot = await db
        .collection(config.source.collection)
        .where(config.source.organizationField, '==', params.organizationId)
        .limit(params.limit || MAX_ROWS_HARD_LIMIT)
        .get();
    } else {
      snapshot = await db
        .collection('organizations')
        .doc(params.organizationId)
        .collection(config.source.subcollection)
        .orderBy(FieldPath.documentId())
        .limit(params.limit || MAX_ROWS_HARD_LIMIT)
        .get();
    }

    const rawRows = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Record<string, unknown>[];

    const fromMs =
      typeof params.filters.from === 'string'
        ? new Date(params.filters.from).getTime()
        : null;
    const toMs =
      typeof params.filters.to === 'string'
        ? new Date(params.filters.to).getTime()
        : null;

    return rawRows
      .filter(row => {
        if (config.date_field) {
          const rowDate = normalizeDate(row[config.date_field]);
          if (rowDate) {
            const rowMs = new Date(rowDate).getTime();
            if (fromMs && rowMs < fromMs) return false;
            if (toMs && rowMs > toMs) return false;
          }
        }

        for (const [key, value] of Object.entries(params.filters)) {
          if (['from', 'to', 'anonymize', 'limit'].includes(key)) continue;
          if (value === undefined || value === null || value === '') continue;

          const current = row[key];
          if (Array.isArray(current)) {
            if (!current.includes(value)) return false;
            continue;
          }

          if (String(current ?? '') !== String(value)) return false;
        }

        return true;
      })
      .map(row => {
        const sanitized = sanitizeDocument(
          row,
          Boolean(params.filters.anonymize)
        );
        return {
          ...sanitized,
          _meta: {
            dataset_key: params.datasetKey,
            source_doc_id: row.id,
            organization_id: params.organizationId,
            exported_at: new Date().toISOString(),
          },
        };
      });
  }

  static async writeDatasetToStorage(params: {
    organizationId: string;
    datasetKey: string;
    format: ExportFormat;
    rows: Record<string, unknown>[];
    storageRoot: string;
  }): Promise<ExportFileDescriptor> {
    const extension = getFileExtension(params.format);
    const storagePath = `${params.storageRoot}/${params.datasetKey}.${extension}`;
    const buffer = this.serializeRows(params.rows, params.format);
    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: getMimeType(params.format),
      },
    });

    const downloadUrl = await getSignedDownloadUrl(storagePath);

    return {
      dataset_key: params.datasetKey,
      format: params.format,
      storage_path: storagePath,
      download_url: downloadUrl,
      row_count: params.rows.length,
      bytes: buffer.byteLength,
      content_type: getMimeType(params.format),
    };
  }

  static serializeRows(
    rows: Record<string, unknown>[],
    format: ExportFormat
  ): Buffer {
    if (format === 'json') {
      const payload = rows.map(row => JSON.stringify(row)).join('\n');
      return Buffer.from(payload, 'utf8');
    }

    if (format === 'txt') {
      const payload = rows.map(row => stringifyForText(row)).join('\n\n');
      return Buffer.from(payload, 'utf8');
    }

    const flatRows = rows.map(row => flattenObject(row));

    if (format === 'csv') {
      const headers = Array.from(
        new Set(flatRows.flatMap(row => Object.keys(row)))
      );
      const csvRows = [
        headers.join(','),
        ...flatRows.map(row =>
          headers
            .map(header => {
              const value = row[header] ?? '';
              const asString = String(value);
              if (
                asString.includes(',') ||
                asString.includes('"') ||
                asString.includes('\n')
              ) {
                return `"${asString.replace(/"/g, '""')}"`;
              }
              return asString;
            })
            .join(',')
        ),
      ];
      return Buffer.from(csvRows.join('\n'), 'utf8');
    }

    const worksheet = XLSX.utils.json_to_sheet(flatRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const arrayBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });
    return Buffer.from(arrayBuffer);
  }

  static buildRestoreExternalKey(params: {
    organizationId: string;
    datasetKey: string;
    backupId: string;
    sourceDocId: string;
  }): string {
    return createHash('sha256')
      .update(
        `${params.organizationId}:${params.datasetKey}:${params.backupId}:${params.sourceDocId}`
      )
      .digest('hex');
  }

  static async readExportFile(
    storagePath: string
  ): Promise<Record<string, unknown>[]> {
    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);
    const [content] = await file.download();
    const rows = content
      .toString('utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line) as Record<string, unknown>);
    return rows;
  }

  static newSnapshotHash(input: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  static makeRunId(): string {
    return randomUUID();
  }
}
