/**
 * Audit Findings Service - SDK Module
 *
 * Service for managing findings associated with audits
 * Handles creation, linking, and management of findings from audit non-conformities
 */

import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Finding } from '../findings/types';

/**
 * Input for creating a finding from an audit
 */
export interface CreateFindingFromAuditInput {
  normPointCode: string;
  conformityStatus: string;
  description: string;
  processes: string[];
  observations?: string;
}

/**
 * Input for linking a finding to an audit
 */
export interface LinkFindingToAuditInput {
  findingId: string;
  auditId: string;
}

/**
 * Audit Findings Service
 * Manages findings associated with audits
 */
export class AuditFindingsService extends BaseService<Finding> {
  protected collectionName = 'findings';
  protected schema = z.object({});

  constructor() {
    super();
  }

  /**
   * Create a finding from an audit non-conformity
   * @param auditId - Audit ID
   * @param data - Finding creation data
   * @param userId - ID of user creating the finding
   * @returns Created finding ID
   */
  async createFindingFromAudit(
    auditId: string,
    data: CreateFindingFromAuditInput,
    userId: string
  ): Promise<string> {
    try {
      // Validate audit exists
      const auditRef = this.db.collection('audits').doc(auditId);
      const auditDoc = await auditRef.get();

      if (!auditDoc.exists) {
        throw new Error('Auditoría no encontrada');
      }

      const audit = auditDoc.data() as any;

      // Generate finding number
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const findingNumber = `HAL-${year}-${String(timestamp).slice(-5)}`;

      const now = Timestamp.now();
      const findingData: any = {
        findingNumber,

        // Phase 1: Registration
        registration: {
          origin: `Auditoría ${audit.auditNumber || audit.title}`,
          name: `No conformidad en punto ${data.normPointCode}`,
          description: data.description,
          processId: null,
          processName: null,
          source: 'audit',
          sourceId: auditId,
        },

        // Phase 2: Immediate Action Planning (null initially)
        immediateActionPlanning: null,

        // Phase 3: Immediate Action Execution (null initially)
        immediateActionExecution: null,

        // Phase 4: Root Cause Analysis (null initially)
        rootCauseAnalysis: null,

        // Status and progress
        status: 'registrado',
        currentPhase: 'registered',
        progress: 0,

        // Audit-specific fields
        auditId,
        auditNumber: audit.auditNumber,
        normPointCode: data.normPointCode,
        conformityStatus: data.conformityStatus,
        processes: data.processes,
        observations: data.observations || null,

        // Audit fields
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        createdByName: userId,
        updatedBy: null,
        updatedByName: null,
        isActive: true,
      };

      const docRef = await this.db
        .collection(this.collectionName)
        .add(findingData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating finding from audit:', error);
      throw error;
    }
  }

  /**
   * List findings for an audit
   * @param auditId - Audit ID
   * @param filters - Filter criteria
   * @returns Array of findings
   */
  async listAuditFindings(
    auditId: string,
    filters: Record<string, any> = {}
  ): Promise<Finding[]> {
    try {
      let query: any = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .where('auditId', '==', auditId);

      // Apply status filter
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply conformity status filter
      if (filters.conformityStatus) {
        query = query.where('conformityStatus', '==', filters.conformityStatus);
      }

      // Apply ordering
      query = query.orderBy('createdAt', 'desc');

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();

      const findings = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Finding[];

      // In-memory search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return findings.filter(
          finding =>
            finding.registration?.name?.toLowerCase().includes(searchLower) ||
            finding.registration?.description
              ?.toLowerCase()
              .includes(searchLower) ||
            finding.findingNumber?.toLowerCase().includes(searchLower)
        );
      }

      return findings;
    } catch (error) {
      console.error('Error listing audit findings:', error);
      throw error;
    }
  }

  /**
   * Get findings by conformity status for an audit
   * @param auditId - Audit ID
   * @param conformityStatus - Conformity status
   * @returns Array of findings
   */
  async getFindingsByConformityStatus(
    auditId: string,
    conformityStatus: string
  ): Promise<Finding[]> {
    try {
      const query = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .where('auditId', '==', auditId)
        .where('conformityStatus', '==', conformityStatus)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Finding[];
    } catch (error) {
      console.error('Error getting findings by conformity status:', error);
      throw error;
    }
  }

  /**
   * Link an existing finding to an audit
   * @param findingId - Finding ID
   * @param auditId - Audit ID
   */
  async linkFindingToAudit(findingId: string, auditId: string): Promise<void> {
    try {
      // Validate finding exists
      const findingDoc = await this.db
        .collection(this.collectionName)
        .doc(findingId)
        .get();

      if (!findingDoc.exists) {
        throw new Error('Hallazgo no encontrado');
      }

      // Validate audit exists
      const auditDoc = await this.db.collection('audits').doc(auditId).get();

      if (!auditDoc.exists) {
        throw new Error('Auditoría no encontrada');
      }

      const audit = auditDoc.data() as any;

      // Update finding with audit reference
      await this.db.collection(this.collectionName).doc(findingId).update({
        auditId,
        auditNumber: audit.auditNumber,
        source: 'audit',
        sourceId: auditId,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error linking finding to audit:', error);
      throw error;
    }
  }

  /**
   * Get findings statistics for an audit
   * @param auditId - Audit ID
   * @returns Statistics object
   */
  async getAuditFindingsStats(auditId: string): Promise<Record<string, any>> {
    try {
      const findings = await this.listAuditFindings(auditId, { limit: 1000 });

      const stats = {
        total: findings.length,
        byStatus: {
          registrado: 0,
          accion_planificada: 0,
          accion_ejecutada: 0,
          analisis_completado: 0,
          cerrado: 0,
        },
        byConformityStatus: {
          NCM: 0,
          NCm: 0,
          NCT: 0,
          R: 0,
          OM: 0,
        },
        averageProgress: 0,
        requiresActionCount: 0,
        closedCount: 0,
      };

      let totalProgress = 0;

      findings.forEach((finding: any) => {
        // Count by status
        if (finding.status in stats.byStatus) {
          (stats.byStatus as Record<string, number>)[finding.status]++;
        }

        // Count by conformity status
        if (
          finding.conformityStatus &&
          finding.conformityStatus in stats.byConformityStatus
        ) {
          (stats.byConformityStatus as Record<string, number>)[
            finding.conformityStatus
          ]++;
        }

        // Total progress
        totalProgress += finding.progress || 0;

        // Requires action
        if (finding.rootCauseAnalysis?.requiresAction) {
          stats.requiresActionCount++;
        }

        // Closed
        if (finding.status === 'cerrado') {
          stats.closedCount++;
        }
      });

      stats.averageProgress =
        findings.length > 0 ? Math.round(totalProgress / findings.length) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting audit findings stats:', error);
      throw error;
    }
  }

  /**
   * Get findings count by conformity status for an audit
   * @param auditId - Audit ID
   * @returns Count by conformity status
   */
  async getConformityStatusCounts(
    auditId: string
  ): Promise<Record<string, number>> {
    try {
      const findings = await this.listAuditFindings(auditId, { limit: 1000 });

      const counts: Record<string, number> = {
        NCM: 0,
        NCm: 0,
        NCT: 0,
        R: 0,
        OM: 0,
      };

      findings.forEach((finding: any) => {
        if (finding.conformityStatus && finding.conformityStatus in counts) {
          counts[finding.conformityStatus]++;
        }
      });

      return counts;
    } catch (error) {
      console.error('Error getting conformity status counts:', error);
      throw error;
    }
  }

  /**
   * Delete finding (soft delete)
   * @param findingId - Finding ID
   */
  async deleteFinding(findingId: string): Promise<void> {
    try {
      const findingDoc = await this.db
        .collection(this.collectionName)
        .doc(findingId)
        .get();

      if (!findingDoc.exists) {
        throw new Error('Hallazgo no encontrado');
      }

      await this.db.collection(this.collectionName).doc(findingId).update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting finding:', error);
      throw error;
    }
  }

  /**
   * Update finding status
   * @param findingId - Finding ID
   * @param status - New status
   * @param userId - ID of user updating
   */
  async updateFindingStatus(
    findingId: string,
    status: string,
    userId: string
  ): Promise<void> {
    try {
      const findingDoc = await this.db
        .collection(this.collectionName)
        .doc(findingId)
        .get();

      if (!findingDoc.exists) {
        throw new Error('Hallazgo no encontrado');
      }

      await this.db.collection(this.collectionName).doc(findingId).update({
        status,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId,
      });
    } catch (error) {
      console.error('Error updating finding status:', error);
      throw error;
    }
  }
}
