import { withAuth } from '@/lib/api/withAuth';
import { emitAccountingEvent } from '@/lib/accounting/emitEvent';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createCrmCobroSchema = z.object({
  organization_id: z.string().min(1).optional(),
  cliente_id: z.string().min(1),
  factura_id: z.string().min(1).optional(),
  fecha: z.string().min(10),
  moneda: z.enum(['ARS', 'USD']).default('ARS'),
  descripcion: z.string().min(1).optional(),
  tercero_id: z.string().min(1).optional(),
  importe_total: z.number().positive(),
  medio: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function nowIso(): string {
  return new Date().toISOString();
}

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = createCrmCobroSchema.parse(await request.json());
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

      const timestamp = nowIso();
      const db = getAdminFirestore();
      const cobroRef = db.collection('crm_cobros').doc();

      const cobro = {
        id: cobroRef.id,
        organization_id: organizationId,
        cliente_id: body.cliente_id,
        factura_id: body.factura_id || null,
        tercero_id: body.tercero_id || body.cliente_id,
        fecha: body.fecha,
        moneda: body.moneda,
        descripcion: body.descripcion || `Cobro CRM ${cobroRef.id}`,
        medio: body.medio || 'caja',
        importe_total: body.importe_total,
        accounting_posted: false,
        accounting_entry_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: auth.uid,
        payload: body.payload || {},
      };

      await cobroRef.set(cobro);

      const accountingResult = await emitAccountingEvent({
        id: `evt:${cobroRef.id}`,
        organization_id: organizationId,
        idempotency_key: `crm_cobro:${cobroRef.id}`,
        plugin_id: 'crm',
        operation_type: 'crm_cobro',
        fecha: body.fecha,
        moneda: body.moneda,
        importe_total: body.importe_total,
        documento_tipo: 'crm_cobro',
        documento_id: cobroRef.id,
        tercero_id: cobro.tercero_id,
        descripcion: cobro.descripcion,
        payload: {
          cliente_id: body.cliente_id,
          factura_id: body.factura_id || null,
          medio: cobro.medio,
          ...cobro.payload,
        },
        created_at: timestamp,
        occurred_at: timestamp,
        created_by: auth.uid,
      });

      await cobroRef.set(
        {
          accounting_posted: accountingResult.outbox_status === 'processed',
          accounting_entry_id: accountingResult.entry_id || null,
          updated_at: nowIso(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        data: {
          ...cobro,
          accounting_posted: accountingResult.outbox_status === 'processed',
          accounting_entry_id: accountingResult.entry_id || null,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'No se pudo registrar el cobro CRM',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
