import { withAuth } from '@/lib/api/withAuth';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const orgId =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? orgId || auth.organizationId
          : auth.organizationId;

      const definitions = await ProcessDefinitionServiceAdmin.getAllActive(
        organizationId || undefined
      );
      return NextResponse.json(definitions);
    } catch (error) {
      console.error('Error getting process definitions:', error);
      return NextResponse.json(
        { error: 'Error al obtener definiciones de procesos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const hasLegacyAssignmentWrite =
        body.jefe_proceso_id !== undefined ||
        body.puesto_responsable_id !== undefined ||
        body.owner_position_id !== undefined;

      if (hasLegacyAssignmentWrite) {
        return NextResponse.json(
          {
            error:
              'La asignacion estructural de responsables se administra desde Mi Panel',
          },
          { status: 409 }
        );
      }

      if (body.action === 'create') {
        const {
          codigo,
          nombre,
          descripcion,
          objetivo,
          alcance,
          funciones_involucradas,
          categoria,
          documento_origen_id,
          etapas_default,
          tipo_registros,
          modulo_vinculado,
          activo,
          organization_id,
        } = body;

        if (!nombre) {
          return NextResponse.json(
            { error: 'El nombre es requerido' },
            { status: 400 }
          );
        }

        const orgId =
          auth.role === 'super_admin'
            ? organization_id || auth.organizationId
            : auth.organizationId;
        if (!orgId) {
          return NextResponse.json(
            { error: 'organization_id es requerido' },
            { status: 400 }
          );
        }

        const id = await ProcessDefinitionServiceAdmin.create({
          process_code: codigo,
          nombre,
          descripcion,
          objetivo,
          alcance,
          funciones_involucradas,
          category_id: categoria,
          documento_origen_id,
          etapas_default,
          tipo_registros,
          modulo_vinculado,
          activo,
          organization_id: orgId,
        });

        return NextResponse.json(
          { id, message: 'Definicion creada exitosamente' },
          { status: 201 }
        );
      }

      if (body.action === 'update') {
        const { id, organization_id, ...updateData } = body;
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
          return NextResponse.json(
            { error: 'Acceso denegado' },
            { status: 403 }
          );
        }
        void organization_id;
        await ProcessDefinitionServiceAdmin.update(id, updateData);
        return NextResponse.json({
          message: 'Definicion actualizada exitosamente',
        });
      }

      return NextResponse.json({ error: 'Accion no valida' }, { status: 400 });
    } catch (error) {
      console.error('Error in POST:', error);
      return NextResponse.json(
        { error: 'Error al procesar solicitud' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
