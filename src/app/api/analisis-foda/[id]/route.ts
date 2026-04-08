import { withAuth } from '@/lib/api/withAuth';
import { AnalisisFODAService } from '@/services/analisis-foda/AnalisisFODAService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const analisis = await AnalisisFODAService.getById(id);

    if (!analisis) {
      return NextResponse.json(
        { error: 'Analisis FODA no encontrado' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      (analisis as any).organization_id &&
      (analisis as any).organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json(analisis);
  } catch (error) {
    console.error('Error fetching analisis FODA:', error);
    return NextResponse.json(
      { error: 'Error al obtener analisis FODA' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await AnalisisFODAService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Analisis FODA no encontrado' },
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
      await AnalisisFODAService.update(id, data, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating analisis FODA:', error);
      return NextResponse.json(
        { error: 'Error al actualizar analisis FODA' },
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
      const current = await AnalisisFODAService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Analisis FODA no encontrado' },
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

      await AnalisisFODAService.delete(id, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting analisis FODA:', error);
      return NextResponse.json(
        { error: 'Error al eliminar analisis FODA' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
