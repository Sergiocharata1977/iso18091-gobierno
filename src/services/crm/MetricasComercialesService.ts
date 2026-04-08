import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ClienteCRM } from '@/types/crm';
import {
  calcularTramoPipeline,
  calcularTramoUltimaAccion,
  type MetricasTemporalesCliente,
  type MetricasTemporalesOportunidad,
} from '@/types/crm-clasificacion';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import type { CRMAccion } from '@/types/crmAcciones';

const CLIENTES_COLLECTION = 'crm_organizaciones';
const OPORTUNIDADES_COLLECTION = 'crm_oportunidades';
const DEFAULT_DIAS_HISTORIAL = 30;
const DEFAULT_DIAS_SIN_CONTACTO = 15;
const SIN_ACCIONES_DIAS = 999;
const ACCIONES_DESGLOSE_BASE = ['llamada', 'mail', 'visita', 'whatsapp'];

function normalizeDate(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function diffInDaysFromNow(value?: string | null): number {
  const date = normalizeDate(value);
  if (!date) return SIN_ACCIONES_DIAS;

  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getFechaUltimoCambioEtapa(oportunidad: OportunidadCRM): string {
  const historial = oportunidad.historial_estados || [];
  if (historial.length === 0) {
    return oportunidad.created_at;
  }

  return historial[historial.length - 1]?.fecha_cambio || oportunidad.created_at;
}

function getAccionesCollection(organizationId: string) {
  const db = getAdminFirestore();
  return db
    .collection('organizations')
    .doc(organizationId)
    .collection('crm_acciones');
}

function getFechaAccionComparable(accion: Partial<CRMAccion>): string | undefined {
  return accion.fecha_realizada || accion.createdAt;
}

export function calcularMetricasOportunidad(
  oportunidad: OportunidadCRM
): MetricasTemporalesOportunidad {
  const dias_en_pipeline = diffInDaysFromNow(oportunidad.created_at);
  const dias_en_etapa_actual = diffInDaysFromNow(
    getFechaUltimoCambioEtapa(oportunidad)
  );

  return {
    dias_en_pipeline,
    dias_en_etapa_actual,
    tramo_pipeline: calcularTramoPipeline(dias_en_pipeline),
  };
}

export async function calcularMetricasCliente(
  organizationId: string,
  clienteId: string
): Promise<MetricasTemporalesCliente> {
  const db = getAdminFirestore();

  const [ultimaAccionSnapshot, clienteSnapshot] = await Promise.all([
    getAccionesCollection(organizationId)
      .where('organization_id', '==', organizationId)
      .where('cliente_id', '==', clienteId)
      .orderBy('fecha_realizada', 'desc')
      .limit(1)
      .get(),
    db.collection(CLIENTES_COLLECTION).doc(clienteId).get(),
  ]);

  const ultimaAccion = ultimaAccionSnapshot.docs[0]?.data() as
    | CRMAccion
    | undefined;

  let dias_desde_ultima_accion = SIN_ACCIONES_DIAS;

  if (ultimaAccion) {
    dias_desde_ultima_accion = diffInDaysFromNow(
      ultimaAccion.fecha_realizada || ultimaAccion.createdAt
    );
  } else if (clienteSnapshot.exists) {
    const cliente = {
      id: clienteSnapshot.id,
      ...clienteSnapshot.data(),
    } as ClienteCRM;

    dias_desde_ultima_accion = diffInDaysFromNow(cliente.ultima_interaccion);
  }

  return {
    dias_desde_ultima_accion,
    tramo_ultima_accion: calcularTramoUltimaAccion(dias_desde_ultima_accion),
  };
}

export function enriquecerOportunidadesConMetricas(
  oportunidades: OportunidadCRM[]
): Array<OportunidadCRM & MetricasTemporalesOportunidad> {
  return oportunidades.map(oportunidad => ({
    ...oportunidad,
    ...calcularMetricasOportunidad(oportunidad),
  }));
}

export async function getMetricasVendedor(
  organizationId: string,
  vendedorId: string,
  diasHistorial = DEFAULT_DIAS_HISTORIAL
): Promise<{
  clientes_asignados: number;
  oportunidades_activas: number;
  oportunidades_ganadas_periodo: number;
  oportunidades_perdidas_periodo: number;
  monto_total_negociado: number;
  acciones_por_tipo: Record<string, number>;
  total_acciones: number;
}> {
  const db = getAdminFirestore();
  const cutoffDate = new Date(Date.now() - diasHistorial * 24 * 60 * 60 * 1000);

  const [clientesSnapshot, oportunidadesSnapshot, accionesSnapshot] =
    await Promise.all([
      db
        .collection(CLIENTES_COLLECTION)
        .where('organization_id', '==', organizationId)
        .where('responsable_id', '==', vendedorId)
        .where('isActive', '==', true)
        .get(),
      db
        .collection(OPORTUNIDADES_COLLECTION)
        .where('organization_id', '==', organizationId)
        .where('vendedor_id', '==', vendedorId)
        .where('isActive', '==', true)
        .get(),
      getAccionesCollection(organizationId)
        .where('organization_id', '==', organizationId)
        .where('vendedor_id', '==', vendedorId)
        .get(),
    ]);

  const oportunidades = oportunidadesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as OportunidadCRM[];

  const acciones = accionesSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(accion => {
      const fecha = normalizeDate(
        getFechaAccionComparable(accion as Partial<CRMAccion>)
      );
      return fecha ? fecha >= cutoffDate : false;
    }) as CRMAccion[];

  const acciones_por_tipo = ACCIONES_DESGLOSE_BASE.reduce(
    (acc, tipo) => {
      acc[tipo] = 0;
      return acc;
    },
    {} as Record<string, number>
  );

  for (const accion of acciones) {
    acciones_por_tipo[accion.tipo] = (acciones_por_tipo[accion.tipo] || 0) + 1;
  }

  const oportunidades_activas = oportunidades.filter(
    oportunidad =>
      oportunidad.isActive &&
      oportunidad.resultado !== 'ganada' &&
      oportunidad.resultado !== 'perdida'
  );

  const oportunidades_cerradas_periodo = oportunidades.filter(oportunidad => {
    const fechaCierre = normalizeDate(oportunidad.fecha_cierre_real);
    return fechaCierre ? fechaCierre >= cutoffDate : false;
  });

  return {
    clientes_asignados: clientesSnapshot.size,
    oportunidades_activas: oportunidades_activas.length,
    oportunidades_ganadas_periodo: oportunidades_cerradas_periodo.filter(
      oportunidad => oportunidad.resultado === 'ganada'
    ).length,
    oportunidades_perdidas_periodo: oportunidades_cerradas_periodo.filter(
      oportunidad => oportunidad.resultado === 'perdida'
    ).length,
    monto_total_negociado: oportunidades.reduce(
      (sum, oportunidad) => sum + (oportunidad.monto_estimado || 0),
      0
    ),
    acciones_por_tipo,
    total_acciones: acciones.length,
  };
}

export async function getClientesSinContactoReciente(
  organizationId: string,
  diasSinContacto = DEFAULT_DIAS_SIN_CONTACTO
): Promise<
  Array<{
    clienteId: string;
    razon_social: string;
    dias_sin_contacto: number;
    responsable_id: string;
  }>
> {
  const db = getAdminFirestore();

  const clientesSnapshot = await db
    .collection(CLIENTES_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('isActive', '==', true)
    .get();

  const clientes = clientesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ClienteCRM[];

  const metricasClientes = await Promise.all(
    clientes.map(async cliente => ({
      cliente,
      metricas: await calcularMetricasCliente(organizationId, cliente.id),
    }))
  );

  return metricasClientes
    .filter(
      ({ metricas }) => metricas.dias_desde_ultima_accion > diasSinContacto
    )
    .map(({ cliente, metricas }) => ({
      clienteId: cliente.id,
      razon_social: cliente.razon_social,
      dias_sin_contacto: metricas.dias_desde_ultima_accion,
      responsable_id: cliente.responsable_id,
    }))
    .sort((a, b) => b.dias_sin_contacto - a.dias_sin_contacto);
}
