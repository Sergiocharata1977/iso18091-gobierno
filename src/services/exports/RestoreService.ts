import { getAdminFirestore } from '@/lib/firebase/admin';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type { DataRestoreRun, ExportFileDescriptor } from '@/types/exports';
import { Timestamp } from 'firebase-admin/firestore';
import { ExportService } from './ExportService';

function getTargetRef(
  organizationId: string,
  datasetKey: string,
  docId: string
) {
  const db = getAdminFirestore();
  const config = ExportService.getDatasetConfig(datasetKey);
  if (config.source.kind === 'top-level') {
    return db.collection(config.source.collection).doc(docId);
  }
  return db
    .collection('organizations')
    .doc(organizationId)
    .collection(config.source.subcollection)
    .doc(docId);
}

export class RestoreService {
  static async listRuns(organizationId: string): Promise<DataRestoreRun[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('data_restore_runs')
      .orderBy('started_at', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        organization_id: String(data.organization_id),
        system_id: String(data.system_id || 'iso9001'),
        snapshot_id: String(data.snapshot_id || ''),
        mode: data.mode === 'staging' ? 'staging' : 'restore_missing',
        status: data.status || 'pending',
        progress: Number(data.progress || 0),
        created_docs_count: Number(data.created_docs_count || 0),
        skipped_count: Number(data.skipped_count || 0),
        conflicts_count: Number(data.conflicts_count || 0),
        conflicts: Array.isArray(data.conflicts) ? data.conflicts : [],
        started_at: data.started_at?.toDate() || new Date(),
        finished_at: data.finished_at?.toDate() || null,
        created_by: String(data.created_by || ''),
      } as DataRestoreRun;
    });
  }

  static async startRestore(params: {
    organizationId: string;
    systemId?: string;
    userId: string;
    snapshotId: string;
    mode: 'staging' | 'restore_missing';
  }): Promise<DataRestoreRun> {
    const db = getAdminFirestore();
    const snapshotDoc = await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection('backup_snapshots')
      .doc(params.snapshotId)
      .get();

    if (!snapshotDoc.exists) {
      throw new Error('Snapshot no encontrado');
    }

    const snapshotData = snapshotDoc.data() || {};
    const files = Array.isArray(snapshotData.files)
      ? (snapshotData.files as ExportFileDescriptor[])
      : [];

    const restoreRef = db
      .collection('organizations')
      .doc(params.organizationId)
      .collection('data_restore_runs')
      .doc();

    await restoreRef.set({
      organization_id: params.organizationId,
      system_id: params.systemId || 'iso9001',
      snapshot_id: params.snapshotId,
      mode: params.mode,
      status: 'running',
      progress: 0,
      created_docs_count: 0,
      skipped_count: 0,
      conflicts_count: 0,
      conflicts: [],
      started_at: Timestamp.now(),
      created_by: params.userId,
    });

    let created_docs_count = 0;
    let skipped_count = 0;
    const conflicts: Array<{
      dataset_key: string;
      doc_id: string;
      reason: string;
    }> = [];
    let processed = 0;

    for (const file of files) {
      if (file.format !== 'json') {
        conflicts.push({
          dataset_key: file.dataset_key,
          doc_id: '*',
          reason: 'restore_only_supports_json_backups',
        });
        continue;
      }

      const rows = await ExportService.readExportFile(file.storage_path);
      for (const row of rows) {
        const meta = row._meta as Record<string, unknown> | undefined;
        const sourceDocId = String(meta?.source_doc_id || row.id || '');
        if (!sourceDocId) {
          conflicts.push({
            dataset_key: file.dataset_key,
            doc_id: 'unknown',
            reason: 'missing_source_doc_id',
          });
          continue;
        }

        const restoreExternalKey = ExportService.buildRestoreExternalKey({
          organizationId: params.organizationId,
          datasetKey: file.dataset_key,
          backupId: params.snapshotId,
          sourceDocId,
        });

        const payload = { ...row };
        delete payload._meta;

        if (params.mode === 'staging') {
          await restoreRef
            .collection('staging_docs')
            .doc(`${file.dataset_key}__${sourceDocId}`)
            .set({
              dataset_key: file.dataset_key,
              source_doc_id: sourceDocId,
              restore_external_key: restoreExternalKey,
              payload,
              created_at: Timestamp.now(),
            });
          created_docs_count += 1;
          processed += 1;
          continue;
        }

        const targetRef = getTargetRef(
          params.organizationId,
          file.dataset_key,
          sourceDocId
        );
        const currentDoc = await targetRef.get();
        if (currentDoc.exists) {
          skipped_count += 1;
          conflicts.push({
            dataset_key: file.dataset_key,
            doc_id: sourceDocId,
            reason: 'existing_document_not_overwritten',
          });
          await CapabilityService.logCapabilityAudit(params.organizationId, {
            capability_id: 'data-export-backup',
            action: 'restore_conflict',
            performed_by: params.userId,
            performed_at: new Date(),
            details: {
              dataset_key: file.dataset_key,
              doc_id: sourceDocId,
              restore_id: restoreRef.id,
            },
            previous_state: null,
          });
        } else {
          await targetRef.set({
            ...payload,
            organization_id: params.organizationId,
            restore_metadata: {
              snapshot_id: params.snapshotId,
              restore_run_id: restoreRef.id,
              restore_external_key: restoreExternalKey,
              restored_at: Timestamp.now(),
              restored_by: params.userId,
            },
          });
          created_docs_count += 1;
        }

        processed += 1;
      }

      await restoreRef.update({
        progress: Math.min(95, processed * 5),
      });
    }

    const finished_at = Timestamp.now();
    await restoreRef.update({
      status: 'done',
      progress: 100,
      created_docs_count,
      skipped_count,
      conflicts_count: conflicts.length,
      conflicts,
      finished_at,
    });

    await CapabilityService.logCapabilityAudit(params.organizationId, {
      capability_id: 'data-export-backup',
      action: 'restore_completed',
      performed_by: params.userId,
      performed_at: new Date(),
      details: {
        restore_id: restoreRef.id,
        snapshot_id: params.snapshotId,
        mode: params.mode,
        created_docs_count,
        skipped_count,
        conflicts_count: conflicts.length,
      },
      previous_state: null,
    });

    return {
      id: restoreRef.id,
      organization_id: params.organizationId,
      system_id: params.systemId || 'iso9001',
      snapshot_id: params.snapshotId,
      mode: params.mode,
      status: 'done',
      progress: 100,
      created_docs_count,
      skipped_count,
      conflicts_count: conflicts.length,
      conflicts,
      started_at: new Date(),
      finished_at: finished_at.toDate(),
      created_by: params.userId,
    };
  }
}
