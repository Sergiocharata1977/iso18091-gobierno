import { withAuth } from '@/lib/api/withAuth';
import { ProcessRecordServiceAdmin } from '@/services/processRecords/ProcessRecordServiceAdmin';
import { ProcessRecordTaskServiceAdmin } from '@/services/processRecords/ProcessRecordTaskServiceAdmin';
import { NextResponse } from 'next/server';

async function authorizeRecord(id: string, auth: any) {
  const record = await ProcessRecordServiceAdmin.getById(id);
  if (!record)
    return {
      error: NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      ),
    };
  if (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    (record as any).organization_id &&
    (record as any).organization_id !== auth.organizationId
  ) {
    return {
      error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    };
  }
  return { record };
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id, taskId } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      const task = await ProcessRecordTaskServiceAdmin.getById(taskId);
      if (!task) {
        return NextResponse.json(
          { error: 'Tarea no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json(task);
    } catch (error) {
      console.error('Error getting task:', error);
      return NextResponse.json(
        { error: 'Error al obtener tarea' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id, taskId } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      const body = await request.json();
      const { stage_id, ...otherData } = body;

      delete otherData.asignado_a_id;
      delete otherData.asignado_a_nombre;

      if (stage_id) {
        await ProcessRecordTaskServiceAdmin.moveToStage(taskId, stage_id, 0);
      }

      if (Object.keys(otherData).length > 0) {
        await ProcessRecordTaskServiceAdmin.update(taskId, otherData);
      }

      return NextResponse.json({
        id: taskId,
        message: 'Tarea actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error updating task:', error);
      return NextResponse.json(
        { error: 'Error al actualizar tarea' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id, taskId } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      await ProcessRecordTaskServiceAdmin.delete(taskId);
      return NextResponse.json({ message: 'Tarea eliminada exitosamente' });
    } catch (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { error: 'Error al eliminar tarea' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
