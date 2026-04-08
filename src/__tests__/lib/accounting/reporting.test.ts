import {
  buildBalanceTrial,
  calculateAccountBalance,
  getIncomeStatement,
} from '@/lib/accounting/reporting';
import { getAdminFirestore } from '@/lib/firebase/admin';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

describe('accounting reporting helpers', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calcula saldo acreedor para cuentas pasivas e ingresos', () => {
    expect(calculateAccountBalance('pasivo', 100, 350)).toBe(250);
    expect(calculateAccountBalance('ingreso', 90, 120)).toBe(30);
  });

  it('arma balance trial con saldo correcto segun naturaleza', () => {
    const rows = buildBalanceTrial(
      [
        {
          id: '1',
          organization_id: 'org-1',
          codigo: '1.1.1',
          nombre: 'Caja',
          naturaleza: 'activo',
          tipo: 'imputable',
          acepta_movimientos: true,
          activa: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        {
          id: '2',
          organization_id: 'org-1',
          codigo: '2.1.1',
          nombre: 'Proveedores',
          naturaleza: 'pasivo',
          tipo: 'imputable',
          acepta_movimientos: true,
          activa: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      [
        { cuenta_codigo: '1.1.1', total_debe: 1000, total_haber: 250 },
        { cuenta_codigo: '2.1.1', total_debe: 100, total_haber: 900 },
      ]
    );

    expect(rows).toEqual([
      expect.objectContaining({
        cuenta_codigo: '1.1.1',
        total_debe: 1000,
        total_haber: 250,
        saldo: 750,
      }),
      expect.objectContaining({
        cuenta_codigo: '2.1.1',
        total_debe: 100,
        total_haber: 900,
        saldo: 800,
      }),
    ]);
  });

  it('calcula estado de resultados como ingresos menos egresos', async () => {
    const createDoc = (id: string, data: Record<string, unknown>) => ({
      id,
      data: () => data,
    });

    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_accounts') {
          return {
            where: jest.fn(() => ({
              get: jest.fn(async () => ({
                docs: [
                  createDoc('acc-ingresos', {
                    organization_id: 'org-1',
                    codigo: '4.1.1',
                    nombre: 'Ventas',
                    naturaleza: 'ingreso',
                    tipo: 'imputable',
                    acepta_movimientos: true,
                    activa: true,
                    created_at: '2026-01-01',
                    updated_at: '2026-01-01',
                  }),
                  createDoc('acc-gastos', {
                    organization_id: 'org-1',
                    codigo: '5.1.1',
                    nombre: 'Sueldos',
                    naturaleza: 'gasto',
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
                  }),
                  createDoc('entry-2', {
                    organization_id: 'org-1',
                    periodo: '2026-03',
                    fecha: '2026-03-11',
                    plugin_id: 'core',
                    status: 'posted',
                    created_at: '2026-03-11T10:00:00.000Z',
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
                      cuenta_codigo: '4.1.1',
                      lado: 'haber',
                      importe: 2500,
                    }),
                    createDoc('line-2', {
                      organization_id: 'org-1',
                      entry_id: 'entry-2',
                      cuenta_codigo: '5.1.1',
                      lado: 'debe',
                      importe: 1200,
                    }),
                  ],
                })),
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

        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    const result = await getIncomeStatement({
      organizationId: 'org-1',
      periodo: '2026-03',
      status: 'posted',
    });

    expect(result.ingresos.total).toBe(2500);
    expect(result.egresos.total).toBe(1200);
    expect(result.resultado_neto).toBe(1300);
  });
});
