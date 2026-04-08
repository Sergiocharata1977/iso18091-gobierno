import { withAuth } from '@/lib/api/withAuth';
import { CoreLedgerService } from '@/lib/accounting/CoreLedgerService';
import { AccountingPeriodClosedError } from '@/lib/accounting/validators';
import { NextResponse } from 'next/server';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();

      const organizationId = auth.organizationId;
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Sin organizacion' },
          { status: 403 }
        );
      }

      const entryId = await CoreLedgerService.postEntry({
        organization_id: organizationId,
        source_module: body.source_module || 'other',
        source_type: body.source_type,
        source_id: body.source_id,
        entry_date: body.entry_date ? new Date(body.entry_date) : new Date(),
        description: body.description,
        currency: body.currency || 'ARS',
        lines: body.lines || [],
        created_by: auth.uid,
        idempotency_key: body.idempotency_key,
      });

      return NextResponse.json({ id: entryId, success: true }, { status: 201 });
    } catch (error) {
      if (error instanceof AccountingPeriodClosedError) {
        return NextResponse.json(
          {
            error: 'Periodo contable cerrado',
            details: error.message,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'Error al registrar asiento contable',
          details: error instanceof Error ? error.message : 'unknown_error',
        },
        { status: 400 }
      );
    }
  },
  { roles: [...WRITE_ROLES] as any }
);
