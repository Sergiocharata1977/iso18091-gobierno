import { withAuth } from '@/lib/api/withAuth';
import { hasAccountingScope } from '@/lib/accounting/apiHelpers';
import {
  ACCOUNTING_AUDIT_COLLECTION,
  ACCOUNTING_PERIODS_COLLECTION,
} from '@/lib/accounting/periods';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AccountingPeriod } from '@/types/accounting';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

const patchSchema = z.object({
  action: z.literal('reopen'),
  confirm: z.literal(true),
  motivo: z.string().trim().min(1).optional(),
});

export const GET = withAuth(
  async (_request, context, auth) => {
    try {
      const { id } = await context.params;
      const db = getAdminFirestore();
      const doc = await db.collection(ACCOUNTING_PERIODS_COLLECTION).doc(id).get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Periodo no encontrado' },
          { status: 404 }
        );
      }

      const data = {
        id: doc.id,
        ...doc.data(),
      } as AccountingPeriod;

      if (
        auth.role !== 'super_admin' &&
        data.organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Periodo no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo obtener el periodo',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] as any }
);

export const PATCH = withAuth(
  async (request, context, auth) => {
    try {
      if (!hasAccountingScope(auth, 'accounting:admin')) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para reabrir periodos' },
          { status: 403 }
        );
      }

      const { id } = await context.params;
      const body = patchSchema.parse(await request.json());
      const db = getAdminFirestore();
      const periodRef = db.collection(ACCOUNTING_PERIODS_COLLECTION).doc(id);
      const auditRef = db.collection(ACCOUNTING_AUDIT_COLLECTION).doc();
      const timestamp = new Date().toISOString();

      const result = await db.runTransaction(async tx => {
        const periodDoc = await tx.get(periodRef);
        if (!periodDoc.exists) {
          throw new Error('Periodo no encontrado');
        }

        const current = {
          id: periodDoc.id,
          ...periodDoc.data(),
        } as AccountingPeriod;

        if (
          auth.role !== 'super_admin' &&
          current.organization_id !== auth.organizationId
        ) {
          throw new Error('Periodo no encontrado');
        }

        if (!body.confirm) {
          throw new Error('Debe confirmar la reapertura del periodo');
        }

        tx.set(
          periodRef,
          {
            status: 'abierto',
            cerrado_at: null,
            cerrado_by: null,
            motivo_cierre: null,
            updated_at: timestamp,
            metadata: {
              ...(current.metadata || {}),
              reopened_at: timestamp,
              reopened_by: auth.uid,
              reopen_reason: body.motivo || null,
            },
          },
          { merge: true }
        );

        tx.set(auditRef, {
          organization_id: current.organization_id,
          action: 'period_opened',
          entity_type: 'period',
          entity_id: current.id,
          performed_by: auth.uid,
          performed_at: timestamp,
          details: {
            action: body.action,
            motivo: body.motivo || null,
          },
          previous_state: {
            status: current.status,
          },
          next_state: {
            status: 'abierto',
          },
        });

        return {
          ...current,
          status: 'abierto',
          cerrado_at: undefined,
          cerrado_by: undefined,
          motivo_cierre: undefined,
          updated_at: timestamp,
        } as AccountingPeriod;
      });

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error && error.message === 'Periodo no encontrado') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'No se pudo reabrir el periodo',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
