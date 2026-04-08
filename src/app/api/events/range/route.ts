import { withAuth } from '@/lib/api/withAuth';
import { adminDb } from '@/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDateStr = searchParams.get('startDate');
      const endDateStr = searchParams.get('endDate');
      const requestedOrgId = searchParams.get('organizationId') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!startDateStr || !endDateStr) {
        return NextResponse.json(
          { error: 'startDate y endDate son requeridos' },
          { status: 400 }
        );
      }
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId es requerido' },
          { status: 400 }
        );
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Fechas invalidas' },
          { status: 400 }
        );
      }

      const snapshot = await adminDb.collection('events').get();
      const events = snapshot.docs
        .map(doc => {
          const data = doc.data();
          let fechaInicio: Date;
          if (data.fecha_inicio?.toDate)
            fechaInicio = data.fecha_inicio.toDate();
          else if (data.fecha_inicio?._seconds)
            fechaInicio = new Date(data.fecha_inicio._seconds * 1000);
          else if (data.fecha_inicio instanceof Date)
            fechaInicio = data.fecha_inicio;
          else if (typeof data.fecha_inicio === 'string')
            fechaInicio = new Date(data.fecha_inicio);
          else fechaInicio = new Date(0);

          let fechaFin: Date | undefined;
          if (data.fecha_fin) {
            if (data.fecha_fin?.toDate) fechaFin = data.fecha_fin.toDate();
            else if (data.fecha_fin?._seconds)
              fechaFin = new Date(data.fecha_fin._seconds * 1000);
            else if (data.fecha_fin instanceof Date) fechaFin = data.fecha_fin;
            else if (typeof data.fecha_fin === 'string')
              fechaFin = new Date(data.fecha_fin);
          }

          return {
            id: doc.id,
            organization_id: data.organization_id,
            titulo: data.titulo,
            descripcion: data.descripcion,
            tipo_evento: data.tipo_evento,
            fecha_inicio: fechaInicio.toISOString(),
            fecha_fin: fechaFin?.toISOString(),
            todo_el_dia: data.todo_el_dia || false,
            responsable_id: data.responsable_id,
            responsable_nombre: data.responsable_nombre,
            estado: data.estado,
            prioridad: data.prioridad,
            source_collection: data.source_collection,
            source_id: data.source_id,
            activo: data.activo,
            created_at: data.created_at?.toDate?.()?.toISOString() || null,
            updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
            date: fechaInicio.toISOString(),
            title: data.titulo,
            type: data.tipo_evento,
            isActive: data.activo,
            priority: data.prioridad,
            status: data.estado,
          };
        })
        .filter(event => {
          const eventDate = new Date(event.fecha_inicio);
          const orgOk = event.organization_id === organizationId;
          return orgOk && eventDate >= startDate && eventDate <= endDate;
        })
        .sort(
          (a, b) =>
            new Date(a.fecha_inicio).getTime() -
            new Date(b.fecha_inicio).getTime()
        );

      return NextResponse.json({
        events,
        count: events.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    } catch (error: any) {
      console.error('[Events API] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener eventos',
          details: error?.message || 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
