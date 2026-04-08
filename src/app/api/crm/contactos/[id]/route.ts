import { withAuth } from '@/lib/api/withAuth';
import { ContactoCRMService } from '@/services/crm/ContactoCRMService';
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
      const contacto = await ContactoCRMService.getById(id);
      if (!contacto)
        return NextResponse.json(
          { success: false, error: 'Contacto no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (contacto as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, data: contacto });
    } catch (error: any) {
      console.error('Error in GET /api/crm/contactos/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to get contacto' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await ContactoCRMService.getById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Contacto no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      await ContactoCRMService.update(id, body);
      const contacto = await ContactoCRMService.getById(id);
      return NextResponse.json({ success: true, data: contacto });
    } catch (error: any) {
      console.error('Error in PATCH /api/crm/contactos/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update contacto' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await ContactoCRMService.getById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Contacto no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await ContactoCRMService.delete(id);
      return NextResponse.json({
        success: true,
        message: 'Contacto eliminado exitosamente',
      });
    } catch (error: any) {
      console.error('Error in DELETE /api/crm/contactos/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete contacto' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
