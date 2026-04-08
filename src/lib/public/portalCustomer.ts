import { getAdminFirestore } from '@/lib/firebase/admin';
import { isCapabilityInstalled } from '@/lib/plugins/capabilityCheck';
import { resolvePublicOrgId } from '@/lib/public/resolveTenantOrg';
import {
  PortalCustomerIdentityError as PublicApiError,
  resolvePortalCustomerIdentity,
} from '@/lib/public/resolvePortalCustomerIdentity';
import { EvaluacionRiesgoService } from '@/services/crm/EvaluacionRiesgoService';
import { EstadosFinancierosService } from '@/services/crm/EstadosFinancierosService';
import { OportunidadesService } from '@/services/crm/OportunidadesService';
import type { ClienteCRM } from '@/types/crm';
import type { EvaluacionRiesgo } from '@/types/crm-evaluacion-riesgo';
import type {
  EstadoResultados,
  EstadoSituacionPatrimonial,
} from '@/types/crm-estados-financieros';
import type { ResolvedPortalCustomerIdentity } from '@/types/portal-customer-identity';
import type { Solicitud, SolicitudTipo } from '@/types/solicitudes';
import {
  resolveSolicitudEstadoLegacy,
  resolveSolicitudEstadoOperativo,
  resolveSolicitudFlujo,
} from '@/types/solicitudes';
import { NextRequest } from 'next/server';

const SOLICITUDES_COLLECTION = 'solicitudes';

type PublicPortalCustomerContext = ResolvedPortalCustomerIdentity;

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function normalizeSolicitud(
  id: string,
  data: Record<string, unknown>
): Solicitud {
  const tipo = data.tipo as Solicitud['tipo'];
  const legacyEstado =
    typeof data.estado === 'string'
      ? (data.estado as Solicitud['estado'])
      : 'recibida';
  const estadoOperativo =
    typeof data.estado_operativo === 'string'
      ? resolveSolicitudEstadoOperativo(
          tipo,
          legacyEstado,
          data.estado_operativo as Solicitud['estado_operativo']
        )
      : resolveSolicitudEstadoOperativo(tipo, legacyEstado);

  return {
    id,
    numero: String(data.numero || ''),
    organization_id: String(data.organization_id || ''),
    tipo,
    flujo:
      typeof data.flujo === 'string'
        ? (data.flujo as Solicitud['flujo'])
        : resolveSolicitudFlujo(tipo),
    estado: resolveSolicitudEstadoLegacy(tipo, estadoOperativo, legacyEstado),
    estado_operativo: estadoOperativo,
    prioridad: (data.prioridad as Solicitud['prioridad']) || null,
    nombre: String(data.nombre || ''),
    telefono: typeof data.telefono === 'string' ? data.telefono : null,
    email: typeof data.email === 'string' ? data.email : null,
    cuit: typeof data.cuit === 'string' ? data.cuit : null,
    mensaje: typeof data.mensaje === 'string' ? data.mensaje : null,
    payload:
      data.payload && typeof data.payload === 'object'
        ? (data.payload as Record<string, unknown>)
        : {},
    origen: String(data.origen || 'public_api'),
    assigned_to: typeof data.assigned_to === 'string' ? data.assigned_to : null,
    crm_cliente_id:
      typeof data.crm_cliente_id === 'string' ? data.crm_cliente_id : null,
    crm_contacto_id:
      typeof data.crm_contacto_id === 'string' ? data.crm_contacto_id : null,
    crm_oportunidad_id:
      typeof data.crm_oportunidad_id === 'string'
        ? data.crm_oportunidad_id
        : null,
    crm_sync_status:
      typeof data.crm_sync_status === 'string'
        ? (data.crm_sync_status as Solicitud['crm_sync_status'])
        : null,
    crm_sync_at:
      data.crm_sync_at instanceof Date
        ? data.crm_sync_at
        : data.crm_sync_at && typeof data.crm_sync_at === 'object'
          ? ((data.crm_sync_at as { toDate?: () => Date }).toDate?.() ?? null)
          : null,
    crm_sync_error:
      typeof data.crm_sync_error === 'string' ? data.crm_sync_error : null,
    created_at: asDate(data.created_at),
    updated_at: asDate(data.updated_at),
  };
}

