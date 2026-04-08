import { withAuth } from '@/lib/api/withAuth';
import { hasAccountingScope } from '@/lib/accounting/apiHelpers';
import {
  ACCOUNTING_AUDIT_COLLECTION,
  ACCOUNTING_PERIODS_COLLECTION,
  resolvePeriodRange,
  resolveScopedOrganizationId,
} from '@/lib/accounting/periods';
import type { AccountingPeriod } from '@/types/accounting';
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { z, ZodError } from 'zod';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

const createPeriodSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const organizationId = resolveScopedOrganizationId(
        searchParams.get('organization_id') || undefined,
        auth
      );

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const statusFilter = searchParams.get('status');
      const db = getAdminFirestore();
      const snapshot = await db
        .collection(ACCOUNTING_PERIODS_COLLECTION)
        .where('organization_id', '==', organizationId)
        .get();

      const data = snapshot.docs
        .map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as AccountingPeriod
        )
        .filter(period => !statusFilter || period.status === statusFilter)
        .sort(
          (left, right) =>
            right.periodo.localeCompare(left.periodo) ||
            (right.updated_at || '').localeCompare(left.updated_at || '')
        );

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron listar los periodos',
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
      if (!hasAccountingScope(auth, 'accounting:admin')) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para abrir periodos' },
          { status: 403 }
        );
      }

      const body = createPeriodSchema.parse(await request.json());
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

      const db = getAdminFirestore();
      const existing = await db
        .collection(ACCOUNTING_PERIODS_COLLECTION)
        .where('organization_id', '==', organizationId)
        .where('periodo', '==', body.periodo)
        .limit(1)
        .get();

      if (!existing.empty) {
        return NextResponse.json(
          { success: false, error: `El periodo ${body.periodo} ya existe` },
          { status: 409 }
        );
      }

      const range = resolvePeriodRange(body.periodo);
      const timestamp = new Date().toISOString();
      const payload: Omit<AccountingPeriod, 'id'> = {
        organization_id: organizationId,
        periodo: body.periodo,
        status: 'abierto',
        fecha_inicio: body.fecha_inicio || range.fecha_inicio,
        fecha_fin: body.fecha_fin || range.fecha_fin,
        metadata: body.metadata,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const periodRef = db.collection(ACCOUNTING_PERIODS_COLLECTION).doc();
      const auditRef = db.collection(ACCOUNTING_AUDIT_COLLECTION).doc();
      const batch = db.batch();

      batch.set(periodRef, payload);
      batch.set(auditRef, {
        organization_id: organizationId,
        action: 'period_opened',
        entity_type: 'period',
        entity_id: periodRef.id,
        performed_by: auth.uid,
        performed_at: timestamp,
        details: {
          periodo: body.periodo,
        },
        previous_state: null,
        next_state: {
          status: 'abierto',
        },
      });

      await batch.commit();

      return NextResponse.json(
        {
          success: true,
          data: {
            id: periodRef.id,
            ...payload,
          },
        },
        { status: 201 }
      );
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
            error instanceof Error ? error.message : 'No se pudo abrir el periodo',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
