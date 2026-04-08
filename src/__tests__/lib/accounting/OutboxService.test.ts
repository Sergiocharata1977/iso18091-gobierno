import { AccountingEngine } from '@/lib/accounting/AccountingEngine';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { OutboxService } from '@/lib/accounting/outbox/OutboxService';
import type { AccountingEvent } from '@/types/accounting';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/accounting/AccountingEngine', () => ({
  AccountingEngine: {
    process: jest.fn(),
  },
}));

type CollectionStore = Map<string, Record<string, unknown>>;
type DbStore = Map<string, CollectionStore>;

function createFirestoreMock(store: DbStore) {
  function ensureCollection(name: string): CollectionStore {
    const existing = store.get(name);
    if (existing) {
      return existing;
    }

    const created = new Map<string, Record<string, unknown>>();
    store.set(name, created);
    return created;
  }

  function createDocRef(collection: string, id: string) {
    return {
      id,
      _collection: collection,
      async get() {
        const data = ensureCollection(collection).get(id);
        return {
          id,
          exists: Boolean(data),
          data: () => data,
        };
      },
    };
  }

  return {
    collection(name: string) {
      const collection = ensureCollection(name);

      return {
        doc(id?: string) {
          const resolvedId =
            id || `${name}-${collection.size + 1}-${Date.now()}`;
          return createDocRef(name, resolvedId);
        },
      };
    },
    async runTransaction<T>(
      callback: (tx: {
        get: (ref: { id: string; _collection: string }) => Promise<{
          id: string;
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (
          ref: { id: string; _collection: string },
          data: Record<string, unknown>,
          options?: { merge?: boolean }
        ) => void;
      }) => Promise<T>
    ) {
      const tx = {
        async get(ref: { id: string; _collection: string }) {
          return createDocRef(ref._collection, ref.id).get();
        },
        set(
          ref: { id: string; _collection: string },
          data: Record<string, unknown>,
          options?: { merge?: boolean }
        ) {
          const collection = ensureCollection(ref._collection);
          const current = collection.get(ref.id) || {};
          collection.set(
            ref.id,
            options?.merge ? { ...current, ...data } : { ...data }
          );
        },
      };

      return callback(tx);
    },
  };
}

describe('OutboxService', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;
  const mockAccountingProcess = AccountingEngine.process as jest.MockedFunction<
    typeof AccountingEngine.process
  >;

  let store: DbStore;

  const event: AccountingEvent = {
    id: 'evt-1',
    organization_id: 'org-1',
    idempotency_key: 'idem-1',
    plugin_id: 'crm',
    operation_type: 'credito_otorgado',
    fecha: '2026-03-26',
    moneda: 'ARS',
    importe_total: 1000,
    documento_id: 'loan-1',
    created_by: 'user-1',
  };

  beforeEach(() => {
    store = new Map();
    mockGetAdminFirestore.mockReturnValue(createFirestoreMock(store) as never);
    mockAccountingProcess.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registra pending y luego processed cuando el motor contable completa el asiento', async () => {
    mockAccountingProcess.mockResolvedValue({
      entry_id: 'entry-1',
      total_debe: 1000,
      total_haber: 1000,
    });

    const result = await OutboxService.processEvent(event);

    const outbox = Array.from(store.get('acc_outbox')?.values() || [])[0] as
      | Record<string, unknown>
      | undefined;

    expect(result).toMatchObject({
      entry_id: 'entry-1',
      outbox_status: 'processed',
      attempts: 1,
    });
    expect(outbox).toMatchObject({
      organization_id: 'org-1',
      status: 'processed',
      attempts: 1,
      last_error: null,
    });
    expect(outbox?.process_result).toMatchObject({
      entry_id: 'entry-1',
      total_debe: 1000,
      total_haber: 1000,
    });
  });

  it('deja el evento en failed cuando falla el procesamiento del asiento', async () => {
    mockAccountingProcess.mockRejectedValue(new Error('firestore_write_failed'));

    await expect(OutboxService.processEvent(event)).rejects.toThrow(
      'firestore_write_failed'
    );

    const outbox = Array.from(store.get('acc_outbox')?.values() || [])[0] as
      | Record<string, unknown>
      | undefined;

    expect(outbox).toMatchObject({
      organization_id: 'org-1',
      status: 'failed',
      attempts: 1,
      last_error: 'firestore_write_failed',
    });
  });

  it('permite reprocesar un evento failed y marcarlo processed', async () => {
    mockAccountingProcess
      .mockRejectedValueOnce(new Error('firestore_write_failed'))
      .mockResolvedValueOnce({
        entry_id: 'entry-2',
        total_debe: 1000,
        total_haber: 1000,
      });

    await expect(OutboxService.processEvent(event)).rejects.toThrow(
      'firestore_write_failed'
    );

    const outboxId = Array.from(store.get('acc_outbox')?.keys() || [])[0];
    const result = await OutboxService.reprocessFailedEvent({
      organizationId: 'org-1',
      outboxId,
    });

    const outbox = store.get('acc_outbox')?.get(outboxId);

    expect(result).toMatchObject({
      entry_id: 'entry-2',
      outbox_status: 'processed',
      attempts: 2,
    });
    expect(outbox).toMatchObject({
      status: 'processed',
      attempts: 2,
      last_error: null,
    });
  });
});