function serializeSolicitud(solicitud: Solicitud) {
  return {
    id: solicitud.id,
    numeroSolicitud: solicitud.numero,
    tipo: solicitud.tipo,
    flujo: solicitud.flujo,
    estado: solicitud.estado,
    estado_operativo: solicitud.estado_operativo,
    prioridad: solicitud.prioridad ?? null,
    nombre: solicitud.nombre,
    email: solicitud.email ?? null,
    telefono: solicitud.telefono ?? null,
    cuit: solicitud.cuit ?? null,
    mensaje: solicitud.mensaje ?? null,
    origen: solicitud.origen,
    crm_cliente_id: solicitud.crm_cliente_id ?? null,
    crm_contacto_id: solicitud.crm_contacto_id ?? null,
    crm_oportunidad_id: solicitud.crm_oportunidad_id ?? null,
    crm_sync_status: solicitud.crm_sync_status ?? null,
    crm_sync_error: solicitud.crm_sync_error ?? null,
    created_at: solicitud.created_at.toISOString(),
    updated_at: solicitud.updated_at.toISOString(),
    payload: solicitud.payload,
  };
}

export async function resolvePublicPortalCustomer(
  request: NextRequest,
  requiredScope?:
    | 'profile'
    | 'solicitudes'
    | 'compras'
    | 'servicios'
    | 'mantenimientos'
    | 'cuenta_corriente'
) : Promise<PublicPortalCustomerContext | null> {
  const db = getAdminFirestore();
  const organizationId = await resolvePublicOrgId(request, null);

  if (!organizationId) {
    throw new PublicApiError('Organizacion publica no resuelta', 404, 'ORG_NOT_FOUND');
  }

  const hasCRM = await isCapabilityInstalled(db, organizationId, 'crm');
  if (!hasCRM) {
    return null;
  }

  return resolvePortalCustomerIdentity(request, requiredScope);
}

