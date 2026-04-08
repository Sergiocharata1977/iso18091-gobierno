import { withAuth } from '@/lib/api/withAuth';
import { RelacionProcesosService } from '@/services/relacion-procesos/RelacionProcesosService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const relacion = await RelacionProcesosService.getById(id);

    if (!relacion) {
      return NextResponse.json(
        { error: 'Relacion no encontrada' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      (relacion as any).organization_id &&
      (relacion as any).organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json(relacion);
  } catch (error) {
    console.error('Error fetching relacion:', error);
    return NextResponse.json(
      { error: 'Error al obtener relacion' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await RelacionProcesosService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Relacion no encontrada' },
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
      await RelacionProcesosService.update(id, data, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating relacion:', error);
      return NextResponse.json(
        { error: 'Error al actualizar relacion' },
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
      const current = await RelacionProcesosService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Relacion no encontrada' },
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

      await RelacionProcesosService.delete(id, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting relacion:', error);
      return NextResponse.json(
        { error: 'Error al eliminar relacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
