import { withAuth } from '@/lib/api/withAuth';
import { PersonalLoanService } from '@/services/finance/PersonalLoanService';
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

const querySchema = z.object({
  customer_id: z.string().min(1).optional(),
  status: z
    .enum([
      'draft',
      'approved',
      'disbursed',
      'active',
      'delinquent',
      'refinanced',
      'cancelled',
      'closed',
      'written_off',
    ])
    .optional(),
});

const bodySchema = z.object({
  organization_id: z.string().min(1).optional(),
  customer_id: z.string().min(1),
  principal_amount: z.number().positive(),
  administrative_fees: z.number().min(0).optional(),
  insurance_amount: z.number().min(0).optional(),
  interest_rate_nominal: z.number().min(0),
  installments_count: z.number().int().positive(),
  first_due_date: z.string().min(1),
  disbursement_date: z.string().min(1),
  credit_evaluation_id: z.string().min(1).optional(),
  currency: z.enum(['ARS', 'USD']).optional(),
  idempotency_key: z.string().min(1).optional(),
});

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const query = querySchema.parse({
        customer_id: searchParams.get('customer_id') || undefined,
        status: searchParams.get('status') || undefined,
      });

      const data = await PersonalLoanService.listByOrganization(
        organizationId,
        query
      );

      return NextResponse.json({ success: true, data });
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
              : 'No se pudieron listar los prestamos',
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

      const data = await PersonalLoanService.create({
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
              : 'No se pudo crear el prestamo',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] as any }
);
