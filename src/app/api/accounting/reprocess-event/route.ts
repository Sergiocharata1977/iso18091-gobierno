import { withAuth } from '@/lib/api/withAuth';
import { hasAccountingScope } from '@/lib/accounting/apiHelpers';
import { OutboxService } from '@/lib/accounting/outbox/OutboxService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const reprocessEventSchema = z.object({
  outbox_id: z.string().min(1),
  organization_id: z.string().min(1).optional(),
});

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      if (!hasAccountingScope(auth, 'accounting:admin')) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      const body = reprocessEventSchema.parse(await request.json());
      const organizationId = body.organization_id || auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const result = await OutboxService.reprocessFailedEvent({
        organizationId,
        outboxId: body.outbox_id,
      });

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'No se pudo reprocesar el evento contable',
          details: error instanceof Error ? error.message : 'unknown_error',
        },
        { status: 400 }
      );
    }
  },
  { requiredCapability: 'contabilidad_central' }
);
