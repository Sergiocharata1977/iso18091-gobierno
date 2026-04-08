import { withAuth } from '@/lib/api/withAuth';
import { adminDb } from '@/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

interface CalendarEvent {
  id: string;
  isActive?: boolean;
  organizationId?: string;
  date?: any;
  endDate?: any;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

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

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Fechas invalidas' },
          { status: 400 }
        );
      }

      let q = adminDb
        .collection('calendar_events')
        .where('isActive', '==', true) as any;
      if (organizationId) q = q.where('organizationId', '==', organizationId);
      const allEventsSnapshot = await q.get();

      const allEvents: CalendarEvent[] = allEventsSnapshot.docs.map(
        (doc: any) => ({ id: doc.id, ...doc.data() })
      );
      const eventsInRange = allEvents
        .map(event => {
          let eventDate: Date;
          const rawDate = event.date;
          if (rawDate?.toDate) eventDate = rawDate.toDate();
          else if (rawDate?._seconds)
            eventDate = new Date(rawDate._seconds * 1000);
          else if (rawDate instanceof Date) eventDate = rawDate;
          else if (typeof rawDate === 'string') eventDate = new Date(rawDate);
          else eventDate = new Date(0);

          return {
            ...event,
            date: eventDate,
            endDate: event.endDate?.toDate?.() || event.endDate,
            createdAt: event.createdAt?.toDate?.() || event.createdAt,
            updatedAt: event.updatedAt?.toDate?.() || event.updatedAt,
          };
        })
        .filter(event => {
          const eventDate =
            event.date instanceof Date
              ? event.date
              : new Date(event.date as any);
          return eventDate >= startDate && eventDate <= endDate;
        })
        .sort((a, b) => {
          const dateA =
            a.date instanceof Date ? a.date : new Date(a.date as any);
          const dateB =
            b.date instanceof Date ? b.date : new Date(b.date as any);
          return dateA.getTime() - dateB.getTime();
        });

      return NextResponse.json({
        events: eventsInRange,
        count: eventsInRange.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    } catch (error: any) {
      console.error('[Calendar API] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener eventos',
          details: error?.message || 'Unknown error',
          code: error?.code || 'UNKNOWN',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
