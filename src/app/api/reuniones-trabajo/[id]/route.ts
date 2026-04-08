import { withAuth } from '@/lib/api/withAuth';
import { ReunionTrabajoService } from '@/services/reuniones-trabajo/ReunionTrabajoService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const reunion = await ReunionTrabajoService.getById(id);

    if (!reunion) {
      return NextResponse.json(
        { error: 'Reunion no encontrada' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      (reunion as any).organization_id &&
      (reunion as any).organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json(reunion);
  } catch (error) {
    console.error('Error fetching reunion:', error);
    return NextResponse.json(
      { error: 'Error al obtener reunion' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await ReunionTrabajoService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Reunion no encontrada' },
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
      await ReunionTrabajoService.update(id, data, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating reunion:', error);
      return NextResponse.json(
        { error: 'Error al actualizar reunion' },
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
      const current = await ReunionTrabajoService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Reunion no encontrada' },
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

      await ReunionTrabajoService.delete(id, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting reunion:', error);
      return NextResponse.json(
        { error: 'Error al eliminar reunion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
