import { withAuth } from '@/lib/api/withAuth';
import { ChecklistTemplateServiceAdmin } from '@/services/checklists/ChecklistTemplateServiceAdmin';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const activeOnly = searchParams.get('active') === 'true';
      const templates = activeOnly
        ? await ChecklistTemplateServiceAdmin.getAllActive(auth.organizationId)
        : await ChecklistTemplateServiceAdmin.getAll(auth.organizationId);
      return NextResponse.json(templates);
    } catch (error) {
      console.error('Error getting templates:', error);
      return NextResponse.json(
        { error: 'Error al obtener plantillas' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const id = await ChecklistTemplateServiceAdmin.create(
        body,
        auth.organizationId,
        auth.uid
      );
      return NextResponse.json(
        { id, message: 'Plantilla creada exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating template:', error);
      const message =
        error instanceof Error ? error.message : 'Error al crear plantilla';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...WRITE_ROLES] }
);
