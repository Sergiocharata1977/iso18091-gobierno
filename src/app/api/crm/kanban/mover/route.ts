import { withAuth } from '@/lib/api/withAuth';
import { MoverClienteKanbanSchema } from '@/lib/schemas/crm-schemas';
import { ClienteCRMService } from '@/services/crm/ClienteCRMService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const validatedData = MoverClienteKanbanSchema.parse(body);

      const clienteActual = await ClienteCRMService.getById(
        validatedData.cliente_id
      );
      if (!clienteActual) {
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (clienteActual as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await ClienteCRMService.moverEstado(validatedData);
      const cliente = await ClienteCRMService.getById(validatedData.cliente_id);

      return NextResponse.json({
        success: true,
        data: cliente,
        message: 'Cliente movido exitosamente',
      });
    } catch (error: any) {
      console.error('Error in POST /api/crm/kanban/mover:', error);
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { success: false, error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to mover cliente' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
