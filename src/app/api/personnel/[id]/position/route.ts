import { withAuth } from '@/lib/api/withAuth';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { NextResponse } from 'next/server';

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PersonnelService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        current.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      if (!body.positionId) {
        return NextResponse.json(
          { error: 'El ID del puesto es requerido' },
          { status: 400 }
        );
      }

      const replaceAssignments = body.replaceAssignments === true;
      await PersonnelService.changePosition(
        id,
        body.positionId,
        replaceAssignments
      );

      return NextResponse.json({
        message: 'Puesto actualizado exitosamente',
        assignmentsReplaced: replaceAssignments,
      });
    } catch (error) {
      console.error('Error updating personnel position:', error);
      const message =
        error instanceof Error ? error.message : 'Error al actualizar puesto';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
