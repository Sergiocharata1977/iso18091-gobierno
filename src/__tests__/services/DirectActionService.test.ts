// Tests for DirectActionService

import { db } from '@/lib/firebase';
import { DirectActionService } from '@/services/direct-actions';
import {
  DirectActionEntity,
  DirectActionRequest,
  DirectActionType,
} from '@/types/direct-actions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

/**
 * Test Suite for Direct Actions
 *
 * These tests validate:
 * 1. Action request creation
 * 2. Permission validation
 * 3. Action execution
 * 4. Audit logging
 * 5. Error handling
 */

describe('DirectActionService', () => {
  const testUserId = 'test-user-admin';
  const testSessionId = 'test-session-123';
  const testAuditId = 'AUD-TEST-001';

  // Helper to create test action request
  const createTestActionRequest = (
    type: DirectActionType,
    entity: DirectActionEntity,
    entityId?: string,
    data?: Record<string, any>
  ): DirectActionRequest => ({
    type,
    entity,
    entityId,
    data: data || {},
    reason: 'Test action',
    requiresConfirmation: true,
  });

  describe('createActionRequest', () => {
    it('should create a pending action request', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);

      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      expect(response.status).toBe('pending_confirmation');
      expect(response.actionId).toBeDefined();
      expect(response.summary).toContain('completado');
      expect(response.requiresConfirmation).toBe(true);
    });

    it('should generate appropriate summary for each action type', async () => {
      const testCases: Array<
        [DirectActionType, DirectActionEntity, string | undefined, string]
      > = [
        ['CREATE', 'audit', undefined, 'Crear nuevo audit'],
        ['UPDATE', 'finding', 'H-001', 'Actualizar finding H-001'],
        [
          'COMPLETE',
          'action',
          'AC-001',
          'Marcar action AC-001 como completado',
        ],
        ['ASSIGN', 'audit', 'AUD-001', 'Asignar audit AUD-001'],
        [
          'CHANGE_STATUS',
          'finding',
          'H-001',
          'Cambiar estado de finding H-001',
        ],
      ];

      for (const [type, entity, entityId, expectedSummary] of testCases) {
        const request = createTestActionRequest(type, entity, entityId);
        const response = await DirectActionService.createActionRequest(
          testUserId,
          testSessionId,
          request
        );

        expect(response.summary).toContain(expectedSummary.split(' ')[0]); // Check first word
      }
    });

    it('should save action to Firestore', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      // Verify in Firestore
      const confirmationRef = doc(
        db,
        'direct_action_confirmations',
        response.actionId
      );
      const confirmationSnap = await getDoc(confirmationRef);

      expect(confirmationSnap.exists()).toBe(true);
      const data = confirmationSnap.data();
      expect(data).toBeDefined();
      expect(data?.userId).toBe(testUserId);
      expect(data?.sessionId).toBe(testSessionId);
      expect(data?.confirmed).toBe(false);
    });

    it('should create audit log entry', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      // Query audit logs
      const logsQuery = query(
        collection(db, 'direct_action_audit_logs'),
        where('actionId', '==', response.actionId)
      );
      const logsSnap = await getDocs(logsQuery);

      expect(logsSnap.size).toBeGreaterThan(0);
      const log = logsSnap.docs[0].data();
      expect(log.status).toBe('pending');
      expect(log.userId).toBe(testUserId);
    });
  });

  describe('confirmAndExecuteAction', () => {
    it('should execute action when confirmed', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const result = await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('✅');
    });

    it('should cancel action when not confirmed', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const result = await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        false
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('cancelada');
    });

    it('should reject confirmation from different user', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const differentUserId = 'different-user';

      await expect(
        DirectActionService.confirmAndExecuteAction(
          response.actionId,
          differentUserId,
          true
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should update audit log on execution', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      // Query audit logs
      const logsQuery = query(
        collection(db, 'direct_action_audit_logs'),
        where('actionId', '==', response.actionId)
      );
      const logsSnap = await getDocs(logsQuery);

      const executedLog = logsSnap.docs.find(
        doc => doc.data().status === 'executed'
      );
      expect(executedLog).toBeDefined();
      expect(executedLog?.data().result.success).toBe(true);
    });
  });

  describe('Permission Validation', () => {
    it('should allow admin to perform all actions', async () => {
      const adminUserId = 'admin-user';
      const actionTypes: DirectActionType[] = [
        'CREATE',
        'UPDATE',
        'COMPLETE',
        'ASSIGN',
        'CHANGE_STATUS',
        'DELETE',
      ];

      for (const type of actionTypes) {
        const request = createTestActionRequest(type, 'audit', testAuditId);
        // Should not throw
        const response = await DirectActionService.createActionRequest(
          adminUserId,
          testSessionId,
          request
        );
        expect(response.actionId).toBeDefined();
      }
    });

    it('should restrict user permissions', async () => {
      const userUserId = 'regular-user';
      const restrictedActions: DirectActionType[] = ['CREATE', 'DELETE'];

      for (const type of restrictedActions) {
        const request = createTestActionRequest(type, 'audit', testAuditId);
        await expect(
          DirectActionService.createActionRequest(
            userUserId,
            testSessionId,
            request
          )
        ).rejects.toThrow('does not have permission');
      }
    });
  });

  describe('Action Execution', () => {
    it('should handle COMPLETE action', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const result = await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('completado');
    });

    it('should handle ASSIGN action', async () => {
      const request = createTestActionRequest('ASSIGN', 'audit', testAuditId, {
        assignedTo: 'juan.perez@empresa.com',
      });
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const result = await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('asignado');
    });

    it('should handle CHANGE_STATUS action', async () => {
      const request = createTestActionRequest(
        'CHANGE_STATUS',
        'finding',
        'H-001',
        {
          newStatus: 'En Revisión',
        }
      );
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const result = await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('estado');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing entityId on UPDATE', async () => {
      const request = createTestActionRequest('UPDATE', 'audit');
      await expect(
        DirectActionService.createActionRequest(
          testUserId,
          testSessionId,
          request
        )
      ).rejects.toThrow();
    });

    it('should throw error for missing assignedTo on ASSIGN', async () => {
      const request = createTestActionRequest(
        'ASSIGN',
        'audit',
        testAuditId,
        {}
      );
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      await expect(
        DirectActionService.confirmAndExecuteAction(
          response.actionId,
          testUserId,
          true
        )
      ).rejects.toThrow('assignedTo');
    });

    it('should handle non-existent action gracefully', async () => {
      await expect(
        DirectActionService.confirmAndExecuteAction(
          'non-existent-id',
          testUserId,
          true
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('Audit Logging', () => {
    it('should log all action states', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      // Query all logs for this action
      const logsQuery = query(
        collection(db, 'direct_action_audit_logs'),
        where('actionId', '==', response.actionId)
      );
      const logsSnap = await getDocs(logsQuery);

      const statuses = logsSnap.docs.map(doc => doc.data().status);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('executed');
    });

    it('should include error details in audit log', async () => {
      const request = createTestActionRequest(
        'ASSIGN',
        'audit',
        testAuditId,
        {}
      );
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      try {
        await DirectActionService.confirmAndExecuteAction(
          response.actionId,
          testUserId,
          true
        );
      } catch (error) {
        // Expected to fail
      }

      // Query audit logs
      const logsQuery = query(
        collection(db, 'direct_action_audit_logs'),
        where('actionId', '==', response.actionId)
      );
      const logsSnap = await getDocs(logsQuery);

      const failedLog = logsSnap.docs.find(
        doc => doc.data().status === 'failed'
      );
      expect(failedLog?.data().error).toBeDefined();
    });
  });

  describe('getPendingConfirmations', () => {
    it('should retrieve pending confirmations for user', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      const pending =
        await DirectActionService.getPendingConfirmations(testUserId);

      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].userId).toBe(testUserId);
      expect(pending[0].confirmed).toBe(false);
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs for user', async () => {
      const request = createTestActionRequest('COMPLETE', 'audit', testAuditId);
      const response = await DirectActionService.createActionRequest(
        testUserId,
        testSessionId,
        request
      );

      await DirectActionService.confirmAndExecuteAction(
        response.actionId,
        testUserId,
        true
      );

      const logs = await DirectActionService.getAuditLogs(testUserId, 10);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].userId).toBe(testUserId);
    });

    it('should return logs sorted by timestamp descending', async () => {
      const logs = await DirectActionService.getAuditLogs(testUserId, 10);

      for (let i = 0; i < logs.length - 1; i++) {
        expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i + 1].timestamp.getTime()
        );
      }
    });
  });
});

/**
 * Integration Test Scenarios
 *
 * Run these manually to test the full flow:
 */

describe('DirectActionService - Integration Tests', () => {
  describe('Complete Workflow', () => {
    it('should complete full action workflow: request -> confirm -> execute -> log', async () => {
      const userId = 'integration-test-user';
      const sessionId = 'integration-test-session';
      const auditId = 'AUD-INTEGRATION-001';

      // Step 1: Create action request
      const request: DirectActionRequest = {
        type: 'COMPLETE',
        entity: 'audit',
        entityId: auditId,
        data: {},
        reason: 'Integration test',
      };

      const response = await DirectActionService.createActionRequest(
        userId,
        sessionId,
        request
      );

      expect(response.status).toBe('pending_confirmation');
      const actionId = response.actionId;

      // Step 2: Confirm and execute
      const result = await DirectActionService.confirmAndExecuteAction(
        actionId,
        userId,
        true
      );

      expect(result.success).toBe(true);

      // Step 3: Verify audit log
      const logs = await DirectActionService.getAuditLogs(userId, 1);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actionId).toBe(actionId);
      expect(logs[0].status).toBe('executed');
    });
  });
});
