import { withAuth } from '@/lib/api/withAuth';
import { FlujogramaService } from '@/services/flujogramas/FlujogramaService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const flujograma = await FlujogramaService.getById(id);

    if (!flujograma) {
      return NextResponse.json(
        { error: 'Flujograma no encontrado' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      (flujograma as any).organization_id &&
      (flujograma as any).organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json(flujograma);
  } catch (error) {
    console.error('Error fetching flujograma:', error);
    return NextResponse.json(
      { error: 'Error al obtener flujograma' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await FlujogramaService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Flujograma no encontrado' },
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
      await FlujogramaService.update(id, data, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating flujograma:', error);
      return NextResponse.json(
        { error: 'Error al actualizar flujograma' },
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
      const current = await FlujogramaService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Flujograma no encontrado' },
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

      await FlujogramaService.delete(id, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting flujograma:', error);
      return NextResponse.json(
        { error: 'Error al eliminar flujograma' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
