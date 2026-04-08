import { withAuth } from '@/lib/api/withAuth';
import { OrganigramaService } from '@/services/organigramas/OrganigramaService';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const estado = searchParams.get('estado');
      const requestedOrg = searchParams.get('organization_id') || undefined;

      if (
        auth.role !== 'super_admin' &&
        requestedOrg &&
        auth.organizationId &&
        requestedOrg !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrg || auth.organizationId || undefined
          : auth.organizationId;

      const organigramas = await OrganigramaService.getAll({
        organization_id: organizationId,
        estado: estado || undefined,
      });
      return NextResponse.json(organigramas);
    } catch (error) {
      console.error('Error fetching organigramas:', error);
      return NextResponse.json(
        { error: 'Error al obtener organigramas' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const data = await request.json();

      if (
        auth.role !== 'super_admin' &&
        data?.organization_id &&
        auth.organizationId &&
        data.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const payload = {
        ...data,
        organization_id: auth.organizationId || data.organization_id,
        created_by: auth.uid,
      };

      const organigramaId = await OrganigramaService.create(payload, auth.uid);
      return NextResponse.json({ id: organigramaId }, { status: 201 });
    } catch (error) {
      console.error('Error creating organigrama:', error);
      return NextResponse.json(
        { error: 'Error al crear organigrama' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
