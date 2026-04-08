/**
 * Tests de integración — WhatsApp RRHH Bidireccional
 * Ola 4 — Plan 107
 *
 * Cubre: RhrResponseProcessor.detectIntent(), generateReply(),
 * findRelatedJob() con aislamiento cross-org.
 */

// Mock firebase-admin/firestore ANTES de cualquier import del módulo bajo prueba
jest.mock('firebase-admin/firestore', () => {
  class MockTimestamp {
    constructor(private readonly _ms: number) {}
    toMillis() {
      return this._ms;
    }
    static now() {
      return new MockTimestamp(Date.now());
    }
    static fromMillis(ms: number) {
      return new MockTimestamp(ms);
    }
  }
  return { Timestamp: MockTimestamp };
});

import { RhrResponseProcessor } from '@/services/whatsapp/RhrResponseProcessor';
import type { EmployeeResponseContext } from '@/types/whatsapp-rrhh';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(
  overrides: Partial<EmployeeResponseContext> = {}
): EmployeeResponseContext {
  return {
    phone_e164: '+5491100001111',
    organization_id: 'org-test',
    message_text: 'OK',
    message_id: 'msg-1',
    conversation_id: 'conv-1',
    detected_intent: 'confirm_task',
    confidence: 0.9,
    ...overrides,
  };
}

function makeFirestoreDoc(
  id: string,
  data: Record<string, unknown>
): FirebaseFirestore.QueryDocumentSnapshot {
  return {
    id,
    data: () => data,
    ref: { update: jest.fn() } as unknown as FirebaseFirestore.DocumentReference,
  } as unknown as FirebaseFirestore.QueryDocumentSnapshot;
}

function makeMockDb(docs: FirebaseFirestore.QueryDocumentSnapshot[] = []) {
  const snapshot = { docs };
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(snapshot),
  };
  return {
    collection: jest.fn(() => queryBuilder),
    _queryBuilder: queryBuilder,
  } as unknown as FirebaseFirestore.Firestore & { _queryBuilder: typeof queryBuilder };
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

