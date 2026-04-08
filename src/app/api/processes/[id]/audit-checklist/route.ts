import { withAuth } from '@/lib/api/withAuth';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import { ProcessAuditGenerator } from '@/services/processes/ProcessAuditGenerator';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, context, auth) => {
  try {
    const { id } = await context.params;

    // 1. Obtener proceso completo (SIPOC)
    const process =
      await ProcessDefinitionServiceAdmin.getByIdWithRelations(id);

    if (!process) {
      return NextResponse.json(
        { success: false, error: 'Proceso no encontrado' },
        { status: 404 }
      );
    }

    if (process.organization_id !== auth.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // 2. Generar checklist
    const checklist = ProcessAuditGenerator.generateChecklist(process);

    return NextResponse.json({ success: true, data: checklist });
  } catch (error) {
    console.error('Error generating audit checklist:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
