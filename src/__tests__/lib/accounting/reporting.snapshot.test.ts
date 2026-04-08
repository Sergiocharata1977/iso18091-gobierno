import { getAdminFirestore } from '@/lib/firebase/admin';
import { getBalanceTrialResult } from '@/lib/accounting/reporting';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

describe('accounting reporting snapshots', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('usa snapshots cuando el filtro corresponde al periodo completo', async () => {
    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_accounts') {
          return {
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                docs: [
                  createDoc('acc-1', {
                    organization_id: 'org-1',
                    codigo: '1.1.1',
                    nombre: 'Caja',
                    naturaleza: 'activo',
                    tipo: 'imputable',
                    acepta_movimientos: true,
                    activa: true,
                    created_at: '2026-01-01',
                    updated_at: '2026-01-01',
                  }),
                ],
              })),
            })),
          };
        }

        if (name === 'acc_snapshots') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: jest.fn(async () => ({
                  docs: [
                    createDoc('snapshot-1', {
                      organization_id: 'org-1',
                      periodo: '2026-03',
                      cuenta_codigo: '1.1.1',
                      moneda: 'ARS',
                      saldo_debe: 150,
                      saldo_haber: 25,
                      saldo_neto: 125,
                      generated_at: '2026-03-31T23:59:59.000Z',
                    }),
                  ],
                })),
              })),
            })),
          };
        }

        if (name === 'acc_entries' || name === 'acc_entry_lines') {
          throw new Error(`No debería consultar ${name} cuando hay snapshot`);
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    const result = await getBalanceTrialResult({
      organizationId: 'org-1',
      periodo: '2026-03',
      status: 'posted',
    });

    expect(result.source).toBe('snapshot');
    expect(result.snapshot_periodo).toBe('2026-03');
    expect(result.rows).toEqual([
      expect.objectContaining({
        cuenta_codigo: '1.1.1',
        total_debe: 150,
        total_haber: 25,
        saldo: 125,
      }),
    ]);
  });

  it('hace fallback a renglones cuando no existe snapshot', async () => {
    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_accounts') {
          return {
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                docs: [
                  createDoc('acc-1', {
                    organization_id: 'org-1',
                    codigo: '1.1.1',
                    nombre: 'Caja',
                    naturaleza: 'activo',
                    tipo: 'imputable',
                    acepta_movimientos: true,
                    activa: true,
                    created_at: '2026-01-01',
                    updated_at: '2026-01-01',
                  }),
                ],
              })),
            })),
          };
        }

        if (name === 'acc_snapshots') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: jest.fn(async () => ({
                  docs: [],
                })),
              })),
            })),
          };
        }

        if (name === 'acc_entries') {
          return {
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                docs: [
                  createDoc('entry-1', {
                    organization_id: 'org-1',
                    periodo: '2026-03',
                    fecha: '2026-03-10',
                    plugin_id: 'core',
                    status: 'posted',
                    created_at: '2026-03-10T10:00:00.000Z',
                    tercero_id: undefined,
                  }),
                ],
              })),
            })),
          };
        }

        if (name === 'acc_entry_lines') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: jest.fn(async () => ({
                  docs: [
                    createDoc('line-1', {
                      organization_id: 'org-1',
                      entry_id: 'entry-1',
                      cuenta_codigo: '1.1.1',
                      lado: 'debe',
                      importe: 90,
                    }),
                  ],
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    const result = await getBalanceTrialResult({
      organizationId: 'org-1',
      periodo: '2026-03',
      status: 'posted',
    });

    expect(result.source).toBe('lines');
    expect(result.snapshot_periodo).toBeUndefined();
    expect(result.rows).toEqual([
      expect.objectContaining({
        cuenta_codigo: '1.1.1',
        total_debe: 90,
        total_haber: 0,
        saldo: 90,
      }),
    ]);
  });
});
