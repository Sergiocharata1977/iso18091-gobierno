// Service for handling Direct Actions - AI-triggered database operations

import { getAdminFirestore } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import {
  DirectActionRequest,
  DirectActionConfirmation,
  DirectActionAuditLog,
  DirectActionResponse,
  DirectActionType,
  DirectActionEntity,
  DirectActionStatus,
} from '@/types/direct-actions';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import type {
  SystemActivityActionType,
  SystemActivityChannel,
  SystemActivitySeverity,
  SystemActivityStatus,
} from '@/types/system-activity-log';
import { v4 as uuidv4 } from 'uuid';

type AdminDirectActionConfirmation = DirectActionConfirmation & {
  createdAt?: Date | { toDate?: () => Date };
  updatedAt?: Date | { toDate?: () => Date };
};

type DirectActionActorContext = {
  organizationId: string | null;
  displayName: string | null;
  role: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

export class DirectActionService {
  /**
   * Create a new direct action request
   * Returns a pending confirmation that requires user approval
   */
  static async createActionRequest(
    userId: string,
    sessionId: string,
    request: DirectActionRequest
  ): Promise<DirectActionResponse> {
    const actionId = uuidv4();
    const actorContext = await this.getActorContext(userId);

    // Validate permissions
    const hasPermission = await this.validatePermissions(
      userId,
      request,
      actorContext
    );
    if (!hasPermission) {
      throw new Error(
        `User ${userId} does not have permission for ${request.type} on ${request.entity}`
      );
    }

    // Generate summary
    const summary = this.generateActionSummary(request);

    // Validate required fields early (before persisting)
    this.validateRequestPayload(request);

    // Create confirmation record
    const confirmation: DirectActionConfirmation = {
      actionId,
      userId,
      sessionId,
      request,
      summary,
      status: 'pending',
      confirmed: false,
    };

    // Save to Firestore
    await setDoc(doc(db, 'direct_action_confirmations', actionId), {
      ...confirmation,
      createdAt: Timestamp.now(),
    });

    // Log the action
    await this.logAction(userId, actionId, request, summary, 'pending');
    await this.logCentralActivity({
      userId,
      sessionId,
      actionId,
      request,
      summary,
      directActionStatus: 'pending',
      actorContext,
    });

    return {
      actionId,
      status: 'pending_confirmation',
      summary,
      message: `⚠️ Acción pendiente de confirmación: ${summary}`,
      requiresConfirmation: request.requiresConfirmation !== false,
      confirmationUrl: `/confirm-action/${actionId}`,
    };
  }

  /**
   * Confirm and execute a direct action
   */
  static async confirmAndExecuteAction(
    actionId: string,
    userId: string,
    confirmed: boolean
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    // Get the confirmation record
    const confirmationRef = doc(db, 'direct_action_confirmations', actionId);
    const confirmationSnap = await getDoc(confirmationRef);

    if (!confirmationSnap.exists()) {
      throw new Error(`Action ${actionId} not found`);
    }

    const confirmation = confirmationSnap.data() as DirectActionConfirmation;
    const actorContext = await this.getActorContext(userId);

    // Verify user is the one who requested it
    if (confirmation.userId !== userId) {
      throw new Error('No autorizado: esta acción fue solicitada por otro usuario');
    }

    // Idempotency guard — block re-execution of already-processed actions
    const finalStatuses: DirectActionStatus[] = ['executed', 'cancelled', 'failed', 'expired'];
    const currentStatus = confirmation.status ?? (confirmation.confirmed ? 'executed' : 'pending');
    if (finalStatuses.includes(currentStatus as DirectActionStatus)) {
      return {
        success: false,
        message: `Esta acción ya fue procesada (estado: ${currentStatus})`,
      };
    }

    if (!confirmed) {
      // Cancel the action
      await updateDoc(confirmationRef, {
        status: 'cancelled',
        confirmed: false,
        updatedAt: Timestamp.now(),
      });

      await this.logAction(
        userId,
        actionId,
        confirmation.request,
        confirmation.summary,
        'cancelled'
      );
      await this.logCentralActivity({
        userId,
        sessionId: confirmation.sessionId,
        actionId,
        request: confirmation.request,
        summary: confirmation.summary,
        directActionStatus: 'cancelled',
        actorContext,
      });

      return {
        success: false,
        message: 'Acción cancelada',
      };
    }

    try {
      await this.logCentralActivity({
        userId,
        sessionId: confirmation.sessionId,
        actionId,
        request: confirmation.request,
        summary: confirmation.summary,
        directActionStatus: 'confirmed',
        actorContext,
      });

      // Execute the action
      const result = await this.executeAction(confirmation.request);

      // Update confirmation record
      await updateDoc(confirmationRef, {
        status: 'executed',
        confirmed: true,
        confirmedAt: Timestamp.now(),
        executedAt: Timestamp.now(),
        result: {
          success: true,
          message: result.message,
          data: result.data,
        },
      });

      // Log successful execution
      await this.logAction(
        userId,
        actionId,
        confirmation.request,
        confirmation.summary,
        'executed',
        result
      );
      await this.logCentralActivity({
        userId,
        sessionId: confirmation.sessionId,
        actionId,
        request: confirmation.request,
        summary: confirmation.summary,
        directActionStatus: 'executed',
        result,
        actorContext,
      });

      return {
        success: true,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Update confirmation record with error
      await updateDoc(confirmationRef, {
        status: 'failed',
        confirmed: true,
        confirmedAt: Timestamp.now(),
        error: errorMessage,
      });

      // Log failed execution
      await this.logAction(
        userId,
        actionId,
        confirmation.request,
        confirmation.summary,
        'failed',
        undefined,
        errorMessage
      );
      await this.logCentralActivity({
        userId,
        sessionId: confirmation.sessionId,
        actionId,
        request: confirmation.request,
        summary: confirmation.summary,
        directActionStatus: 'failed',
        error: errorMessage,
        actorContext,
      });

      throw error;
    }
  }

  /**
   * Execute the actual database operation
   */
  private static async executeAction(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    switch (request.type) {
      case 'CREATE':
        return await this.handleCreate(request);
      case 'UPDATE':
        return await this.handleUpdate(request);
      case 'COMPLETE':
        return await this.handleComplete(request);
      case 'ASSIGN':
        return await this.handleAssign(request);
      case 'CHANGE_STATUS':
        return await this.handleChangeStatus(request);
      case 'DELETE':
        return await this.handleDelete(request);
      default:
        throw new Error(`Unknown action type: ${request.type}`);
    }
  }

  private static async handleCreate(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    const collectionName = this.getCollectionName(request.entity);
    const docId = uuidv4();

    await setDoc(doc(db, collectionName, docId), {
      ...request.data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      message: `✅ ${request.entity} creado exitosamente`,
      data: { id: docId },
    };
  }

  private static async handleUpdate(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    if (!request.entityId) {
      throw new Error('entityId is required for UPDATE action');
    }

    const collectionName = this.getCollectionName(request.entity);
    const docRef = doc(db, collectionName, request.entityId);

    await updateDoc(docRef, {
      ...request.data,
      updatedAt: Timestamp.now(),
    });

    return {
      message: `✅ ${request.entity} actualizado exitosamente`,
      data: { id: request.entityId },
    };
  }

  private static async handleComplete(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    if (!request.entityId) {
      throw new Error('entityId is required for COMPLETE action');
    }

    const collectionName = this.getCollectionName(request.entity);
    const docRef = doc(db, collectionName, request.entityId);

    await updateDoc(docRef, {
      estado: 'completado',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      message: `✅ ${request.entity} marcado como completado`,
      data: { id: request.entityId },
    };
  }

  private static async handleAssign(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    if (!request.entityId || !request.data.assignedTo) {
      throw new Error('entityId and assignedTo are required for ASSIGN action');
    }

    const collectionName = this.getCollectionName(request.entity);
    const docRef = doc(db, collectionName, request.entityId);

    await updateDoc(docRef, {
      assignedTo: request.data.assignedTo,
      assignedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      message: `✅ ${request.entity} asignado a ${request.data.assignedTo}`,
      data: { id: request.entityId },
    };
  }

  private static async handleChangeStatus(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    if (!request.entityId || !request.data.newStatus) {
      throw new Error(
        'entityId and newStatus are required for CHANGE_STATUS action'
      );
    }

    const collectionName = this.getCollectionName(request.entity);
    const docRef = doc(db, collectionName, request.entityId);

    await updateDoc(docRef, {
      estado: request.data.newStatus,
      statusChangedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      message: `✅ Estado de ${request.entity} cambiado a ${request.data.newStatus}`,
      data: { id: request.entityId },
    };
  }

  private static async handleDelete(
    request: DirectActionRequest
  ): Promise<{ message: string; data?: any }> {
    if (!request.entityId) {
      throw new Error('entityId is required for DELETE action');
    }

    // For safety, we soft-delete by marking as deleted
    const collectionName = this.getCollectionName(request.entity);
    const docRef = doc(db, collectionName, request.entityId);

    await updateDoc(docRef, {
      deleted: true,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      message: `✅ ${request.entity} eliminado`,
      data: { id: request.entityId },
    };
  }

  /**
   * Early validation — fail fast before any Firestore write
   */
  private static validateRequestPayload(request: DirectActionRequest): void {
    const needsEntityId: DirectActionType[] = ['UPDATE', 'COMPLETE', 'ASSIGN', 'CHANGE_STATUS', 'DELETE'];
    if (needsEntityId.includes(request.type) && !request.entityId) {
      throw new Error(`entityId es obligatorio para acciones de tipo ${request.type}`);
    }
    if (request.type === 'ASSIGN' && !request.data?.assignedTo) {
      throw new Error('assignedTo es obligatorio para acciones de tipo ASSIGN');
    }
    if (request.type === 'CHANGE_STATUS' && !request.data?.newStatus) {
      throw new Error('newStatus es obligatorio para acciones de tipo CHANGE_STATUS');
    }
  }

  /**
   * Validate user permissions for the action
   */
  private static async validatePermissions(
    userId: string,
    request: DirectActionRequest,
    actorContext?: DirectActionActorContext | null
  ): Promise<boolean> {
    const resolvedActorContext =
      actorContext ?? (await this.getActorContext(userId));

    if (!resolvedActorContext) {
      return false;
    }

    const userRole = resolvedActorContext.role || 'user';

    // Admin can do everything
    if (userRole === 'admin') {
      return true;
    }

    const allActions: DirectActionType[] = ['CREATE', 'UPDATE', 'COMPLETE', 'ASSIGN', 'CHANGE_STATUS', 'DELETE'];

    // Role taxonomy unified with withAuth roles
    const rolePermissions: Record<string, DirectActionType[]> = {
      super_admin: allActions,
      admin: allActions,
      gerente: ['CREATE', 'UPDATE', 'COMPLETE', 'ASSIGN', 'CHANGE_STATUS'],
      jefe: ['CREATE', 'UPDATE', 'COMPLETE', 'ASSIGN', 'CHANGE_STATUS'],
      auditor: ['CREATE', 'UPDATE', 'COMPLETE', 'ASSIGN', 'CHANGE_STATUS'],
      manager: ['UPDATE', 'COMPLETE', 'ASSIGN', 'CHANGE_STATUS'],
      user: ['UPDATE', 'COMPLETE'],
    };

    const allowedActions = rolePermissions[userRole] || [];
    return allowedActions.includes(request.type);
  }

  private static async getActorContext(
    userId: string
  ): Promise<DirectActionActorContext | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();

    return {
      organizationId: this.readString(
        userData.organization_id,
        userData.organizationId
      ),
      displayName: this.readString(
        userData.displayName,
        userData.nombre,
        userData.name,
        userData.email
      ),
      role: this.readString(userData.role),
      departmentId: this.readString(
        userData.department_id,
        userData.departmentId
      ),
      departmentName: this.readString(
        userData.department_name,
        userData.departmentName
      ),
    };
  }

  /**
   * Generate human-readable summary of the action
   */
  private static generateActionSummary(request: DirectActionRequest): string {
    const entity = request.entity;
    const type = request.type;

    switch (type) {
      case 'CREATE':
        return `Crear nuevo ${entity}`;
      case 'UPDATE':
        return `Actualizar ${entity} ${request.entityId}`;
      case 'COMPLETE':
        return `Marcar ${entity} ${request.entityId} como completado`;
      case 'ASSIGN':
        return `Asignar ${entity} ${request.entityId} a ${request.data.assignedTo}`;
      case 'CHANGE_STATUS':
        return `Cambiar estado de ${entity} ${request.entityId} a ${request.data.newStatus}`;
      case 'DELETE':
        return `Eliminar ${entity} ${request.entityId}`;
      default:
        return `Ejecutar acción ${type} en ${entity}`;
    }
  }

  /**
   * Get Firestore collection name for entity
   */
  private static getCollectionName(entity: DirectActionEntity): string {
    const collectionMap: Record<DirectActionEntity, string> = {
      audit: 'auditorias',
      finding: 'hallazgos',
      action: 'acciones',
      'non-conformity': 'no_conformidades',
      'process-record': 'registros_procesos',
      personnel: 'personal',
      training: 'capacitaciones',
      evaluation: 'evaluaciones',
    };

    return collectionMap[entity] || entity;
  }

  /**
   * Log action to audit trail
   */
  private static async logAction(
    userId: string,
    actionId: string,
    request: DirectActionRequest,
    summary: string,
    status: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled',
    result?: { message: string; data?: any },
    error?: string
  ): Promise<void> {
    const auditLog: DirectActionAuditLog = {
      id: uuidv4(),
      userId,
      actionId,
      type: request.type,
      entity: request.entity,
      entityId: request.entityId,
      status,
      request,
      summary,
      result: result
        ? {
            success: true,
            message: result.message,
          }
        : undefined,
      error,
      timestamp: new Date(),
    };

    await setDoc(doc(db, 'direct_action_audit_logs', auditLog.id), {
      ...auditLog,
      timestamp: Timestamp.now(),
    });
  }

  private static async logCentralActivity({
    userId,
    sessionId,
    actionId,
    request,
    summary,
    directActionStatus,
    result,
    error,
    actorContext,
  }: {
    userId: string;
    sessionId: string;
    actionId: string;
    request: DirectActionRequest;
    summary: string;
    directActionStatus: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled';
    result?: { message: string; data?: any };
    error?: string;
    actorContext?: DirectActionActorContext | null;
  }): Promise<void> {
    const resolvedActorContext =
      actorContext ?? (await this.getActorContext(userId));

    if (!resolvedActorContext?.organizationId) {
      return;
    }

    const activity = this.mapCentralActivity(
      directActionStatus,
      summary,
      request,
      result,
      error
    );
    const targetEntityId = this.resolveTargetEntityId(request, result);

    await SystemActivityLogService.logUserAction({
      organization_id: resolvedActorContext.organizationId,
      actor_user_id: userId,
      actor_display_name: resolvedActorContext.displayName,
      actor_role: resolvedActorContext.role,
      actor_department_id: resolvedActorContext.departmentId,
      actor_department_name: resolvedActorContext.departmentName,
      occurred_at: new Date(),
      source_module: 'direct_actions',
      source_submodule: request.type.toLowerCase(),
      channel: this.resolveChannel(sessionId),
      entity_type: request.entity,
      entity_id: targetEntityId,
      entity_code: targetEntityId,
      action_type: activity.actionType,
      action_label: activity.label,
      description: activity.description,
      status: activity.status,
      severity: activity.severity,
      related_entities: [
        {
          entity_type: 'direct_action_confirmation',
          entity_id: actionId,
          relation: 'approval_request',
        },
      ],
      evidence_refs: [
        {
          type: 'direct_action_confirmation',
          id: actionId,
          label: summary,
        },
      ],
      correlation_id: actionId,
      metadata: {
        direct_action_type: request.type,
        direct_action_status: directActionStatus,
        request_reason: request.reason ?? null,
        session_id: sessionId,
        target_entity_id: request.entityId ?? null,
        result_message: result?.message ?? null,
        error: error ?? null,
      },
    });
  }

  private static mapCentralActivity(
    directActionStatus: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled',
    summary: string,
    request: DirectActionRequest,
    result?: { message: string; data?: any },
    error?: string
  ): {
    actionType: SystemActivityActionType;
    label: string;
    description: string;
    status: SystemActivityStatus;
    severity: SystemActivitySeverity;
  } {
    switch (directActionStatus) {
      case 'pending':
        return {
          actionType: 'ai_action_requested',
          label: 'Accion IA propuesta',
          description: request.reason
            ? `${summary}. Motivo: ${request.reason}`
            : summary,
          status: 'pending',
          severity: 'info',
        };
      case 'confirmed':
        return {
          actionType: 'ai_action_confirmed',
          label: 'Accion IA confirmada',
          description: `Confirmacion humana registrada para: ${summary}`,
          status: 'success',
          severity: 'info',
        };
      case 'cancelled':
        return {
          actionType: 'ai_action_rejected',
          label: 'Accion IA rechazada',
          description: request.reason
            ? `Accion rechazada por el usuario. Motivo original: ${request.reason}`
            : `Accion rechazada por el usuario: ${summary}`,
          status: 'cancelled',
          severity: 'medium',
        };
      case 'executed':
        return {
          actionType: 'ai_action_executed',
          label: 'Accion IA ejecutada',
          description: result?.message
            ? `${summary}. Resultado: ${result.message}`
            : summary,
          status: 'success',
          severity: 'low',
        };
      case 'failed':
        return {
          actionType: 'ai_action_failed',
          label: 'Accion IA fallida',
          description: error
            ? `${summary}. Error: ${error}`
            : `Fallo al ejecutar: ${summary}`,
          status: 'failure',
          severity: 'high',
        };
    }
  }

  private static resolveTargetEntityId(
    request: DirectActionRequest,
    result?: { message: string; data?: any }
  ): string | null {
    const resultId = result?.data?.id;
    if (typeof resultId === 'string' && resultId.trim().length > 0) {
      return resultId;
    }

    return request.entityId ?? null;
  }

  private static resolveChannel(sessionId: string): SystemActivityChannel {
    const normalized = sessionId.toLowerCase();

    if (normalized.includes('terminal')) {
      return 'terminal';
    }
    if (normalized.includes('api')) {
      return 'api';
    }
    if (normalized.includes('auto')) {
      return 'automation';
    }
    if (normalized.includes('web')) {
      return 'web';
    }

    return 'ai';
  }

  private static readString(...values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized.length > 0) {
          return normalized;
        }
      }
    }

    return null;
  }

  /**
   * Get pending confirmations for a user
   * Uses explicit status field — excludes cancelled/failed/executed
   */
  static async getPendingConfirmations(
    userId: string
  ): Promise<DirectActionConfirmation[]> {
    const q = query(
      collection(db, 'direct_action_confirmations'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as DirectActionConfirmation);
  }

  /**
   * Get audit logs for a user
   */
  static async getAuditLogs(
    userId: string,
    limit: number = 50
  ): Promise<DirectActionAuditLog[]> {
    const q = query(
      collection(db, 'direct_action_audit_logs'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => doc.data() as DirectActionAuditLog)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  static async getPendingConfirmationsForOrganization(
    organizationId: string,
    limit: number = 20
  ): Promise<AdminDirectActionConfirmation[]> {
    const dbAdmin = getAdminFirestore();
    const snapshot = await dbAdmin
      .collection('direct_action_confirmations')
      .where('status', '==', 'pending')
      .limit(Math.max(limit * 3, limit))
      .get();

    return await this.filterConfirmationsByOrganization(
      organizationId,
      snapshot.docs.map(doc => ({
        actionId: doc.id,
        ...(doc.data() as Omit<AdminDirectActionConfirmation, 'actionId'>),
      })),
      limit
    );
  }

  static async getRecentConfirmationsForOrganization(
    organizationId: string,
    limit: number = 20
  ): Promise<AdminDirectActionConfirmation[]> {
    const dbAdmin = getAdminFirestore();
    const snapshot = await dbAdmin
      .collection('direct_action_confirmations')
      .limit(Math.max(limit * 4, limit))
      .get();

    const filtered = await this.filterConfirmationsByOrganization(
      organizationId,
      snapshot.docs.map(doc => ({
        actionId: doc.id,
        ...(doc.data() as Omit<AdminDirectActionConfirmation, 'actionId'>),
      })),
      Math.max(limit * 2, limit)
    );

    return filtered
      .sort((a, b) => {
        const aTime = this.toMillis(a.updatedAt || a.createdAt);
        const bTime = this.toMillis(b.updatedAt || b.createdAt);
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  private static async filterConfirmationsByOrganization(
    organizationId: string,
    confirmations: AdminDirectActionConfirmation[],
    limit: number
  ): Promise<AdminDirectActionConfirmation[]> {
    if (confirmations.length === 0) return [];

    const dbAdmin = getAdminFirestore();
    const uniqueUserIds = [...new Set(confirmations.map(item => item.userId))];
    const userSnapshots = await Promise.all(
      uniqueUserIds.map(userId => dbAdmin.collection('users').doc(userId).get())
    );

    const userOrgById = new Map<string, string | null>();
    for (const userSnap of userSnapshots) {
      userOrgById.set(
        userSnap.id,
        userSnap.exists ? String(userSnap.data()?.organization_id || '') : null
      );
    }

    return confirmations
      .filter(item => userOrgById.get(item.userId) === organizationId)
      .slice(0, limit);
  }

  private static toMillis(value?: Date | { toDate?: () => Date }): number {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    const converted = value.toDate?.();
    return converted instanceof Date ? converted.getTime() : 0;
  }
}
