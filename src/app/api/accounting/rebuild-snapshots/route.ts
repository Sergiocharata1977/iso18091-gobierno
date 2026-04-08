import { withAuth } from '@/lib/api/withAuth';
import { hasAccountingScope } from '@/lib/accounting/apiHelpers';
import { getPeriodByCode } from '@/lib/accounting/repositories/entries';
import { SnapshotService } from '@/lib/accounting/SnapshotService';
import {
  ACCOUNTING_AUDIT_COLLECTION,
  resolveScopedOrganizationId,
} from '@/lib/accounting/periods';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const rebuildSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
});

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      if (!hasAccountingScope(auth, 'accounting:admin')) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para recalcular snapshots' },
          { status: 403 }
        );
      }

      const body = rebuildSchema.parse(await request.json());
      const organizationId = resolveScopedOrganizationId(
        body.organization_id,
        auth
      );

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const period = await getPeriodByCode(organizationId, body.periodo);
      if (!period) {
        return NextResponse.json(
          { success: false, error: 'Periodo no encontrado' },
          { status: 404 }
        );
      }

      const result = await SnapshotService.generateForPeriod({
        organizationId,
        periodo: body.periodo,
        generatedBy: auth.uid,
      });

      await getAdminFirestore()
        .collection(ACCOUNTING_AUDIT_COLLECTION)
        .add({
          organization_id: organizationId,
          action: 'snapshot_generated',
          entity_type: 'snapshot',
          entity_id: `${body.periodo}:snapshot`,
          performed_by: auth.uid,
          performed_at: new Date().toISOString(),
          details: {
            source: 'rebuild_snapshots',
            ...result,
          },
          previous_state: null,
          next_state: {
            generated_count: result.generated_count,
          },
        });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron recalcular los snapshots',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
