import { withAuth } from '@/lib/api/withAuth';
import { ProcessRecordServiceAdmin } from '@/services/processRecords/ProcessRecordServiceAdmin';
import { ProcessRecordStageServiceAdmin } from '@/services/processRecords/ProcessRecordStageServiceAdmin';
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

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id, stageId } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      await ProcessRecordStageServiceAdmin.delete(stageId);
      return NextResponse.json({ message: 'Etapa eliminada exitosamente' });
    } catch (error) {
      console.error('Error deleting stage:', error);
      return NextResponse.json(
        { error: 'Error al eliminar etapa' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id, stageId } = await params;
      const check = await authorizeRecord(id, auth);
      if (check.error) return check.error;

      const body = await request.json();
      await ProcessRecordStageServiceAdmin.update(stageId, body);

      return NextResponse.json({ message: 'Etapa actualizada exitosamente' });
    } catch (error) {
      console.error('Error updating stage:', error);
      return NextResponse.json(
        { error: 'Error al actualizar etapa' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
