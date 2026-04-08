import { withAuth } from '@/lib/api/withAuth';
import { FindingImmediateActionPlanningSchema } from '@/lib/validations/findings';
import { FindingService } from '@/services/findings/FindingService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await FindingService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
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
      const formData = {
        ...body,
        plannedDate: new Date(body.plannedDate),
      };
      const validatedData =
        FindingImmediateActionPlanningSchema.parse(formData);

      await FindingService.updateImmediateActionPlanning(
        id,
        validatedData,
        auth.uid,
        auth.email || 'Usuario'
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(
        'Error in POST /api/findings/[id]/immediate-action-planning:',
        error
      );
      return NextResponse.json(
        { error: 'Error al actualizar planificacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
