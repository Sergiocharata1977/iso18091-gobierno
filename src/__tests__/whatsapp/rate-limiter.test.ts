/**
 * Tests de integración — WhatsAppRateLimiter
 * Ola 4 — Plan 107
 *
 * Cubre: checkAndIncrement(), getRemainingQuota(), aislamiento cross-org.
 */

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

import {
  RateLimitError,
  WhatsAppRateLimiter,
  type RateLimitConfig,
} from '@/lib/whatsapp/RateLimiter';

// ---------------------------------------------------------------------------
// Helpers para construir el mock de Firestore
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

interface MockDocData {
  count_hour?: number;
  count_minute?: number;
  window_hour_start?: number; // ms timestamp
  window_minute_start?: number; // ms timestamp
}

function buildMockDb(initialData: MockDocData | null = null) {
  const stored: Record<string, MockDocData> = {};
  let capturedDocId: string | null = null;

  const mockTx = {
    get: jest.fn(async () => ({
      data: () => (capturedDocId && stored[capturedDocId] ? stored[capturedDocId] : undefined),
    })),
    set: jest.fn((ref: unknown, data: MockDocData) => {
      if (capturedDocId) {
        stored[capturedDocId] = { ...(stored[capturedDocId] ?? {}), ...data };
      }
    }),
  };

  const mockDb = {
    collection: jest.fn(() => ({
      doc: jest.fn((id: string) => {
        capturedDocId = id;
        if (initialData !== null && !stored[id]) {
          stored[id] = { ...initialData };
        }
        return { id };
      }),
    })),
    runTransaction: jest.fn(async (callback: (tx: typeof mockTx) => Promise<void>) => {
      await callback(mockTx);
    }),
    _stored: stored,
    _mockTx: mockTx,
    _getCapturedDocId: () => capturedDocId,
  };

  return mockDb;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WhatsAppRateLimiter', () => {
  const cfg: RateLimitConfig = { max_per_hour: 5, max_per_minute: 3 };

  // -------------------------------------------------------------------------
  // checkAndIncrement — happy path
  // -------------------------------------------------------------------------
  describe('checkAndIncrement() — dentro del límite', () => {
    it('permite enviar cuando no hay registros previos (contador en 0)', async () => {
      const db = buildMockDb(null); // sin datos previos
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      await expect(limiter.checkAndIncrement('org-A')).resolves.toBeUndefined();
    });

    it('permite enviar mientras el contador está por debajo del límite', async () => {
      const db = buildMockDb({
        count_hour: 2,
        count_minute: 1,
        window_hour_start: Date.now() - 10_000,
        window_minute_start: Date.now() - 5_000,
      });
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      await expect(limiter.checkAndIncrement('org-A')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // checkAndIncrement — límites superados
  // -------------------------------------------------------------------------
  describe('checkAndIncrement() — límite superado', () => {
    it('lanza RateLimitError al superar el límite por minuto', async () => {
      const db = buildMockDb({
        count_hour: 2,
        count_minute: 3, // ya está en el máximo (max_per_minute: 3)
        window_hour_start: Date.now() - 10_000,
        window_minute_start: Date.now() - 5_000, // ventana activa (< 1 min)
      });
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      await expect(limiter.checkAndIncrement('org-A')).rejects.toBeInstanceOf(RateLimitError);
    });

    it('RateLimitError tiene retry_after > 0', async () => {
      const db = buildMockDb({
        count_hour: 2,
        count_minute: 3,
        window_hour_start: Date.now() - 10_000,
        window_minute_start: Date.now() - 5_000,
      });
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      let caught: RateLimitError | null = null;
      try {
        await limiter.checkAndIncrement('org-A');
      } catch (e) {
        if (e instanceof RateLimitError) caught = e;
      }

      expect(caught).not.toBeNull();
      expect(caught!.retry_after).toBeGreaterThan(0);
    });

    it('lanza RateLimitError al superar el límite por hora', async () => {
      const db = buildMockDb({
        count_hour: 5, // ya está en el máximo (max_per_hour: 5)
        count_minute: 0,
        window_hour_start: Date.now() - 10_000,   // ventana activa (< 1h)
        window_minute_start: Date.now() - 5_000,
      });
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      await expect(limiter.checkAndIncrement('org-A')).rejects.toBeInstanceOf(RateLimitError);
    });
  });

  // -------------------------------------------------------------------------
  // Reset de ventana
  // -------------------------------------------------------------------------
  describe('reset de ventana de tiempo', () => {
    it('resetea el contador de hora cuando la ventana expiró', async () => {
      const db = buildMockDb({
        count_hour: 5,     // estaba en el máximo
        count_minute: 0,
        window_hour_start: Date.now() - HOUR_MS - 1_000, // venció hace 1 segundo
        window_minute_start: Date.now() - 5_000,
      });
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      // Tras reset, count_hour = 0 < 5 → debe pasar sin error
      await expect(limiter.checkAndIncrement('org-A')).resolves.toBeUndefined();
    });

    it('resetea el contador de minuto cuando la ventana expiró', async () => {
      const db = buildMockDb({
        count_hour: 1,
        count_minute: 3,   // estaba en el máximo
        window_hour_start: Date.now() - 10_000,
        window_minute_start: Date.now() - MINUTE_MS - 1_000, // venció hace 1 segundo
      });
      const limiter = new WhatsAppRateLimiter(db as unknown as FirebaseFirestore.Firestore, cfg);

      // Tras reset, count_minute = 0 < 3 → debe pasar sin error
      await expect(limiter.checkAndIncrement('org-A')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getRemainingQuota
  // -------------------------------------------------------------------------
  describe('getRemainingQuota()', () => {
    it('retorna cuota completa cuando no hay registros', async () => {
      const db = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ data: () => undefined }),
          })),
        })),
      } as unknown as FirebaseFirestore.Firestore;

      const limiter = new WhatsAppRateLimiter(db, cfg);
      const quota = await limiter.getRemainingQuota('org-A');

      expect(quota.per_hour).toBe(cfg.max_per_hour);
      expect(quota.per_minute).toBe(cfg.max_per_minute);
    });

    it('descuenta correctamente los mensajes ya enviados', async () => {
      const db = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              data: () => ({
                count_hour: 3,
                count_minute: 1,
                window_hour_start: Date.now() - 10_000,
                window_minute_start: Date.now() - 5_000,
              }),
            }),
          })),
        })),
      } as unknown as FirebaseFirestore.Firestore;

      const limiter = new WhatsAppRateLimiter(db, cfg);
      const quota = await limiter.getRemainingQuota('org-A');

      expect(quota.per_hour).toBe(2);   // 5 - 3
      expect(quota.per_minute).toBe(2); // 3 - 1
    });

    it('retorna cuota completa cuando la ventana expiró', async () => {
      const db = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              data: () => ({
                count_hour: 5,
                count_minute: 3,
                window_hour_start: Date.now() - HOUR_MS - 1_000,   // venció
                window_minute_start: Date.now() - MINUTE_MS - 1_000, // venció
              }),
            }),
          })),
        })),
      } as unknown as FirebaseFirestore.Firestore;

      const limiter = new WhatsAppRateLimiter(db, cfg);
      const quota = await limiter.getRemainingQuota('org-A');

      expect(quota.per_hour).toBe(cfg.max_per_hour);
      expect(quota.per_minute).toBe(cfg.max_per_minute);
    });
  });

  // -------------------------------------------------------------------------
  // Aislamiento cross-org
  // -------------------------------------------------------------------------
  describe('aislamiento cross-org', () => {
    it('usa claves de documento distintas para orgs distintas', async () => {
      const capturedDocIds: string[] = [];

      const db = {
        collection: jest.fn(() => ({
          doc: jest.fn((id: string) => {
            capturedDocIds.push(id);
            return { id };
          }),
        })),
        runTransaction: jest.fn(async (cb: (tx: { get: jest.Mock; set: jest.Mock }) => Promise<void>) => {
          await cb({ get: jest.fn().mockResolvedValue({ data: () => undefined }), set: jest.fn() });
        }),
      } as unknown as FirebaseFirestore.Firestore;

      const limiter = new WhatsAppRateLimiter(db, cfg);

      await limiter.checkAndIncrement('org-A');
      await limiter.checkAndIncrement('org-B');

      expect(capturedDocIds).toContain('org-A_whatsapp');
      expect(capturedDocIds).toContain('org-B_whatsapp');
      expect(capturedDocIds[0]).not.toBe(capturedDocIds[1]);
    });

    it('el quota de org-A no interfiere con org-B', async () => {
      // org-A en el límite, org-B con 0 mensajes
      const docData: Record<string, MockDocData> = {
        'org-A_whatsapp': {
          count_hour: 3,
          count_minute: 3, // máximo
          window_hour_start: Date.now() - 10_000,
          window_minute_start: Date.now() - 5_000,
        },
        'org-B_whatsapp': {
          count_hour: 0,
          count_minute: 0,
          window_hour_start: Date.now() - 10_000,
          window_minute_start: Date.now() - 5_000,
        },
      };

      const db = {
        collection: jest.fn(() => ({
          doc: jest.fn((id: string) => ({ id })),
        })),
        runTransaction: jest.fn(async (cb: (tx: { get: jest.Mock; set: jest.Mock }) => Promise<void>, ...rest: unknown[]) => {
          // Necesitamos saber qué docId se usó — lo inferimos del contexto
          // Simplificación: runTransaction se llama secuencialmente
          const txCallIndex = (db.runTransaction as jest.Mock).mock.calls.length - 1;
          const orgId = txCallIndex === 0 ? 'org-A' : 'org-B';
          const key = `${orgId}_whatsapp`;
          await cb({
            get: jest.fn().mockResolvedValue({ data: () => docData[key] }),
            set: jest.fn(),
          });
          void rest;
        }),
      } as unknown as FirebaseFirestore.Firestore;

      const limiter = new WhatsAppRateLimiter(db, cfg);

      // org-A debe fallar (en el límite de minuto)
      await expect(limiter.checkAndIncrement('org-A')).rejects.toBeInstanceOf(RateLimitError);

      // org-B debe pasar (contador en 0)
      await expect(limiter.checkAndIncrement('org-B')).resolves.toBeUndefined();
    });
  });
});
