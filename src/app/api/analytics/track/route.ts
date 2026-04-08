import { withAuth } from '@/lib/api/withAuth';
import { ProductAnalyticsService } from '@/services/analytics/ProductAnalyticsService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const TrackAnalyticsSchema = z.object({
  event: z.string().min(1),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = TrackAnalyticsSchema.parse(await request.json());

      await ProductAnalyticsService.trackClientEvent({
        event: body.event,
        distinctId: auth.uid,
        organizationId: auth.organizationId,
        properties: body.properties,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[analytics/track][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo registrar el evento' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['super_admin', 'admin', 'gerente', 'jefe', 'operario', 'auditor'],
    allowNoOrg: true,
  }
);
