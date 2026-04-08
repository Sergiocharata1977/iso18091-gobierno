import { withAuth } from '@/lib/api/withAuth';
import {
  accountingEventSchema,
  hasAccountingScope,
} from '@/lib/accounting/apiHelpers';
import { emitAccountingEvent } from '@/lib/accounting/emitEvent';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      if (!hasAccountingScope(auth, 'accounting:emit')) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      const body = accountingEventSchema.parse(await request.json());
      const organizationId = body.organization_id || auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const result = await emitAccountingEvent({
        ...body,
        organization_id: organizationId,
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'No se pudo procesar el evento contable',
          details: error instanceof Error ? error.message : 'unknown_error',
        },
        { status: 400 }
      );
    }
  },
  { requiredCapability: 'contabilidad_central' }
);