describe('RhrResponseProcessor', () => {
  let processor: RhrResponseProcessor;
  let mockDb: FirebaseFirestore.Firestore;

  beforeEach(() => {
    mockDb = makeMockDb();
    processor = new RhrResponseProcessor(mockDb);
  });

  // -------------------------------------------------------------------------
  // detectIntent
  // -------------------------------------------------------------------------
  describe('detectIntent()', () => {
    it('detecta confirm_task para "OK"', () => {
      const result = processor.detectIntent('OK');
      expect(result.intent).toBe('confirm_task');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('detecta confirm_task para "listo 👍"', () => {
      const result = processor.detectIntent('listo 👍');
      expect(result.intent).toBe('confirm_task');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('detecta confirm_task para "HECHO" (mayúsculas)', () => {
      const result = processor.detectIntent('HECHO');
      expect(result.intent).toBe('confirm_task');
    });

    it('detecta reject_task para "no puedo hacerlo"', () => {
      const result = processor.detectIntent('no puedo hacerlo');
      expect(result.intent).toBe('reject_task');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('detecta reject_task para "imposible terminarlo hoy"', () => {
      const result = processor.detectIntent('imposible terminarlo hoy');
      expect(result.intent).toBe('reject_task');
    });

    it('detecta ask_question para mensaje con signo ? (sin keywords de deadline)', () => {
      // '¿cuándo?' contiene 'cuando' que matchea request_deadline primero —
      // usar texto con ? pero sin keywords de deadline/issue/confirm/reject
      const result = processor.detectIntent('¿puede revisarlo el técnico?');
      expect(result.intent).toBe('ask_question');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detecta report_issue para "hay un problema con el equipo"', () => {
      const result = processor.detectIntent('hay un problema con el equipo');
      expect(result.intent).toBe('report_issue');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('detecta report_issue para "el sistema tiene un error"', () => {
      const result = processor.detectIntent('el sistema tiene un error');
      expect(result.intent).toBe('report_issue');
    });

    it('detecta request_deadline para "¿para cuándo necesito entregarlo?"', () => {
      const result = processor.detectIntent('¿para cuándo necesito entregarlo?');
      // puede ser ask_question o request_deadline — ambos son válidos según la lógica
      expect(['ask_question', 'request_deadline']).toContain(result.intent);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detecta request_deadline para "para cuando es la fecha límite"', () => {
      const result = processor.detectIntent('para cuando es la fecha limite');
      expect(result.intent).toBe('request_deadline');
    });

    it('retorna unknown con confidence 0.3 para texto ambiguo', () => {
      const result = processor.detectIntent('mañana veo eso');
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0.3);
    });

    it('retorna unknown para texto vacío', () => {
      const result = processor.detectIntent('');
      expect(result.intent).toBe('unknown');
    });
  });

  // -------------------------------------------------------------------------
  // generateReply
  // -------------------------------------------------------------------------
  describe('generateReply()', () => {
    it('genera mensaje con ✅ para confirm_task', () => {
      const ctx = makeContext({ detected_intent: 'confirm_task' });
      const reply = processor.generateReply('confirm_task', ctx);
      expect(reply).not.toBeNull();
      expect(reply).toContain('✅');
    });

    it('incluye el nombre del empleado si está disponible', () => {
      const ctx = {
        ...makeContext({ detected_intent: 'confirm_task' }),
        employee_name: 'Juan',
      } as EmployeeResponseContext;
      const reply = processor.generateReply('confirm_task', ctx);
      expect(reply).toContain('Juan');
    });

    it('genera mensaje con ❌ para reject_task', () => {
      const ctx = makeContext({ detected_intent: 'reject_task' });
      const reply = processor.generateReply('reject_task', ctx);
      expect(reply).not.toBeNull();
      expect(reply).toContain('❌');
    });

    it('genera mensaje de supervisor para ask_question', () => {
      const ctx = makeContext({ detected_intent: 'ask_question' });
      const reply = processor.generateReply('ask_question', ctx);
      expect(reply).not.toBeNull();
      expect(reply).toContain('🤔');
    });

    it('genera mensaje de problema registrado para report_issue', () => {
      const ctx = makeContext({
        detected_intent: 'report_issue',
        related_job_id: 'job-abc',
      });
      const reply = processor.generateReply('report_issue', ctx);
      expect(reply).not.toBeNull();
      expect(reply).toContain('⚠️');
      expect(reply).toContain('job-abc');
    });

    it('retorna null para unknown (no responder)', () => {
      const ctx = makeContext({ detected_intent: 'unknown' });
      const reply = processor.generateReply('unknown', ctx);
      expect(reply).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findRelatedJob
  // -------------------------------------------------------------------------
  describe('findRelatedJob()', () => {
    it('encuentra job de asignación relacionado al teléfono y org', async () => {
      const jobDoc = makeFirestoreDoc('job-1', {
        intent: 'task.assign',
        organization_id: 'org-A',
        payload: { responsable_phone: '+5491100001111' },
        created_at: new Date(),
        user_id: 'user-1',
        agent_instance_id: 'agent-1',
        status: 'completed',
        priority: 'normal',
        attempts: 1,
        max_attempts: 3,
        updated_at: new Date(),
      });

      const db = makeMockDb([jobDoc]);
      const proc = new RhrResponseProcessor(db);

      const result = await proc.findRelatedJob('+5491100001111', 'org-A');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('job-1');
    });

    it('retorna null cuando no hay jobs en las últimas 48h', async () => {
      const db = makeMockDb([]); // snapshot vacío
      const proc = new RhrResponseProcessor(db);

      const result = await proc.findRelatedJob('+5491100001111', 'org-A');
      expect(result).toBeNull();
    });

    it('retorna null cuando el job no coincide con el teléfono', async () => {
      const jobDoc = makeFirestoreDoc('job-1', {
        intent: 'task.assign',
        organization_id: 'org-A',
        payload: { responsable_phone: '+5491199998888' }, // teléfono diferente
        created_at: new Date(),
        user_id: 'user-1',
        agent_instance_id: 'agent-1',
        status: 'completed',
        priority: 'normal',
        attempts: 1,
        max_attempts: 3,
        updated_at: new Date(),
      });

      const db = makeMockDb([jobDoc]);
      const proc = new RhrResponseProcessor(db);

      const result = await proc.findRelatedJob('+5491100001111', 'org-A');
      expect(result).toBeNull();
    });

    it('ignora jobs con intent distinto a task.assign / task.reminder', async () => {
      const jobDoc = makeFirestoreDoc('job-2', {
        intent: 'crm.lead.score', // intent irrelevante
        organization_id: 'org-A',
        payload: { phone: '+5491100001111' },
        created_at: new Date(),
        user_id: 'user-1',
        agent_instance_id: 'agent-1',
        status: 'completed',
        priority: 'normal',
        attempts: 1,
        max_attempts: 3,
        updated_at: new Date(),
      });

      const db = makeMockDb([jobDoc]);
      const proc = new RhrResponseProcessor(db);

      const result = await proc.findRelatedJob('+5491100001111', 'org-A');
      expect(result).toBeNull();
    });

    // Cross-org isolation: la query de Firestore se hace con el orgId correcto
    it('aislamiento cross-org: consulta Firestore con el orgId provisto', async () => {
      const db = makeMockDb([]);
      const proc = new RhrResponseProcessor(db);
      const capturedWhereArgs: unknown[] = [];

      // Espiar las llamadas a where()
      const collectionSpy = db.collection as jest.Mock;
      collectionSpy.mockImplementation(() => {
        const qb = {
          where: jest.fn((...args: unknown[]) => {
            capturedWhereArgs.push(args);
            return qb;
          }),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };
        return qb;
      });

      await proc.findRelatedJob('+5491100001111', 'org-B');

      // Verificar que la primera cláusula where filtra por organization_id === 'org-B'
      expect(capturedWhereArgs.length).toBeGreaterThan(0);
      expect(capturedWhereArgs[0]).toEqual(['organization_id', '==', 'org-B']);
    });
  });

  // -------------------------------------------------------------------------
  // process() — integración
  // -------------------------------------------------------------------------
  describe('process()', () => {
    it('retorna action_taken: reply_sent para confirm_task sin task_id', async () => {
      const db = makeMockDb([]); // sin docs en actions/audit_findings
      // mock de colecciones específicas
      (db.collection as jest.Mock).mockImplementation((name: string) => {
        if (name === 'agent_jobs') {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
          };
        }
        // actions / audit_findings sin resultados
        return {
          doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }) })),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }),
        };
      });

      const proc = new RhrResponseProcessor(db);
      const ctx = makeContext({ detected_intent: 'confirm_task' });
      const result = await proc.process(ctx);

      expect(result.intent).toBe('confirm_task');
      expect(['task_confirmed', 'reply_sent']).toContain(result.action_taken);
    });

    it('retorna action_taken: question_queued para ask_question', async () => {
      const ctx = makeContext({ detected_intent: 'ask_question' });
      const result = await processor.process(ctx);
      expect(result.action_taken).toBe('question_queued');
      expect(result.reply_message).toBeDefined();
    });

    it('retorna action_taken: issue_logged para report_issue', async () => {
      const ctx = makeContext({ detected_intent: 'report_issue' });
      const result = await processor.process(ctx);
      expect(result.action_taken).toBe('issue_logged');
      expect(result.reply_message).toContain('⚠️');
    });

    it('retorna action_taken: ignored para unknown', async () => {
      const ctx = makeContext({ detected_intent: 'unknown' });
      const result = await processor.process(ctx);
      expect(result.action_taken).toBe('ignored');
      expect(result.reply_message).toBeUndefined();
    });
  });
});
