import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type { BackupSnapshot } from '@/types/exports';
import { Timestamp } from 'firebase-admin/firestore';
import { ExportService } from './ExportService';

export class BackupService {
  static async listSnapshots(
    organizationId: string
  ): Promise<BackupSnapshot[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('backup_snapshots')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        organization_id: String(data.organization_id),
        system_id: String(data.system_id || 'iso9001'),
        created_by: String(data.created_by || ''),
        created_at: data.created_at?.toDate() || new Date(),
        included_datasets: Array.isArray(data.included_datasets)
          ? (data.included_datasets as string[])
          : [],
        files: Array.isArray(data.files) ? data.files : [],
        hash_global: String(data.hash_global || ''),
        retention_policy: {
          days: Number(data.retention_policy?.days || 30),
          max_backups: Number(data.retention_policy?.max_backups || 20),
        },
        expires_at: data.expires_at?.toDate() || new Date(),
        counts:
          data.counts && typeof data.counts === 'object'
            ? (data.counts as Record<string, number>)
            : {},
        mode: data.mode === 'partial' ? 'partial' : 'full',
      } as BackupSnapshot;
    });
  }

  static async createSnapshot(params: {
    organizationId: string;
    systemId?: string;
    userId: string;
    datasets: string[];
    format?: 'json' | 'xlsx';
    retentionDays?: number;
    maxBackups?: number;
  }): Promise<BackupSnapshot> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const datasets = params.datasets.length
      ? params.datasets
      : (
          await ExportService.listAvailableDatasets({
            organizationId: params.organizationId,
            systemId: params.systemId || 'iso9001',
          })
        ).map(item => item.key);

    const files = [];
    const counts: Record<string, number> = {};
    const snapshotRef = db
      .collection('organizations')
      .doc(params.organizationId)
      .collection('backup_snapshots')
      .doc();

    for (const datasetKey of datasets) {
      const rows = await ExportService.fetchDatasetRows({
        organizationId: params.organizationId,
        datasetKey,
        filters: {},
      });

      const file = await ExportService.writeDatasetToStorage({
        organizationId: params.organizationId,
        datasetKey,
        format: params.format || 'json',
        rows,
        storageRoot: `orgs/${params.organizationId}/backups/${snapshotRef.id}`,
      });

      files.push(file);
      counts[datasetKey] = rows.length;
    }

    const retention_policy = {
      days: params.retentionDays || 30,
      max_backups: params.maxBackups || 20,
    };
    const expires_at = Timestamp.fromDate(
      new Date(Date.now() + retention_policy.days * 24 * 60 * 60 * 1000)
    );
    const hash_global = ExportService.newSnapshotHash({
      organizationId: params.organizationId,
      datasets,
      files,
      counts,
    });

    const payload = {
      organization_id: params.organizationId,
      system_id: params.systemId || 'iso9001',
      created_by: params.userId,
      created_at: now,
      included_datasets: datasets,
      files,
      counts,
      hash_global,
      retention_policy,
      expires_at,
      mode: datasets.length > 1 ? 'full' : 'partial',
    };

    await snapshotRef.set(payload);
    await this.cleanupRetention(
      params.organizationId,
      retention_policy.max_backups
    );

    await CapabilityService.logCapabilityAudit(params.organizationId, {
      capability_id: 'data-export-backup',
      action: 'backup_created',
      performed_by: params.userId,
      performed_at: new Date(),
      details: {
        snapshot_id: snapshotRef.id,
        datasets,
        counts,
      },
      previous_state: null,
    });

    return {
      id: snapshotRef.id,
      organization_id: params.organizationId,
      system_id: params.systemId || 'iso9001',
      created_by: params.userId,
      created_at: now.toDate(),
      included_datasets: datasets,
      files,
      hash_global,
      retention_policy,
      expires_at: expires_at.toDate(),
      counts,
      mode: datasets.length > 1 ? 'full' : 'partial',
    };
  }

  static async cleanupRetention(
    organizationId: string,
    maxBackups: number
  ): Promise<void> {
    const db = getAdminFirestore();
    const bucket = getAdminStorage().bucket();
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('backup_snapshots')
      .orderBy('created_at', 'desc')
      .get();

    const now = Date.now();
    const docsToDelete = snapshot.docs.filter((doc, index) => {
      const data = doc.data();
      const expiresAt = data.expires_at?.toDate?.();
      const expired = expiresAt instanceof Date && expiresAt.getTime() < now;
      const overflow = index >= maxBackups;
      return expired || overflow;
    });

    for (const doc of docsToDelete) {
      const data = doc.data();
      const files = Array.isArray(data.files) ? data.files : [];
      for (const file of files) {
        if (typeof file?.storage_path === 'string') {
          await bucket.file(file.storage_path).delete({ ignoreNotFound: true });
        }
      }
      await doc.ref.delete();
    }
  }
}
