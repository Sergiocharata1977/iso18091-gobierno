import { withAuth } from '@/lib/api/withAuth';
import { ChecklistTemplateServiceAdmin } from '@/services/checklists/ChecklistTemplateServiceAdmin';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const template = await ChecklistTemplateServiceAdmin.getById(id);
      if (!template)
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (template as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const field = {
        id: body.id || uuidv4(),
        orden: body.orden ?? 0,
        tipo: body.tipo || 'texto',
        etiqueta: body.etiqueta || '',
        descripcion: body.descripcion || '',
        requerido: body.requerido ?? false,
        opciones: body.opciones || [],
        valor_esperado: body.valor_esperado || '',
        valor_minimo: body.valor_minimo,
        valor_maximo: body.valor_maximo,
        unidad: body.unidad || '',
      };

      await ChecklistTemplateServiceAdmin.addField(id, field);
      return NextResponse.json(
        { id: field.id, message: 'Campo agregado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error adding field:', error);
      return NextResponse.json(
        { error: 'Error al agregar campo' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
