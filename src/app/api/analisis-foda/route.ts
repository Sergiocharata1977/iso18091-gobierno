import { withAuth } from '@/lib/api/withAuth';
import { AnalisisFODAService } from '@/services/analisis-foda/AnalisisFODAService';
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
      const tipo = searchParams.get('tipo');
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

      const analisis = await AnalisisFODAService.getAll({
        organization_id: organizationId,
        tipo_analisis: tipo || undefined,
        estado: estado || undefined,
      });
      return NextResponse.json(analisis);
    } catch (error) {
      console.error('Error fetching analisis FODA:', error);
      return NextResponse.json(
        { error: 'Error al obtener analisis FODA' },
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

      const analisisId = await AnalisisFODAService.create(payload, auth.uid);
      return NextResponse.json({ id: analisisId }, { status: 201 });
    } catch (error) {
      console.error('Error creating analisis FODA:', error);
      return NextResponse.json(
        { error: 'Error al crear analisis FODA' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
