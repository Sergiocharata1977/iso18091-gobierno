import { CalendarService } from '@/services/calendar/CalendarService';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Feed público de calendario personal
 * URL: /api/calendar/feed/{token}
 *
 * El token se genera como: hash(userId + organizationId + secret)
 * Esto permite suscripción desde Google Calendar, Outlook, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Validar token y extraer userId y organizationId
    // En producción, esto debería validarse contra una tabla de tokens en Firestore
    // Por ahora, usamos un formato simple: base64(userId:organizationId)
    let userId: string;
    let organizationId: string;

    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [extractedUserId, extractedOrgId] = decoded.split(':');

      if (!extractedUserId || !extractedOrgId) {
        throw new Error('Token format invalid');
      }

      userId = extractedUserId;
      organizationId = extractedOrgId;
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Obtener eventos del usuario (próximos 6 meses)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);

    const events = await CalendarService.getEventsByDateRange(
      startDate,
      endDate,
      { responsibleUserId: userId },
      organizationId
    );

    // Generar iCalendar
    const icalContent = CalendarService.generateICalendar(
      events,
      'Mi Calendario Personal'
    );

    // Retornar como feed iCal
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'private, max-age=3600', // Cache 1 hora
        'X-Robots-Tag': 'noindex, nofollow', // No indexar por buscadores
      },
    });
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    return NextResponse.json(
      { error: 'Error al generar feed de calendario' },
      { status: 500 }
    );
  }
}
