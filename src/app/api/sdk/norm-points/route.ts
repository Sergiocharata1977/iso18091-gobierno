import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { AuthContext, withAuth } from '@/lib/api/withAuth';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function getRequestedOrgId(searchParams: URLSearchParams): string | null {
  return (
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
}

function validateRequestedOrg(
  requestedOrgId: string | null,
  auth: AuthContext
): NextResponse | null {
  if (!requestedOrgId) return null;
  if (requestedOrgId !== auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Acceso denegado',
        message: 'No puedes operar sobre otra organizacion',
      },
      { status: 403 }
    );
  }
  return null;
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }

      const searchParams = request.nextUrl.searchParams;

      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const tipoNorma =
        searchParams.get('tipo_norma') || searchParams.get('tipoNorma');
      const chapter = searchParams.get('chapter');
      const search = searchParams.get('search');

      const limit = parseInt(searchParams.get('limit') || '100');
      const offset = parseInt(searchParams.get('offset') || '0');

      const db = getAdminFirestore();
      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
        .collection('normPoints')
        .where('organization_id', '==', auth.organizationId);

      if (tipoNorma) {
        query = query.where('tipo_norma', '==', tipoNorma);
      }

      if (chapter) {
        query = query.where('chapter', '==', chapter);
      }

      const snapshot = await query.get();

      let normPoints = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      normPoints = normPoints.filter((np: any) => !np.deletedAt);

      if (search) {
        const searchLower = search.toLowerCase();
        normPoints = normPoints.filter(
          (np: any) =>
            (np.requirement &&
              np.requirement.toLowerCase().includes(searchLower)) ||
            (np.description &&
              np.description.toLowerCase().includes(searchLower)) ||
            (np.title && np.title.toLowerCase().includes(searchLower)) ||
            (np.code && np.code.toLowerCase().includes(searchLower))
        );
      }

      normPoints.sort((a: any, b: any) => {
        const codeA = a.code || a.chapter || '';
        const codeB = b.code || b.chapter || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      });

      const paginatedPoints = normPoints.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        data: paginatedPoints,
        count: normPoints.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/norm-points:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener puntos de norma',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    const body = await request
      .json()
      .catch(() => ({
        organization_id: null,
        organizationId: null,
        orgId: null,
        org: null,
      }));
    const requestedOrgId =
      body?.organization_id ||
      body?.organizationId ||
      body?.orgId ||
      body?.org ||
      null;
    const orgValidation = validateRequestedOrg(requestedOrgId, auth);
    if (orgValidation) return orgValidation;

    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  },
  { roles: [...WRITE_ROLES] }
);
