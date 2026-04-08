/**
 * API Route: Obtener revision vigente
 * GET /api/planificacion-revision-direccion/latest
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionDireccionService } from '@/services/planificacion-revision-direccion/PlanificacionRevisionDireccionService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const latest = await PlanificacionRevisionDireccionService.getLatest();

      if (!latest) {
        return NextResponse.json(
          { error: 'No se encontro ninguna revision vigente' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (latest as any).organization_id &&
        (latest as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(latest);
    } catch (error) {
      console.error(
        'Error en GET /api/planificacion-revision-direccion/latest:',
        error
      );
      return NextResponse.json(
        { error: 'Error al obtener la revision vigente' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
