/**
 * API Route: Planificacion y Revision por la Direccion
 * GET /api/planificacion-revision-direccion - Listar todas las revisiones
 * POST /api/planificacion-revision-direccion - Crear nueva revision
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionDireccionService } from '@/services/planificacion-revision-direccion/PlanificacionRevisionDireccionService';
import type { CreatePlanificacionRevisionDireccionData } from '@/types/planificacion-revision-direccion';
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
      const revisiones = await PlanificacionRevisionDireccionService.getAll();
      return NextResponse.json(revisiones);
    } catch (error) {
      console.error(
        'Error en GET /api/planificacion-revision-direccion:',
        error
      );
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
      const body = await request.json();

      if (
        auth.role !== 'super_admin' &&
        body?.organization_id &&
        auth.organizationId &&
        body.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const data: CreatePlanificacionRevisionDireccionData = {
        ...body,
        created_by: auth.uid,
      };

      if (!data.fecha_revision) {
        return NextResponse.json(
          { error: 'La fecha de revision es requerida' },
          { status: 400 }
        );
      }

      if (!data.periodo) {
        return NextResponse.json(
          { error: 'El periodo es requerido' },
          { status: 400 }
        );
      }

      const created =
        await PlanificacionRevisionDireccionService.createRevision(data);
      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      console.error(
        'Error en POST /api/planificacion-revision-direccion:',
        error
      );
      return NextResponse.json(
        { error: 'Error al crear la revision' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
