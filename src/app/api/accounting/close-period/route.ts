import { withAuth } from '@/lib/api/withAuth';
import { hasAccountingScope } from '@/lib/accounting/apiHelpers';
import { getPeriodByCode } from '@/lib/accounting/repositories/entries';
import { SnapshotService } from '@/lib/accounting/SnapshotService';
import {
  ACCOUNTING_AUDIT_COLLECTION,
  ACCOUNTING_CLOSURES_COLLECTION,
  ACCOUNTING_ENTRIES_COLLECTION,
  ACCOUNTING_PERIODS_COLLECTION,
  resolveScopedOrganizationId,
} from '@/lib/accounting/periods';
import type { AccountingClosure, AccountingPeriod } from '@/types/accounting';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const closePeriodSchema = z
  .object({
    organization_id: z.string().trim().min(1).optional(),
    period_id: z.string().trim().min(1).optional(),
    periodo: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    motivo_cierre: z.string().trim().min(1).optional(),
  })
  .refine(body => body.period_id || body.periodo, {
    message: 'Debe informar period_id o periodo',
    path: ['period_id'],
  });

export const POST = withAuth(
  async (request, _context, auth) => {
    const db = getAdminFirestore();
    const timestamp = new Date().toISOString();
    let closureRef:
      | FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
      | undefined;

    try {
      if (!hasAccountingScope(auth, 'accounting:admin')) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para cerrar periodos' },
          { status: 403 }
        );
      }

      const body = closePeriodSchema.parse(await request.json());
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

      const periodDoc = body.period_id
        ? await db.collection(ACCOUNTING_PERIODS_COLLECTION).doc(body.period_id).get()
        : null;
      const period = periodDoc?.exists
        ? ({
            id: periodDoc.id,
            ...periodDoc.data(),
          } as AccountingPeriod)
        : body.periodo
          ? await getPeriodByCode(organizationId, body.periodo)
          : null;

      if (!period || period.organization_id !== organizationId) {
        return NextResponse.json(
          { success: false, error: 'Periodo no encontrado' },
          { status: 404 }
        );
      }

      if (period.status === 'cerrado') {
        return NextResponse.json(
          {
            success: false,
            error: `El periodo ${period.periodo} ya esta cerrado`,
          },
          { status: 409 }
        );
      }

      const drafts = await db
        .collection(ACCOUNTING_ENTRIES_COLLECTION)
        .where('organization_id', '==', organizationId)
        .where('periodo', '==', period.periodo)
        .where('status', '==', 'draft')
        .limit(1)
        .get();

      if (!drafts.empty) {
        return NextResponse.json(
          {
            success: false,
            error: `El periodo ${period.periodo} tiene asientos en borrador`,
          },
          { status: 409 }
        );
      }

      closureRef = db.collection(ACCOUNTING_CLOSURES_COLLECTION).doc();
      await closureRef.set({
        organization_id: organizationId,
        periodo: period.periodo,
        status: 'running',
        snapshot_id: '',
        started_at: timestamp,
        started_by: auth.uid,
        metadata: {
          motivo_cierre: body.motivo_cierre || null,
          period_id: period.id,
        },
      } satisfies Omit<AccountingClosure, 'id'>);

      const snapshotResult = await SnapshotService.generateForPeriod({
        organizationId,
        periodo: period.periodo,
        generatedBy: auth.uid,
      });

      await db.runTransaction(async tx => {
        const periodRef = db.collection(ACCOUNTING_PERIODS_COLLECTION).doc(period.id);
        const freshPeriodDoc = await tx.get(periodRef);
        if (!freshPeriodDoc.exists) {
          throw new Error('Periodo no encontrado');
        }

        const freshPeriod = {
          id: freshPeriodDoc.id,
          ...freshPeriodDoc.data(),
        } as AccountingPeriod;

        if (freshPeriod.status === 'cerrado') {
          throw new Error(`El periodo ${freshPeriod.periodo} ya esta cerrado`);
        }

        tx.set(
          periodRef,
          {
            status: 'cerrado',
            cerrado_at: timestamp,
            cerrado_by: auth.uid,
            motivo_cierre: body.motivo_cierre || null,
            updated_at: timestamp,
          },
          { merge: true }
        );

        tx.set(
          closureRef!,
          {
            status: 'completed',
            snapshot_id: `${organizationId}:${period.periodo}:${timestamp}`,
            completed_at: timestamp,
            entries_count: snapshotResult.entries_count,
            metadata: {
              ...(snapshotResult || {}),
              motivo_cierre: body.motivo_cierre || null,
              period_id: period.id,
            },
          },
          { merge: true }
        );

        tx.set(db.collection(ACCOUNTING_AUDIT_COLLECTION).doc(), {
          organization_id: organizationId,
          action: 'closure_started',
          entity_type: 'closure',
          entity_id: closureRef!.id,
          performed_by: auth.uid,
          performed_at: timestamp,
          details: {
            periodo: period.periodo,
          },
          previous_state: null,
          next_state: {
            status: 'running',
          },
        });

        tx.set(db.collection(ACCOUNTING_AUDIT_COLLECTION).doc(), {
          organization_id: organizationId,
          action: 'snapshot_generated',
          entity_type: 'snapshot',
          entity_id: `${period.periodo}:snapshot`,
          performed_by: auth.uid,
          performed_at: timestamp,
          details: snapshotResult,
          previous_state: null,
          next_state: {
            generated_count: snapshotResult.generated_count,
          },
        });

        tx.set(db.collection(ACCOUNTING_AUDIT_COLLECTION).doc(), {
          organization_id: organizationId,
          action: 'period_closed',
          entity_type: 'period',
          entity_id: period.id,
          performed_by: auth.uid,
          performed_at: timestamp,
          details: {
            motivo_cierre: body.motivo_cierre || null,
            closure_id: closureRef!.id,
          },
          previous_state: {
            status: freshPeriod.status,
          },
          next_state: {
            status: 'cerrado',
          },
        });

        tx.set(db.collection(ACCOUNTING_AUDIT_COLLECTION).doc(), {
          organization_id: organizationId,
          action: 'closure_completed',
          entity_type: 'closure',
          entity_id: closureRef!.id,
          performed_by: auth.uid,
          performed_at: timestamp,
          details: {
            periodo: period.periodo,
            generated_count: snapshotResult.generated_count,
          },
          previous_state: {
            status: 'running',
          },
          next_state: {
            status: 'completed',
          },
        });
      });

      return NextResponse.json({
        success: true,
        data: {
          closure_id: closureRef.id,
          period_id: period.id,
          periodo: period.periodo,
          snapshot: snapshotResult,
        },
      });
    } catch (error) {
      if (closureRef) {
        await closureRef.set(
          {
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'unknown_error',
            completed_at: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      if (
        error instanceof Error &&
        (error.message === 'Periodo no encontrado' ||
          error.message.includes('ya esta cerrado'))
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.message.includes('cerrado') ? 409 : 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'No se pudo cerrar el periodo',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
