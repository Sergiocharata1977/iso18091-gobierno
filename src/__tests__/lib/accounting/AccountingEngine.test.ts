import { getAdminFirestore } from '@/lib/firebase/admin';
import { AccountingEngine } from '@/lib/accounting/AccountingEngine';
import { AccountingPeriodClosedError } from '@/lib/accounting/validators';
import type {
  AccountingAccount,
  AccountingEvent,
  AccountingRule,
} from '@/types/accounting';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

function createQuery(snapshot: unknown) {
  return {
    where: jest.fn(() => createQuery(snapshot)),
    limit: jest.fn(() => ({
      get: jest.fn(async () => snapshot),
    })),
    get: jest.fn(async () => snapshot),
  };
}

describe('AccountingEngine', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  let writes: Array<{ collection: string; id: string; data: unknown }>;

  beforeEach(() => {
    writes = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('crea el asiento balanceado en Firestore desde un evento', async () => {
    const event: AccountingEvent = {
      id: 'evt-1',
      organization_id: 'org-1',
      idempotency_key: 'idem-1',
      plugin_id: 'crm',
      operation_type: 'crm_credito_otorgado',
      fecha: '2026-03-26',
      moneda: 'ARS',
      importe_total: 1000,
      importe_capital: 1000,
      documento_id: 'loan-1',
      documento_tipo: 'prestamo',
      descripcion: 'Desembolso de prestamo',
      created_by: 'user-1',
    };

    const rule: AccountingRule = {
      id: 'rule-1',
      organization_id: 'org-1',
      plugin_id: 'crm',
      operation_type: 'crm_credito_otorgado',
      nombre: 'Prestamo otorgado',
      status: 'active',
      version: 1,
      lines: [
        {
          id: 'line-1',
          lado: 'debe',
          cuenta_codigo: '113101',
          amount_source: 'importe_capital',
        },
        {
          id: 'line-2',
          lado: 'haber',
          cuenta_codigo: '111201',
          amount_source: 'importe_capital',
        },
      ],
      created_at: '2026-03-26T00:00:00.000Z',
      updated_at: '2026-03-26T00:00:00.000Z',
    };

    const debitAccount: AccountingAccount = {
      id: 'acc-1',
      organization_id: 'org-1',
      codigo: '113101',
      nombre: 'Prestamos a cobrar',
      naturaleza: 'activo',
      tipo: 'imputable',
      acepta_movimientos: true,
      moneda: 'ARS',
      activa: true,
      created_at: '2026-03-26T00:00:00.000Z',
      updated_at: '2026-03-26T00:00:00.000Z',
    };

    const creditAccount: AccountingAccount = {
      id: 'acc-2',
      organization_id: 'org-1',
      codigo: '111201',
      nombre: 'Banco cuenta corriente',
      naturaleza: 'activo',
      tipo: 'imputable',
      acepta_movimientos: true,
      moneda: 'ARS',
      activa: true,
      created_at: '2026-03-26T00:00:00.000Z',
      updated_at: '2026-03-26T00:00:00.000Z',
    };

    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_entries') {
          return {
            where: jest.fn(() =>
              createQuery({
                empty: true,
                docs: [],
              })
            ),
            doc: jest.fn(() => ({ id: 'entry-generated', _collection: name })),
          };
        }

        if (name === 'acc_periods') {
          return { where: jest.fn(() => createQuery({ empty: true, docs: [] })) };
        }

        if (name === 'acc_rules') {
          return {
            where: jest.fn(() =>
              createQuery({
                docs: [createDoc(rule.id, rule)],
              })
            ),
          };
        }

        if (name === 'acc_accounts') {
          return {
            where: jest.fn(() => ({
              where: jest.fn((_field: string, _op: string, value: string) => ({
                limit: jest.fn(() => ({
                  get: jest.fn(async () => ({
                    empty: false,
                    docs: [
                      createDoc(
                        value === '113101' ? debitAccount.id : creditAccount.id,
                        value === '113101' ? debitAccount : creditAccount
                      ),
                    ],
                  })),
                })),
              })),
            })),
          };
        }

        return {
          doc: jest.fn(() => ({
            id: `${name}-generated-${writes.length + 1}`,
            _collection: name,
          })),
        };
      }),
      runTransaction: jest.fn(async callback => {
        const tx = {
          set: jest.fn((ref: { id: string; _collection?: string }, data: unknown) => {
            writes.push({
              collection: ref._collection || 'unknown',
              id: ref.id,
              data,
            });
          }),
        };

        return callback(tx);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    const result = await AccountingEngine.process(event);

    expect(result.total_debe).toBe(1000);
    expect(result.total_haber).toBe(1000);
    expect(result.entry_id).toBe('entry-generated');

    expect(mockDb.runTransaction).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(4);

    const entryWrite = writes.find(item => item.id === 'entry-generated');
    expect(entryWrite?.data).toMatchObject({
      organization_id: 'org-1',
      documento_id: 'loan-1',
      status: 'posted',
      total_debe: 1000,
      total_haber: 1000,
    });

    const lineWrites = writes.filter(item => item.collection === 'acc_entry_lines');
    expect(lineWrites).toHaveLength(2);
    expect(lineWrites[0]?.data).toMatchObject({ entry_id: 'entry-generated' });

    const auditWrite = writes.find(item => item.collection === 'acc_audit_log');
    expect(auditWrite?.data).toMatchObject({
      action: 'entry_created',
      entity_type: 'entry',
      entity_id: 'entry-generated',
      trace_id: 'idem-1',
    });
  });

  it('rechaza asientos cuando el periodo esta cerrado', async () => {
    const event: AccountingEvent = {
      id: 'evt-closed',
      organization_id: 'org-1',
      idempotency_key: 'idem-closed',
      plugin_id: 'crm',
      operation_type: 'crm_credito_otorgado',
      fecha: '2026-03-26',
      moneda: 'ARS',
      importe_total: 1000,
      documento_id: 'loan-closed',
    };

    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_entries') {
          return {
            where: jest.fn(() =>
              createQuery({
                empty: true,
                docs: [],
              })
            ),
          };
        }

        if (name === 'acc_periods') {
          return {
            where: jest.fn(() =>
              createQuery({
                empty: false,
                docs: [
                  createDoc('period-1', {
                    organization_id: 'org-1',
                    periodo: '2026-03',
                    status: 'cerrado',
                  }),
                ],
              })
            ),
          };
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    await expect(AccountingEngine.process(event)).rejects.toBeInstanceOf(
      AccountingPeriodClosedError
    );
  });
});
