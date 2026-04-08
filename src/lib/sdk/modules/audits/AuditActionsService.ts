/**
 * Audit Actions Service - SDK Module
 *
 * Service for managing corrective actions associated with audits
 * Handles creation, tracking, and management of actions from audit findings
 */

import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Action } from '../actions/types';

/**
 * Input for creating an action from a finding
 */
export interface CreateActionFromFindingInput {
  findingId: string;
  title: string;
  description: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Date;
  priority: 'alta' | 'media' | 'baja';
  comments?: string;
}

/**
 * Input for updating action status
 */
export interface UpdateActionStatusInput {
  status: 'planificada' | 'en_ejecucion' | 'completada' | 'cancelada';
  comments?: string;
}

/**
 * Input for tracking action progress
 */
export interface TrackActionProgressInput {
  percentageComplete: number;
  comments?: string;
}

/**
 * Input for closing an action
 */
export interface CloseActionInput {
  evidence: string;
  comments?: string;
}

/**
 * Action progress information
 */
export interface ActionProgress {
  actionId: string;
  status: string;
  percentageComplete: number;
  startDate: Date | null;
  plannedDate: Date;
  completionDate: Date | null;
  daysRemaining: number;
  isOverdue: boolean;
}

/**
 * Audit Actions Service
 * Manages corrective actions associated with audits
 */
export class AuditActionsService extends BaseService<Action> {
  protected collectionName = 'actions';
  protected schema = z.object({});

  constructor() {
    super();
  }

  /**
   * Create an action from a finding
   * @param auditId - Audit ID
   * @param data - Action creation data
   * @param userId - ID of user creating the action
   * @returns Created action ID
   */
  async createActionFromFinding(
    auditId: string,
    data: CreateActionFromFindingInput,
    userId: string
  ): Promise<string> {
    try {
      // Validate finding exists
      const findingDoc = await this.db
        .collection('findings')
        .doc(data.findingId)
        .get();

      if (!findingDoc.exists) {
        throw new Error('Hallazgo no encontrado');
      }

      const finding = findingDoc.data() as any;

      // Validate audit exists
      const auditDoc = await this.db.collection('audits').doc(auditId).get();

      if (!auditDoc.exists) {
        throw new Error('Auditoría no encontrada');
      }

      const audit = auditDoc.data() as any;

      // Generate action number
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const actionNumber = `ACC-${year}-${String(timestamp).slice(-5)}`;

      const now = Timestamp.now();
      const actionData: any = {
        actionNumber,
        title: data.title,
        description: data.description,
        priority: data.priority,

        // Relationships
        auditId,
        auditNumber: audit.auditNumber,
        findingId: data.findingId,
        findingNumber: finding.findingNumber,

        // Responsible
        responsiblePersonId: data.responsiblePersonId,
        responsiblePersonName: data.responsiblePersonName,

        // Dates
        plannedDate: Timestamp.fromDate(data.plannedDate),
        startDate: null,
        completionDate: null,

        // Status
        status: 'planificada',
        percentageComplete: 0,

        // Tracking
        comments: data.comments || null,
        evidence: null,

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
        .add(actionData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating action from finding:', error);
      throw error;
    }
  }

  /**
   * List actions for an audit
   * @param auditId - Audit ID
   * @param filters - Filter criteria
   * @returns Array of actions
   */
  async listAuditActions(
    auditId: string,
    filters: Record<string, any> = {}
  ): Promise<Action[]> {
    try {
      let query: any = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .where('auditId', '==', auditId);

      // Apply status filter
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply priority filter
      if (filters.priority) {
        query = query.where('priority', '==', filters.priority);
      }

      // Apply responsible person filter
      if (filters.responsiblePersonId) {
        query = query.where(
          'responsiblePersonId',
          '==',
          filters.responsiblePersonId
        );
      }

      // Apply ordering
      query = query.orderBy('plannedDate', 'asc');

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();

      const actions = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Action[];

      // In-memory search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return actions.filter(
          action =>
            action.title?.toLowerCase().includes(searchLower) ||
            action.description?.toLowerCase().includes(searchLower) ||
            action.actionNumber?.toLowerCase().includes(searchLower)
        );
      }

      return actions;
    } catch (error) {
      console.error('Error listing audit actions:', error);
      throw error;
    }
  }

  /**
   * Update action status
   * @param actionId - Action ID
   * @param data - Status update data
   * @param userId - ID of user updating
   */
  async updateActionStatus(
    actionId: string,
    data: UpdateActionStatusInput,
    userId: string
  ): Promise<void> {
    try {
      const actionDoc = await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .get();

      if (!actionDoc.exists) {
        throw new Error('Acción no encontrada');
      }

      const updateData: Record<string, any> = {
        status: data.status,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId,
      };

      // Set start date if transitioning to en_ejecucion
      if (data.status === 'en_ejecucion') {
        updateData.startDate = Timestamp.now();
      }

      // Set completion date if transitioning to completada
      if (data.status === 'completada') {
        updateData.completionDate = Timestamp.now();
        updateData.percentageComplete = 100;
      }

      // Add comments if provided
      if (data.comments) {
        updateData.comments = data.comments;
      }

      await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .update(updateData);
    } catch (error) {
      console.error('Error updating action status:', error);
      throw error;
    }
  }

