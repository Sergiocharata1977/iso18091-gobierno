import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AccountingRule } from '@/types/accounting';

const RULES_COLLECTION = 'acc_rules';
const CRM_PLUGIN_ID = 'crm';

function nowIso(): string {
  return new Date().toISOString();
}

function buildCrmRules(
  organizationId: string,
  userId: string
): AccountingRule[] {
  const timestamp = nowIso();

  return [
    {
      id: `${CRM_PLUGIN_ID}:crm_factura`,
      organization_id: organizationId,
      plugin_id: CRM_PLUGIN_ID,
      operation_type: 'crm_factura',
      nombre: 'Factura CRM',
      descripcion: 'Devenga clientes, ventas e IVA debito desde factura CRM.',
      status: 'active',
      version: 1,
      priority: 100,
      lines: [
        {
          id: 'debe-clientes',
          lado: 'debe',
          cuenta_codigo: '1.1.03',
          amount_source: 'importe_total',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-ventas',
          lado: 'haber',
          cuenta_codigo: '4.1.01',
          amount_source: 'importe_capital',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-iva-debito',
          lado: 'haber',
          cuenta_codigo: '2.1.04',
          amount_source: 'importe_iva',
          tercero_source: 'evento.tercero_id',
          required: false,
        },
      ],
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
      updated_by: userId,
    },
    {
      id: `${CRM_PLUGIN_ID}:crm_cobro`,
      organization_id: organizationId,
      plugin_id: CRM_PLUGIN_ID,
      operation_type: 'crm_cobro',
      nombre: 'Cobro CRM',
      descripcion: 'Registra ingreso en caja y cancelacion de cuenta cliente.',
      status: 'active',
      version: 1,
      priority: 100,
      lines: [
        {
          id: 'debe-caja',
          lado: 'debe',
          cuenta_codigo: '1.1.01',
          amount_source: 'importe_total',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-clientes',
          lado: 'haber',
          cuenta_codigo: '1.1.03',
          amount_source: 'importe_total',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
      ],
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
      updated_by: userId,
    },
    {
      id: `${CRM_PLUGIN_ID}:crm_credito_otorgado`,
      organization_id: organizationId,
      plugin_id: CRM_PLUGIN_ID,
      operation_type: 'crm_credito_otorgado',
      nombre: 'Credito otorgado CRM',
      descripcion: 'Reconoce credito financiado, venta financiada e interes a devengar.',
      status: 'active',
      version: 1,
      priority: 100,
      lines: [
        {
          id: 'debe-creditos-financiaciones',
          lado: 'debe',
          cuenta_codigo: '1.1.04',
          amount_source: 'importe_total',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-ventas-financiadas',
          lado: 'haber',
          cuenta_codigo: '4.1.02',
          amount_source: 'importe_capital',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-intereses-devengar',
          lado: 'haber',
          cuenta_codigo: '4.1.03',
          amount_source: 'importe_interes',
          tercero_source: 'evento.tercero_id',
          required: false,
        },
      ],
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
      updated_by: userId,
    },
    {
      id: `${CRM_PLUGIN_ID}:crm_cuota_cobrada`,
      organization_id: organizationId,
      plugin_id: CRM_PLUGIN_ID,
      operation_type: 'crm_cuota_cobrada',
      nombre: 'Cuota cobrada CRM',
      descripcion: 'Imputa cobranza de cuota contra credito financiado e intereses ganados.',
      status: 'active',
      version: 1,
      priority: 100,
      lines: [
        {
          id: 'debe-caja-cuota',
          lado: 'debe',
          cuenta_codigo: '1.1.01',
          amount_source: 'importe_total',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-creditos-financiaciones',
          lado: 'haber',
          cuenta_codigo: '1.1.04',
          amount_source: 'importe_capital',
          tercero_source: 'evento.tercero_id',
          required: true,
        },
        {
          id: 'haber-intereses-ganados',
          lado: 'haber',
          cuenta_codigo: '4.1.03',
          amount_source: 'importe_interes',
          tercero_source: 'evento.tercero_id',
          required: false,
        },
      ],
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
      updated_by: userId,
    },
  ];
}

export async function ensureCrmAccountingRules(params: {
  organizationId: string;
  userId: string;
}) {
  const db = getAdminFirestore();
  const rules = buildCrmRules(params.organizationId, params.userId);
  const batch = db.batch();

  for (const rule of rules) {
    batch.set(db.collection(RULES_COLLECTION).doc(rule.id), rule, { merge: true });
  }

  await batch.commit();

  return rules;
}
