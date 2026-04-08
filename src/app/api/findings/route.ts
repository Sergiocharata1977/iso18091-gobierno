import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { FindingFormSchema } from '@/lib/validations/findings';
import { EventService } from '@/services/events/EventService';
import { FindingService } from '@/services/findings/FindingService';
import type { FindingStatus } from '@/types/findings';
import { NextResponse } from 'next/server';

// GET /api/findings - Listar hallazgos
export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // MULTI-TENANT: Usar organization_id del usuario autenticado
    const organizationId = auth.organizationId;
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    const filters = {
      organization_id: organizationId,
      status: (searchParams.get('status') as FindingStatus) || undefined,
      processId: searchParams.get('processId') || undefined,
      sourceId: searchParams.get('sourceId') || undefined,
      year: searchParams.get('year')
        ? parseInt(searchParams.get('year')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      requiresAction: searchParams.get('requiresAction')
        ? searchParams.get('requiresAction') === 'true'
        : undefined,
    };

    const { findings } = await FindingService.list(organizationId, filters);

    return NextResponse.json({ findings });
  } catch (error) {
    console.error('Error in GET /api/findings:', error);
    return NextResponse.json(
      { error: 'Error al obtener hallazgos' },
      { status: 500 }
    );
  }
});

// POST /api/findings - Crear hallazgo
export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();

    // MULTI-TENANT: Usar organization_id del usuario autenticado
    const organizationId = auth.organizationId;
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    // Asegurar que el hallazgo se cree en la organización del usuario
    body.organization_id = organizationId;

    // Validar datos
    const validatedData = FindingFormSchema.parse(body);

    // Crear hallazgo con datos del usuario autenticado
    const findingId = await FindingService.create(
      validatedData,
      auth.uid,
      auth.email,
      organizationId
    );

    // Sincronizar con colección events unificada
    try {
      const eventId = await EventService.syncFromSource({
        organization_id: body.organization_id,
        titulo: `🔎 Hallazgo: ${validatedData.name}`,
        descripcion: validatedData.description,
        tipo_evento: 'hallazgo',
        fecha_inicio: new Date(),
        estado: 'programado',
        prioridad: 'alta',
        source_collection: 'findings',
        source_id: findingId,
        created_by: auth.uid,
      });

      // Actualizar hallazgo con event_id usando adminDb directamente
      await adminDb
        .collection('findings')
        .doc(findingId)
        .update({ event_id: eventId });
    } catch (eventError) {
      console.error('Error syncing finding to events:', eventError);
    }

    return NextResponse.json({ id: findingId }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/findings:', error);
    return NextResponse.json(
      { error: 'Error al crear hallazgo' },
      { status: 500 }
    );
  }
});
