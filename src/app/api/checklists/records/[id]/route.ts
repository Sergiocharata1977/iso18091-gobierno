import { withAuth } from '@/lib/api/withAuth';
import { ChecklistRecordServiceAdmin } from '@/services/checklists/ChecklistRecordServiceAdmin';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const record = await ChecklistRecordServiceAdmin.getById(id);
      if (!record)
        return NextResponse.json(
          { error: 'Checklist no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (record as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      return NextResponse.json(record);
    } catch (error) {
      console.error('Error getting record:', error);
      return NextResponse.json(
        { error: 'Error al obtener checklist' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const record = await ChecklistRecordServiceAdmin.getById(id);
      if (!record)
        return NextResponse.json(
          { error: 'Checklist no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (record as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const { action, ...data } = body;

      switch (action) {
        case 'update_answer':
          await ChecklistRecordServiceAdmin.updateAnswer(
            id,
            data.campo_id,
            data.answer
          );
          break;
        case 'update_all_answers':
          await ChecklistRecordServiceAdmin.updateAllAnswers(
            id,
            data.respuestas
          );
          break;
        case 'complete':
          await ChecklistRecordServiceAdmin.complete(
            id,
            auth.uid,
            auth.email || 'Usuario',
            data.observaciones
          );
          break;
        case 'cancel':
          await ChecklistRecordServiceAdmin.cancel(id);
          break;
        default:
          return NextResponse.json(
            { error: 'Accion no valida' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        message: 'Checklist actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error updating record:', error);
      return NextResponse.json(
        { error: 'Error al actualizar checklist' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const record = await ChecklistRecordServiceAdmin.getById(id);
      if (!record)
        return NextResponse.json(
          { error: 'Checklist no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (record as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await ChecklistRecordServiceAdmin.delete(id);
      return NextResponse.json({ message: 'Checklist eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting record:', error);
      return NextResponse.json(
        { error: 'Error al eliminar checklist' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
