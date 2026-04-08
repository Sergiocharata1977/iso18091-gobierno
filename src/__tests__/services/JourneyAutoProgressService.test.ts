jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/services/JourneyService', () => ({
  JourneyService: {
    saveJourneyProgress: jest.fn(),
  },
}));

import { JourneyAutoProgressService } from '@/services/JourneyAutoProgressService';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { JourneyService } from '@/services/JourneyService';

type RecordMap = Record<string, Array<Record<string, unknown>>>;

function docSnapshot(data?: Record<string, unknown> | null) {
  return {
    exists: data != null,
    data: () => data ?? undefined,
  };
}

function querySnapshot(items: Array<Record<string, unknown>>) {
  return {
    size: items.length,
    empty: items.length === 0,
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
  };
}

function createAdminDb(fixtures?: {
  organizations?: Record<string, Record<string, unknown>>;
  orgCollections?: Record<string, RecordMap>;
  topLevel?: Record<string, Array<Record<string, unknown>>>;
}) {
  const organizations = fixtures?.organizations ?? {};
  const orgCollections = fixtures?.orgCollections ?? {};
  const topLevel = fixtures?.topLevel ?? {};

  function executeCollection(path: string[], filters: Array<{ field: string; value: unknown }>) {
    if (path.length === 1) {
      const [collectionName] = path;
      let docs = [...(topLevel[collectionName] ?? [])];
      for (const filter of filters) {
        docs = docs.filter(doc => doc[filter.field] === filter.value);
      }
      return querySnapshot(docs);
    }

    if (path.length === 3 && path[0] === 'organizations') {
      const [, orgId, collectionName] = path;
      let docs = [...(orgCollections[orgId]?.[collectionName] ?? [])];
      for (const filter of filters) {
        docs = docs.filter(doc => doc[filter.field] === filter.value);
      }
      return querySnapshot(docs);
    }

    return querySnapshot([]);
  }

  function createRef(path: string[], filters: Array<{ field: string; value: unknown }> = []) {
    return {
      doc(id: string) {
        const nextPath = [...path, id];
        return {
          ...createRef(nextPath, filters),
          async get() {
            if (nextPath.length === 2 && nextPath[0] === 'organizations') {
              return docSnapshot(organizations[id] ?? null);
            }

            if (nextPath.length === 4 && nextPath[0] === 'organizations') {
              const [, orgId, collectionName, docId] = nextPath;
              const docData = (orgCollections[orgId]?.[collectionName] ?? []).find(
                item => item.id === docId
              );
              return docSnapshot(docData ?? null);
            }

            return docSnapshot(null);
          },
          collection(name: string) {
            return createRef([...nextPath, name]);
          },
        };
      },
      collection(name: string) {
        return createRef([...path, name]);
      },
      where(field: string, _operator: string, value: unknown) {
        return createRef(path, [...filters, { field, value }]);
      },
      limit() {
        return this;
      },
      async get() {
        return executeCollection(path, filters);
      },
    };
  }

  return {
    collection(name: string) {
      return createRef([name]);
    },
  };
}

describe('JourneyAutoProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('org sin datos devuelve 0% en todas las fases', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(createAdminDb());

    const progress = await JourneyAutoProgressService.computeProgress('org-empty');

    expect(progress).toHaveLength(6);
    expect(progress.map(phase => phase.porcentaje)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(progress[0].status).toBe('available');
    expect(progress.slice(1).every(phase => phase.status === 'locked')).toBe(true);
    expect(JourneyService.saveJourneyProgress).toHaveBeenCalledWith('org-empty', progress);
  });

  it('org con 3 procesos completa la tarea 3.2', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(
      createAdminDb({
        topLevel: {
          procesos: [
            { id: 'p1', organization_id: 'org-processes', nombre: 'Ventas' },
            { id: 'p2', organization_id: 'org-processes', nombre: 'Compras' },
            { id: 'p3', organization_id: 'org-processes', nombre: 'Calidad' },
          ],
        },
      })
    );

    const progress = await JourneyAutoProgressService.computeProgress('org-processes');
    const phase3 = progress.find(phase => phase.phaseId === 3);

    expect(phase3).toBeDefined();
    expect(phase3?.tareasCompletadas).toContain('3.2');
    expect(phase3?.porcentaje).toBeGreaterThan(0);
  });

  it('preserva progreso manual previo al hacer merge', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(
      createAdminDb({
        orgCollections: {
          'org-manual': {
            journey: [
              {
                id: 'progress',
                fases: [
                  {
                    phaseId: 1,
                    status: 'completed',
                    porcentaje: 100,
                    tareasCompletadas: ['1.1', '1.5'],
                  },
                  {
                    phaseId: 3,
                    status: 'in_progress',
                    porcentaje: 25,
                    tareasCompletadas: ['3.4'],
                  },
                ],
              },
            ],
          },
        },
        topLevel: {
          procesos: [
            { id: 'p1', organization_id: 'org-manual', nombre: 'Ventas' },
          ],
        },
      })
    );

    const progress = await JourneyAutoProgressService.computeProgress('org-manual');
    const phase1 = progress.find(phase => phase.phaseId === 1);
    const phase3 = progress.find(phase => phase.phaseId === 3);

    expect(phase1?.tareasCompletadas).toEqual(expect.arrayContaining(['1.1', '1.5']));
    expect(phase3?.tareasCompletadas).toEqual(expect.arrayContaining(['3.2', '3.4']));
  });

  it('cross-org: org A no puede afectar datos de org B', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(
      createAdminDb({
        topLevel: {
          procesos: [
            { id: 'p-a', organization_id: 'org-a', nombre: 'Proceso A' },
            { id: 'p-b', organization_id: 'org-b', nombre: 'Proceso B' },
          ],
          documents: [
            {
              id: 'doc-b',
              organization_id: 'org-b',
              status: 'approved',
              title: 'Procedimiento org B',
            },
          ],
        },
      })
    );

    const progress = await JourneyAutoProgressService.computeProgress('org-a');
    const phase3 = progress.find(phase => phase.phaseId === 3);

    expect(phase3?.tareasCompletadas).toContain('3.2');
    expect(phase3?.tareasCompletadas).not.toContain('3.3');
  });
});
