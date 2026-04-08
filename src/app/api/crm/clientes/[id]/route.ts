import { withAuth } from '@/lib/api/withAuth';
import { UpdateClienteCRMSchema } from '@/lib/schemas/crm-schemas';
import { ClienteCRMServiceAdmin } from '@/services/crm/ClienteCRMServiceAdmin';
import { NextResponse } from 'next/server';

function denied(auth: any, orgId?: string) {
  return (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    orgId &&
    orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const cliente = await ClienteCRMServiceAdmin.getById(id);
      if (!cliente)
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (cliente as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, data: cliente });
    } catch (error: any) {
      console.error('Error in GET /api/crm/clientes/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch cliente' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

const updateClienteHandler = async (
  request: Request,
  params: any,
  auth: any
) => {
  try {
    const { id } = await params;
    const current = await ClienteCRMServiceAdmin.getById(id);
    if (!current)
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    if (denied(auth, (current as any).organization_id)) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateClienteCRMSchema.parse(body);
    await ClienteCRMServiceAdmin.update(id, validatedData, auth.uid);
    const cliente = await ClienteCRMServiceAdmin.getById(id);

    return NextResponse.json({
      success: true,
      data: cliente,
      message: 'Cliente actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error in update /api/crm/clientes/[id]:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update cliente' },
      { status: 500 }
    );
  }
};

export const PATCH = withAuth(updateClienteHandler, { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'],
});

export const PUT = withAuth(updateClienteHandler, { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'],
});

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await ClienteCRMServiceAdmin.getById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await ClienteCRMServiceAdmin.delete(id, auth.uid);
      return NextResponse.json({
        success: true,
        message: 'Cliente eliminado exitosamente',
      });
    } catch (error: any) {
      console.error('Error in DELETE /api/crm/clientes/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete cliente' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
