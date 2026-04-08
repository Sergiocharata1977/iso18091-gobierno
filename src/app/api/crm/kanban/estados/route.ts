import { withAuth } from '@/lib/api/withAuth';
import { CreateEstadoKanbanSchema } from '@/lib/schemas/crm-schemas';
import { KanbanServiceAdmin } from '@/services/crm/KanbanServiceAdmin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const estados = await KanbanServiceAdmin.getEstados(organizationId);
      return NextResponse.json({
        success: true,
        data: estados,
        count: estados.length,
      });
    } catch (error: any) {
      console.error('Error in GET /api/crm/kanban/estados:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch estados' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      const validatedData = CreateEstadoKanbanSchema.parse({
        ...body,
        organization_id: organizationId,
      });
      const estado = await KanbanServiceAdmin.crearEstado(validatedData);

      return NextResponse.json(
        { success: true, data: estado, message: 'Estado creado exitosamente' },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error in POST /api/crm/kanban/estados:', error);
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { success: false, error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create estado' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
