import { withAuth } from '@/lib/api/withAuth';
import { EventService } from '@/services/events/EventService';
import { FindingService } from '@/services/findings/FindingService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const finding = await FindingService.getById(id);

    if (!finding) {
      return NextResponse.json(
        { error: 'Hallazgo no encontrado' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      finding.organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json({ finding });
  } catch (error) {
    console.error('Error in GET /api/findings/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener hallazgo' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await FindingService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        current.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const finding = await FindingService.update(id, body);

      try {
        const createdAtDate = finding.createdAt?.toDate
          ? finding.createdAt.toDate()
          : new Date();
        await EventService.syncFromSource({
          organization_id: (finding as any).organization_id || '',
          titulo: `Hallazgo: ${finding.registration?.name || 'Hallazgo'}`,
          descripcion: finding.registration?.description,
          tipo_evento: 'hallazgo',
          fecha_inicio: createdAtDate,
          responsable_id: finding.createdBy,
          responsable_nombre: finding.createdByName,
          estado: (finding.status === 'cerrado'
            ? 'completado'
            : finding.status === 'en_tratamiento'
              ? 'en_progreso'
              : 'programado') as any,
          prioridad: 'media',
          source_collection: 'findings',
          source_id: finding.id,
          created_by: auth.uid,
        });
      } catch (eventError) {
        console.error('Error syncing event for finding update:', eventError);
      }

      return NextResponse.json({ success: true, finding });
    } catch (error) {
      console.error('Error in PUT /api/findings/[id]:', error);
      return NextResponse.json(
        { error: 'Error al actualizar hallazgo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await FindingService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        current.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await FindingService.delete(id, auth.uid, auth.email || 'Usuario');
      try {
        await EventService.deleteBySource('findings', id);
      } catch (eventError) {
        console.error('Error deleting event for finding:', eventError);
      }
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/findings/[id]:', error);
      return NextResponse.json(
        { error: 'Error al eliminar hallazgo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
