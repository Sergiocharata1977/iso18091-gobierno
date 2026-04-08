import { getAdminFirestore } from '@/lib/firebase/admin';
import { SnapshotService } from '@/lib/accounting/SnapshotService';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    ref: { id, _collection: 'acc_snapshots' },
    data: () => data,
  };
}

describe('SnapshotService', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('recalcula snapshots por cuenta y reemplaza snapshots previos', async () => {
    const deleted: string[] = [];
    const written: Array<{ id: string; data: Record<string, unknown> }> = [];
    let generatedCounter = 0;

    const existingSnapshots = [
      createDoc('old-1', {
        organization_id: 'org-1',
        periodo: '2026-03',
      }),
    ];

    const entryDocs = [
      { id: 'entry-1', data: () => ({}) },
      { id: 'entry-2', data: () => ({}) },
    ];

    const lineDocs = [
      {
        id: 'line-1',
        data: () => ({
          organization_id: 'org-1',
          entry_id: 'entry-1',
          cuenta_codigo: '111201',
          moneda: 'ARS',
          lado: 'debe',
          importe: 100,
        }),
      },
      {
        id: 'line-2',
        data: () => ({
          organization_id: 'org-1',
          entry_id: 'entry-2',
          cuenta_codigo: '111201',
          moneda: 'ARS',
          lado: 'haber',
          importe: 40,
        }),
      },
      {
        id: 'line-3',
        data: () => ({
          organization_id: 'org-1',
          entry_id: 'entry-2',
          cuenta_codigo: '211101',
          moneda: 'ARS',
          lado: 'haber',
          importe: 60,
        }),
      },
    ];

    const createBatch = () => ({
      delete: jest.fn((ref: { id: string }) => {
        deleted.push(ref.id);
      }),
      set: jest.fn((ref: { id: string }, data: Record<string, unknown>) => {
        written.push({ id: ref.id, data });
      }),
      commit: jest.fn(async () => undefined),
    });

    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_entries') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                where: jest.fn(() => ({
                  get: jest.fn(async () => ({
                    docs: entryDocs,
                  })),
                })),
              })),
            })),
          };
        }

        if (name === 'acc_entry_lines') {
          return {
            where: jest.fn(() => ({
              where: jest.fn((_field: string, _op: string, values: string[]) => ({
                get: jest.fn(async () => ({
                  docs: lineDocs.filter(doc =>
                    values.includes(String(doc.data().entry_id))
                  ),
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
                  docs: existingSnapshots,
                })),
              })),
            })),
            doc: jest.fn(() => ({
              id: `snapshot-${++generatedCounter}`,
            })),
          };
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
      batch: jest.fn(() => createBatch()),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    const result = await SnapshotService.generateForPeriod({
      organizationId: 'org-1',
      periodo: '2026-03',
      generatedBy: 'user-1',
    });

    expect(result.entries_count).toBe(2);
    expect(result.lines_count).toBe(3);
    expect(result.deleted_count).toBe(1);
    expect(result.generated_count).toBe(2);
    expect(deleted).toEqual(['old-1']);
    expect(written).toHaveLength(2);
    expect(written[0]?.data).toMatchObject({
      organization_id: 'org-1',
      periodo: '2026-03',
      generated_by: 'user-1',
    });

    const account111201 = written.find(
      item => item.data.cuenta_codigo === '111201'
    );
    expect(account111201?.data).toMatchObject({
      saldo_debe: 100,
      saldo_haber: 40,
      saldo_neto: 60,
    });
  });

  it('genera automaticamente solo periodos vencidos sin snapshot', async () => {
    const generatedCalls: string[] = [];
    const periodDocs = [
      createDoc('period-1', {
        organization_id: 'org-1',
        periodo: '2026-01',
        fecha_fin: '2026-01-31',
      }),
      createDoc('period-2', {
        organization_id: 'org-1',
        periodo: '2026-02',
        fecha_fin: '2026-02-28',
      }),
      createDoc('period-3', {
        organization_id: 'org-1',
        periodo: '2026-04',
        fecha_fin: '2026-04-30',
      }),
    ];

    const snapshotExistence = new Map<string, boolean>([
      ['org-1:2026-01', true],
      ['org-1:2026-02', false],
      ['org-1:2026-04', false],
    ]);

    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'acc_periods') {
          return {
            where: jest.fn(() => ({
              where: jest.fn((_field: string, _op: string, cutoff: string) => ({
                get: jest.fn(async () => ({
                  docs: periodDocs.filter(
                    doc => String(doc.data().fecha_fin) < cutoff
                  ),
                })),
              })),
            })),
          };
        }

        if (name === 'acc_snapshots') {
          return {
            where: jest.fn((_field: string, _op: string, organizationId: string) => ({
              where: jest.fn((_periodField: string, _periodOp: string, periodo: string) => ({
                limit: jest.fn(() => ({
                  get: jest.fn(async () => {
                    const exists =
                      snapshotExistence.get(`${organizationId}:${periodo}`) ?? false;
                    return {
                      empty: !exists,
                      docs: exists
                        ? [createDoc('snapshot-existing', { organization_id: organizationId, periodo })]
                        : [],
                    };
                  }),
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as never);

    const generateSpy = jest
      .spyOn(SnapshotService, 'generateForPeriod')
      .mockImplementation(async params => {
        generatedCalls.push(`${params.organizationId}:${params.periodo}`);
        return {
          periodo: params.periodo,
          entries_count: 1,
          lines_count: 2,
          deleted_count: 0,
          generated_count: 1,
          generated_at: '2026-03-26T00:00:00.000Z',
        };
      });

    const result = await SnapshotService.generateMissingMonthlySnapshots({
      organizationId: 'org-1',
      now: new Date('2026-03-26T00:00:00.000Z'),
    });

    expect(result.generated_count).toBe(1);
    expect(result.generated).toEqual([
      expect.objectContaining({
        organization_id: 'org-1',
        periodo: '2026-02',
      }),
    ]);
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy).toHaveBeenCalledWith({
      organizationId: 'org-1',
      periodo: '2026-02',
      generatedBy: undefined,
    });

    generateSpy.mockRestore();
  });
});
