import { getAdminFirestore } from '@/lib/firebase/admin';
import { ProductoDealerService } from '@/services/dealer/ProductoDealerService';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

describe('ProductoDealerService', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  const orgId = 'org-1';
  const productoId = 'prod-1';
  const createdOld = new Date('2026-03-01T10:00:00.000Z');
  const createdNew = new Date('2026-03-02T10:00:00.000Z');

  let collectionGetMock: jest.Mock;
  let docGetMock: jest.Mock;
  let docUpdateMock: jest.Mock;
  let docSetMock: jest.Mock;
  let docFactoryMock: jest.Mock;

  beforeEach(() => {
    collectionGetMock = jest.fn();
    docGetMock = jest.fn();
    docUpdateMock = jest.fn();
    docSetMock = jest.fn();

    docFactoryMock = jest.fn((id?: string) => ({
      id: id || 'new-prod',
      get: docGetMock,
      update: docUpdateMock,
      set: docSetMock,
    }));

    const collectionRef = {
      get: collectionGetMock,
      doc: docFactoryMock,
    };

    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => collectionRef),
        })),
      })),
    };

    mockGetAdminFirestore.mockReturnValue(db as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists, filters and sorts in memory without depending on Firestore composite indexes', async () => {
    collectionGetMock.mockResolvedValue({
      docs: [
        {
          id: 'prod-old',
          data: () => ({
            nombre: 'Pulverizadora',
            categoria: 'maquinaria',
            activo: true,
            destacado: false,
            imagenes: [],
            created_at: createdOld,
            updated_at: createdOld,
          }),
        },
        {
          id: 'prod-new',
          data: () => ({
            nombre: 'Sembradora',
            categoria: 'maquinaria',
            activo: true,
            destacado: true,
            imagenes: [],
            created_at: createdNew,
            updated_at: createdNew,
          }),
        },
        {
          id: 'prod-deleted',
          data: () => ({
            nombre: 'Eliminado',
            categoria: 'maquinaria',
            activo: false,
            destacado: false,
            imagenes: [],
            created_at: createdNew,
            updated_at: createdNew,
            deleted_at: createdNew,
          }),
        },
      ],
    });

    const result = await ProductoDealerService.list(orgId, {
      categoria: 'maquinaria',
      activo: true,
      limit: 10,
    });

    expect(collectionGetMock).toHaveBeenCalledTimes(1);
    expect(result.map(item => item.id)).toEqual(['prod-new', 'prod-old']);
  });

  it('returns null for soft-deleted products on detail', async () => {
    docGetMock.mockResolvedValue({
      exists: true,
      id: productoId,
      data: () => ({
        nombre: 'Producto dado de baja',
        categoria: 'repuesto',
        activo: false,
        destacado: false,
        imagenes: [],
        created_at: createdOld,
        updated_at: createdNew,
        deleted_at: createdNew,
      }),
    });

    await expect(
      ProductoDealerService.getById(orgId, productoId)
    ).resolves.toBeNull();
  });

  it('soft deletes by marking deleted_at and deactivating the product', async () => {
    docGetMock.mockResolvedValue({
      exists: true,
      id: productoId,
      data: () => ({
        nombre: 'Producto activo',
        categoria: 'repuesto',
        activo: true,
        destacado: false,
        imagenes: [],
        created_at: createdOld,
        updated_at: createdOld,
      }),
    });

    await ProductoDealerService.softDelete(orgId, productoId);

    expect(docUpdateMock).toHaveBeenCalledTimes(1);
    expect(docUpdateMock.mock.calls[0][0]).toMatchObject({
      activo: false,
    });
    expect(docUpdateMock.mock.calls[0][0].deleted_at).toBeDefined();
  });
});
