import { withAuth } from '@/lib/api/withAuth';
import { ActionControlExecutionSchema } from '@/lib/validations/actions';
import { ActionService } from '@/services/actions/ActionService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const action = await ActionService.getById(id);

      if (!action) {
        return NextResponse.json(
          { error: 'Accion no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (action as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();

      if (body.executionDate) {
        body.executionDate = new Date(body.executionDate);
      }

      const validatedData = ActionControlExecutionSchema.parse(body);
      await ActionService.updateControlExecution(
        id,
        validatedData,
        auth.uid,
        auth.email
      );

      return NextResponse.json({
        message: 'Control completado exitosamente',
      });
    } catch (error: unknown) {
      console.error(
        'Error in POST /api/actions/[id]/control-execution:',
        error
      );

      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al completar el control' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
