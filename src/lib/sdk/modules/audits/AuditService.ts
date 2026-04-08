/**
 * Audit Service - SDK Module
 *
 * Service for managing audits using the unified SDK pattern
 * Extends BaseService with audit-specific operations
 */

import { Timestamp } from 'firebase-admin/firestore';
import { BaseService } from '../../base/BaseService';
import type {
  Audit,
  AuditAdvancedFilters,
  AuditStats,
  AuditStatus,
  AuditTrend,
  ConformityStats,
  ConformityStatus,
  CreateAuditInput,
  NormPointVerification,
  StartExecutionInput,
  UpdateAuditInput,
  UpdateMeetingInput,
  UpdateNormPointVerificationInput,
  UpdateReportDeliveryInput,
  ValidationResult,
} from './types';
import { CreateAuditSchema, UpdateAuditSchema } from './validations';

/**
 * Audit Service
 * Manages all audit-related operations
 */
export class AuditService extends BaseService<Audit> {
  protected collectionName = 'audits';
  protected schema = CreateAuditSchema;

  constructor() {
    super();
  }

  /**
   * Create a new audit
   * @param data - Audit creation data
   * @param userId - ID of user creating the audit
   * @returns Created audit ID
   */
  async createAndReturnId(
    data: CreateAuditInput & { organization_id: string },
    userId: string
  ): Promise<string> {
    try {
      // Validate data
      const validated = CreateAuditSchema.parse(data);

      // Generate audit number (simple format: AUD-YYYY-XXXXX)
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const auditNumber = `AUD-${year}-${String(timestamp).slice(-5)}`;

      // Determine norm points to audit
      let normPointsToAudit: string[] = [];
      if (validated.auditType === 'complete') {
        // For complete audits, load all ISO 9001 norm points from collection
        const normPointsSnapshot = await this.db
          .collection('norm_points')
          .where('tipo_norma', '==', 'iso_9001')
          .where('is_mandatory', '==', true)
          .get();

        normPointsToAudit = normPointsSnapshot.docs.map(doc => doc.data().code);
      } else {
        // For partial audits, use selected ones
        normPointsToAudit = validated.selectedNormPoints;
      }

      // Initialize norm point verifications
      const normPointsVerification: NormPointVerification[] =
        normPointsToAudit.map(code => ({
          normPointCode: code,
          normPointId: null,
          conformityStatus: null,
          processes: [],
          processIds: null,
          observations: null,
          verifiedAt: null,
          verifiedBy: null,
          verifiedByName: null,
        }));

      const now = Timestamp.now();
      const auditData: any = {
        auditNumber,
        organization_id: data.organization_id, // Add organization_id
        title: validated.title,
        auditType: validated.auditType,
        scope: validated.scope,
        plannedDate: Timestamp.fromDate(validated.plannedDate),
        leadAuditor: validated.leadAuditor,
        leadAuditorId: null,
        normas: validated.normas?.length ? validated.normas : undefined,
        selectedNormPoints: normPointsToAudit,

        // Execution fields
        executionDate: null,
        normPointsVerification,
        openingMeeting: null,
        closingMeeting: null,
        reportDelivery: null,
        previousActionsVerification: null,
        observations: null,

        // Status
        status: 'planned' as AuditStatus,

        // Audit fields
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
      };

      const docRef = await this.db
        .collection(this.collectionName)
        .add(auditData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating audit:', error);
      throw error;
    }
  }

  /**
   * List audits with filters
   * @param filters - Filter criteria
   * @param options - Pagination options
   * @returns Array of audits
   */
  async list(
    filters: Record<string, any> = {},
    options: any = {}
  ): Promise<Audit[]> {
    try {
      // Start with base query - NO isActive filter to avoid composite index requirement
      let query: any = this.db.collection(this.collectionName);

      // Multi-tenant filter
      if (filters.organization_id) {
        query = query.where('organization_id', '==', filters.organization_id);
      }

      // Apply status filter
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply audit type filter
      if (filters.auditType) {
        query = query.where('auditType', '==', filters.auditType);
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

      // Apply limit (add buffer for filtering)
      if (options.limit) {
        query = query.limit(options.limit * 2); // Fetch more to account for filtering
      }

      const snapshot = await query.get();

      let audits = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Audit[];

      // Filter out inactive audits in memory (soft delete)
      audits = audits.filter(audit => audit.isActive === true);

      // In-memory search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        audits = audits.filter(
          audit =>
            audit.title.toLowerCase().includes(searchLower) ||
            audit.auditNumber.toLowerCase().includes(searchLower) ||
            audit.scope.toLowerCase().includes(searchLower)
        );
      }

      // Apply limit after filtering
      if (options.limit && audits.length > options.limit) {
        audits = audits.slice(0, options.limit);
      }

      return audits;
    } catch (error) {
      console.error('Error listing audits:', error);
      throw error;
    }
  }