export async function listPortalSolicitudes(
  context: PublicPortalCustomerContext,
  options?: {
    tipo?: SolicitudTipo;
    limit?: number;
  }
) {
  const db = getAdminFirestore();
  const limit = options?.limit ?? 50;
  const crmClienteId = context.crm_cliente.id;
  const crmContactoId = context.identity.crm_contacto_id ?? null;

  // El portal debe resolver solicitudes por vinculos CRM explicitos, no por coincidencia de email.
  const byClientePromise = db
    .collection(SOLICITUDES_COLLECTION)
    .where('organization_id', '==', context.organization_id)
    .where('crm_cliente_id', '==', crmClienteId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();

  const byContactoPromise = crmContactoId
    ? db
        .collection(SOLICITUDES_COLLECTION)
        .where('organization_id', '==', context.organization_id)
        .where('crm_contacto_id', '==', crmContactoId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get()
    : Promise.resolve(null);

  const [byCliente, byContacto] = await Promise.all([
    byClientePromise,
    byContactoPromise,
  ]);
  const merged = new Map<string, Solicitud>();

  for (const doc of byCliente.docs) {
    const solicitud = normalizeSolicitud(doc.id, doc.data() as Record<string, unknown>);
    merged.set(solicitud.id, solicitud);
  }

  if (byContacto) {
    for (const doc of byContacto.docs) {
      const solicitud = normalizeSolicitud(
        doc.id,
        doc.data() as Record<string, unknown>
      );
      if (solicitud.crm_cliente_id && solicitud.crm_cliente_id !== crmClienteId) {
        continue;
      }
      merged.set(solicitud.id, solicitud);
    }
  }

  return Array.from(merged.values())
    .filter(solicitud => !options?.tipo || solicitud.tipo === options.tipo)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
}

export async function getPortalCustomerOverview(
  context: PublicPortalCustomerContext
): Promise<{
  oportunidades: Awaited<ReturnType<typeof OportunidadesService.listar>>;
  evaluaciones: EvaluacionRiesgo[];
  estadosSituacion: EstadoSituacionPatrimonial[];
  estadosResultados: EstadoResultados[];
  solicitudes: Solicitud[];
}> {
  const [oportunidades, evaluaciones, estadosSituacion, estadosResultados, solicitudes] =
    await Promise.all([
      OportunidadesService.listar(context.organization_id, {
        crm_organizacion_id: context.crm_cliente.id,
      }),
      EvaluacionRiesgoService.getByCliente(
        context.organization_id,
        context.crm_cliente.id
      ),
      EstadosFinancierosService.getSituacionPatrimonialByCliente(
        context.organization_id,
        context.crm_cliente.id
      ),
      EstadosFinancierosService.getEstadoResultadosByCliente(
        context.organization_id,
        context.crm_cliente.id
      ),
      listPortalSolicitudes(context, { limit: 100 }),
    ]);

  return {
    oportunidades,
    evaluaciones,
    estadosSituacion,
    estadosResultados,
    solicitudes,
  };
}

export function buildPortalClientePayload(context: PublicPortalCustomerContext) {
  const cliente = context.crm_cliente;

  return {
    id: cliente.id,
    razon_social: cliente.razon_social,
    nombre_comercial: cliente.nombre_comercial ?? null,
    cuit_cuil: cliente.cuit_cuil,
    tipo_cliente: cliente.tipo_cliente,
    categoria_riesgo: cliente.categoria_riesgo ?? null,
    estado_kanban_id: cliente.estado_kanban_id,
    estado_kanban_nombre: cliente.estado_kanban_nombre,
    email: cliente.email ?? null,
    telefono: cliente.telefono ?? null,
    direccion: cliente.direccion ?? null,
    localidad: cliente.localidad ?? null,
    provincia: cliente.provincia ?? null,
    responsable_id: cliente.responsable_id ?? null,
    responsable_nombre: cliente.responsable_nombre ?? null,
    limite_credito_actual: cliente.limite_credito_actual ?? null,
    linea_credito_vigente_id: cliente.linea_credito_vigente_id ?? null,
    fecha_primera_compra: cliente.fecha_primera_compra ?? null,
    fecha_ultima_compra: cliente.fecha_ultima_compra ?? null,
    total_compras_12m: cliente.total_compras_12m ?? 0,
    cantidad_compras_12m: cliente.cantidad_compras_12m ?? 0,
    monto_total_compras_historico: cliente.monto_total_compras_historico ?? 0,
    ultima_interaccion: cliente.ultima_interaccion ?? null,
    notas: cliente.notas ?? '',
    created_at: cliente.created_at,
    updated_at: cliente.updated_at,
  };
}

export function buildPortalLinkPayload(context: PublicPortalCustomerContext) {
  return {
    organization_id: context.organization_id,
    firebase_uid: context.auth.uid,
    firebase_email: context.auth.email,
    crm_contacto_id: context.identity.crm_contacto_id ?? null,
    linked_at: context.identity.linked_at,
    last_login_at: context.identity.last_login_at ?? null,
    allowed_scopes: context.identity.allowed_scopes,
  };
}

export function buildCuentaCorrientePayload(input: {
  cliente: ClienteCRM;
  evaluacion?: EvaluacionRiesgo | null;
  estadoSituacion?: EstadoSituacionPatrimonial | null;
  estadoResultados?: EstadoResultados | null;
}) {
  const evaluacion = input.evaluacion ?? null;
  const estadoSituacion = input.estadoSituacion ?? null;
  const estadoResultados = input.estadoResultados ?? null;

  return {
    limite_credito_actual: input.cliente.limite_credito_actual ?? null,
    linea_credito_vigente_id: input.cliente.linea_credito_vigente_id ?? null,
    categoria_riesgo: input.cliente.categoria_riesgo ?? null,
    total_compras_12m: input.cliente.total_compras_12m ?? 0,
    monto_total_compras_historico:
      input.cliente.monto_total_compras_historico ?? 0,
    evaluacion_vigente: evaluacion
      ? {
          id: evaluacion.id,
          estado: evaluacion.estado,
          fecha_evaluacion: evaluacion.fecha_evaluacion,
          score_total: evaluacion.score_ponderado_total,
          tier_sugerido: evaluacion.tier_sugerido,
          tier_asignado: evaluacion.tier_asignado ?? null,
          limite_credito_asignado: evaluacion.limite_credito_asignado ?? null,
          capital_garantia: evaluacion.capital_garantia,
          evaluador_nombre: evaluacion.evaluador_nombre,
          evaluacion_personal: evaluacion.evaluacion_personal ?? null,
        }
      : null,
    situacion_patrimonial_vigente: estadoSituacion
      ? {
          id: estadoSituacion.id,
          ejercicio: estadoSituacion.ejercicio,
          fecha_cierre: estadoSituacion.fecha_cierre,
          total_activo: estadoSituacion.total_activo,
          total_pasivo: estadoSituacion.total_pasivo,
          total_patrimonio_neto: estadoSituacion.total_patrimonio_neto,
          liquidez_corriente: estadoSituacion.liquidez_corriente,
          solvencia: estadoSituacion.solvencia,
          endeudamiento: estadoSituacion.endeudamiento,
        }
      : null,
    estado_resultados_vigente: estadoResultados
      ? {
          id: estadoResultados.id,
          ejercicio: estadoResultados.ejercicio,
          fecha_cierre: estadoResultados.fecha_cierre,
          ganancia_bruta: estadoResultados.ganancia_bruta,
          ganancia_antes_impuestos: estadoResultados.ganancia_antes_impuestos,
          ganancia_perdida_ejercicio:
            estadoResultados.ganancia_perdida_ejercicio,
        }
      : null,
  };
}

export function serializePortalSolicitudList(solicitudes: Solicitud[]) {
  return solicitudes.map(serializeSolicitud);
}

export { PublicApiError };
