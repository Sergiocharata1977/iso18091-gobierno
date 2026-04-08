import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { AuditService } from '@/lib/sdk/modules/audits';
import { EventService } from '@/services/events/EventService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, _context, auth) => {
  try {
    const auditService = new AuditService();
    const searchParams = req.nextUrl.searchParams;
    const filters: Record<string, unknown> = {};
    const organizationId =
      auth.organizationId || searchParams.get('organization_id');
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'organization_id es requerido' },
        { status: 400 }
      );
    }
    filters.organization_id = organizationId;

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status');
    }

    if (searchParams.get('auditType')) {
      filters.auditType = searchParams.get('auditType');
    }

    const limit = searchParams.get('pageSize')
      ? parseInt(searchParams.get('pageSize')!)
      : 50;

    const audits = await auditService.list(filters, { limit });

    return NextResponse.json({
      success: true,
      data: audits,
    });
  } catch (error) {
    console.error('Error listing audits:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar auditorías' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req, _context, auth) => {
  try {
    const auditService = new AuditService();
    const body = await req.json();
    const organizationId = auth.organizationId || body.organization_id;
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'organization_id es requerido' },
        { status: 400 }
      );
    }
    body.organization_id = organizationId;

    // Convert date string to Date
    if (body.plannedDate) {
      body.plannedDate = new Date(body.plannedDate);
    }

    const userId = auth.uid;

    const auditId = await auditService.createAndReturnId(body, userId);

    // Sincronizar con colección events unificada
    try {
      const eventId = await EventService.syncFromSource({
        organization_id: body.organization_id,
        titulo: `🔍 Auditoría: ${body.title || body.code || 'Nueva auditoría'}`,
        descripcion: body.scope || body.objectives,
        tipo_evento: 'auditoria',
        fecha_inicio: body.plannedDate,
        fecha_fin: body.endDate,
        responsable_id: body.leadAuditorId,
        responsable_nombre: body.leadAuditorName,
        estado: 'programado',
        prioridad: 'alta',
        source_collection: 'audits',
        source_id: auditId,
        created_by: userId,
      });

      // Actualizar auditoría con event_id usando adminDb
      await adminDb
        .collection('audits')
        .doc(auditId)
        .update({ event_id: eventId });
    } catch (eventError) {
      console.error('Error syncing audit to events:', eventError);
      // No falla la creación de auditoría si falla el evento
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: auditId },
        message: 'Auditoría creada exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating audit:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear auditoría' },
      { status: 500 }
    );
  }
});
