import { withAuth } from '@/lib/api/withAuth';
import { processRecordTaskSchema } from '@/lib/validations/processRecords';
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
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      const { searchParams } = new URL(request.url);
      const stageId = searchParams.get('stage_id');

      const tasks = stageId
        ? await ProcessRecordTaskServiceAdmin.getByStageId(stageId)
        : await ProcessRecordTaskServiceAdmin.getByProcessRecordId(id);

      return NextResponse.json(tasks);
    } catch (error) {
      console.error('Error getting tasks:', error);
      return NextResponse.json(
        { error: 'Error al obtener tareas' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      const body = await request.json();
      const { stage_id, ...taskData } = body;

      if (!stage_id) {
        return NextResponse.json(
          { error: 'Se requiere stage_id' },
          { status: 400 }
        );
      }

      const validatedData = processRecordTaskSchema.parse({
        ...taskData,
        asignado_a_id: undefined,
        asignado_a_nombre: undefined,
        fecha_vencimiento: taskData.fecha_vencimiento
          ? new Date(taskData.fecha_vencimiento)
          : undefined,
      });

      const userId = auth.uid || body.created_by || 'system';

      const taskId = await ProcessRecordTaskServiceAdmin.create(
        id,
        stage_id,
        validatedData,
        userId
      );

      return NextResponse.json(
        { id: taskId, message: 'Tarea creada exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating task:', error);
      const message =
        error instanceof Error ? error.message : 'Error al crear tarea';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