  /**
   * Get audit by ID
   * @param id - Audit ID
   * @returns Audit or null
   */
  async getById(id: string): Promise<Audit | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as Audit;
    } catch (error) {
      console.error('Error getting audit:', error);
      throw error;
    }
  }

  /**
   * Update audit
   * @param id - Audit ID
   * @param data - Partial audit data
   * @param userId - ID of user updating
   * @returns Updated audit
   */
  async update(
    id: string,
    data: UpdateAuditInput,
    userId: string
  ): Promise<Audit> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'planned') {
        throw new Error(
          'Solo se pueden editar auditorías en estado planificado'
        );
      }

      // Validate partial data
      const validated = UpdateAuditSchema.partial().parse(data);

      const updateData: Record<string, any> = {
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      if (validated.title) updateData.title = validated.title;
      if (validated.auditType) updateData.auditType = validated.auditType;
      if (validated.scope) updateData.scope = validated.scope;
      if (validated.plannedDate)
        updateData.plannedDate = Timestamp.fromDate(validated.plannedDate);
      if (validated.leadAuditor) updateData.leadAuditor = validated.leadAuditor;
      if (validated.selectedNormPoints)
        updateData.selectedNormPoints = validated.selectedNormPoints;

      await this.db.collection(this.collectionName).doc(id).update(updateData);

      return (await this.getById(id)) as Audit;
    } catch (error) {
      console.error('Error updating audit:', error);
      throw error;
    }
  }

  /**
   * Delete audit (soft delete)
   * @param id - Audit ID
   */
  async delete(id: string): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      await this.db.collection(this.collectionName).doc(id).update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting audit:', error);
      throw error;
    }
  }

  /**
   * Start audit execution
   * @param id - Audit ID
   * @param data - Execution start data
   * @param userId - ID of user starting execution
   */
  async startExecution(
    id: string,
    data: StartExecutionInput,
    userId: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'planned') {
        throw new Error('La auditoría ya fue iniciada');
      }

      // Use existing norm points
      const normPointCodes = audit.selectedNormPoints;

      // Create initial verifications
      const normPointsVerification: NormPointVerification[] =
        normPointCodes.map(code => ({
          normPointCode: code,
          normPointId: null,
          conformityStatus: null,
          processes: [],
          processIds: null,
          observations: null,
          verifiedAt: null,
          verifiedBy: null,
          verifiedByName: null,
        }));

      await this.db
        .collection(this.collectionName)
        .doc(id)
        .update({
          status: 'in_progress',
          executionDate: Timestamp.fromDate(data.executionDate),
          normPointsVerification,
          updatedAt: Timestamp.now(),
          updatedBy: userId,
        });
    } catch (error) {
      console.error('Error starting execution:', error);
      throw error;
    }
  }

  /**
   * Update norm point verification
   * @param id - Audit ID
   * @param data - Verification data
   * @param userId - ID of user updating
   */
  async updateNormPointVerification(
    id: string,
    data: UpdateNormPointVerificationInput,
    userId: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      // Find the index of the point to update
      const index = audit.normPointsVerification.findIndex(
        v => v.normPointCode === data.normPointCode
      );

      if (index === -1) {
        throw new Error('Punto de norma no encontrado');
      }

      // Update the point
      const updatedVerifications = [...audit.normPointsVerification];
      updatedVerifications[index] = {
        ...updatedVerifications[index],
        conformityStatus: data.conformityStatus,
        processes: data.processes,
        observations: data.observations || null,
        verifiedAt: Timestamp.now() as any,
        verifiedBy: userId,
        verifiedByName: userId, // TODO: Get real user name
      };

      await this.db.collection(this.collectionName).doc(id).update({
        normPointsVerification: updatedVerifications,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating norm point verification:', error);
      throw error;
    }
  }

  /**
   * Update opening meeting
   * @param id - Audit ID
   * @param data - Meeting data
   * @param userId - ID of user updating
   */
  async updateOpeningMeeting(
    id: string,
    data: UpdateMeetingInput,
    userId: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      const openingMeeting: any = {
        date: Timestamp.fromDate(data.date),
        participants: data.participants.map(p => ({
          ...p,
          userId: null,
        })),
        notes: data.notes || null,
      };

      await this.db.collection(this.collectionName).doc(id).update({
        openingMeeting,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating opening meeting:', error);
      throw error;
    }
  }

  /**
   * Update closing meeting
   * @param id - Audit ID
   * @param data - Meeting data
   * @param userId - ID of user updating
   */
  async updateClosingMeeting(
    id: string,
    data: UpdateMeetingInput,
    userId: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      const closingMeeting: any = {
        date: Timestamp.fromDate(data.date),
        participants: data.participants.map(p => ({
          ...p,
          userId: null,
        })),
        notes: data.notes || null,
      };

      await this.db.collection(this.collectionName).doc(id).update({
        closingMeeting,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating closing meeting:', error);
      throw error;
    }
  }

  /**
   * Update report delivery
   * @param id - Audit ID
   * @param data - Report delivery data
   * @param userId - ID of user updating
   */
  async updateReportDelivery(
    id: string,
    data: UpdateReportDeliveryInput,
    userId: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      const reportDelivery: any = {
        date: Timestamp.fromDate(data.date),
        deliveredBy: data.deliveredBy,
        deliveredById: null,
        receivedBy: data.receivedBy,
        receivedByIds: null,
        notes: data.notes || null,
      };

      await this.db.collection(this.collectionName).doc(id).update({
        reportDelivery,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating report delivery:', error);
      throw error;
    }
  }

  /**
   * Update previous actions verification
   * @param id - Audit ID
   * @param text - Verification text
   * @param userId - ID of user updating
   */
  async updatePreviousActionsVerification(
    id: string,
    text: string,
    userId: string
  ): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        previousActionsVerification: text,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating previous actions verification:', error);
      throw error;
    }
  }

  /**
   * Update observations
   * @param id - Audit ID
   * @param text - Observations text
   * @param userId - ID of user updating
   */
  async updateObservations(
    id: string,
    text: string,
    userId: string
  ): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        observations: text,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error updating observations:', error);
      throw error;
    }
  }

  /**
   * Complete audit
   * @param id - Audit ID
   * @param userId - ID of user completing
   */
  async complete(id: string, userId: string): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      // Validate all points are verified
      const allVerified = audit.normPointsVerification.every(
        v => v.conformityStatus !== null
      );

      if (!allVerified) {
        throw new Error('Todos los puntos deben estar verificados');
      }

      await this.db.collection(this.collectionName).doc(id).update({
        status: 'completed',
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error('Error completing audit:', error);
      throw error;
    }
  }

  /**
   * Search audits with advanced filters
   * @param filters - Advanced filter criteria
   * @returns Array of audits matching filters
   */
  async searchAudits(filters: AuditAdvancedFilters = {}): Promise<Audit[]> {
    try {
      let query: any = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true);

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        query = query.where('status', 'in', filters.status);
      }

      // Apply audit type filter
      if (filters.auditType && filters.auditType.length > 0) {
        query = query.where('auditType', 'in', filters.auditType);
      }

      // Apply lead auditor filter
      if (filters.leadAuditorId) {
        query = query.where('leadAuditorId', '==', filters.leadAuditorId);
      }

      // Apply year filter
      if (filters.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31, 23, 59, 59);
        query = query
          .where('createdAt', '>=', Timestamp.fromDate(startDate))
          .where('createdAt', '<=', Timestamp.fromDate(endDate));
      }

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .where(
            'plannedDate',
            '>=',
            Timestamp.fromDate(filters.dateRange.start)
          )
          .where(
            'plannedDate',
            '<=',
            Timestamp.fromDate(filters.dateRange.end)
          );
      }

      // Apply ordering and limit
      query = query.orderBy('createdAt', 'desc');
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const audits = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Audit[];

      // In-memory search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        return audits.filter(
          audit =>
            audit.title.toLowerCase().includes(searchLower) ||
            audit.auditNumber.toLowerCase().includes(searchLower) ||
            audit.scope.toLowerCase().includes(searchLower)
        );
      }

      // In-memory conformity status filter
      if (filters.conformityStatus && filters.conformityStatus.length > 0) {
        return audits.filter(audit =>
          audit.normPointsVerification?.some(v =>
            filters.conformityStatus?.includes(
              v.conformityStatus as ConformityStatus
            )
          )
        );
      }

      return audits;
    } catch (error) {
      console.error('Error searching audits:', error);
      throw error;
    }
  }

  /**
   * Get audits by date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of audits in date range
   */
  async getAuditsByDateRange(startDate: Date, endDate: Date): Promise<Audit[]> {
    try {
      const query = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .where('plannedDate', '>=', Timestamp.fromDate(startDate))
        .where('plannedDate', '<=', Timestamp.fromDate(endDate))
        .orderBy('plannedDate', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Audit[];
    } catch (error) {
      console.error('Error getting audits by date range:', error);
      throw error;
    }
  }

  /**
   * Get audits by lead auditor
   * @param auditorId - Auditor ID
   * @returns Array of audits led by auditor
   */
  async getAuditsByLeadAuditor(auditorId: string): Promise<Audit[]> {
    try {
      const query = this.db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .where('leadAuditorId', '==', auditorId)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Audit[];
    } catch (error) {
      console.error('Error getting audits by lead auditor:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param filters - Filter criteria
   * @returns Audit statistics
   */
  async getAuditStats(filters: Record<string, any> = {}): Promise<AuditStats> {
    try {
      const audits = await this.list(filters, { limit: 1000 });

      const stats: AuditStats = {
        total: audits.length,
        byStatus: {
          planned: 0,
          in_progress: 0,
          completed: 0,
        },
        byType: {
          complete: 0,
          partial: 0,
        },
        averageConformity: 0,
        nonConformitiesCount: 0,
        completionRate: 0,
        conformityStats: {
          CF: 0,
          NCM: 0,
          NCm: 0,
          NCT: 0,
          R: 0,
          OM: 0,
          F: 0,
        },
      };

      let totalConformity = 0;
      let conformityCount = 0;

      audits.forEach(audit => {
        // Count by status
        stats.byStatus[audit.status]++;

        // Count by type
        stats.byType[audit.auditType]++;

        // Count conformity statuses
        audit.normPointsVerification?.forEach(v => {
          if (v.conformityStatus) {
            stats.conformityStats[v.conformityStatus]++;
            conformityCount++;

            // Calculate average conformity (CF = 100%, NCM/NCm = 0%, others = 50%)
            if (v.conformityStatus === 'CF') {
              totalConformity += 100;
            } else if (
              v.conformityStatus === 'NCM' ||
              v.conformityStatus === 'NCm'
            ) {
              totalConformity += 0;
              stats.nonConformitiesCount++;
            } else {
              totalConformity += 50;
            }
          }
        });
      });

      stats.averageConformity =
        conformityCount > 0 ? Math.round(totalConformity / conformityCount) : 0;
      stats.completionRate =
        audits.length > 0
          ? Math.round((stats.byStatus.completed / audits.length) * 100)
          : 0;

      return stats;
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw error;
    }
  }

  /**
   * Get conformity statistics for an audit
   * @param auditId - Audit ID
   * @returns Conformity statistics
   */
  async getConformityStats(auditId: string): Promise<ConformityStats> {
    try {
      const audit = await this.getById(auditId);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      const stats: ConformityStats = {
        CF: 0,
        NCM: 0,
        NCm: 0,
        NCT: 0,
        R: 0,
        OM: 0,
        F: 0,
      };

      audit.normPointsVerification?.forEach(v => {
        if (v.conformityStatus) {
          stats[v.conformityStatus]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting conformity stats:', error);
      throw error;
    }
  }

  /**
   * Get audit trends over months
   * @param months - Number of months to analyze
   * @returns Array of audit trends
   */
  async getAuditTrends(months: number = 12): Promise<AuditTrend[]> {
    try {
      const trends: AuditTrend[] = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          1
        );

        const audits = await this.getAuditsByDateRange(monthDate, nextMonth);

        const nonConformitiesCount = audits.reduce((sum, audit) => {
          return (
            sum +
            (audit.normPointsVerification?.filter(
              v => v.conformityStatus === 'NCM' || v.conformityStatus === 'NCm'
            ).length || 0)
          );
        }, 0);

        const completedCount = audits.filter(
          a => a.status === 'completed'
        ).length;
        const completionRate =
          audits.length > 0
            ? Math.round((completedCount / audits.length) * 100)
            : 0;

        trends.push({
          month: monthDate.toLocaleDateString('es-ES', {
            month: 'short',
            year: 'numeric',
          }),
          auditsCount: audits.length,
          nonConformitiesCount,
          completionRate,
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting audit trends:', error);
      throw error;
    }
  }

  /**
   * Validate audit completion
   * @param id - Audit ID
   * @returns Validation result
   */
  async validateAuditCompletion(id: string): Promise<ValidationResult> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        return {
          isValid: false,
          errors: ['Auditoría no encontrada'],
          warnings: [],
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check if all norm points are verified
      const unverifiedPoints = audit.normPointsVerification?.filter(
        v => v.conformityStatus === null
      );
      if (unverifiedPoints && unverifiedPoints.length > 0) {
        errors.push(`${unverifiedPoints.length} puntos de norma sin verificar`);
      }

      // Check if opening meeting is recorded
      if (!audit.openingMeeting) {
        warnings.push('Reunión de apertura no registrada');
      }

      // Check if closing meeting is recorded
      if (!audit.closingMeeting) {
        warnings.push('Reunión de cierre no registrada');
      }

      // Check if report is delivered
      if (!audit.reportDelivery) {
        warnings.push('Reporte no entregado');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating audit completion:', error);
      throw error;
    }
  }

  /**
   * Check if audit can transition to new status
   * @param id - Audit ID
   * @param newStatus - New status
   * @returns True if transition is allowed
   */
  async canTransitionStatus(
    id: string,
    newStatus: AuditStatus
  ): Promise<boolean> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        return false;
      }

      // Define allowed transitions
      const allowedTransitions: Record<AuditStatus, AuditStatus[]> = {
        planned: ['in_progress'],
        in_progress: ['completed'],
        completed: [],
      };

      return allowedTransitions[audit.status]?.includes(newStatus) || false;
    } catch (error) {
      console.error('Error checking status transition:', error);
      return false;
    }
  }
}
