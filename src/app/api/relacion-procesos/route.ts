import { withAuth } from '@/lib/api/withAuth';
import { RelacionProcesosService } from '@/services/relacion-procesos/RelacionProcesosService';
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
      const procesoId = searchParams.get('proceso_id');
      const tipo = searchParams.get('tipo');
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

      const relaciones = await RelacionProcesosService.getAll({
        organization_id: organizationId,
        proceso_origen_id: procesoId || undefined,
        tipo_relacion: tipo || undefined,
      });
      return NextResponse.json(relaciones);
    } catch (error) {
      console.error('Error fetching relaciones:', error);
      return NextResponse.json(
        { error: 'Error al obtener relaciones de procesos' },
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

      const relacionId = await RelacionProcesosService.create(
        payload,
        auth.uid
      );
      return NextResponse.json({ id: relacionId }, { status: 201 });
    } catch (error) {
      console.error('Error creating relacion:', error);
      return NextResponse.json(
        { error: 'Error al crear relacion de procesos' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
