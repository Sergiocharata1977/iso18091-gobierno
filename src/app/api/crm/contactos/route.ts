import { withAuth } from '@/lib/api/withAuth';
import { ContactoCRMService } from '@/services/crm/ContactoCRMService';
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
      const crmOrganizacionId = searchParams.get('crm_organizacion_id');

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const contactos = crmOrganizacionId
        ? await ContactoCRMService.getByOrganizacionCRM(
            organizationId,
            crmOrganizacionId
          )
        : await ContactoCRMService.getByOrganization(organizationId);

      return NextResponse.json({ success: true, data: contactos });
    } catch (error: any) {
      console.error('Error in GET /api/crm/contactos:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to get contactos' },
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

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }
      if (!body.nombre || !body.telefono) {
        return NextResponse.json(
          { success: false, error: 'nombre y telefono son requeridos' },
          { status: 400 }
        );
      }

      const contacto = await ContactoCRMService.create(organizationId, {
        nombre: body.nombre,
        apellido: body.apellido,
        email: body.email,
        telefono: body.telefono,
        whatsapp: body.whatsapp || body.telefono,
        cargo: body.cargo,
        empresa: body.empresa,
        crm_organizacion_id: body.crm_organizacion_id,
        notas: body.notas,
      });

      return NextResponse.json({ success: true, data: contacto });
    } catch (error: any) {
      console.error('Error in POST /api/crm/contactos:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create contacto' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
