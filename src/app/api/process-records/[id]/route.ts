import { withAuth } from '@/lib/api/withAuth';
import { ProcessRecordServiceAdmin } from '@/services/processRecords/ProcessRecordServiceAdmin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const record = await ProcessRecordServiceAdmin.getById(id);

      if (!record) {
        return NextResponse.json(
          { error: 'Registro no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (record as any).organization_id &&
        (record as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(record);
    } catch (error) {
      console.error('Error getting process record:', error);
      return NextResponse.json(
        { error: 'Error al obtener registro' },
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
      const current = await ProcessRecordServiceAdmin.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Registro no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      await ProcessRecordServiceAdmin.update(id, body);
      return NextResponse.json({
        message: 'Registro actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error updating process record:', error);
      return NextResponse.json(
        { error: 'Error al actualizar registro' },
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
      const current = await ProcessRecordServiceAdmin.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Registro no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await ProcessRecordServiceAdmin.delete(id);
      return NextResponse.json({ message: 'Registro eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting process record:', error);
      return NextResponse.json(
        { error: 'Error al eliminar registro' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
