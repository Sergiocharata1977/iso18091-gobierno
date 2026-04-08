import { GET, PUT } from '@/app/api/sdk/quality/objectives/[id]/route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const authBase = {
  uid: 'user-1',
  email: 'user@test.com',
  organizationId: 'org-1',
  role: 'admin',
  user: {
    id: 'user-1',
    email: 'user@test.com',
    rol: 'admin',
    organization_id: 'org-1',
    personnel_id: null,
    activo: true,
    status: 'active',
  },
} as any;

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any) => handler(request, context, authBase);
  },
}));

const mockGetById = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateProgress = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/sdk/modules/quality', () => ({
  QualityObjectiveService: jest.fn().mockImplementation(() => ({
    getById: mockGetById,
    update: mockUpdate,
    updateProgress: mockUpdateProgress,
    delete: mockDelete,
  })),
}));

describe('SDK quality objectives org scope security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies cross-org read in GET /api/sdk/quality/objectives/[id]', async () => {
    mockGetById.mockResolvedValue({
      id: 'objective-1',
      organization_id: 'org-2',
      title: 'Cross org objective',
    });

    const response = await GET(
      {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as any,
      { params: Promise.resolve({ id: 'objective-1' }) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
  });

  it('denies cross-org write in PUT /api/sdk/quality/objectives/[id]', async () => {
    const response = await PUT(
      {
        json: async () => ({ organization_id: 'org-2', title: 'hijack' }),
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as any,
      { params: Promise.resolve({ id: 'objective-1' }) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetById).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });
});
