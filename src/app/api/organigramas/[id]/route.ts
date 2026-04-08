import { withAuth } from '@/lib/api/withAuth';
import { OrganigramaService } from '@/services/organigramas/OrganigramaService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const organigrama = await OrganigramaService.getById(id);

    if (!organigrama) {
      return NextResponse.json(
        { error: 'Organigrama no encontrado' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      (organigrama as any).organization_id &&
      (organigrama as any).organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json(organigrama);
  } catch (error) {
    console.error('Error fetching organigrama:', error);
    return NextResponse.json(
      { error: 'Error al obtener organigrama' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await OrganigramaService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Organigrama no encontrado' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const data = await request.json();
      await OrganigramaService.update(id, data, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating organigrama:', error);
      return NextResponse.json(
        { error: 'Error al actualizar organigrama' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await OrganigramaService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Organigrama no encontrado' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await OrganigramaService.delete(id, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting organigrama:', error);
      return NextResponse.json(
        { error: 'Error al eliminar organigrama' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
