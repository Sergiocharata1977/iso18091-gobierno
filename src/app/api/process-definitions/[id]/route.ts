import { withAuth } from '@/lib/api/withAuth';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import { NextResponse } from 'next/server';

function hasLegacyAssignmentWrite(body: Record<string, unknown>): boolean {
  return (
    body.jefe_proceso_id !== undefined ||
    body.jefe_proceso_nombre !== undefined ||
    body.puesto_responsable_id !== undefined ||
    body.owner_position_id !== undefined
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const definition =
        await ProcessDefinitionServiceAdmin.getByIdWithRelations(id);

      if (!definition) {
        return NextResponse.json(
          { error: 'Definicion no encontrada' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        definition.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(definition);
    } catch (error) {
      console.error('Error getting process definition:', error);
      return NextResponse.json(
        { error: 'Error al obtener definicion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current =
        await ProcessDefinitionServiceAdmin.getByIdWithRelations(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Definicion no encontrada' },
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

      const body = (await request.json()) as Record<string, unknown>;
      if (hasLegacyAssignmentWrite(body)) {
        return NextResponse.json(
          {
            error:
              'La asignacion estructural de responsables se administra desde Mi Panel',
          },
          { status: 409 }
        );
      }
      if (body.organization_id !== undefined) {
        delete body.organization_id;
      }

      await ProcessDefinitionServiceAdmin.update(id, body);

      return NextResponse.json({
        message: 'Definicion actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error updating process definition:', error);
      return NextResponse.json(
        { error: 'Error al actualizar definicion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
