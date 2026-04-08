import { withAuth } from '@/lib/api/withAuth';
import { emitAccountingEvent } from '@/lib/accounting/emitEvent';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createCrmFacturaSchema = z.object({
  organization_id: z.string().min(1).optional(),
  cliente_id: z.string().min(1),
  fecha: z.string().min(10),
  moneda: z.enum(['ARS', 'USD']).default('ARS'),
  descripcion: z.string().min(1).optional(),
  numero: z.string().min(1).optional(),
  tercero_id: z.string().min(1).optional(),
  importe_neto: z.number().nonnegative(),
  importe_iva: z.number().nonnegative().default(0),
  importe_total: z.number().nonnegative().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function nowIso(): string {
  return new Date().toISOString();
}

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = createCrmFacturaSchema.parse(await request.json());
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

      const importeTotal =
        typeof body.importe_total === 'number'
          ? body.importe_total
          : Number((body.importe_neto + body.importe_iva).toFixed(2));
      const timestamp = nowIso();
      const db = getAdminFirestore();
      const facturaRef = db.collection('crm_facturas').doc();

      const factura = {
        id: facturaRef.id,
        organization_id: organizationId,
        cliente_id: body.cliente_id,
        tercero_id: body.tercero_id || body.cliente_id,
        numero: body.numero || facturaRef.id,
        fecha: body.fecha,
        moneda: body.moneda,
        descripcion: body.descripcion || `Factura CRM ${body.numero || facturaRef.id}`,
        importe_neto: body.importe_neto,
        importe_iva: body.importe_iva,
        importe_total: importeTotal,
        accounting_posted: false,
        accounting_entry_id: null,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: auth.uid,
        payload: body.payload || {},
      };

      await facturaRef.set(factura);

      const accountingResult = await emitAccountingEvent({
        id: `evt:${facturaRef.id}`,
        organization_id: organizationId,
        idempotency_key: `crm_factura:${facturaRef.id}`,
        plugin_id: 'crm',
        operation_type: 'crm_factura',
        fecha: body.fecha,
        moneda: body.moneda,
        importe_total: importeTotal,
        importe_capital: body.importe_neto,
        importe_iva: body.importe_iva,
        documento_tipo: 'crm_factura',
        documento_id: facturaRef.id,
        tercero_id: factura.tercero_id,
        descripcion: factura.descripcion,
        payload: {
          cliente_id: body.cliente_id,
          numero: factura.numero,
          ...factura.payload,
        },
        created_at: timestamp,
        occurred_at: timestamp,
        created_by: auth.uid,
      });

      await facturaRef.set(
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
          ...factura,
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
          error: error instanceof Error ? error.message : 'No se pudo crear la factura CRM',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
