import { withAuth } from '@/lib/api/withAuth';
import { syncUserRoleFromPersonnel } from '@/lib/utils/user-personnel-sync';
import { personnelSchema } from '@/lib/validations/rrhh';
import { UserContextService } from '@/services/context/UserContextService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const personnel = await PersonnelService.getById(id);

      if (!personnel) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        personnel.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(personnel);
    } catch (error) {
      console.error('Error in personnel GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener personal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

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
      const requestedOrgId = body.organization_id as string | undefined;
      if (
        auth.role !== 'super_admin' &&
        requestedOrgId &&
        requestedOrgId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      const validatedData = personnelSchema.parse({
        ...body,
        organization_id: current.organization_id,
      });

      console.log('[API /personnel/[id]] Actualizando personal:', id);

      // Actualizar personal
      const personnel = await PersonnelService.update(id, validatedData);
      const cacheUserId = current.user_id || personnel.user_id;
      if (cacheUserId) UserContextService.invalidateCache(cacheUserId);

      console.log('[API /personnel/[id]] Personal actualizado exitosamente');

      // Sincronizar rol del usuario si cambió tipo_personal
      if (validatedData.tipo_personal) {
        console.log(
          '[API /personnel/[id]] Sincronizando rol de usuario para tipo_personal:',
          validatedData.tipo_personal
        );

        // Ejecutar sincronización en background (no bloquear respuesta)
        syncUserRoleFromPersonnel(id, validatedData.tipo_personal).catch(
          error => {
            console.error(
              '[API /personnel/[id]] Error en sincronización de rol:',
              error
            );
            // No lanzar error, la actualización del personal ya se completó
          }
        );
      }

      return NextResponse.json(personnel);
    } catch (error) {
      console.error('Error in personnel PUT:', error);

      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ZodError'
      ) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: (error as any).errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar personal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
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

      await PersonnelService.delete(id);

      return NextResponse.json({ message: 'Personal eliminado exitosamente' });
    } catch (error) {
      console.error('Error in personnel DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar personal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

// PATCH for toggling status or updating position
export const PATCH = withAuth(
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

      // Handle toggle_status action
      if (body.action === 'toggle_status') {
        const personnel = await PersonnelService.toggleStatus(id);
        const cacheUserId = current.user_id || personnel.user_id;
        if (cacheUserId) UserContextService.invalidateCache(cacheUserId);
        return NextResponse.json(personnel);
      }

      // Handle position update with context inheritance
      if (body.puesto_id !== undefined) {
        console.log(
          '[API /personnel/[id] PATCH] Cambiando puesto y heredando contexto:',
          {
            id,
            puesto_id: body.puesto_id,
          }
        );

        // Use changePosition to automatically copy assignments (processes, objectives, indicators)
        // replaceAssignments = true implies inheriting the new position's context completely
        await PersonnelService.changePosition(id, body.puesto_id, true);

        // Fetch updated personnel to return
        const updatedPersonnel = await PersonnelService.getById(id);
        const cacheUserId = current.user_id || updatedPersonnel?.user_id;
        if (cacheUserId) UserContextService.invalidateCache(cacheUserId);
        return NextResponse.json(updatedPersonnel);
      }

      // Handle other partial updates (without position change)
      if (
        body.puesto !== undefined ||
        body.departamento_id !== undefined ||
        body.departamento !== undefined
      ) {
        const updateData: Record<string, string | undefined> = {};
        // puesto_id already handled above
        if (body.puesto !== undefined) updateData.puesto = body.puesto;
        if (body.departamento_id !== undefined)
          updateData.departamento_id = body.departamento_id;
        if (body.departamento !== undefined)
          updateData.departamento = body.departamento;

        console.log(
          '[API /personnel/[id] PATCH] Actualizando datos desnormalizados:',
          updateData
        );

        const personnel = await PersonnelService.update(id, updateData);
        const cacheUserId = current.user_id || personnel.user_id;
        if (cacheUserId) UserContextService.invalidateCache(cacheUserId);
        return NextResponse.json(personnel);
      }

      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error) {
      console.error('Error in personnel PATCH:', error);
      return NextResponse.json(
        { error: 'Error al actualizar personal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
