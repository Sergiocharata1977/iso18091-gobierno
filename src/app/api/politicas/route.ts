import { withAuth } from '@/lib/api/withAuth';
import { PoliticaService } from '@/services/politicas/PoliticaService';
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

      const politicas = await PoliticaService.getAll({
        organization_id: organizationId,
        estado: estado || undefined,
      });
      return NextResponse.json(politicas);
    } catch (error) {
      console.error('Error fetching politicas:', error);
      return NextResponse.json(
        { error: 'Error al obtener politicas' },
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
      };

      const politicaId = await PoliticaService.create(payload, auth.uid);
      const politica = await PoliticaService.getById(politicaId);

      return NextResponse.json(
        { id: politicaId, ...politica },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating politica:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return NextResponse.json(
        { error: 'Error al crear politica', details: errorMessage },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
