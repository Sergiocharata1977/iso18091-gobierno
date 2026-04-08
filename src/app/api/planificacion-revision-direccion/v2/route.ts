/**
 * API Route: /api/planificacion-revision-direccion/v2
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionV2Service } from '@/services/planificacion-revision-direccion/PlanificacionRevisionV2Service';
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
  async () => {
    try {
      const revisiones = await PlanificacionRevisionV2Service.getAll();
      return NextResponse.json(revisiones);
    } catch (error) {
      console.error('Error al obtener revisiones V2:', error);
      return NextResponse.json(
        { error: 'Error al obtener las revisiones' },
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

      const nuevaRevision = await PlanificacionRevisionV2Service.createRevision(
        {
          ...data,
          created_by: auth.uid,
        }
      );
      return NextResponse.json(nuevaRevision, { status: 201 });
    } catch (error) {
      console.error('Error al crear revision V2:', error);
      return NextResponse.json(
        { error: 'Error al crear la revision' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
