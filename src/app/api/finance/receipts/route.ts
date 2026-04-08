import { withAuth } from '@/lib/api/withAuth';
import { ReceiptService } from '@/services/finance/ReceiptService';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

const bodySchema = z.object({
  organization_id: z.string().min(1).optional(),
  customer_id: z.string().min(1),
  receipt_date: z.string().min(1),
  payment_channel: z.enum(['cash', 'transfer', 'card', 'gateway', 'debit']),
  gross_amount: z.number().positive(),
  payment_reference: z.string().optional(),
  source: z.enum(['backoffice', 'web_checkout', 'webhook']),
  payment_intent_id: z.string().optional(),
  provider: z.string().optional(),
  provider_reference: z.string().optional(),
  idempotency_key: z.string().min(1).optional(),
});

const querySchema = z.object({
  receipt_id: z.string().min(1),
});

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = querySchema.parse({
        receipt_id: searchParams.get('receipt_id') || undefined,
      });

      const allocations = await ReceiptService.listAllocations(query.receipt_id);
      const filtered =
        auth.role === 'super_admin'
          ? allocations
          : allocations.filter(
              allocation => allocation.organization_id === auth.organizationId
            );

      return NextResponse.json({ success: true, data: filtered });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener las imputaciones',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] as any }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = bodySchema.parse(await request.json());
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const data = await ReceiptService.create({
        ...body,
        organization_id: organizationId,
        created_by: auth.uid,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
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
              : 'No se pudo registrar el recibo',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] as any }
);