  /**
   * Track action progress
   * @param actionId - Action ID
   * @param data - Progress data
   * @param userId - ID of user updating
   */
  async trackActionProgress(
    actionId: string,
    data: TrackActionProgressInput,
    userId: string
  ): Promise<void> {
    try {
      const actionDoc = await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .get();

      if (!actionDoc.exists) {
        throw new Error('Acción no encontrada');
      }

      const updateData: Record<string, any> = {
        percentageComplete: Math.min(100, Math.max(0, data.percentageComplete)),
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId,
      };

      // Set status to en_ejecucion if not already
      const action = actionDoc.data() as any;
      if (action.status === 'planificada' && data.percentageComplete > 0) {
        updateData.status = 'en_ejecucion';
        updateData.startDate = Timestamp.now();
      }

      // Add comments if provided
      if (data.comments) {
        updateData.comments = data.comments;
      }

      await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .update(updateData);
    } catch (error) {
      console.error('Error tracking action progress:', error);
      throw error;
    }
  }

  /**
   * Get action progress information
   * @param actionId - Action ID
   * @returns Action progress
   */
  async getActionProgress(actionId: string): Promise<ActionProgress> {
    try {
      const actionDoc = await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .get();

      if (!actionDoc.exists) {
        throw new Error('Acción no encontrada');
      }

      const action = actionDoc.data() as any;
      const plannedDate = action.plannedDate?.toDate() || new Date();
      const today = new Date();
      const daysRemaining = Math.ceil(
        (plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        actionId,
        status: action.status,
        percentageComplete: action.percentageComplete || 0,
        startDate: action.startDate?.toDate() || null,
        plannedDate,
        completionDate: action.completionDate?.toDate() || null,
        daysRemaining,
        isOverdue: daysRemaining < 0 && action.status !== 'completada',
      };
    } catch (error) {
      console.error('Error getting action progress:', error);
      throw error;
    }
  }

  /**
   * Close an action with evidence
   * @param actionId - Action ID
   * @param data - Closing data
   * @param userId - ID of user closing
   */
  async closeAction(
    actionId: string,
    data: CloseActionInput,
    userId: string
  ): Promise<void> {
    try {
      const actionDoc = await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .get();

      if (!actionDoc.exists) {
        throw new Error('Acción no encontrada');
      }

      await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .update({
          status: 'completada',
          percentageComplete: 100,
          evidence: data.evidence,
          comments: data.comments || null,
          completionDate: Timestamp.now(),
          updatedAt: Timestamp.now(),
          updatedBy: userId,
          updatedByName: userId,
        });
    } catch (error) {
      console.error('Error closing action:', error);
      throw error;
    }
  }

  /**
   * Get actions statistics for an audit
   * @param auditId - Audit ID
   * @returns Statistics object
   */
  async getAuditActionsStats(auditId: string): Promise<Record<string, any>> {
    try {
      const actions = await this.listAuditActions(auditId, { limit: 1000 });

      const stats = {
        total: actions.length,
        byStatus: {
          planificada: 0,
          en_ejecucion: 0,
          completada: 0,
          cancelada: 0,
        },
        byPriority: {
          alta: 0,
          media: 0,
          baja: 0,
        },
        averageProgress: 0,
        overdueCount: 0,
        completedCount: 0,
      };

      let totalProgress = 0;
      const today = new Date();

      actions.forEach((action: any) => {
        // Count by status
        if (action.status in stats.byStatus) {
          (stats.byStatus as Record<string, number>)[action.status]++;
        }

        // Count by priority
        if (action.priority in stats.byPriority) {
          (stats.byPriority as Record<string, number>)[action.priority]++;
        }

        // Total progress
        totalProgress += action.percentageComplete || 0;

        // Overdue count
        const plannedDate =
          action.plannedDate?.toDate?.() || new Date(action.plannedDate);
        if (plannedDate < today && action.status !== 'completada') {
          stats.overdueCount++;
        }

        // Completed count
        if (action.status === 'completada') {
          stats.completedCount++;
        }
      });

      stats.averageProgress =
        actions.length > 0 ? Math.round(totalProgress / actions.length) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting audit actions stats:', error);
      throw error;
    }
  }

  /**
   * Get overdue actions for an audit
   * @param auditId - Audit ID
   * @returns Array of overdue actions
   */
  async getOverdueActions(auditId: string): Promise<Action[]> {
    try {
      const actions = await this.listAuditActions(auditId, { limit: 1000 });
      const today = new Date();

      return actions.filter((action: any) => {
        const plannedDate =
          action.plannedDate?.toDate?.() || new Date(action.plannedDate);
        return plannedDate < today && action.status !== 'completada';
      });
    } catch (error) {
      console.error('Error getting overdue actions:', error);
      throw error;
    }
  }

  /**
   * Delete action (soft delete)
   * @param actionId - Action ID
   */
  async deleteAction(actionId: string): Promise<void> {
    try {
      const actionDoc = await this.db
        .collection(this.collectionName)
        .doc(actionId)
        .get();

      if (!actionDoc.exists) {
        throw new Error('Acción no encontrada');
      }

      await this.db.collection(this.collectionName).doc(actionId).update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting action:', error);
      throw error;
    }
  }
}
