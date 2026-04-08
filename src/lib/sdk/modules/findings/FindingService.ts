/**
 * Finding Service - SDK Module
 *
 * Service for managing findings using the unified SDK pattern
 * Extends BaseService with finding-specific operations
 * Supports 4 phases: registration, immediate action planning, execution, and root cause analysis
 */

import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import type {
  Finding,
  FindingStatus,
  CreateFindingInput,
  UpdateFindingImmediateActionPlanningInput,
  UpdateFindingImmediateActionExecutionInput,
  UpdateFindingRootCauseAnalysisInput,
  FindingFilters,
  FindingStats,
} from './types';
import {
  CreateFindingSchema,
  UpdateFindingImmediateActionPlanningSchema,
  UpdateFindingImmediateActionExecutionSchema,
  UpdateFindingRootCauseAnalysisSchema,
} from './validations';

/**
 * Finding Service
 * Manages all finding-related operations with 4-phase workflow
 */
export class FindingService extends BaseService<Finding> {
  protected collectionName = 'findings';
  protected schema = CreateFindingSchema;

  constructor() {
    super();
  }

  /**
   * Create a new finding
   * @param data - Finding creation data
   * @param userId - ID of user creating the finding
   * @returns Created finding ID
   */
  async createAndReturnId(
    data: CreateFindingInput,
    userId: string
  ): Promise<string> {
    try {
      // Validate data
      const validated = CreateFindingSchema.parse(data);

      // Generate finding number (format: HAL-YYYY-XXXXX)
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const findingNumber = `HAL-${year}-${String(timestamp).slice(-5)}`;

      const now = Timestamp.now();
      const findingData: any = {
        findingNumber,

        // Phase 1: Registration
        registration: {
          origin: validated.origin,
          name: validated.name,
          description: validated.description,
          processId: validated.processId || null,
          processName: validated.processName || null,
          source: validated.source,
          sourceId: validated.sourceId || null,
        },

        // Phase 2: Immediate Action Planning (null initially)
        immediateActionPlanning: null,

        // Phase 3: Immediate Action Execution (null initially)
        immediateActionExecution: null,

        // Phase 4: Root Cause Analysis (null initially)
        rootCauseAnalysis: null,

        // Status and progress
        status: 'registrado' as FindingStatus,
        currentPhase: 'registered',
        progress: 0,

        // Audit fields
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        createdByName: userId, // TODO: Get real user name
        updatedBy: null,
        updatedByName: null,
        isActive: true,
      };

      const docRef = await this.db
        .collection(this.collectionName)
        .add(findingData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating finding:', error);
      throw error;
    }
  }

  /**
   * List findings with filters
   * @param filters - Filter criteria
   * @param options - Pagination options
   * @returns Array of findings
   */
  async list(
    filters: Record<string, any> = {},
    options: any = {}
  ): Promise<Finding[]> {
    try {
      let query: any = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true);

      // Apply status filter
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply process filter
      if (filters.processId) {
        query = query.where('registration.processId', '==', filters.processId);
      }

      // Apply source filter
      if (filters.sourceId) {
        query = query.where('registration.sourceId', '==', filters.sourceId);
      }

      // Apply year filter
      if (filters.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31, 23, 59, 59);
        query = query
          .where('createdAt', '>=', Timestamp.fromDate(startDate))
          .where('createdAt', '<=', Timestamp.fromDate(endDate));
      }

      // Apply ordering
      query = query.orderBy('createdAt', 'desc');

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
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

      // In-memory requiresAction filter
      if (filters.requiresAction !== undefined) {
        return findings.filter(
          finding =>
            finding.rootCauseAnalysis?.requiresAction === filters.requiresAction
        );
      }

      return findings;
    } catch (error) {
      console.error('Error listing findings:', error);
      throw error;
    }
  }

  /**
   * Get finding by ID
   * @param id - Finding ID
   * @returns Finding or null
   */
  async getById(id: string): Promise<Finding | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as Finding;
    } catch (error) {
      console.error('Error getting finding:', error);
      throw error;
    }
  }

  /**
   * Update immediate action planning (Phase 2)
   * @param id - Finding ID
   * @param data - Planning data
   * @param userId - ID of user updating
   */
  async updateImmediateActionPlanning(
    id: string,
    data: UpdateFindingImmediateActionPlanningInput,
    userId: string
  ): Promise<void> {
    try {
      const finding = await this.getById(id);

      if (!finding) {
        throw new Error('Hallazgo no encontrado');
      }

      // Validate data
      const validated = UpdateFindingImmediateActionPlanningSchema.parse(data);

      const immediateActionPlanning = {
        responsiblePersonId: validated.responsiblePersonId,
        responsiblePersonName: validated.responsiblePersonName,
        plannedDate: Timestamp.fromDate(validated.plannedDate),
        comments: validated.comments || null,
      };

      await this.db.collection(this.collectionName).doc(id).update({
        immediateActionPlanning,
        status: 'accion_planificada',
        currentPhase: 'immediate_action_planned',
        progress: 25,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId, // TODO: Get real user name
      });
    } catch (error) {
      console.error('Error updating immediate action planning:', error);
      throw error;
    }
  }

  /**
   * Update immediate action execution (Phase 3)
   * @param id - Finding ID
   * @param data - Execution data
   * @param userId - ID of user updating
   */
  async updateImmediateActionExecution(
    id: string,
    data: UpdateFindingImmediateActionExecutionInput,
    userId: string
  ): Promise<void> {
    try {
      const finding = await this.getById(id);

      if (!finding) {
        throw new Error('Hallazgo no encontrado');
      }

      // Validate data
      const validated = UpdateFindingImmediateActionExecutionSchema.parse(data);

      const immediateActionExecution = {
        executionDate: Timestamp.fromDate(validated.executionDate),
        correction: validated.correction,
        executedBy: userId,
        executedByName: userId, // TODO: Get real user name
      };

      await this.db.collection(this.collectionName).doc(id).update({
        immediateActionExecution,
        status: 'accion_ejecutada',
        currentPhase: 'immediate_action_executed',
        progress: 50,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId, // TODO: Get real user name
      });
    } catch (error) {
      console.error('Error updating immediate action execution:', error);
      throw error;
    }
  }

  /**
   * Update root cause analysis (Phase 4)
   * @param id - Finding ID
   * @param data - Analysis data
   * @param userId - ID of user updating
   */
  async updateRootCauseAnalysis(
    id: string,
    data: UpdateFindingRootCauseAnalysisInput,
    userId: string
  ): Promise<void> {
    try {
      const finding = await this.getById(id);

      if (!finding) {
        throw new Error('Hallazgo no encontrado');
      }

      // Validate data
      const validated = UpdateFindingRootCauseAnalysisSchema.parse(data);

      const rootCauseAnalysis = {
        analysis: validated.analysis,
        requiresAction: validated.requiresAction,
        analyzedBy: userId,
        analyzedByName: userId, // TODO: Get real user name
        analyzedDate: Timestamp.now(),
      };

      await this.db.collection(this.collectionName).doc(id).update({
        rootCauseAnalysis,
        status: 'analisis_completado',
        currentPhase: 'root_cause_analyzed',
        progress: 75,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId, // TODO: Get real user name
      });
    } catch (error) {
      console.error('Error updating root cause analysis:', error);
      throw error;
    }
  }

  /**
   * Close finding
   * @param id - Finding ID
   * @param userId - ID of user closing
   */
  async close(id: string, userId: string): Promise<void> {
    try {
      const finding = await this.getById(id);

      if (!finding) {
        throw new Error('Hallazgo no encontrado');
      }

      await this.db.collection(this.collectionName).doc(id).update({
        status: 'cerrado',
        currentPhase: 'closed',
        progress: 100,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userId, // TODO: Get real user name
      });
    } catch (error) {
      console.error('Error closing finding:', error);
      throw error;
    }
  }

  /**
   * Delete finding (soft delete)
   * @param id - Finding ID
   */
  async delete(id: string): Promise<void> {
    try {
      const finding = await this.getById(id);

      if (!finding) {
        throw new Error('Hallazgo no encontrado');
      }

      await this.db.collection(this.collectionName).doc(id).update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting finding:', error);
      throw error;
    }
  }

  /**
   * Get finding statistics
   * @param filters - Filter criteria
   * @returns Finding statistics
   */
  async getStats(filters: Record<string, any> = {}): Promise<FindingStats> {
    try {
      const findings = await this.list(filters, { limit: 1000 });

      const stats: FindingStats = {
        total: findings.length,
        byStatus: {
          registrado: 0,
          accion_planificada: 0,
          accion_ejecutada: 0,
          analisis_completado: 0,
          cerrado: 0,
        },
        byProcess: {},
        averageProgress: 0,
        requiresActionCount: 0,
        closedCount: 0,
      };

      let totalProgress = 0;

      findings.forEach(finding => {
        // Count by status
        stats.byStatus[finding.status]++;

        // Count by process
        if (finding.registration?.processName) {
          stats.byProcess[finding.registration.processName] =
            (stats.byProcess[finding.registration.processName] || 0) + 1;
        }

        // Total progress
        totalProgress += finding.progress;

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
      console.error('Error getting finding stats:', error);
      throw error;
    }
  }
}
