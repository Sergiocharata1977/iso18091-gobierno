import { withAuth } from '@/lib/api/withAuth';
import { ProcessRecordServiceAdmin } from '@/services/processRecords/ProcessRecordServiceAdmin';
import { ProcessRecordStageServiceAdmin } from '@/services/processRecords/ProcessRecordStageServiceAdmin';
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

      const stages =
        await ProcessRecordStageServiceAdmin.getByProcessRecordId(id);
      return NextResponse.json(stages);
    } catch (error) {
      console.error('Error getting stages:', error);
      return NextResponse.json(
        { error: 'Error al obtener etapas' },
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

      const body = await request.json();
      const stageId = await ProcessRecordStageServiceAdmin.create(id, body);

      return NextResponse.json(
        { id: stageId, message: 'Etapa creada exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating stage:', error);
      const message =
        error instanceof Error ? error.message : 'Error al crear etapa';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
